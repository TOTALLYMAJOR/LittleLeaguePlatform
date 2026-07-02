"use client";

import Link from "next/link";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode
} from "react";
import { getUiConceptScoreSummary, uiConceptScorecard } from "./concept-scorecard";

export const providerStatusCopy = [
  "Draft",
  "Queued",
  "Pending review",
  "Provider disconnected",
  "Seed fallback",
  "Live data",
  "Read-only",
  "Denied"
] as const;

type BadgeVariant = "success" | "warning" | "error" | "info" | "neutral";

const badgeClassByVariant: Record<BadgeVariant, string> = {
  success: "ok",
  warning: "warning",
  error: "danger",
  info: "info",
  neutral: "neutral"
};

export function StatusBadge({
  label,
  variant = "neutral",
  dot = false,
  pulse = false
}: {
  label: string;
  variant?: BadgeVariant;
  dot?: boolean;
  pulse?: boolean;
}) {
  return (
    <span className={`badge ${badgeClassByVariant[variant]}`}>
      {dot ? <span className={`badge-dot${pulse ? " pulse" : ""}`} aria-hidden="true" /> : null}
      {label}
    </span>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function avatarHue(name: string) {
  return (name.charCodeAt(0) * 41) % 360;
}

export function AvatarStack({ names, max = 4, label }: { names: string[]; max?: number; label?: string }) {
  const visible = names.slice(0, max);
  const hidden = Math.max(0, names.length - visible.length);
  return (
    <div className="avatar-stack" aria-label={label ?? `${names.length} participants, ${hidden} more not shown`}>
      {visible.map((name) => (
        <span
          className="avatar sm"
          key={name}
          title={name}
          style={{ background: `hsl(${avatarHue(name)} 74% 88%)` }}
        >
          {initials(name)}
        </span>
      ))}
      {hidden ? <span className="avatar-stack-overflow">+{hidden}</span> : null}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <section className="empty-state" aria-label={title}>
      <div className="empty-state-icon" aria-hidden="true">LL</div>
      <div className="empty-state-title">{title}</div>
      <p className="empty-state-body">{body}</p>
      {action}
    </section>
  );
}

export function ProgressRing({ percent, label, size = 48 }: { percent: number; label: string; size?: number }) {
  const normalized = Math.max(0, Math.min(100, percent));
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (normalized / 100) * circumference;
  return (
    <span className="progress-ring" style={{ "--ring-size": `${size}px` } as CSSProperties} aria-label={`${label}: ${normalized}%`}>
      <svg viewBox="0 0 44 44" aria-hidden="true">
        <circle className="progress-ring-track" cx="22" cy="22" r={radius} />
        <circle
          className="progress-ring-value"
          cx="22"
          cy="22"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span>{label}</span>
    </span>
  );
}

export function SkeletonBlock({ variant = "text", lines = 3 }: { variant?: "text" | "card" | "avatar" | "table-row"; lines?: number }) {
  if (variant === "avatar") return <span className="skeleton skeleton-avatar" aria-busy="true" aria-label="Loading" />;
  if (variant === "card") return <div className="skeleton skeleton-card" aria-busy="true" aria-label="Loading" />;
  if (variant === "table-row") {
    return (
      <div className="skeleton-table-row" aria-busy="true" aria-label="Loading row">
        <span className="skeleton skeleton-text" />
        <span className="skeleton skeleton-text" />
        <span className="skeleton skeleton-text" />
      </div>
    );
  }
  return (
    <div aria-busy="true" aria-label="Loading">
      {Array.from({ length: lines }, (_, index) => (
        <span key={index} className={`skeleton skeleton-text ${index === lines - 1 ? "w-1-2" : "w-3-4"}`} />
      ))}
    </div>
  );
}

export function ToastQueue() {
  return (
    <div className="toast-region" role="status" aria-live="polite" aria-label="Notifications">
      <article className="toast info">
        <span className="toast-icon" aria-hidden="true">i</span>
        <div className="toast-body">
          <div className="toast-title">Queued</div>
          <div className="toast-msg">Provider delivery remains approval-gated.</div>
        </div>
      </article>
    </div>
  );
}

export function Tooltip({ tip, children }: { tip: string; children: ReactNode }) {
  const id = useId();
  return (
    <span className="tooltip-wrap" data-tip={tip}>
      <span aria-describedby={id}>{children}</span>
      <span id={id} role="tooltip" className="sr-only">{tip}</span>
    </span>
  );
}

export function Toggle({
  checked,
  label,
  onChange
}: {
  checked: boolean;
  label: string;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <button type="button" className="toggle-control" role="switch" aria-checked={checked} onClick={() => onChange?.(!checked)}>
      <span className="toggle" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}

export function Chip({ label, onDismiss }: { label: string; onDismiss?: () => void }) {
  return (
    <span className="chip">
      {label}
      {onDismiss ? (
        <button type="button" className="chip-dismiss" aria-label={`Remove ${label}`} onClick={onDismiss}>
          x
        </button>
      ) : null}
    </span>
  );
}

export function Divider({ label }: { label?: string }) {
  return label ? (
    <div className="divider labeled" role="separator">
      <span>{label}</span>
    </div>
  ) : <hr className="divider" />;
}

export function BreadcrumbTrail({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="breadcrumb">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} aria-current={index === items.length - 1 ? "page" : undefined}>
            {item.href && index !== items.length - 1 ? <Link href={item.href}>{item.label}</Link> : item.label}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div className="page-header-left">
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h1>{title}</h1>
        {subtitle ? <p className="lead">{subtitle}</p> : null}
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </header>
  );
}

export function ScrollSpyDots({ sections, activeId }: { sections: Array<{ id: string; label: string }>; activeId?: string }) {
  return (
    <nav className="scroll-spy" aria-label="Page sections">
      {sections.map((section) => (
        <a key={section.id} href={`#${section.id}`} aria-label={section.label} data-active={section.id === activeId ? "true" : undefined} />
      ))}
    </nav>
  );
}

export function ResponsiveTable({
  caption,
  headers,
  rows
}: {
  caption: string;
  headers: string[];
  rows: Array<Array<ReactNode>>;
}) {
  return (
    <div className="table-wrap table-freeze-col">
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            {headers.map((header) => <th key={header} scope="col">{header}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => cellIndex === 0
                ? <th key={cellIndex} scope="row">{cell}</th>
                : <td key={cellIndex}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SortableHeader({ label, sort = "none" }: { label: string; sort?: "ascending" | "descending" | "none" }) {
  return (
    <button type="button" className="th-sort" aria-sort={sort}>
      {label}
      <span aria-hidden="true">{sort === "descending" ? "v" : "^"}</span>
    </button>
  );
}

export function SelectionToolbar({ count }: { count: number }) {
  return (
    <div className="selection-toolbar" aria-live="polite" data-visible={count > 0 ? "true" : "false"}>
      <strong>{count} selected</strong>
      <button type="button" className="secondary">Review selected</button>
    </div>
  );
}

export function InlineStatusEditor({ label = "Pending review" }: { label?: string }) {
  return (
    <label className="inline-status-editor">
      Status
      <select defaultValue={label}>
        {providerStatusCopy.map((status) => <option key={status}>{status}</option>)}
      </select>
    </label>
  );
}

export function Pagination({ page = 2, pages = 8 }: { page?: number; pages?: number }) {
  return (
    <nav className="pagination" aria-label="Pagination">
      <button type="button" className="secondary">Previous</button>
      <span>Page {page} of {pages}</span>
      <button type="button" className="secondary">Next</button>
      <label>
        Page size
        <select defaultValue="25">
          <option>10</option>
          <option>25</option>
          <option>50</option>
        </select>
      </label>
    </nav>
  );
}

export function ExpandableRow({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <section className="accordion">
      <button type="button" className="accordion-trigger" aria-expanded={open} aria-controls={id} onClick={() => setOpen((value) => !value)}>
        <span>{title}</span>
        <span className="accordion-chevron" aria-hidden="true">›</span>
      </button>
      <div className="accordion-body" id={id}>
        <div className="accordion-content">{children}</div>
      </div>
    </section>
  );
}

export function DataGrid({ items }: { items: Array<{ label: string; value: string; delta: string; trend: "up" | "down" }> }) {
  return (
    <div className="data-grid" aria-label="Stats scorecard">
      {items.map((item) => (
        <article className="card flat metric" key={item.label}>
          <span className="metric-label">{item.label}</span>
          <strong>{item.value}</strong>
          <span className={`metric-delta ${item.trend}`}>{item.delta}</span>
        </article>
      ))}
    </div>
  );
}

export function CsvDiffView() {
  return (
    <div className="csv-diff" aria-label="CSV import review">
      <div className="csv-diff-row danger"><strong>Error</strong><span>Missing guardian email</span></div>
      <div className="csv-diff-row warning"><strong>Warning</strong><span>Duplicate jersey number</span></div>
      <div className="csv-diff-row ok"><strong>Success</strong><span>Roster row ready</span></div>
    </div>
  );
}

export function FilterableList({ items }: { items: string[] }) {
  const [query, setQuery] = useState("");
  const filtered = items.filter((item) => item.toLowerCase().includes(query.toLowerCase()));
  return (
    <section className="filterable-list">
      <label>
        Search
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} aria-describedby="filter-count" />
      </label>
      <p id="filter-count" aria-live="polite">{filtered.length} results found</p>
      {filtered.length ? (
        <ul className="list compact">{filtered.map((item) => <li key={item}>{item}</li>)}</ul>
      ) : <EmptyState title="No results" body="Adjust the filter to see matching league records." />}
    </section>
  );
}

export function Timeline({ entries }: { entries: Array<{ type: "ok" | "warning" | "danger"; time: string; title: string; detail: string }> }) {
  return (
    <div className="timeline">
      {entries.map((entry) => (
        <article className="timeline-item" key={`${entry.time}-${entry.title}`}>
          <span className={`timeline-dot ${entry.type}`} aria-hidden="true" />
          <time className="timeline-time" dateTime={entry.time}>{entry.time}</time>
          <strong>{entry.title}</strong>
          <p className="muted">{entry.detail}</p>
        </article>
      ))}
    </div>
  );
}

export function EventCardRow({ title, date, location, weather }: { title: string; date: string; location: string; weather: string }) {
  return (
    <article className="event-row">
      <div className="event-date-block"><span className="month">JUL</span><span className="day">12</span></div>
      <div>
        <strong className="event-title">{title}</strong>
        <p className="event-meta">{date} at {location}</p>
        <WeatherChip label={weather} variant="info" />
      </div>
    </article>
  );
}

export function WeekStrip({ days, activeDay }: { days: string[]; activeDay: string }) {
  return (
    <div className="week-strip" role="tablist" aria-label="Week">
      {days.map((day) => (
        <button key={day} type="button" className="week-day" role="tab" aria-selected={day === activeDay}>
          <span>{day.slice(0, 3)}</span>
          <span className="week-day-num">{day.slice(-2)}</span>
        </button>
      ))}
    </div>
  );
}

export function MonthMiniCalendar() {
  return (
    <div className="month-mini-calendar" aria-label="July mini calendar">
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <strong key={day}>{day}</strong>)}
      {Array.from({ length: 35 }, (_, index) => (
        <button key={index} type="button" aria-label={`July ${index + 1}`}>
          {index + 1}
          {index % 6 === 0 ? <span className="event-dot" aria-label="Event scheduled" /> : null}
        </button>
      ))}
    </div>
  );
}

export function GameDayBanner() {
  return (
    <section className="game-day-banner" aria-label="Game Day Mode">
      <strong>Game Day</strong>
      <span>Riverside Park, 4:00 PM</span>
      <a href="/schedule">View lineup</a>
    </section>
  );
}

export function RsvpPicker({ value = "Going" }: { value?: "Going" | "Maybe" | "Cannot make it" }) {
  return (
    <fieldset className="rsvp-picker">
      <legend>RSVP response</legend>
      {(["Going", "Maybe", "Cannot make it"] as const).map((option) => (
        <button key={option} type="button" className="rsvp-btn" aria-pressed={option === value}>
          {option}
        </button>
      ))}
    </fieldset>
  );
}

export function ConflictWarning() {
  return (
    <aside className="conflict-warning" role="status">
      <strong>Schedule conflict</strong>
      <span>Overlaps with Tigers practice at 3:30 PM.</span>
      <a href="/schedule">Review conflict</a>
    </aside>
  );
}

export function RecurringIndicator() {
  return (
    <details className="recurring-indicator">
      <summary>Weekly recurring event</summary>
      <p>This event, this and future events, or all events can be updated.</p>
    </details>
  );
}

export function CountdownChip({ label = "Next game in 2d 4h 18m" }: { label?: string }) {
  return <span className="countdown-chip" aria-live="polite">{label}</span>;
}

export function UnreadBadge({ count }: { count: number }) {
  if (!count) return null;
  const label = count > 99 ? "99+" : String(count);
  return <span className="unread-badge" aria-label={`${label} unread messages`}>{label}</span>;
}

export function ReadReceipt({ read, total }: { read: number; total: number }) {
  return <span className="read-receipt" aria-label={`Read by ${read} of ${total} members`}>Read by {read} of {total}</span>;
}

export function TypingIndicator({ label = "Coach is typing" }: { label?: string }) {
  return (
    <div className="typing-indicator" aria-label={label}>
      <span className="typing-dot" aria-hidden="true" />
      <span className="typing-dot" aria-hidden="true" />
      <span className="typing-dot" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function MessageBubble({
  author,
  role,
  body,
  time,
  outbound = false,
  readBy,
  totalReaders
}: {
  author: string;
  role: string;
  body: string;
  time: string;
  outbound?: boolean;
  readBy?: number;
  totalReaders?: number;
}) {
  return (
    <article className={`chat-message-row ${outbound ? "outbound" : "inbound"}`} aria-label={`Message from ${author}`}>
      <div className="avatar sm" aria-hidden="true">{initials(author)}</div>
      <div className={`chat-bubble ${outbound ? "out" : "in"}`}>
        <div className="chat-bubble-meta">
          <strong>{author}</strong>
          <span>{role}</span>
        </div>
        <p>{body}</p>
        <time>{time}</time>
        {typeof readBy === "number" && typeof totalReaders === "number" ? <ReadReceipt read={readBy} total={totalReaders} /> : null}
      </div>
    </article>
  );
}

export function ModerationActionMenu({ canModerate = false }: { canModerate?: boolean }) {
  return (
    <menu className="moderation-menu" role="menu" aria-label="Moderation actions">
      <button type="button" role="menuitem" disabled={!canModerate}>Pin</button>
      <button type="button" role="menuitem" disabled={!canModerate}>Flag</button>
      <button type="button" role="menuitem" disabled={!canModerate}>Delete</button>
    </menu>
  );
}

export function PinnedMessagesBar({ count = 2, children }: { count?: number; children?: ReactNode }) {
  return (
    <details className="pinned-messages-bar" open>
      <summary>{count} pinned messages</summary>
      <div>{children ?? <p>Coach Note previews stay above the active thread.</p>}</div>
    </details>
  );
}

export function BroadcastMode({ enabled }: { enabled: boolean }) {
  return (
    <aside className="broadcast-mode" role="status">
      <StatusBadge label={enabled ? "Read-only" : "Live data"} variant={enabled ? "warning" : "success"} />
      <span>{enabled ? "Coach Broadcast Mode is on. Families can read updates but cannot post." : "Team Chat is open for assigned families and staff."}</span>
    </aside>
  );
}

export function MessageInputToolbar({ disabled = false }: { disabled?: boolean }) {
  return (
    <div className="message-input-toolbar">
      <label>
        Message
        <textarea disabled={disabled} placeholder="Ask a team question or share a parent update." />
      </label>
      <button type="button" disabled={disabled}>Send</button>
    </div>
  );
}

export function FloatingLabelInput({ label, id, type = "text" }: { label: string; id: string; type?: string }) {
  return (
    <div className="floating-field">
      <input id={id} type={type} placeholder=" " />
      <label htmlFor={id}>{label}</label>
    </div>
  );
}

export function PasswordField({ id = "password" }: { id?: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-field">
      <label htmlFor={id}>Password</label>
      <div>
        <input id={id} type={visible ? "text" : "password"} autoComplete="current-password" />
        <button type="button" className="secondary" aria-label={visible ? "Hide password" : "Show password"} onClick={() => setVisible((value) => !value)}>
          {visible ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}

export function WizardSteps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="wizard-steps" aria-label={`Step ${current + 1} of ${steps.length}`}>
      {steps.map((step, index) => (
        <li key={step} className={`wizard-step${index < current ? " done" : ""}${index === current ? " active" : ""}`}>
          <span className="wizard-step-num">{index + 1}</span>
          <span>{step}</span>
          {index < steps.length - 1 ? <span className={`wizard-connector${index < current ? " done" : ""}`} aria-hidden="true" /> : null}
        </li>
      ))}
    </ol>
  );
}

export function InlineValidation({ id = "league-name", error = "League name is required." }: { id?: string; error?: string }) {
  return (
    <label>
      League name
      <input id={id} aria-invalid="true" aria-describedby={`${id}-error`} />
      <span className="field-error" id={`${id}-error`} role="alert">{error}</span>
    </label>
  );
}

export function FileDropZone() {
  return (
    <label className="drop-zone">
      Upload CSV, PDF, JPG, or PNG
      <input className="sr-only" type="file" accept=".csv,.pdf,.jpg,.png" />
    </label>
  );
}

export function PhoneInput() {
  return (
    <fieldset className="phone-input">
      <legend>Phone number</legend>
      <label>
        Country code
        <select defaultValue="+1"><option>+1</option><option>+44</option></select>
      </label>
      <label>
        Number
        <input type="tel" inputMode="tel" placeholder="(555) 123-4567" />
      </label>
    </fieldset>
  );
}

export function DateRangeFields() {
  return (
    <fieldset className="date-range-fields">
      <legend>Date range</legend>
      <label>Start<input type="date" /></label>
      <label>End<input type="date" /></label>
      <p className="field-hint">7 days selected</p>
    </fieldset>
  );
}

export function CharacterCountTextarea({ max = 280 }: { max?: number }) {
  const [value, setValue] = useState("");
  const limit = value.length >= max;
  const warn = value.length >= max * 0.8;
  return (
    <label>
      Announcement
      <textarea maxLength={max} value={value} onChange={(event) => setValue(event.target.value)} />
      <span className="char-count" data-warn={warn || undefined} data-limit={limit || undefined}>{value.length} / {max} characters</span>
    </label>
  );
}

export function ConfirmDialogPreview() {
  return (
    <section className="dialog-preview" aria-labelledby="confirm-dialog-preview">
      <h3 id="confirm-dialog-preview">Confirm destructive action</h3>
      <p>Cancel is the safe default. Delete requires an explicit destructive button.</p>
      <div className="dialog-footer">
        <button type="button" className="secondary">Cancel</button>
        <button type="button" className="danger">Delete</button>
      </div>
    </section>
  );
}

export function GradientTeamCard({ team = "Tiny Tigers" }: { team?: string }) {
  return (
    <article className="hero-team-card card">
      <div className="hero-team-main">
        <div>
          <span className="eyebrow">Team home</span>
          <h3>{team}</h3>
          <p className="muted">Family schedules, RSVPs, chat, and Parent Replay in one place.</p>
        </div>
        <div className="big-team-logo" aria-hidden="true">TT</div>
      </div>
    </article>
  );
}

export function SemanticLegend({ items }: { items: Array<{ label: string; tone: "ok" | "warning" | "danger" | "muted" }> }) {
  return (
    <dl className="semantic-legend">
      {items.map((item) => (
        <div key={item.label}>
          <dt><span className={`status-dot ${item.tone}`} aria-hidden="true" />{item.label}</dt>
          <dd>{item.tone}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SkillCard({ title, level }: { title: string; level: number }) {
  return (
    <article className="skill-card">
      <span className="skill-icon" aria-hidden="true">SK</span>
      <div>
        <div className="skill-name">{title}</div>
        <div className="mastery-dots" aria-label={`${level} of 5 mastery`}>
          {Array.from({ length: 5 }, (_, index) => <span key={index} className={`mastery-dot${index < level ? " filled" : ""}`} />)}
        </div>
      </div>
    </article>
  );
}

export function PhotoMemoryCard({ caption }: { caption: string }) {
  return (
    <article className="photo-memory-card">
      <div className="photo-memory-image" role="img" aria-label={caption} />
      <button type="button" className="secondary" aria-pressed="false">Save</button>
      <p>{caption}</p>
    </article>
  );
}

export function WeatherChip({ label, variant = "info" }: { label: string; variant?: BadgeVariant }) {
  return <StatusBadge label={label} variant={variant} />;
}

export function AnnouncementBanner({ urgency = "info" }: { urgency?: "info" | "urgent" }) {
  return (
    <section className={`announcement-banner ${urgency === "urgent" ? "warning" : ""}`} role={urgency === "urgent" ? "alert" : "banner"}>
      <strong>{urgency === "urgent" ? "Schedule change" : "Announcement"}</strong>
      <span>Provider sending remains Pending review until approved.</span>
      <button type="button" className="secondary">Dismiss</button>
    </section>
  );
}

export function LoadingButton({ loading }: { loading: boolean }) {
  return (
    <button type="button" className="loading-button" disabled={loading}>
      {loading ? <span className="btn-spinner" aria-hidden="true" /> : null}
      {loading ? "Saving" : "Save"}
    </button>
  );
}

export function NumberCounter({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setDisplay(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min(1, (now - start) / 500);
      const eased = 1 - Math.pow(1 - progress, 4);
      setDisplay(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <span className="number-counter">{display}</span>;
}

export function PullRefreshIndicator() {
  return <div className="pull-refresh-indicator" aria-live="polite">Release to refresh</div>;
}

export function SwipeActionRow({ children }: { children: ReactNode }) {
  return (
    <div className="swipe-action-row">
      <button type="button" className="ok">Complete</button>
      <div>{children}</div>
      <button type="button" className="danger">Delete</button>
    </div>
  );
}

export function triggerHapticFeedback() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(10);
}

export function KeyboardCardGrid({ items }: { items: Array<{ title: string; href: string }> }) {
  const listRef = useRef<HTMLUListElement>(null);
  function onKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    const links = Array.from(listRef.current?.querySelectorAll<HTMLAnchorElement>("a") ?? []);
    const currentIndex = links.findIndex((link) => link === document.activeElement);
    if (!links.length) return;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      links[Math.min(links.length - 1, currentIndex + 1)]?.focus();
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      links[Math.max(0, currentIndex - 1)]?.focus();
    }
    if (event.key === "Home") {
      event.preventDefault();
      links[0]?.focus();
    }
    if (event.key === "End") {
      event.preventDefault();
      links[links.length - 1]?.focus();
    }
  }
  return (
    <ul className="keyboard-card-grid" role="list" ref={listRef} onKeyDown={onKeyDown}>
      {items.map((item) => (
        <li key={item.href}><Link className="card interactive" href={item.href}>{item.title}</Link></li>
      ))}
    </ul>
  );
}

export function TwoPanelSplit({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <section className="two-panel-split">
      <aside>{left}</aside>
      <div>{right}</div>
    </section>
  );
}

export function MasonryMediaGrid({ children }: { children: ReactNode }) {
  return <div className="masonry media-masonry">{children}</div>;
}

export function SidebarInfoLayout({ left, main, right }: { left: ReactNode; main: ReactNode; right: ReactNode }) {
  return (
    <section className="sidebar-info-layout">
      <aside>{left}</aside>
      <div>{main}</div>
      <aside>{right}</aside>
    </section>
  );
}

export function StickySectionList({ groups }: { groups: Array<{ title: string; items: string[] }> }) {
  return (
    <div className="sticky-section-list">
      {groups.map((group) => (
        <section key={group.title}>
          <h3>{group.title}</h3>
          <ul>{group.items.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
      ))}
    </div>
  );
}

export function WidgetGrid({ children }: { children: ReactNode }) {
  return <section className="widget-grid">{children}</section>;
}

export function RoleSelectionCards() {
  return (
    <section className="role-selection-cards" aria-label="Who are you">
      {["Parent", "Coach", "Admin"].map((role) => (
        <button key={role} type="button" aria-pressed="false">
          <strong>{role}</strong>
          <span>Open the {role.toLowerCase()} dashboard.</span>
        </button>
      ))}
    </section>
  );
}

export function RegistrationStatusTracker({ current = 1 }: { current?: number }) {
  const steps = ["Submitted", "Under Review", "Approved", "Activated"];
  return (
    <ol className="registration-status-tracker" aria-label="Registration status">
      {steps.map((step, index) => (
        <li key={step} data-state={index < current ? "complete" : index === current ? "current" : "pending"}>
          <span>{index + 1}</span>
          <strong>{step}</strong>
        </li>
      ))}
    </ol>
  );
}

export function InviteRecoveryStepper() {
  return <WizardSteps current={1} steps={["Email", "Token preview", "Confirm"]} />;
}

export function PrivacyFirstDisplay({ email = "jordan.parent@example.com", phone = "5551234321" }: { email?: string; phone?: string }) {
  const [name, domain] = email.split("@");
  return (
    <dl className="privacy-display">
      <div><dt>Email</dt><dd className="sensitive">{name?.[0] ?? "x"}....@{domain}</dd></div>
      <div><dt>Phone</dt><dd className="sensitive">... ... {phone.slice(-4)}</dd></div>
    </dl>
  );
}

export function CoachChecklist() {
  return (
    <section className="coach-checklist card">
      <h3>First-run coach checklist</h3>
      <ul className="list compact">
        <li>Set up your team</li>
        <li>Add players</li>
        <li>Set your first practice</li>
      </ul>
    </section>
  );
}

export function PermissionBoundaryNotice({ status = "Read-only" }: { status?: "Read-only" | "Denied" }) {
  return (
    <section className={`notice ${status === "Denied" ? "danger" : "warning"}`}>
      <StatusBadge label={status} variant={status === "Denied" ? "error" : "warning"} />
      <p>This area is limited by role. Use your assigned dashboard for active records.</p>
    </section>
  );
}

export function AuditTrailTable() {
  return (
    <ResponsiveTable
      caption="Security audit log, last 90 days"
      headers={["Timestamp", "Actor", "Action", "Entity", "Result"]}
      rows={[
        ["Jun 30", "admin@example.com", "team_membership_saved", "Tiny Tigers", "Success"],
        ["Jun 29", "coach@example.com", "cross_team_read_blocked", "Team Chat", "Denied"]
      ]}
    />
  );
}

export function UiConceptProofHarness() {
  const summary = useMemo(() => getUiConceptScoreSummary(uiConceptScorecard), []);
  return (
    <section className="ui-proof-harness" aria-label="100 UI UX concepts proof">
      <PageHeader
        eyebrow="UI scorecard"
        title={`${summary.complete} of ${summary.total} concepts scored 10/10`}
        subtitle="Reusable global patterns are styled, responsive, accessible, and route-ready."
      />
      <div className="cluster">
        <StatusBadge label="Live data" variant="success" dot />
        <StatusBadge label="Provider disconnected" variant="error" />
        <Chip label="Team Chat" />
        <CountdownChip />
      </div>
      <GradientTeamCard />
      <SidebarInfoLayout
        left={<AvatarStack names={["Coach Taylor", "Jordan Lee", "Riley Chen", "Sam Patel", "Avery Stone"]} />}
        main={<MessageBubble author="Coach Taylor" role="Coach" body="Arrival is 3:30 PM at Field 2." time="3:04 PM" readBy={8} totalReaders={10} />}
        right={<PermissionBoundaryNotice />}
      />
      <WidgetGrid>
        <DataGrid items={[{ label: "RSVPs", value: "47", delta: "+12%", trend: "up" }]} />
        <RegistrationStatusTracker />
        <AuditTrailTable />
      </WidgetGrid>
    </section>
  );
}
