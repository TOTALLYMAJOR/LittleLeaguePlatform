# Aura.Build Gemini 3 Pro UI Design Prompt

You are Gemini 3 Pro acting as a senior product UI/UX designer inside Aura.Build. Redesign the global styling and UI/UX system for this existing Next.js app: **Little League HQ**, a private youth sports operations platform for league admins, coaches, and parents.

This is an application redesign, not a marketing landing page. Build the first screen and all route surfaces as usable software for repeated operational work.

## Product Context

Little League HQ helps youth sports organizations manage private team operations:

- Parent dashboard: child/team summary, upcoming schedule, coach updates, RSVP needs, recent media, notification preferences.
- Parent RSVP: one-tap Going / Maybe / Not Going for linked children only.
- Coach dashboard: assigned-team attendance, RSVP reliability, weekly update draft, weather drafts, snacks, volunteers, Parent Replay entry point.
- Parent Replay: signature coaching loop where coaches choose 2-3 practice focus areas and generate parent-ready home activities, coach translations, skill cards, memory moments, and team quests.
- Team Portal: team-specific hub for schedule, Game Day Calm Mode, roster family view, field maps, Parent Replay, videos, parent education, skill cards, season memories, volunteer center, and team branding.
- Team Chat: private branded team communication for assigned parents, coaches, and org admins. Children do not have chat accounts.
- Admin dashboard: league operations across teams, registrations, sponsors, communication queue, roster maker, lineup builder, readiness, imports, invites, and notification architecture.
- Admin Theme Console: first-class team branding management with mascot, sport preset, colors, contrast, mobile/dark previews, and audit evidence.
- Registration and review: parent self-registration creates pending review only; admin approval is required before access.
- Schedule alerts: edit event details and preview affected families, RSVP state, alert channels, and draft notification records.

The app currently uses a simple global CSS system with:

- Fixed left sidebar on desktop, horizontal nav on mobile.
- CSS variables for background, surface, text, muted text, line, accent, danger, warning, ok, shadow.
- Shared classes: `shell`, `sidebar`, `brand`, `nav`, `main`, `page`, `hero`, `eyebrow`, `lead`, `grid two/three`, `card`, `card-header`, `stack`, `toolbar`, `badge`, `notice`, `metric`, `table-wrap`, `list`.
- Specialized route classes for Team Portal, Team Chat, Parent Replay, theme rows, communication previews, lineup builder, and mobile previews.

## Non-Negotiable Product Boundaries

Preserve these boundaries in the UI. They must remain visible and understandable:

- Children do not log in.
- Parent/guardian accounts manage child access.
- Player display names use first name plus last initial.
- Team spaces are private.
- Parents only see linked child/team records.
- Coaches only manage assigned teams.
- Admins are organization-scoped.
- Registration submission does not grant access.
- Email, SMS, push, weather, AI, video, maps, and media providers are not automatically sending or publishing unless explicitly wired later.
- Schedule alerts, weekly updates, Parent Replay, weather alerts, and communications should read as drafts/queues/previews when appropriate.
- Human approval gates matter. Do not visually imply an agent or automation has final authority.
- Auditability matters. Admin actions should show status, actor, timestamp, before/after summary where relevant.
- Privacy and safety notices should be calm, compact, and visible, not buried.

## Design Direction

Create a polished, modern, trustworthy, mobile-first operations UI for youth sports. It should feel warm enough for parents and coaches, but still disciplined enough for admins managing sensitive child and family data.

Avoid:

- Generic SaaS dashboard sameness.
- Oversized marketing hero sections.
- Cartoon-heavy sports styling.
- Decorative gradient blobs/orbs.
- One-note color palettes.
- Visual clutter that makes safety states hard to scan.
- Cards inside cards.
- UI text explaining obvious controls or design features.
- Hiding important privacy/provider boundaries in small gray footnotes.

Aim for:

- Calm operational clarity.
- Strong hierarchy for “what needs attention next.”
- Compact but readable dashboard density.
- Role-aware navigation.
- Family-friendly warmth through controlled accents, team colors, sport cues, and generous spacing.
- Crisp status treatment for live, draft, pending, warning, denied, approved, provider disconnected, and audit logged.
- Consistent light and dark mode.
- Excellent mobile ergonomics for parents on game day.

## Global UX Architecture

Design a shared app shell that scales across admin, coach, parent, and team surfaces.

Required shell behavior:

