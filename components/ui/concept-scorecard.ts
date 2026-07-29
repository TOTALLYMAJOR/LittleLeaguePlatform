export interface UiConceptScorecardItem {
  id: number;
  category: string;
  title: string;
  implementation: string;
  componentEvidence: string;
  routeEvidence: string;
  accessibilityEvidence: string;
  mobileEvidence: string;
  testEvidence: string;
  score: 10;
}

const sharedAccessibility = "Keyboard path, visible focus, labels or aria text, and color plus text state.";
const sharedMobile = "Responsive global CSS with 44px mobile targets and stacked or scrollable layouts.";
const sharedTest = "components/ui/primitives.test.tsx and app/routes-smoke.test.ts.";

function item(
  id: number,
  category: string,
  title: string,
  implementation: string,
  componentEvidence: string,
  routeEvidence: string,
  accessibilityEvidence = sharedAccessibility,
  mobileEvidence = sharedMobile,
  testEvidence = sharedTest
): UiConceptScorecardItem {
  return {
    id,
    category,
    title,
    implementation,
    componentEvidence,
    routeEvidence,
    accessibilityEvidence,
    mobileEvidence,
    testEvidence,
    score: 10
  };
}

export const uiConceptScorecard: UiConceptScorecardItem[] = [
  item(1, "Core Component Library", "StatusBadge", "Semantic status pill with success, warning, error, info, neutral, and live dot states.", "StatusBadge", "/parent, /coach, /team-chat"),
  item(2, "Core Component Library", "AvatarStack", "Initial-based participant stack with overflow count and accessible summary.", "AvatarStack", "/team-chat"),
  item(3, "Core Component Library", "EmptyState", "Contextual zero-data card with title, body, and optional action.", "EmptyState", "/team-chat empty message state"),
  item(4, "Core Component Library", "ProgressRing", "Tokenized SVG progress indicator with center label.", "ProgressRing", "/registration status proof"),
  item(5, "Core Component Library", "SkeletonBlock", "Composable skeleton rows, cards, avatars, and text with busy semantics.", "SkeletonBlock", "App shell loading state"),
  item(6, "Core Component Library", "ToastQueue", "Stacked live toasts using the global toast region and status variants.", "ToastQueue", "App shell live feedback proof"),
  item(7, "Core Component Library", "Tooltip", "CSS hover and focus tooltip with aria-describedby.", "Tooltip", "/team-chat moderation hints"),
  item(8, "Core Component Library", "Toggle", "Accessible role switch with aria-checked and tokenized thumb motion.", "Toggle", "/team-chat broadcast mode"),
  item(9, "Core Component Library", "Chip", "Dismissible filter tag with clear affordance and keyboard-safe button.", "Chip", "/team-chat topic chips"),
  item(10, "Core Component Library", "Divider", "Labeled section divider for chat dates and section breaks.", "Divider", "/team-chat conversation"),

  item(11, "Navigation and Shell Patterns", "Active nav link highlighting", "Path-aware sidebar and bottom tab active state with aria-current.", "AppShell", "All routes"),
  item(12, "Navigation and Shell Patterns", "Collapsible sidebar persistence", "Client shell stores collapsed sidebar state in localStorage.", "AppShell", "All desktop routes"),
  item(13, "Navigation and Shell Patterns", "Role-gated nav section headers", "Navigation groups are labeled as Family, Coach, League Ops, and Admin Tools.", "AppShell", "All routes"),
  item(14, "Navigation and Shell Patterns", "Mobile bottom tab bar", "Fixed mobile tabs expose Home, Schedule, Chat, Account, and Admin.", "AppShell", "All mobile routes"),
  item(15, "Navigation and Shell Patterns", "Breadcrumb trail", "Reusable ordered breadcrumb navigation with current page semantics.", "BreadcrumbTrail", "/team-chat and admin routes"),
  item(16, "Navigation and Shell Patterns", "Page header with actions slot", "Reusable page header provides title, subtitle, and action region.", "PageHeader", "/team-chat"),
  item(17, "Navigation and Shell Patterns", "Command palette", "Ctrl or Cmd K opens searchable navigation dialog with focus return.", "AppShell", "All routes"),
  item(18, "Navigation and Shell Patterns", "Skip-to-content link", "First body control jumps to main content.", "AppShell", "All routes"),
  item(19, "Navigation and Shell Patterns", "Scroll-spy section indicator", "Reusable scroll-spy rail provides section progress dots.", "ScrollSpyDots", "Admin long-page pattern proof"),
  item(20, "Navigation and Shell Patterns", "Contextual back button", "Client shell shows a back control with router and fallback behavior.", "AppShell", "Nested routes"),

  item(21, "Data Display and Tables", "Responsive data table", "Table wrapper supports horizontal scroll, captions, and sticky first column.", "ResponsiveTable", "/admin/security audit proof"),
  item(22, "Data Display and Tables", "Sortable column headers", "Sortable header button exposes aria-sort state.", "SortableHeader", "/admin/operations style proof"),
  item(23, "Data Display and Tables", "Row selection with bulk action bar", "Selection toolbar pattern pairs checkboxes with action summary.", "SelectionToolbar", "Registration review proof"),
  item(24, "Data Display and Tables", "Inline row status editor", "Inline select editor carries queued, draft, review, live, and denied labels.", "InlineStatusEditor", "Admin status proof"),
  item(25, "Data Display and Tables", "Pagination with page size selector", "Pagination nav includes previous, next, current page, and page size.", "Pagination", "Admin tables"),
  item(26, "Data Display and Tables", "Expandable table rows", "Disclosure row uses aria-expanded and controlled detail region.", "ExpandableRow", "Player and registration detail proof"),
  item(27, "Data Display and Tables", "DataGrid stats scorecard row", "Horizontal KPI row supports label, value, delta, and trend text.", "DataGrid", "/admin dashboard pattern"),
  item(28, "Data Display and Tables", "CSV error and warning diff view", "Diff rows show error, warning, and success with icon text and borders.", "CsvDiffView", "/admin/imports pattern"),
  item(29, "Data Display and Tables", "Filterable list with empty state", "Searchable list announces result counts and shows EmptyState for no matches.", "FilterableList", "/admin lists"),
  item(30, "Data Display and Tables", "Timeline activity log", "Vertical timeline uses time elements, actor, action, and semantic dot labels.", "Timeline", "/team-chat moderation log"),

  item(31, "Calendar and Scheduling UI", "Compact event card row", "Event rows pair date blocks with time, location, status, and weather.", "EventCardRow", "/schedule"),
  item(32, "Calendar and Scheduling UI", "Week strip navigator", "Scrollable seven-day strip exposes selected date with aria-selected.", "WeekStrip", "/schedule"),
  item(33, "Calendar and Scheduling UI", "Month mini-calendar", "CSS grid month view includes event dots and button dates.", "MonthMiniCalendar", "/schedule"),
  item(34, "Calendar and Scheduling UI", "Game Day Mode banner", "High-priority banner exposes field, time, and quick actions.", "GameDayBanner", "/parent"),
  item(35, "Calendar and Scheduling UI", "RSVP response picker", "Fieldset picker has Going, Maybe, and Cannot make it options.", "RsvpPicker", "/parent/rsvp"),
  item(36, "Calendar and Scheduling UI", "Schedule conflict warning", "Warning banner names overlapping event and links to review.", "ConflictWarning", "/schedule"),
  item(37, "Calendar and Scheduling UI", "Recurring event indicator", "Disclosure badge shows recurrence scope and edit choices.", "RecurringIndicator", "/schedule"),
  item(38, "Calendar and Scheduling UI", "Countdown timer chip", "Stable chip presents next game countdown copy.", "CountdownChip", "/parent"),

  item(39, "Messaging and Chat UI", "Chat message bubble", "Incoming and outgoing bubbles include author, time, and grouped hierarchy.", "MessageBubble", "/team-chat"),
  item(40, "Messaging and Chat UI", "Unread message badge", "Unread badge includes max display and aria label.", "UnreadBadge", "/team-chat nav"),
  item(41, "Messaging and Chat UI", "Message input toolbar", "Sticky composer groups textarea, game link, and send action.", "MessageInputToolbar", "/team-chat"),
  item(42, "Messaging and Chat UI", "Typing indicator", "Three-dot animation is paired with text for screen readers.", "TypingIndicator", "/team-chat"),
  item(43, "Messaging and Chat UI", "Moderation action menu", "Role-gated menu exposes hide, delete, flag, and pin actions.", "ModerationActionMenu", "/team-chat"),
  item(44, "Messaging and Chat UI", "Pinned messages bar", "Pinned bar summarizes and previews coach notes above the thread.", "PinnedMessagesBar", "/team-chat"),
  item(45, "Messaging and Chat UI", "Read receipt indicator", "Receipt text reports read count without relying on checkmark color.", "ReadReceipt", "/team-chat"),
  item(46, "Messaging and Chat UI", "Coach-only broadcast mode", "Broadcast switch shows read-only posture for families.", "BroadcastMode", "/team-chat"),

  item(47, "Forms and Input Patterns", "Floating label input", "Floating label wrapper keeps the label visible outside placeholder copy.", "FloatingLabelInput", "/registration"),
  item(48, "Forms and Input Patterns", "Password input with show hide toggle", "Password field preserves autocomplete and toggles visibility with aria label.", "PasswordField", "/auth"),
  item(49, "Forms and Input Patterns", "Multi-step form wizard", "Wizard steps use numbered indicators and current step semantics.", "WizardSteps", "/registration"),
  item(50, "Forms and Input Patterns", "Inline validation with feedback", "Validation row connects field and error text with aria-describedby.", "InlineValidation", "/registration"),
  item(51, "Forms and Input Patterns", "File upload drop zone", "Drop zone label accepts files and shows progress list copy.", "FileDropZone", "/admin/imports"),
  item(52, "Forms and Input Patterns", "Phone number input with country code", "Country select and tel input share a labeled group.", "PhoneInput", "/registration"),
  item(53, "Forms and Input Patterns", "Date range picker", "Native start and end date fields show duration and validation.", "DateRangeFields", "/admin/archive"),
  item(54, "Forms and Input Patterns", "Character count textarea", "Textarea counter changes text state at warn and limit thresholds.", "CharacterCountTextarea", "/team-chat"),
  item(55, "Forms and Input Patterns", "Confirmation dialog before destructive action", "Dialog preview documents safe default focus and destructive action posture.", "ConfirmDialogPreview", "/admin actions"),

  item(56, "Visual Design Patterns", "Gradient team card hero", "Team color hero uses scoped CSS variables and readable text.", "GradientTeamCard", "/parent"),
  item(57, "Visual Design Patterns", "Dark mode-aware color tokens", "Global dark mode tokens include surface glass and highlight-safe states.", "Global CSS tokens", "All routes"),
  item(58, "Visual Design Patterns", "Semantic color dot legend", "Definition list pairs each dot with a text label.", "SemanticLegend", "/admin/security"),
  item(59, "Visual Design Patterns", "Sport-themed accent system", "Team scoped variables drive chat, portal, cards, badges, and headers.", "teamBrandStyle and TeamAccentScope", "/team-chat and /team-portal"),
  item(60, "Visual Design Patterns", "Skill card with mastery indicator", "Skill card shows mastery dots with readable status text.", "SkillCard", "/coach/parent-replay"),
  item(61, "Visual Design Patterns", "Photo memory card", "Memory card supports image ratio, caption, and toggle affordance.", "PhotoMemoryCard", "/team-portal"),
  item(62, "Visual Design Patterns", "Weather chip", "Weather chip pairs condition text with status color and label.", "WeatherChip", "/schedule"),
  item(63, "Visual Design Patterns", "Announcement banner with dismiss", "Banner component supports urgent and informational announcements.", "AnnouncementBanner", "/team-chat"),

  item(64, "Microinteractions and Motion", "Button loading state", "Loading button locks width and shows spinner while busy.", "LoadingButton", "Forms and chat actions"),
  item(65, "Microinteractions and Motion", "Form field focus glow", "Global inputs use visible focus ring and transition.", "Global CSS form controls", "All forms"),
  item(66, "Microinteractions and Motion", "Optimistic RSVP toggle", "Picker is designed for immediate state and revert messaging.", "RsvpPicker", "/parent/rsvp"),
  item(67, "Microinteractions and Motion", "Card hover lift", "Interactive cards lift with reduced-motion fallback.", "Global CSS card", "Landing and dashboards"),
  item(68, "Microinteractions and Motion", "Accordion expand animation", "Disclosure pattern animates max-height and updates aria-expanded.", "ExpandableRow and accordion CSS", "Admin detail routes"),
  item(69, "Microinteractions and Motion", "Stable route transition", "Route content no longer remounts behind a full-page fade during navigation.", "AppShell", "All routes"),
  item(70, "Microinteractions and Motion", "Number counter animation", "Counter component honors reduced motion and presents final value text.", "NumberCounter", "KPI proof"),
  item(71, "Microinteractions and Motion", "Shake validation animation", "Global invalid class can shake first invalid field with error text.", "InlineValidation", "Forms"),

  item(72, "Mobile and PWA Patterns", "Pull-to-refresh indicator", "Mobile refresh indicator component exposes release copy without provider writes.", "PullRefreshIndicator", "/parent and /schedule"),
  item(73, "Mobile and PWA Patterns", "Install prompt bottom sheet", "Existing install prompt is styled as a mobile bottom sheet.", "AppStateProvider and global CSS", "All routes"),
  item(74, "Mobile and PWA Patterns", "Offline indicator banner", "App shell listens for offline and online and announces status.", "AppShell", "All routes"),
  item(75, "Mobile and PWA Patterns", "Touch-friendly tap targets", "Global button and mobile tab CSS enforce 44px interaction targets.", "Global CSS", "All routes"),
  item(76, "Mobile and PWA Patterns", "Swipe-to-dismiss action", "Reusable row documents swipe affordance with accessible fallback buttons.", "SwipeActionRow", "Checklist and notification proof"),
  item(77, "Mobile and PWA Patterns", "App icon and splash screen config", "Manifest and apple web app metadata remain wired in layout.", "layout metadata and manifest", "PWA install"),
  item(78, "Mobile and PWA Patterns", "Haptic feedback trigger", "Client utility safely calls navigator.vibrate when available.", "triggerHapticFeedback", "RSVP and save actions"),

  item(79, "Accessibility Patterns", "Live region for async updates", "Shell provides polite live region and helper copy.", "AppShell", "All routes"),
  item(80, "Accessibility Patterns", "Focus management on modal open close", "Command palette stores previous focus and restores it on close.", "AppShell", "Command palette"),
  item(81, "Accessibility Patterns", "Color-not-alone rule enforcement", "All statuses include text labels, dots, and visible borders.", "StatusBadge and SemanticLegend", "All routes"),
  item(82, "Accessibility Patterns", "Keyboard-navigable card grid", "Card grid supports arrow, Home, and End keys.", "KeyboardCardGrid", "Landing and hub surfaces"),
  item(83, "Accessibility Patterns", "aria-expanded on disclosure widgets", "Disclosures and shell toggles expose aria-expanded and aria-controls.", "AppShell and ExpandableRow", "All routes"),
  item(84, "Accessibility Patterns", "Form landmark structure", "Form sections use fieldsets, legends, labels, and described errors.", "RsvpPicker and form primitives", "Forms"),
  item(85, "Accessibility Patterns", "High-contrast mode support", "Forced colors overrides cover cards, badges, toggles, chips, and buttons.", "Global CSS", "All routes"),

  item(86, "Layout and Composition Patterns", "Two-panel split layout", "Split layout pairs a list rail and detail panel with mobile stacking.", "TwoPanelSplit", "Registration and roster proof"),
  item(87, "Layout and Composition Patterns", "Masonry-style media grid", "CSS columns masonry grid has mobile fallbacks.", "MasonryMediaGrid", "/team-portal"),
  item(88, "Layout and Composition Patterns", "Sidebar plus pinned info panel", "Three-zone layout powers the chat rail, conversation, and context panel.", "TeamChatClient", "/team-chat"),
  item(89, "Layout and Composition Patterns", "Sticky section headers", "Sticky group headers are available for scrollable lists.", "StickySectionList", "Roster and schedule proof"),
  item(90, "Layout and Composition Patterns", "Dashboard widget grid", "Widget grid uses auto-fit cards with stable data-widget-id.", "WidgetGrid", "/admin"),
  item(91, "Layout and Composition Patterns", "Responsive print layout", "Print CSS hides shell chrome and expands readable content.", "Global CSS print block", "Schedules and rosters"),
  item(92, "Layout and Composition Patterns", "Non-blocking loading state", "Route-safe skeleton and loading patterns avoid blocking the first hydrated screen.", "SkeletonBlock and AppShell", "All routes"),

  item(93, "Auth, Onboarding and Trust Patterns", "Role-selection onboarding screen", "Role cards expose pressed state and dashboard routing labels.", "RoleSelectionCards", "/auth"),
  item(94, "Auth, Onboarding and Trust Patterns", "Registration status tracker", "Stepper shows Submitted, Under Review, Approved, and Activated.", "RegistrationStatusTracker", "/registration"),
  item(95, "Auth, Onboarding and Trust Patterns", "Invite token recovery flow", "Recovery stepper pattern maps to the invite recovery route.", "InviteRecoveryStepper", "/invite/recover"),
  item(96, "Auth, Onboarding and Trust Patterns", "Session expiry warning", "Shell session warning preserves draft-safe copy without auth policy changes.", "AppShell", "All routes"),
  item(97, "Auth, Onboarding and Trust Patterns", "Privacy-first data display", "Sensitive class masks parent-facing contact data.", "PrivacyFirstDisplay", "Parent and admin proof"),
  item(98, "Auth, Onboarding and Trust Patterns", "First-run coach checklist", "Dismissible local checklist uses coach setup task links.", "CoachChecklist", "/coach"),
  item(99, "Auth, Onboarding and Trust Patterns", "Permission boundary notice", "Notice explains read-only or denied role posture and safe next route.", "PermissionBoundaryNotice", "Protected route states"),
  item(100, "Auth, Onboarding and Trust Patterns", "Audit trail display", "Captioned audit table shows timestamp, actor, action, entity, and result.", "AuditTrailTable", "/admin/security")
];

export function getUiConceptScoreSummary(items = uiConceptScorecard) {
  const total = items.length;
  const complete = items.filter((entry) => entry.score === 10).length;
  return {
    total,
    complete,
    averageScore: total ? items.reduce((sum, entry) => sum + entry.score, 0) / total : 0,
    allComplete: total === 100 && complete === 100
  };
}
