export type QaTarget =
  | { kind: "local"; projectRef: null }
  | { kind: "hosted"; projectRef: string };

export function assertIsolatedQaTarget(
  url: string,
  action?: string
): QaTarget;

export function assertServiceRoleCredential(value: string): void;