- Desktop: stable navigation with clear role grouping, not a long undifferentiated link list.
- Mobile: thumb-friendly top/bottom navigation or compact drawer pattern; key parent/coach actions must be reachable without horizontal link hunting.
- Active route state, role labels, and team context should be obvious.
- The app brand should be “Little League HQ” unless you propose a better neutral placeholder, but do not rebrand the product away from private youth sports operations.
- Include a compact global status area for environment/source state such as seed fallback, Supabase live, provider disconnected, draft only, or access gated.

Suggested nav groups:

- Home / Overview.
- Parent: Parent Home, RSVP.
- Coach: Coach Home, Coach RSVPs, Parent Replay.
- Team: Team Portal, Team Chat, Schedule.
- Admin: Admin Dashboard, Theme Console, Registration Review, Memberships, Health, Imports, Invites.
- Account: Auth, Account, Recover Invite.

## Visual System Requirements

Produce an implementation-ready global style system:

- Color tokens for app neutrals, surfaces, borders, text, muted text, success, warning, danger, info, focus, and team accent layers.
- Light and dark mode variables.
- Team brand variables that can safely tint Team Portal and Team Chat without destroying contrast.
- Typography scale for app headings, section headings, dense cards, tables, forms, and badges. Do not use viewport-width font scaling.
- Spacing scale and layout rhythm.
- Border radius: keep cards and controls at 8px radius or less unless a very specific component needs a pill shape, such as badges/chips.
- Shadows should be subtle and functional, not decorative.
- Focus states must be visible.
- Touch targets should be at least 44px on mobile.
- Text must never overflow buttons, badges, cards, nav items, or table cells.
- Use stable dimensions for metric cards, toolbars, previews, roster rows, chat messages, RSVP controls, and team swatches.

## Component System To Design

Design reusable components or CSS patterns for:

- App shell and grouped navigation.
- Page header with compact eyebrow, title, supporting copy, primary action, and status badge.
- Metric cards.
- Status badges: live, seed fallback, draft, queued, pending, approved, warning, denied, provider disconnected, audit logged.
- Notice banners: info, safety, warning, success, access denied.
- Data tables and responsive table-to-card behavior.
- Forms: labels, helper text, selects, color inputs, textareas, disabled fields.
- Segmented controls and filter bars.
- Action toolbars.
- Empty states.
- Access gate panels.
- Audit event list.
- Timeline / season memory list.
- RSVP response controls.
- Team color swatches and contrast indicators.
- Game Day Calm Mode summary card.
- Chat message, pinned coach note, compose box, moderation controls.
- Parent Replay activity card.
- Theme preview card for desktop, mobile, and dark mode.
- Admin communication queue preview.
- Roster maker / lineup builder controls.

## Route-Specific UX Requirements

### Home / Feature Hub

Turn the current feature grid into a role-aware product command center:

- Show the product boundary clearly: production scaffold, provider sends disconnected, private child/team data.
- Cluster routes by role and workflow.
- Highlight Parent Replay as the signature workflow without making the page a marketing hero.
- Use compact cards with clear next actions.

### Parent Dashboard

Optimize for “what does this parent need to know right now?”

- Top priority: next event, RSVP needed, coach update, linked child/team.
- Notification preferences should feel like a family safety/quiet-hours contract, not a settings dump.
- Recent media should make moderation/visibility state clear if present.
- Mobile should be extremely simple for a parent checking from a field parking lot.

### Parent RSVP

Make RSVP fast, obvious, and confidence-building:

- Large response controls with current response state.
- Child initials/name and event context clear.
- Show access scope and save state.
- Avoid dense admin-style layout.

### Coach Dashboard

Make it a workbench:

- Attendance snapshot and no-response counts should be scannable.
- Weekly update draft should read as editable draft, not sent message.
- Weather/snack/volunteer actions need clear pending/provider boundaries.
- Parent Replay should be a prominent coach action.
- RSVP reliability must not feel like public shaming; treat it as private coach-only follow-up insight.

### Parent Replay

This is the signature product surface. Make it feel valuable and coach-approved:

- Left side / first section: choose team, preview as coach/admin, choose exactly 2-3 focus areas.
- Right side / next section: generated parent replay preview with 30-second, 2-minute, and 5-minute activity cards.
- Show coach-to-parent translations, team quest, skill cards, memory moment, and healthy aggregate streak.
- Make the “draft/approval/no provider send/no AI provider connected” boundary visible without making the experience feel broken.

