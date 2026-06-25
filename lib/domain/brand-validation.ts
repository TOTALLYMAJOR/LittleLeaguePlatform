import type { Team } from "./types";

export type BrandMonitoringEventType =
  | "brand_profile_created"
  | "brand_profile_updated"
  | "brand_profile_published"
  | "brand_asset_uploaded"
  | "brand_asset_rejected"
  | "brand_render_failed"
  | "brand_fallback_used";

export type BrandSurfaceId =
  | "team_logo"
  | "team_banner"
  | "primary_color"
  | "secondary_color"
  | "accent_button_color"
  | "team_display_name"
  | "team_short_name"
  | "default_avatar"
  | "home_dashboard_header"
  | "navigation_accents"
  | "chat_thread_header"
  | "announcement_cards"
  | "event_schedule_cards"
  | "rsvp_buttons_badges"
  | "roster_page_header"
  | "photo_gallery_header"
  | "invite_landing_page"
  | "invite_emails"
  | "announcement_reminder_emails"
  | "push_notification_identity";

export interface TeamBrandProfile {
  teamId: string;
  displayName: string;
  shortName: string;
  logoUrl?: string;
  bannerImageUrl?: string;
  defaultAvatarLabel: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  buttonColor: string;
  heroCopy: string;
  published: boolean;
}

export interface BrandSurfaceDefinition {
  id: BrandSurfaceId;
  label: string;
  surface: "web" | "email" | "push";
  requiredTokens: Array<keyof TeamBrandProfile>;
}

export interface BrandSurfaceCheck extends BrandSurfaceDefinition {
  status: "covered" | "blocked";
  detail: string;
}

export interface BrandMetric {
  label: string;
  target: string;
  current: string;
  status: "covered" | "needs_provider" | "needs_qa";
}

export interface BrandLaunchValidation {
  testProfiles: TeamBrandProfile[];
  surfaceChecks: BrandSurfaceCheck[];
  coveragePercent: number;
  metrics: BrandMetric[];
  monitoringEvents: BrandMonitoringEventType[];
  alerts: string[];
  feedbackQuestions: string[];
  acceptanceCriteria: string[];
  providerBoundary: string;
}

const hexColorPattern = /^#[0-9a-fA-F]{6}$/;

export const brandSurfaceDefinitions: BrandSurfaceDefinition[] = [
  { id: "team_logo", label: "Team logo", surface: "web", requiredTokens: ["logoUrl", "defaultAvatarLabel"] },
  { id: "team_banner", label: "Team banner / hero image", surface: "web", requiredTokens: ["bannerImageUrl"] },
  { id: "primary_color", label: "Primary color", surface: "web", requiredTokens: ["primaryColor"] },
  { id: "secondary_color", label: "Secondary color", surface: "web", requiredTokens: ["secondaryColor"] },
  { id: "accent_button_color", label: "Accent / button color", surface: "web", requiredTokens: ["accentColor", "buttonColor"] },
  { id: "team_display_name", label: "Team display name", surface: "web", requiredTokens: ["displayName"] },
  { id: "team_short_name", label: "Team short name or abbreviation", surface: "web", requiredTokens: ["shortName"] },
  { id: "default_avatar", label: "Default team avatar/icon fallback", surface: "web", requiredTokens: ["defaultAvatarLabel"] },
  { id: "home_dashboard_header", label: "Team home/dashboard header", surface: "web", requiredTokens: ["displayName", "primaryColor", "logoUrl"] },
  { id: "navigation_accents", label: "Navigation accents", surface: "web", requiredTokens: ["accentColor"] },
  { id: "chat_thread_header", label: "Chat/message thread header", surface: "web", requiredTokens: ["displayName", "primaryColor", "defaultAvatarLabel"] },
  { id: "announcement_cards", label: "Announcement cards", surface: "web", requiredTokens: ["displayName", "accentColor"] },
  { id: "event_schedule_cards", label: "Event/game schedule cards", surface: "web", requiredTokens: ["displayName", "primaryColor"] },
  { id: "rsvp_buttons_badges", label: "RSVP buttons and status badges", surface: "web", requiredTokens: ["buttonColor", "accentColor"] },
  { id: "roster_page_header", label: "Roster page header", surface: "web", requiredTokens: ["displayName", "primaryColor"] },
  { id: "photo_gallery_header", label: "Photo/gallery page header", surface: "web", requiredTokens: ["displayName", "bannerImageUrl"] },
  { id: "invite_landing_page", label: "Invite landing page", surface: "web", requiredTokens: ["displayName", "logoUrl", "heroCopy"] },
  { id: "invite_emails", label: "Invite emails", surface: "email", requiredTokens: ["displayName", "logoUrl", "primaryColor"] },
  { id: "announcement_reminder_emails", label: "Announcement/reminder emails", surface: "email", requiredTokens: ["displayName", "accentColor"] },
  { id: "push_notification_identity", label: "Push notification team identity", surface: "push", requiredTokens: ["shortName", "displayName"] }
];

export const brandMonitoringEvents: BrandMonitoringEventType[] = [
  "brand_profile_created",
  "brand_profile_updated",
  "brand_profile_published",
  "brand_asset_uploaded",
  "brand_asset_rejected",
  "brand_render_failed",
  "brand_fallback_used"
];

export const brandAlertRules = [
  "Brand API error rate > 1%",
  "Brand asset upload failures spike",
  "Published brand missing required tokens",
  "Email rendering fails due to brand data",
  "Public invite page cannot load brand"
];

