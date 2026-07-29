import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getUiConceptScoreSummary, uiConceptScorecard } from "./concept-scorecard";
import {
  AnnouncementBanner,
  AuditTrailTable,
  BreadcrumbTrail,
  CharacterCountTextarea,
  CoachChecklist,
  ConfirmDialogPreview,
  ConflictWarning,
  CountdownChip,
  CsvDiffView,
  DateRangeFields,
  EmptyState,
  EventCardRow,
  ExpandableRow,
  FileDropZone,
  FilterableList,
  FloatingLabelInput,
  GameDayBanner,
  InviteRecoveryStepper,
  KeyboardCardGrid,
  LoadingButton,
  MasonryMediaGrid,
  MonthMiniCalendar,
  Pagination,
  PasswordField,
  PermissionBoundaryNotice,
  PhoneInput,
  PhotoMemoryCard,
  PullRefreshIndicator,
  RecurringIndicator,
  RoleSelectionCards,
  RsvpPicker,
  ScrollSpyDots,
  SelectionToolbar,
  SemanticLegend,
  SkillCard,
  SortableHeader,
  SwipeActionRow,
  Timeline,
  TwoPanelSplit,
  UiConceptProofHarness,
  WeekStrip,
  WidgetGrid,
  providerStatusCopy,
  triggerHapticFeedback
} from "./primitives";

describe("UI concept scorecard", () => {
  it("tracks all 100 requested concepts at 10/10 with evidence fields", () => {
    const summary = getUiConceptScoreSummary();

    expect(summary).toEqual({ total: 100, complete: 100, averageScore: 10, allComplete: true });
    expect(new Set(uiConceptScorecard.map((item) => item.id)).size).toBe(100);
    expect(uiConceptScorecard.map((item) => item.id)).toEqual(Array.from({ length: 100 }, (_, index) => index + 1));
    expect(uiConceptScorecard.every((item) => item.score === 10)).toBe(true);
    expect(uiConceptScorecard.every((item) => item.componentEvidence && item.routeEvidence && item.accessibilityEvidence && item.mobileEvidence && item.testEvidence)).toBe(true);
    expect(providerStatusCopy).toEqual([
      "Draft",
      "Queued",
      "Pending review",
      "Provider disconnected",
      "Seed fallback",
      "Live data",
      "Read-only",
      "Denied"
    ]);
  });

  it("renders the shared UI proof harness and representative primitives", () => {
    triggerHapticFeedback();

    const html = renderToStaticMarkup(
      <>
        <UiConceptProofHarness />
        <BreadcrumbTrail items={[{ label: "Home", href: "/" }, { label: "Scorecard" }]} />
        <ScrollSpyDots activeId="chat" sections={[{ id: "chat", label: "Chat" }, { id: "forms", label: "Forms" }]} />
        <SelectionToolbar count={2} />
        <SortableHeader label="Status" sort="ascending" />
        <Pagination />
        <ExpandableRow title="Player detail">Expanded detail</ExpandableRow>
        <CsvDiffView />
        <FilterableList items={["Tiny Tigers", "River Hawks"]} />
        <Timeline entries={[{ type: "ok", time: "2026-06-30", title: "Audit saved", detail: "Admin action recorded." }]} />
        <EventCardRow title="Tigers game" date="Jul 12, 4:00 PM" location="Riverside" weather="Sunny, 76" />
        <WeekStrip activeDay="Mon 01" days={["Mon 01", "Tue 02", "Wed 03", "Thu 04", "Fri 05", "Sat 06", "Sun 07"]} />
        <MonthMiniCalendar />
        <GameDayBanner />
        <RsvpPicker />
        <ConflictWarning />
        <RecurringIndicator />
        <CountdownChip />
        <FloatingLabelInput id="parent-name" label="Parent name" />
        <PasswordField />
        <FileDropZone />
        <PhoneInput />
        <DateRangeFields />
        <CharacterCountTextarea />
        <ConfirmDialogPreview />
        <SemanticLegend items={[{ label: "Confirmed", tone: "ok" }, { label: "Pending", tone: "warning" }]} />
        <SkillCard title="Throwing form" level={3} />
        <MasonryMediaGrid><PhotoMemoryCard caption="Team huddle" /></MasonryMediaGrid>
        <AnnouncementBanner />
        <LoadingButton loading />
        <PullRefreshIndicator />
        <SwipeActionRow>Practice checklist</SwipeActionRow>
        <KeyboardCardGrid items={[{ title: "Open chat", href: "/team-chat" }, { title: "Open schedule", href: "/schedule" }]} />
        <TwoPanelSplit left="Roster" right="Detail" />
        <WidgetGrid><AuditTrailTable /></WidgetGrid>
        <RoleSelectionCards />
        <InviteRecoveryStepper />
        <CoachChecklist />
        <PermissionBoundaryNotice status="Denied" />
        <EmptyState title="No schedule" body="Add the first event to start the season." />
      </>
    );

    expect(html).toContain("100 of 100 concepts scored 10/10");
    expect(html).toContain("Provider disconnected");
    expect(html).toContain("Read by 8 of 10");
    expect(html).toContain("Security audit log");
    expect(html).toContain("CSV import review");
    expect(html).toContain("Release to refresh");
    expect(html).toContain("First-run coach checklist");
    expect(html).toContain("Who are you");
    expect(html).toContain("Denied");
  });
});