### Team Portal

Make this the team’s home:

- Strong team identity through safe accent colors, mascot initial/mark, and sport preset.
- Prioritize Game Day Calm Mode, this week’s schedule, Parent Replay summary, roster family view, and field map.
- Use team brand color as accent, not full-page saturation.
- Preserve privacy signals around guardians, invites, memberships, media, and provider boundaries.
- Volunteer/snack/help-at-home sections should feel actionable but not crowded.

### Team Chat

Make it a private clubhouse, but mature and safe:

- Clear viewer/team selector for preview mode.
- Strong access-gated state when viewer lacks membership.
- Pinned coach note must stand apart from normal chat.
- Game-Day Questions section should be easy to find.
- Compose areas should clearly show who can post and what team sees the message.
- Moderation controls and audit log should be visible to coach/admin without dominating parent view.

### Admin Dashboard

Make it dense, operational, and audit-friendly:

- Metrics: teams, pending registrations, active sponsors, readiness concerns.
- Registration queue, team management, communication console, roster maker, lineup builder, season planning, sponsor records, notification records.
- Communication console must communicate “queue records only; provider delivery disconnected.”
- Roster and lineup tools should be structured, not whimsical.
- Use tables where comparison matters; cards where action/status matters.

### Admin Theme Console

This is a first-class design system management surface:

- All teams table with theme preset, mascot, primary/secondary swatches, contrast status, logo status placeholder, last updated audit event.
- Theme editor with sport preset, mascot, color controls, save state, actor/role scope.
- Desktop/mobile/dark preview cards.
- Contrast warning must be strong and actionable.
- Audit list should be compact and credible.

### Registration And Review

Keep access boundaries explicit:

- Parent registration form should state that submission creates a pending request only.
- Review surface should distinguish approve, reject, request more info.
- Avoid language that implies account or child access is granted before admin approval.

### Schedule Alerts

Make impact preview the center of the UX:

- Show changed field/time/status inputs.
- Highlight affected families, existing RSVPs, no-response players, notification channels, draft record count.
- Queue action must be visibly separate from provider send.

## Responsive Requirements

Design for these breakpoints:

- Mobile: 360px to 430px wide, parent-first and coach game-day use.
- Tablet: 768px to 1024px, coach/admin sideline use.
- Desktop: 1280px and up, admin operations.

Mobile requirements:

- No horizontal nav hunting for primary flows.
- Cards stack cleanly.
- Tables become cards or scroll only when necessary.
- Buttons wrap or resize without clipping.
- Chat and RSVP controls remain comfortable.
- Game Day Calm Mode should fit without burying the event essentials.

## Accessibility Requirements

- WCAG AA contrast for text and controls.
- Visible keyboard focus.
- Semantic headings and form labels.
- Status badges should not rely on color alone.
- Disabled controls need explanation where important.
- Do not use tiny text for safety-critical states.
- Preserve screen-reader-friendly labels for private access and provider boundaries.

## Implementation Constraints

Assume this codebase:

- Next.js app router.
- React.
- Plain CSS in `app/globals.css`.
- Shared UI lives heavily in `components/feature-panels.tsx`.
- Existing route files under `app/`.
- No external UI library is currently installed.

Prefer:

- A token-driven CSS redesign that can be applied globally.
- Minimal component API churn.
- Reusing existing class names where practical.
- Adding route-specific utility classes only where they clarify complex surfaces.

Do not:

- Add backend behavior.
- Add real provider sends.
- Add real AI provider calls.
- Remove privacy notices.
- Remove role/access gates.
- Turn the app into a public landing page.
- Hide seed/live/provider status.
- Replace real operational surfaces with mock marketing sections.

## Desired Output From Aura/Gemini

Return a complete design package with:

1. Design rationale in 5-8 bullets.
2. Global design tokens for light mode, dark mode, and team accent theming.
3. App shell/navigation redesign.
4. Reusable component specifications.
5. Route-by-route UX changes for the surfaces listed above.
6. Responsive behavior for mobile/tablet/desktop.
7. Accessibility checklist.
8. Implementation-ready CSS or CSS module guidance compatible with `app/globals.css`.
9. A short QA checklist for visual verification.

Final quality bar:

- A league admin can scan operational risk quickly.
- A coach can act before practice/game without confusion.
- A parent can RSVP and understand the next event in seconds.
- A child privacy reviewer can see that access, provider, and approval boundaries are preserved.
