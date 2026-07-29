import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  loadMigrationFiles,
  reconstructCatalog,
  renderMarkdown,
  runCli,
  splitSqlStatements,
  verifyCatalog,
} from "../scripts/audit-rls-policy-overlaps.mjs";

const rootDir = resolve(import.meta.dirname, "..");

describe("RLS policy overlap source audit", () => {
  it("splits SQL without treating comments, strings, or function bodies as statements", () => {
    const statements = splitSqlStatements(`
      -- ignored ;
      create function public.example() returns text language sql as $body$
        select ';not a delimiter';
      $body$;
      /* ignored ; */
      create policy "read rows" on public.examples for select using (true);
    `);

    expect(statements).toHaveLength(2);
    expect(statements[0].text).toContain("create function");
    expect(statements[1].text).toContain('create policy "read rows"');
  });

  it("applies CREATE, ALTER, DROP, ALL-command expansion, grants, and revokes in order", () => {
    const catalog = reconstructCatalog([
      {
        path: "001.sql",
        sql: `
          create policy "all members" on public.examples
            for all to authenticated using (owner_id = auth.uid())
            with check (owner_id = auth.uid());
          create policy "read members" on public.examples
            for select to authenticated using (visible);
          grant select, update on table public.examples to anon, authenticated;
        `,
      },
      {
        path: "002.sql",
        sql: `
          alter policy "read members" on public.examples
            using ((select auth.uid()) = owner_id);
          revoke update on table public.examples from anon, authenticated;
          drop policy "all members" on public.examples;
        `,
      },
    ]);

    expect(catalog.policies).toHaveLength(1);
    expect(catalog.policies[0]).toMatchObject({
      name: "read members",
      command: "SELECT",
      roles: ["authenticated"],
      using: "((select auth.uid()) = owner_id)",
      lastChangedIn: "002.sql",
    });
    expect(catalog.overlapGroups).toHaveLength(0);
  });

  it("fails closed on policy-changing DDL it cannot parse", () => {
    expect(() =>
      reconstructCatalog([
        {
          path: "bad.sql",
          sql: 'alter policy "read rows" on public.examples rename to "other";',
        },
      ]),
    ).toThrow(
      /Unsupported ALTER POLICY clause|ALTER POLICY did not match|Unparsed policy-changing DDL/,
    );

    expect(() =>
      reconstructCatalog([
        {
          path: "bad.sql",
          sql: "create policy broken syntax;",
        },
      ]),
    ).toThrow(/Unparsed policy-changing DDL/);
  });

  it("reconstructs the committed migration catalog deterministically", () => {
    const first = reconstructCatalog(loadMigrationFiles(rootDir));
    const second = reconstructCatalog(loadMigrationFiles(rootDir));

    expect(verifyCatalog(first)).toEqual({
      policies: 156,
      overlapGroups: 35,
      selectGroups: 34,
      updateGroups: 1,
      serviceOnlyGroups: 7,
    });
    expect(second.policies).toEqual(first.policies);
    expect(second.overlapGroups).toEqual(first.overlapGroups);
    expect(first.overlapGroups.map((group) => group.id)).toEqual(
      [...first.overlapGroups.map((group) => group.id)].sort(),
    );
  });

  it("preserves PostgreSQL identifier truncation for the migration-40 ALTER", () => {
    const catalog = reconstructCatalog(loadMigrationFiles(rootDir));
    const policy = catalog.policies.find(
      (item) =>
        item.table === "notification_delivery_attempts" &&
        item.name === "notification recipients and team managers read delivery attempt",
    );

    expect(policy).toBeDefined();
    expect(policy.lastChangedIn).toBe(
      "supabase/migrations/20260726182645_optimize_rls_auth_initplans.sql",
    );
    expect(policy.using).toContain("(select auth.uid())");
  });

  it("renders Markdown and verifies that the checked-in review covers every group", () => {
    const catalog = reconstructCatalog(loadMigrationFiles(rootDir));
    const markdown = renderMarkdown(catalog);
    const review = readFileSync(
      resolve(rootDir, "docs/rls-policy-overlap-review-2026-07-27.md"),
      "utf8",
    );

    expect(markdown).toContain("35 overlap groups");
    for (const group of catalog.overlapGroups) {
      expect(review).toContain(`\`${group.id}\``);
    }
    expect(() => runCli(["--verify"], rootDir)).not.toThrow();
  });
});
