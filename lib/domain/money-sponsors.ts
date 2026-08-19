import type { AppState, Player, Sponsor, Team } from "./types";
import { buildSponsorProgramSummaries, sumSponsorInvoicedCents } from "./sponsor-program";

export type FamilyWalletItemKind = "registration_fee" | "team_due" | "reimbursement" | "sponsor_discount" | "scholarship_credit";
export type FamilyWalletProofState = "pending" | "invoice_ready" | "paid_proof_recorded" | "offered" | "redeemed_proof_required";

export interface FamilyWalletItem {
  id: string;
  kind: FamilyWalletItemKind;
  label: string;
  playerId?: string;
  teamId: string;
  amountCents: number;
  direction: "charge" | "credit";
  proofState: FamilyWalletProofState;
  sponsorId?: string;
  note: string;
}

export interface FamilyWalletSummary {
  parentUserId: string;
  items: FamilyWalletItem[];
  unpaidCents: number;
  creditsCents: number;
  netDueCents: number;
  proofBoundary: string;
}

export type SponsorOpportunityNeed = "uniforms" | "field_signs" | "snacks" | "photography" | "trophies" | "scholarships" | "camps";
export type SponsorOpportunityStatus = "suggested" | "reviewing" | "matched" | "declined";

export interface SponsorOpportunity {
  id: string;
  organizationId: string;
  teamId?: string;
  need: SponsorOpportunityNeed;
  title: string;
  targetAmountCents: number;
  sponsorFit: string;
  status: SponsorOpportunityStatus;
  evidence: string;
}

export interface LocalBusinessTeamPage {
  teamId: string;
  teamName: string;
  sponsors: Array<{
    sponsorId: string;
    name: string;
    url: string;
    logoUrl?: string;
    offerText: string;
    reviewStatus: "approved_active";
  }>;
  acknowledgement: string;
  privacyBoundary: string;
}

export interface LeagueRevenueSummary {
  organizationId: string;
  seasonId: string;
  registrationFeeCents: number;
  teamDueCents: number;
  sponsorInvoiceCents: number;
  unpaidFamilyBalanceCents: number;
  scholarshipCreditCents: number;
  activeSponsorCount: number;
  pendingSponsorCount: number;
  renewalRiskCount: number;
  proofBoundary: string;
}

function activePlayersForParent(state: AppState, parentUserId: string) {
  const linkedPlayerIds = new Set(state.guardianLinks
    .filter((link) => link.parentUserId === parentUserId && link.status === "active")
    .map((link) => link.playerId));

  return state.players.filter((player) => linkedPlayerIds.has(player.id));
}

function teamForPlayer(state: AppState, player: Player): Team | undefined {
  return state.teams.find((team) => team.id === player.teamId);
}

function sponsorDiscountForTeam(sponsors: Sponsor[], teamId: string): Sponsor | undefined {
  return sponsors.find((sponsor) => (
    sponsor.status === "active" &&
    sponsor.placementKey === "team_portal" &&
    (!sponsor.teamId || sponsor.teamId === teamId)
  ));
}

export function buildFamilyWalletSummary(state: AppState, parentUserId: string): FamilyWalletSummary {
  const players = activePlayersForParent(state, parentUserId);
  const items = players.map((player): FamilyWalletItem => {
    const team = teamForPlayer(state, player);
    const teamId = team?.id ?? player.teamId;
    return {
      id: `balance-unavailable-${player.id}`,
      kind: "registration_fee",
      label: `${player.firstName} ${player.lastInitial}. fee status`,
      playerId: player.id,
      teamId,
      amountCents: 0,
      direction: "charge",
      proofState: "pending",
      note: "Status unavailable in preview data. No charge, credit, paid status, or settlement is inferred."
    };
  });

  const unpaidCents = items
    .filter((item) => item.direction === "charge" && item.proofState !== "paid_proof_recorded")
    .reduce((total, item) => total + item.amountCents, 0);
  const creditsCents = items
    .filter((item) => item.direction === "credit")
    .reduce((total, item) => total + item.amountCents, 0);

  return {
    parentUserId,
    items,
    unpaidCents,
    creditsCents,
    netDueCents: Math.max(0, unpaidCents - creditsCents),
    proofBoundary: "Family Balance Summary shows evidence-backed obligations only. Preview data never infers charges, credits, paid status, or settlement."
  };
}

export const buildFamilyBalanceSummary = buildFamilyWalletSummary;