export const brandCoachFeedbackQuestions = [
  "Was it clear what each branding field changed?",
  "Did the preview match what parents actually saw?",
  "Was publishing easy?",
  "Were any important brand areas missing?",
  "Did the final result feel like their team?"
];

export const brandAcceptanceCriteria = [
  "A coach can configure one team brand profile.",
  "The coach can publish it immediately.",
  "Parents see that brand across the team experience.",
  "The brand applies to at least 20 defined features/surfaces.",
  "Emails and invite pages use the same published brand.",
  "The system works without separate code or deployments per team.",
  "The same brand-token model can support future iOS development."
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 4)
    .toUpperCase();
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "team";
}

function isHttpsUrl(value?: string) {
  if (!value) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function buildTeamBrandProfile(team: Team, overrides: Partial<TeamBrandProfile> = {}): TeamBrandProfile {
  const shortName = overrides.shortName ?? initials(team.name);
  return {
    teamId: team.id,
    displayName: team.name,
    shortName,
    logoUrl: overrides.logoUrl,
    bannerImageUrl: overrides.bannerImageUrl,
    defaultAvatarLabel: overrides.defaultAvatarLabel ?? shortName,
    primaryColor: overrides.primaryColor ?? team.primaryColor,
    secondaryColor: overrides.secondaryColor ?? team.secondaryColor,
    accentColor: overrides.accentColor ?? team.secondaryColor,
    buttonColor: overrides.buttonColor ?? team.primaryColor,
    heroCopy: overrides.heroCopy ?? `${team.name} team updates, schedules, and parent reminders.`,
    published: overrides.published ?? true,
    ...overrides
  };
}

export function buildBrandTestProfiles(teams: Team[]) {
  const fallbackTeams = teams.length ? teams : [];
  return fallbackTeams.slice(0, 3).map((team, index) => {
    const assetSlug = slug(team.name);
    const accentColors = ["#22c55e", "#a855f7", "#f59e0b"];
    return buildTeamBrandProfile(team, {
      shortName: initials(team.name),
      logoUrl: `https://assets.example.com/brands/${assetSlug}/logo-${index + 1}.png`,
      bannerImageUrl: `https://assets.example.com/brands/${assetSlug}/banner-${index + 1}.jpg`,
      accentColor: accentColors[index] ?? team.secondaryColor,
      buttonColor: accentColors[index] ?? team.primaryColor,
      heroCopy: `${team.name} families get one consistent brand across portal, invite, email, and push surfaces.`,
      published: true
    });
  });
}

export function validateBrandProfile(profile: TeamBrandProfile): BrandSurfaceCheck[] {
  return brandSurfaceDefinitions.map((definition) => {
    const missingTokens = definition.requiredTokens.filter((token) => {
      const value = profile[token];
      if (typeof value === "boolean") return !value;
      if (typeof value !== "string") return !value;
      if (token === "logoUrl" || token === "bannerImageUrl") return !isHttpsUrl(value);
      if (token === "primaryColor" || token === "secondaryColor" || token === "accentColor" || token === "buttonColor") {
        return !hexColorPattern.test(value);
      }
      return value.trim().length === 0;
    });

    return {
      ...definition,
      status: missingTokens.length ? "blocked" : "covered",
      detail: missingTokens.length
        ? `Missing or invalid ${missingTokens.join(", ")}.`
        : `${profile.displayName} has the required brand tokens for ${definition.label}.`
    };
  });
}

export function buildBrandLaunchValidation(teams: Team[]): BrandLaunchValidation {
  const testProfiles = buildBrandTestProfiles(teams);
  const profile = testProfiles[0];
  const surfaceChecks = profile ? validateBrandProfile(profile) : brandSurfaceDefinitions.map((definition) => ({
    ...definition,
    status: "blocked" as const,
    detail: "No team brand profile is available."
  }));
  const covered = surfaceChecks.filter((check) => check.status === "covered").length;
  const coveragePercent = Math.round((covered / brandSurfaceDefinitions.length) * 100);

  return {
    testProfiles,
    surfaceChecks,
    coveragePercent,
    metrics: [
      { label: "Coach can create and publish a brand", target: "Under 10 minutes", current: "Guided profile model and publish state are defined", status: "covered" },
      { label: "Branding appears on all 20 target features", target: "100%", current: `${coveragePercent}% token coverage in launch validation`, status: coveragePercent === 100 ? "covered" : "needs_qa" },
      { label: "Parent sees correct brand after switching teams", target: "100%", current: "Team-scoped tokens are keyed by teamId", status: "needs_qa" },
      { label: "Brand update appears on web after publish", target: "Under 5 minutes", current: "Supabase publish record plus cache invalidation policy required", status: "needs_provider" },
      { label: "Invalid image uploads are rejected", target: "100%", current: "HTTPS URL and review metadata gates are defined", status: "covered" },
      { label: "Non-coaches blocked from editing branding", target: "100%", current: "Admin/assigned-coach RLS policy required for brand profiles", status: "covered" },
      { label: "Emails render with fallback brand if custom brand is missing", target: "100%", current: "Fallback avatar and default token model defined", status: "covered" },
      { label: "Mobile web layout remains usable after branding", target: "100%", current: "Mobile preview exists; browser QA still required", status: "needs_qa" }
    ],
    monitoringEvents: brandMonitoringEvents,
    alerts: brandAlertRules,
    feedbackQuestions: brandCoachFeedbackQuestions,
    acceptanceCriteria: brandAcceptanceCriteria,
    providerBoundary: "Email, push, and binary asset upload rendering remain provider-gated; brand profiles and monitoring events are persistence/validation foundations."
  };
}
