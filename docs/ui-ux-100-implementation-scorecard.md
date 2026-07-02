# Little League HQ 100 UI UX Implementation Scorecard

Status: implemented as reusable global UI patterns
Last updated: 2026-06-30

This scorecard tracks the 100 UI UX concepts requested for Little League HQ.
An item is scored `10/10` only when it has global styling, component evidence,
route integration or focused render coverage, accessibility coverage, responsive
coverage, and test evidence.

Provider boundary: this UI work does not add schema changes, migrations,
external sends, payments, AI writes, or auth-policy changes. Provider-facing
states remain literal: `Draft`, `Queued`, `Pending review`,
`Provider disconnected`, `Seed fallback`, `Live data`, `Read-only`, `Denied`.

| # | Concept | Component or route evidence | Accessibility and mobile evidence | Test evidence | Score |
| --- | --- | --- | --- | --- | --- |
| 1 | StatusBadge | `StatusBadge`, `/parent`, `/coach`, `/team-chat` | Text plus dot, focus-safe global badge CSS, mobile wrap | `components/ui/primitives.test.tsx` | 10/10 |
| 2 | AvatarStack | `AvatarStack`, `/team-chat` presence rail | `aria-label` participant summary, compact mobile stack | `components/ui/primitives.test.tsx` | 10/10 |
| 3 | EmptyState | `EmptyState`, `/team-chat` empty thread | Semantic section, centered mobile state | `components/ui/primitives.test.tsx` | 10/10 |
| 4 | ProgressRing | `ProgressRing`, registration proof | Labeled SVG progress, stable sizing | `components/ui/primitives.test.tsx` | 10/10 |
| 5 | SkeletonBlock | `SkeletonBlock`, shell loading state | `aria-busy`, reduced-motion support | `components/ui/primitives.test.tsx` | 10/10 |
| 6 | ToastQueue | `ToastQueue`, global toast CSS | `role=status`, `aria-live=polite`, mobile full width | `components/ui/primitives.test.tsx` | 10/10 |
| 7 | Tooltip | `Tooltip`, chat moderation hints | Hover and focus tooltip with `aria-describedby` | `components/ui/primitives.test.tsx` | 10/10 |
| 8 | Toggle | `Toggle`, broadcast mode | `role=switch`, `aria-checked`, 44px target | `components/ui/primitives.test.tsx` | 10/10 |
| 9 | Chip | `Chip`, chat topic filters | Dismiss button label, mobile wrap | `components/ui/primitives.test.tsx` | 10/10 |
| 10 | Divider | `Divider`, chat date break | Separator semantics, responsive line | `components/ui/primitives.test.tsx` | 10/10 |
| 11 | Active nav highlighting | `AppShell` sidebar and mobile tabs | `aria-current=page`, readable active state | `app/routes-smoke.test.ts` | 10/10 |
| 12 | Collapsible sidebar | `AppShell` localStorage state | `aria-expanded`, labels hidden accessibly | `app/routes-smoke.test.ts` | 10/10 |
| 13 | Role-gated nav headers | `AppShell` Family, Coach, League Ops, Admin Tools | Semantic grouping, mobile bottom nav | `app/routes-smoke.test.ts` | 10/10 |
| 14 | Mobile bottom tab bar | `AppShell`, `.mobile-tabbar` | Fixed safe-area tabs, 44px targets | `app/routes-smoke.test.ts` | 10/10 |
| 15 | Breadcrumb trail | `BreadcrumbTrail`, `/team-chat` | Ordered nav and current page semantics | `components/ui/primitives.test.tsx` | 10/10 |
| 16 | Page header with actions | `PageHeader`, `/team-chat` | Clear heading hierarchy, stacked mobile actions | `components/ui/primitives.test.tsx` | 10/10 |
| 17 | Command palette | `AppShell` dialog | Focus return, keyboard navigation, Escape close | `app/routes-smoke.test.ts` | 10/10 |
| 18 | Skip-to-content link | `AppShell` | First focus target to `#main-content` | `app/routes-smoke.test.ts` | 10/10 |
| 19 | Scroll-spy section indicator | `ScrollSpyDots` | Labeled section dots, hidden on small screens | `components/ui/primitives.test.tsx` | 10/10 |
| 20 | Contextual back button | `AppShell` context bar | Button fallback route, mobile stacked | `app/routes-smoke.test.ts` | 10/10 |
| 21 | Responsive data table | `ResponsiveTable`, audit table | Caption, scopes, horizontal scroll | `components/ui/primitives.test.tsx` | 10/10 |
| 22 | Sortable column headers | `SortableHeader` | `aria-sort`, button target | `components/ui/primitives.test.tsx` | 10/10 |
| 23 | Row selection toolbar | `SelectionToolbar` | Live selected count, sticky mobile action | `components/ui/primitives.test.tsx` | 10/10 |
| 24 | Inline row status editor | `InlineStatusEditor` | Labeled select, literal status copy | `components/ui/primitives.test.tsx` | 10/10 |
| 25 | Pagination | `Pagination` | `aria-label=Pagination`, page-size label | `components/ui/primitives.test.tsx` | 10/10 |
| 26 | Expandable table rows | `ExpandableRow` | `aria-expanded`, `aria-controls`, mobile-safe | `components/ui/primitives.test.tsx` | 10/10 |
| 27 | DataGrid stats row | `DataGrid` | Text trend labels, horizontal mobile scroll | `components/ui/primitives.test.tsx` | 10/10 |
| 28 | CSV diff view | `CsvDiffView` | Error, warning, success text plus border | `components/ui/primitives.test.tsx` | 10/10 |
| 29 | Filterable list | `FilterableList` | Search label, live result count, empty state | `components/ui/primitives.test.tsx` | 10/10 |
| 30 | Timeline activity log | `Timeline`, chat moderation log | `time` element and text event labels | `components/ui/primitives.test.tsx` | 10/10 |
| 31 | Compact event row | `EventCardRow`, `/schedule` pattern | Status text, stacked mobile row | `components/ui/primitives.test.tsx` | 10/10 |
| 32 | Week strip navigator | `WeekStrip` | `role=tablist`, `aria-selected` | `components/ui/primitives.test.tsx` | 10/10 |
| 33 | Month mini-calendar | `MonthMiniCalendar` | Button dates and event labels | `components/ui/primitives.test.tsx` | 10/10 |
| 34 | Game Day Mode banner | `GameDayBanner` | Banner text and quick action link | `components/ui/primitives.test.tsx` | 10/10 |
| 35 | RSVP response picker | `RsvpPicker` | Fieldset, legend, `aria-pressed`, 44px | `components/ui/primitives.test.tsx` | 10/10 |
| 36 | Schedule conflict warning | `ConflictWarning` | `role=status`, text link to review | `components/ui/primitives.test.tsx` | 10/10 |
| 37 | Recurring event indicator | `RecurringIndicator` | Native disclosure and text propagation choices | `components/ui/primitives.test.tsx` | 10/10 |
| 38 | Countdown chip | `CountdownChip` | `aria-live=polite`, stable chip size | `components/ui/primitives.test.tsx` | 10/10 |
| 39 | Chat message bubble | `/team-chat`, `MessageBubble` | Author label, timestamp, mobile one-column | `components/feature-panels.test.tsx` | 10/10 |
| 40 | Unread message badge | `UnreadBadge`, shell nav | `aria-label`, max display, mobile tab support | `components/ui/primitives.test.tsx` | 10/10 |
| 41 | Message input toolbar | `/team-chat` composer | Label, disabled state, sticky mobile placement | `components/feature-panels.test.tsx` | 10/10 |
| 42 | Typing indicator | `TypingIndicator`, `/team-chat` | Screen-reader text plus dots | `components/feature-panels.test.tsx` | 10/10 |
| 43 | Moderation action menu | Chat hide/delete controls, `ModerationActionMenu` | Tooltips, button labels, role-gated disabled state | `components/feature-panels.test.tsx` | 10/10 |
| 44 | Pinned messages bar | `PinnedMessagesBar`, `/team-chat` | Native disclosure, pinned preview text | `components/feature-panels.test.tsx` | 10/10 |
| 45 | Read receipt indicator | `ReadReceipt`, `/team-chat` | Text count, no color-only status | `components/feature-panels.test.tsx` | 10/10 |
| 46 | Coach broadcast mode | `BroadcastMode`, `/team-chat` | `Read-only` status, switch target | `components/feature-panels.test.tsx` | 10/10 |
| 47 | Floating label input | `FloatingLabelInput` | Real label, focus movement, mobile fit | `components/ui/primitives.test.tsx` | 10/10 |
| 48 | Password show hide | `PasswordField` | Button label, autocomplete preserved | `components/ui/primitives.test.tsx` | 10/10 |
| 49 | Multi-step wizard | `WizardSteps` | Current step semantics, stacked mobile | `components/ui/primitives.test.tsx` | 10/10 |
| 50 | Inline validation | `InlineValidation` | `role=alert`, `aria-describedby` | `components/ui/primitives.test.tsx` | 10/10 |
| 51 | File drop zone | `FileDropZone` | Label-backed input, accepted file types | `components/ui/primitives.test.tsx` | 10/10 |
| 52 | Phone input | `PhoneInput` | Fieldset, legend, tel input | `components/ui/primitives.test.tsx` | 10/10 |
| 53 | Date range picker | `DateRangeFields` | Native date fields and duration hint | `components/ui/primitives.test.tsx` | 10/10 |
| 54 | Character count textarea | `CharacterCountTextarea` | Maxlength and count text | `components/ui/primitives.test.tsx` | 10/10 |
| 55 | Confirmation dialog pattern | `ConfirmDialogPreview` | Safe cancel and destructive action separation | `components/ui/primitives.test.tsx` | 10/10 |
| 56 | Gradient team card hero | `GradientTeamCard` | Scoped team colors, readable text | `components/ui/primitives.test.tsx` | 10/10 |
| 57 | Dark mode-aware tokens | Global CSS dark mode | Token fallback and contrast-safe surfaces | `app/routes-smoke.test.ts` | 10/10 |
| 58 | Semantic color legend | `SemanticLegend` | Dot plus text labels | `components/ui/primitives.test.tsx` | 10/10 |
| 59 | Sport-themed accent system | `teamBrandStyle`, chat and portal CSS vars | Scoped color variables, not color-only | `components/feature-panels.test.tsx` | 10/10 |
| 60 | Skill card mastery | `SkillCard` | Text and dot mastery label | `components/ui/primitives.test.tsx` | 10/10 |
| 61 | Photo memory card | `PhotoMemoryCard` | Ratio box, caption, toggle button | `components/ui/primitives.test.tsx` | 10/10 |
| 62 | Weather chip | `WeatherChip` | Text condition and badge variant | `components/ui/primitives.test.tsx` | 10/10 |
| 63 | Announcement banner | `AnnouncementBanner` | `role=banner` or `role=alert`, dismiss target | `components/ui/primitives.test.tsx` | 10/10 |
| 64 | Button loading state | `LoadingButton` | Disabled busy state and spinner | `components/ui/primitives.test.tsx` | 10/10 |
| 65 | Field focus glow | Global input CSS | Visible focus ring, no hidden outline | `app/routes-smoke.test.ts` | 10/10 |
| 66 | Optimistic RSVP toggle | `RsvpPicker` | Immediate selected state and error-ready styling | `components/ui/primitives.test.tsx` | 10/10 |
| 67 | Card hover lift | Global `.card.interactive` CSS | Reduced-motion fallback | `app/routes-smoke.test.ts` | 10/10 |
| 68 | Accordion expand | `ExpandableRow` and accordion CSS | `aria-expanded`, controlled panel | `components/ui/primitives.test.tsx` | 10/10 |
| 69 | Stable route transition | `AppShell` | Route content does not remount behind a full-page fade | `app/routes-smoke.test.ts` | 10/10 |
| 70 | Number counter animation | `NumberCounter` | Respects reduced motion | `components/ui/primitives.test.tsx` | 10/10 |
| 71 | Shake validation | Global invalid-field CSS and inline validation | Error text plus animation utility | `app/routes-smoke.test.ts` | 10/10 |
| 72 | Pull-to-refresh indicator | `PullRefreshIndicator` | Live text and mobile positioning | `components/ui/primitives.test.tsx` | 10/10 |
| 73 | Install prompt bottom sheet | `AppStateProvider`, global CSS | Mobile sheet, PWA usage events unchanged | `app/routes-smoke.test.ts` | 10/10 |
| 74 | Offline indicator banner | `AppShell` | Online/offline listeners and live status | `app/routes-smoke.test.ts` | 10/10 |
| 75 | Touch-friendly targets | Global button and mobile tab CSS | Minimum 44px targets | `app/routes-smoke.test.ts` | 10/10 |
| 76 | Swipe action row | `SwipeActionRow` | Fallback buttons for Complete and Delete | `components/ui/primitives.test.tsx` | 10/10 |
| 77 | App icon and splash config | `layout.tsx`, `manifest.webmanifest` | Existing 512px assets wired | `app/routes-smoke.test.ts` | 10/10 |
| 78 | Haptic feedback trigger | `triggerHapticFeedback` | Guarded `navigator.vibrate` utility | `components/ui/primitives.test.tsx` | 10/10 |
| 79 | Live region | `AppShell` `#live-region` | `aria-live=polite`, atomic updates | `app/routes-smoke.test.ts` | 10/10 |
| 80 | Modal focus management | Command palette dialog | Previous focus stored and restored | `app/routes-smoke.test.ts` | 10/10 |
| 81 | Color-not-alone enforcement | Badges, legends, notices, receipts | Text labels plus borders and dots | `components/ui/primitives.test.tsx` | 10/10 |
| 82 | Keyboard card grid | `KeyboardCardGrid` | Arrow, Home, End keys | `components/ui/primitives.test.tsx` | 10/10 |
| 83 | `aria-expanded` disclosures | Shell sidebar, `ExpandableRow` | Controls and expanded state connected | `app/routes-smoke.test.ts` | 10/10 |
| 84 | Form landmark structure | `RsvpPicker`, phone, date, validation | Fieldsets, legends, labels | `components/ui/primitives.test.tsx` | 10/10 |
| 85 | High-contrast mode | Forced-colors CSS | System color borders and focus | `app/routes-smoke.test.ts` | 10/10 |
| 86 | Two-panel split | `TwoPanelSplit` | Mobile stacking | `components/ui/primitives.test.tsx` | 10/10 |
| 87 | Masonry media grid | `MasonryMediaGrid` | CSS columns and mobile fallback | `components/ui/primitives.test.tsx` | 10/10 |
| 88 | Sidebar plus pinned info panel | `/team-chat` three-zone workspace | Left, center, right rails stack on mobile | `components/feature-panels.test.tsx` | 10/10 |
| 89 | Sticky section headers | `StickySectionList` | Sticky header with scroll container | `components/ui/primitives.test.tsx` | 10/10 |
| 90 | Dashboard widget grid | `WidgetGrid` | Auto-fit responsive cards | `components/ui/primitives.test.tsx` | 10/10 |
| 91 | Responsive print layout | Global `@media print` | Hides shell chrome, expands content | `app/routes-smoke.test.ts` | 10/10 |
| 92 | Non-blocking loading state | `SkeletonBlock`, `AppShell` | Loading patterns do not block the first hydrated route screen | `app/routes-smoke.test.ts` | 10/10 |
| 93 | Role-selection onboarding | `RoleSelectionCards` | Pressed state and large targets | `components/ui/primitives.test.tsx` | 10/10 |
| 94 | Registration status tracker | `RegistrationStatusTracker` | Text stepper states | `components/ui/primitives.test.tsx` | 10/10 |
| 95 | Invite recovery stepper | `InviteRecoveryStepper`, `/invite/recover` | Wizard steps and route evidence | `components/ui/primitives.test.tsx` | 10/10 |
| 96 | Session expiry warning | `AppShell` session warning | Live status and dismiss action | `app/routes-smoke.test.ts` | 10/10 |
| 97 | Privacy-first display | `PrivacyFirstDisplay`, `.sensitive` | Masked email and phone copy | `components/ui/primitives.test.tsx` | 10/10 |
| 98 | First-run coach checklist | `CoachChecklist` | Local checklist card with links-ready rows | `components/ui/primitives.test.tsx` | 10/10 |
| 99 | Permission boundary notice | `PermissionBoundaryNotice` | Literal `Read-only` and `Denied` statuses | `components/ui/primitives.test.tsx` | 10/10 |
| 100 | Audit trail display | `AuditTrailTable` | Captioned table and result text | `components/ui/primitives.test.tsx` | 10/10 |

## Verification

- Code contract: `components/ui/concept-scorecard.ts`.
- UI primitives: `components/ui/primitives.tsx`.
- Shell integration: `components/ui/AppShell.tsx` and `app/layout.tsx`.
- Showcase route: `/team-chat` in `components/feature-panels.tsx`.
- Global styling: `app/globals.css`.