export function buildSponsorOpportunities(state: AppState): SponsorOpportunity[] {
  const openSnackTeams = new Set(state.snackScheduleSlots.filter((slot) => slot.status === "open").map((slot) => slot.teamId));
  const mediaReadyTeams = new Set(state.mediaItems.filter((item) => (item.moderationStatus ?? "approved") === "approved").map((item) => item.teamId));
  const underservedTeams = state.teams.filter((team) => openSnackTeams.has(team.id) || !mediaReadyTeams.has(team.id));

  const opportunities: SponsorOpportunity[] = [
    {
      id: "sponsor-opp-scholarships",
      organizationId: state.organization.id,
      need: "scholarships",
      title: "Registration scholarship pool",
      targetAmountCents: 50000,
      sponsorFit: "Local bank, clinic, service club, or civic sponsor",
      status: "suggested",
      evidence: `${state.registrationRequests.filter((request) => request.status === "pending").length} registration request(s) are awaiting review.`
    },
    {
      id: "sponsor-opp-field-signs",
      organizationId: state.organization.id,
      need: "field_signs",
      title: "Opening month field signage",
      targetAmountCents: 30000,
      sponsorFit: "Local restaurant, realtor, or family services business",
      status: state.sponsors.some((sponsor) => sponsor.placementKey === "field_map") ? "matched" : "reviewing",
      evidence: `${state.events.filter((event) => event.status === "scheduled").length} scheduled event(s) create local field presence.`
    },
    {
      id: "sponsor-opp-snacks",
      organizationId: state.organization.id,
      teamId: underservedTeams[0]?.id,
      need: "snacks",
      title: "Snack table support",
      targetAmountCents: 15000,
      sponsorFit: "Grocery, pizza, cafe, or hydration sponsor",
      status: "suggested",
      evidence: `${state.snackScheduleSlots.filter((slot) => slot.status === "open").length} snack slot(s) are still open.`
    },
    {
      id: "sponsor-opp-photography",
      organizationId: state.organization.id,
      teamId: underservedTeams[1]?.id ?? state.teams[0]?.id,
      need: "photography",
      title: "Picture day and storybook sponsor",
      targetAmountCents: 20000,
      sponsorFit: "Photographer, print shop, or local family business",
      status: "suggested",
      evidence: `${state.mediaItems.filter((item) => (item.moderationStatus ?? "approved") === "approved").length} approved media item(s) can support recap proof.`
    }
  ];

  return opportunities.sort((left, right) => {
    const statusRank: Record<SponsorOpportunityStatus, number> = { suggested: 0, reviewing: 1, matched: 2, declined: 3 };
    return statusRank[left.status] - statusRank[right.status] || right.targetAmountCents - left.targetAmountCents;
  });
}

export function buildLeagueRevenueSummary(state: AppState): LeagueRevenueSummary {
  const activePlayers = state.players;
  const walletSummaries = Array.from(new Set(state.guardianLinks
    .filter((link) => link.status === "active" && link.parentUserId)
    .map((link) => link.parentUserId!)))
    .map((parentUserId) => buildFamilyWalletSummary(state, parentUserId));
  const programSummaries = buildSponsorProgramSummaries(state.sponsors);

  return {
    organizationId: state.organization.id,
    seasonId: state.activeSeason.id,
    registrationFeeCents: 0,
    teamDueCents: 0,
    sponsorInvoiceCents: sumSponsorInvoicedCents(programSummaries),
    unpaidFamilyBalanceCents: walletSummaries.reduce((total, wallet) => total + wallet.netDueCents, 0),
    scholarshipCreditCents: walletSummaries.reduce((total, wallet) => (
      total + wallet.items
        .filter((item) => item.kind === "scholarship_credit")
        .reduce((sum, item) => sum + item.amountCents, 0)
    ), 0),
    activeSponsorCount: state.sponsors.filter((sponsor) => sponsor.status === "active").length,
    pendingSponsorCount: state.sponsors.filter((sponsor) => sponsor.status === "pending").length,
    renewalRiskCount: state.sponsors.filter((sponsor) => sponsor.status === "expired" || sponsor.status === "pending").length,
    proofBoundary: `Revenue dashboard separates receivables, sponsor invoice readiness, and payment proof. ${activePlayers.length} player record(s) exist, but no fee amount is inferred. Sponsor invoice value is folded from persisted sponsorship agreements and invoices only; ${programSummaries.filter((summary) => !summary.agreementRecorded).length} sponsor(s) have no agreement on record and contribute nothing. Browser return or public placement is not settlement.`
  };
}

export function buildLocalBusinessTeamPage(state: AppState, teamId: string): LocalBusinessTeamPage {
  const team = state.teams.find((candidate) => candidate.id === teamId);
  const sponsors = state.sponsors
    .filter((sponsor) => sponsor.status === "active" && sponsor.placementKey === "team_portal" && (!sponsor.teamId || sponsor.teamId === teamId))
    .map((sponsor) => ({
      sponsorId: sponsor.id,
      name: sponsor.name,
      url: sponsor.url,
      logoUrl: sponsor.logoUrl,
      offerText: `${sponsor.name} supports ${team?.name ?? "this team"} families this season.`,
      reviewStatus: "approved_active" as const
    }));

  return {
    teamId,
    teamName: team?.name ?? "Team",
    sponsors,
    acknowledgement: sponsors.length
      ? `${sponsors.length} approved local business sponsor(s) are supporting this team page.`
      : "No approved local business sponsors are placed on this team page yet.",
    privacyBoundary: "Local business pages show approved sponsor records, team schedule context, and community acknowledgments only. They do not expose child profiles, parent contact data, private media, or payment state."
  };
}
