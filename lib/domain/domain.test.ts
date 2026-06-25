import { describe, expect, it } from "vitest";
import {
  NOW,
  analyzeRosterCsv,
  applyScheduleChange,
  buildAdminAssistiveSuggestions,
  buildCoachAssistiveSuggestions,
  buildParentAssistiveSuggestions,
  computeAdminHealth,
  computeSeasonPlanningMetrics,
  createScheduleEvent,
  createRegistrationRequest,
  createParentReplay,
  defaultTeamCommunicationCopy,
  detectScheduleConflicts,
  exportTeamCalendarIcs,
  evaluateInviteRecovery,
  generateParentReplayDraft,
  getCoachRsvpReliability,
  canModerateTeamChat,
  getCoachRsvpSummaries,
  getEventStatusTracking,
  getNotificationChannelReadiness,
  getNotificationRetryLogs,
  getDeviceManagementSummary,
  getEmailFallbackPlan,
  getAlertOpenRateTracking,
  getParentDashboard,
  getScheduleNotificationWorkflow,
  getScheduleRsvpSyncRows,
  getVapidSendAdapterStatus,
  getSportWeatherThresholds,
  evaluateWeatherThresholds,
  getLeagueWeatherThresholds,
  createFieldClosureDraft,
  getWeatherEscalationRules,
  getWeatherSafetyNotes,
  getEmbeddedMapUi,
  getFieldLayoutMetadata,
  getMapQuotaStatus,
  getVenueAmenityNotes,
  getVenueMarkers,
  getVenuePage,
  getArrivalInstructions,
  getMapFallbackUx,
  getVenueIntelligence,
  highlightLocationChange,
  getWeatherAlertHistory,
  getWeatherApprovalQueue,
  getWeatherProviderRetryLogs,
  getTeamChatAccess,
  getTeamChatReportingSummary,
  getTeamChatRetentionJobs,
  getTeamChatView,
  getMediaMessagePolicyScreens,
  getVenueRecords,
  moderateTeamChatMessage,
  postTeamChatMessage,
  previewTeamCommunication,
  previewScheduleChangeImpact,
  previewRecurringEvents,
  queueTeamCommunication,
  applyNotificationUnsubscribe,
  recipientAllowsNotification,
  smsUrgencyAllowed,
  sampleRosterCsv,
  seedState,
  sendCoachAnnouncement,
  setRsvp,
  updateTeamPortalBranding,
  validateMediaUrl,
  approveMediaItem,
  rejectMediaItem,
  getMediaReportingSummary,
  getUploadStorageProviderStatus,
  getFamilyFacingModerationQueue,
  getMediaRetentionPolicy,
  canViewMediaByRole,
  getMediaConsentControls,
  getPerPlayerMediaConsent,
  getPhotoVisibilityFlags,
  getPrivateTeamAlbum,
  createMediaTakedownRequest,
  getParentSubmittedMoments,
  getVolunteerMoments,
  exportSeasonMemories,
  getSnackReminders,
  getSnackConflicts,
  getSnackAuditTrail,
  cancelSnackSlot,
  getVolunteerRoleCaps,
  getVolunteerReminders,
  cancelVolunteerSignup,
  getVolunteerApprovalPolicies,
  getSnackVolunteerFairness,
  getDutyRotation,
  getFamilyOptOuts,
  getSiblingAwareDutyAssignments,
  getMissedSlotTracking,
  getSponsorPublicDisplayPolicy,
  getTeamPortalSponsorPlacement,
  getScheduleSponsorPlacement,
  getMediaGallerySponsorPlacement,
  getEmailSponsorPlacement,
  getBannerSponsorPlacement,
  getTouchTargetQa,
  getOfflineStateSummary,
  getCacheInvalidationPolicy,
  getManualDarkToggleState,
  getAccessibilityContrastChecks,
  getPromptEvalHarness,
  getPrivacyFilters,
  getInviteAcceptanceRate,
  getAverageInviteToAccountTimeHours,
  getFailedInviteCount
} from "./index";

describe("CSV duplicate detection", () => {
  it("separates blocking duplicate-player errors from reviewable warnings", () => {
    const analysis = analyzeRosterCsv(sampleRosterCsv, seedState, NOW);

    expect(analysis.errorRows).toBeGreaterThan(0);
    expect(analysis.warningRows).toBeGreaterThan(0);
    expect(analysis.rows.flatMap((row) => row.issues.map((issue) => issue.code))).toContain("duplicate_player_same_team");
    expect(analysis.rows.flatMap((row) => row.issues.map((issue) => issue.code))).toContain("duplicate_jersey_number");
  });

  it("blocks missing parent contact when both email and phone are invalid", () => {
    const csv = [
      "team,division,player_first,last_initial,jersey,parent_name,parent_email,parent_phone",
      "Tiny Tigers,3U,New,N,9,No Contact,not-an-email,"
    ].join("\n");
    const analysis = analyzeRosterCsv(csv, seedState, NOW);

    expect(analysis.errorRows).toBe(1);
    expect(analysis.rows[0]?.issues.map((issue) => issue.code)).toContain("invalid_required_parent_contact");
  });
});

describe("media URL validation", () => {
  it("allows only HTTPS Google Photos and YouTube links", () => {
    expect(validateMediaUrl("google_photos", "https://photos.google.com/share/demo").ok).toBe(true);
    expect(validateMediaUrl("google_photos", "https://photos.app.goo.gl/demo").ok).toBe(true);
    expect(validateMediaUrl("youtube", "https://www.youtube.com/watch?v=demo").ok).toBe(true);
    expect(validateMediaUrl("youtube", "https://youtu.be/demo").ok).toBe(true);
    expect(validateMediaUrl("youtube", "http://youtu.be/demo").ok).toBe(false);
    expect(validateMediaUrl("google_photos", "https://example.com/album").ok).toBe(false);
  });

  it("summarizes approve, reject, upload provider, and reporting state", () => {
    const item = seedState.mediaItems[0]!;
    const approved = approveMediaItem(item);
    const rejected = rejectMediaItem(item);
    const reporting = getMediaReportingSummary([{ ...item, reportCount: 2, moderationStatus: "pending" }]);
    const storage = getUploadStorageProviderStatus(false);

    expect(approved.moderationStatus).toBe("approved");
    expect(rejected.item.moderationStatus).toBe("rejected");
    expect(reporting.totalReports).toBe(2);
    expect(reporting.pendingReview).toBe(1);
    expect(storage.provider).toBe("not_configured");
  });

  it("tracks family moderation, retention, role visibility, and consent controls", () => {
    const reported = { ...seedState.mediaItems[0]!, reportCount: 1, moderationStatus: "pending" as const };
    const queue = getFamilyFacingModerationQueue([reported]);
    const retention = getMediaRetentionPolicy();
    const controls = getMediaConsentControls();

    expect(queue).toHaveLength(1);
    expect(retention.seasonMedia).toContain("active season");
    expect(canViewMediaByRole(reported, "parent")).toBe(false);
    expect(canViewMediaByRole(reported, "admin")).toBe(true);
    expect(controls[0]?.label).toBe("Team media consent");
  });

  it("tracks per-player consent, photo flags, private albums, and takedown requests", () => {
    const item = seedState.mediaItems[0]!;

    expect(getPerPlayerMediaConsent("player-mason", ["player-mason"]).consent).toBe("granted");
    expect(getPhotoVisibilityFlags(item).teamVisible).toBe(true);
    expect(getPrivateTeamAlbum(seedState.mediaItems, "team-tigers")).toHaveLength(2);
    expect(createMediaTakedownRequest(item, "Parent requested removal.").status).toBe("needs_review");
  });

  it("builds parent moments, volunteer moments, export rows, and snack reminders", () => {
    expect(getParentSubmittedMoments(seedState, "team-tigers")).toHaveLength(2);
    expect(getVolunteerMoments(seedState, "team-tigers")).toHaveLength(1);
    expect(exportSeasonMemories(seedState, "team-tigers").filename).toContain("season-memories");
    expect(getSnackReminders(seedState, "team-tigers")).toHaveLength(2);
  });

  it("tracks snack conflicts, snack audit, cancellations, and volunteer caps", () => {
    const cancelled = cancelSnackSlot(seedState, "snack-tigers-game", "Family schedule changed.");

    expect(getSnackConflicts(seedState, "team-tigers")).toHaveLength(0);
    expect(getSnackAuditTrail(seedState, "team-tigers")).toHaveLength(2);
    expect(cancelled.state.snackScheduleSlots.find((slot) => slot.id === "snack-tigers-game")?.status).toBe("open");
    expect(getVolunteerRoleCaps(seedState, "team-tigers").map((cap) => cap.role)).toContain("Score helper");
  });

  it("tracks volunteer reminders, cancellations, approval policies, and fairness", () => {
    const cancelled = cancelVolunteerSignup(seedState, "volunteer-score-helper", "Family schedule changed.");

    expect(getVolunteerReminders(seedState, "team-tigers")).toHaveLength(3);
    expect(cancelled.state.volunteerSignups.find((signup) => signup.id === "volunteer-score-helper")?.status).toBe("open");
    expect(getVolunteerApprovalPolicies()).toHaveLength(3);
    expect(getSnackVolunteerFairness(seedState, "team-tigers").balanceScore).toBe(0);
  });

  it("tracks duty rotation, opt-outs, sibling-aware duties, and missed slots", () => {
    expect(getDutyRotation(seedState, "team-tigers")).toHaveLength(2);
    expect(getFamilyOptOuts(seedState, "team-tigers")[0]?.optedOut).toBe(false);
    expect(getSiblingAwareDutyAssignments(seedState, "team-tigers")[0]?.siblingGroupKey).toContain("user-parent");
    expect(getMissedSlotTracking(seedState, "team-tigers").length).toBeGreaterThan(0);
  });
});

describe("invite recovery", () => {
  it("allows a pending invite under resend limits", () => {
    const result = evaluateInviteRecovery(seedState, "sam@example.com", NOW);
    expect(result.code).toBe("eligible");
    expect(result.canResend).toBe(true);
  });

  it("detects expired, accepted, not-found, and hourly-limited invites", () => {
    expect(evaluateInviteRecovery(seedState, "pat@example.com", NOW).code).toBe("expired");
    expect(evaluateInviteRecovery(seedState, "jordan@example.com", NOW).code).toBe("already_registered");
    expect(evaluateInviteRecovery(seedState, "missing@example.com", NOW).code).toBe("not_found");
    expect(evaluateInviteRecovery(seedState, "limit@example.com", NOW).code).toBe("rate_limited_hour");
  });
});

describe("parent dashboard and RSVP", () => {
  it("loads only parent-linked child, events, announcement, and RSVP needs", () => {
    const dashboard = getParentDashboard(seedState, "user-parent-jordan", NOW);

    expect(dashboard.children).toHaveLength(1);
    expect(dashboard.children[0]?.player.firstName).toBe("Mason");
    expect(dashboard.nextEvents.length).toBeGreaterThan(0);
    expect(dashboard.latestAnnouncement?.title).toBe("Opening weekend notes");
    expect(dashboard.rsvpNeeded.length).toBeGreaterThan(0);
  });

  it("prevents a parent from RSVPing for another child", () => {
    const result = setRsvp(seedState, {
      eventId: "event-tigers-game",
      playerId: "player-avery",
      parentUserId: "user-parent-jordan",
      response: "going",
      now: NOW
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain("linked child");
  });

  it("updates RSVP and coach attendance summary counts", () => {
    const result = setRsvp(seedState, {
      eventId: "event-tigers-game",
      playerId: "player-mason",
      parentUserId: "user-parent-jordan",
      response: "maybe",
      now: NOW
    });
    const summaries = getCoachRsvpSummaries(result.state, "user-coach-taylor", NOW);

    expect(result.ok).toBe(true);
    expect(summaries[0]?.maybe).toBe(1);
    expect(summaries[0]?.going).toBe(1);
    expect(summaries[0]?.noResponse).toBe(0);
  });

  it("tracks family RSVP reliability without public parent ranking", () => {
    const reliability = getCoachRsvpReliability(seedState, "user-coach-taylor", NOW);
    const jordan = reliability.find((row) => row.parentUser?.id === "user-parent-jordan");
    const riley = reliability.find((row) => row.parentUser?.id === "user-parent-riley");

    expect(jordan?.noResponse).toBe(2);
    expect(jordan?.responseRate).toBe(0);
    expect(jordan?.reminderMode).toBe("Needs reminder");
    expect(riley?.responded).toBe(1);
  });
});

describe("schedule changes and admin health", () => {
  it("creates channel-specific notification records for affected parents", () => {
    const result = applyScheduleChange(seedState, {
      eventId: "event-tigers-game",
      actorUserId: "user-admin",
      actorRole: "admin",
      locationName: "Field 3",
      now: NOW
    });

    expect(result.ok).toBe(true);
    expect(result.state.notifications.filter((notification) => notification.eventId === "event-tigers-game")).toHaveLength(4);
  });

  it("previews schedule change impact before queueing alert records", () => {
    const preview = previewScheduleChangeImpact(seedState, {
      eventId: "event-tigers-game",
      actorUserId: "user-admin",
      actorRole: "admin",
      status: "cancelled",
      now: NOW
    });

    expect(preview.ok).toBe(true);
    expect(preview.affectedFamilies).toBe(2);
    expect(preview.rsvpdPlayers).toBe(1);
    expect(preview.noResponsePlayers).toBe(1);
    expect(preview.channels).toEqual(["push", "email", "sms"]);
    expect(preview.notificationCount).toBe(6);
  });

  it("detects team and venue conflicts before schedule creation", () => {
    const conflicts = detectScheduleConflicts(seedState, {
      teamId: "team-tigers",
      startsAt: "2026-04-04T09:15:00.000Z",
      endsAt: "2026-04-04T09:45:00.000Z",
      locationName: "Field 1"
    });

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]?.reasons).toEqual(["team overlap", "venue overlap"]);
  });

  it("creates schedule events through the actor-checked CRUD service", () => {
    const result = createScheduleEvent(seedState, {
      actorUserId: "user-admin",
      actorRole: "admin",
      organizationId: seedState.organization.id,
      seasonId: seedState.activeSeason.id,
      teamId: "team-tigers",
      title: "Tiny Tigers Picture Day",
      eventType: "team_event",
      startsAt: "2026-04-12T15:00:00.000Z",
      endsAt: "2026-04-12T16:00:00.000Z",
      locationName: "Community Room",
      locationAddress: "100 League Way",
      now: NOW
    });

    expect(result.ok).toBe(true);
    expect(result.event?.title).toBe("Tiny Tigers Picture Day");
    expect(result.state.events).toHaveLength(seedState.events.length + 1);
    expect(result.state.auditEvents[0]?.action).toBe("schedule_event_created");
  });

  it("builds venue records, recurrence previews, calendar export, and RSVP sync rows", () => {
    const venues = getVenueRecords(seedState);
    const repeats = previewRecurringEvents(seedState, { sourceEventId: "event-tigers-practice", count: 2, intervalDays: 7 });
    const calendar = exportTeamCalendarIcs(seedState, "team-tigers");
    const syncRows = getScheduleRsvpSyncRows(seedState);

    expect(venues.map((venue) => venue.name)).toContain("Field 1");
    expect(repeats).toHaveLength(2);
    expect(repeats[0]?.title).toContain("#2");
    expect(calendar).toContain("BEGIN:VCALENDAR");
    expect(calendar).toContain("Tiny Tigers Practice");
    expect(syncRows.find((row) => row.event.id === "event-tigers-game")?.going).toBe(1);
  });

  it("summarizes schedule notification workflow and channel readiness", () => {
    const changed = applyScheduleChange(seedState, {
      eventId: "event-tigers-game",
      actorUserId: "user-admin",
      actorRole: "admin",
      status: "cancelled",
      now: NOW
    }).state;
    const workflow = getScheduleNotificationWorkflow(changed);
    const status = getEventStatusTracking(changed);
    const channels = getNotificationChannelReadiness(changed);

    expect(workflow.total).toBe(6);
    expect(workflow.statusCounts.pending).toBe(6);
    expect(status.cancelled).toBe(1);
    expect(channels.find((channel) => channel.channel === "push")?.label).toBe("Push notification channel");
    expect(channels.find((channel) => channel.channel === "email")?.status).toBe("ok");
    expect(channels.find((channel) => channel.channel === "sms")?.status).toBe("ok");
  });

  it("tracks sent, failed, and read notification statuses from records", () => {
    const workflow = getScheduleNotificationWorkflow({
      ...seedState,
      notifications: [
        {
          id: "notification-sent",
          organizationId: seedState.organization.id,
          recipientUserId: "user-parent-jordan",
          teamId: "team-tigers",
          eventId: "event-tigers-game",
          notificationType: "schedule_changed",
          title: "Schedule changed",
          body: "Updated time.",
          channel: "email",
          status: "sent",
          createdAt: NOW,
          sentAt: NOW
        },
        {
          id: "notification-failed",
          organizationId: seedState.organization.id,
          recipientUserId: "user-parent-riley",
          teamId: "team-tigers",
          eventId: "event-tigers-game",
          notificationType: "schedule_changed",
          title: "Schedule changed",
          body: "Updated time.",
          channel: "sms",
          status: "failed",
          createdAt: "2026-04-01T12:30:00.000Z"
        },
        {
          id: "notification-read",
          organizationId: seedState.organization.id,
          recipientUserId: "user-parent-jordan",
          teamId: "team-tigers",
          eventId: "event-tigers-game",
          notificationType: "event_cancelled",
          title: "Event cancelled",
          body: "Game cancelled.",
          channel: "push",
          status: "read",
          createdAt: NOW,
          readAt: NOW
        }
      ]
    });

    expect(workflow.statusCounts.sent).toBe(1);
    expect(workflow.statusCounts.failed).toBe(1);
    expect(workflow.statusCounts.read).toBe(1);
  });

  it("keeps VAPID, unsubscribe, retry, and preference gates explicit", () => {
    const unsubscribed = applyNotificationUnsubscribe(seedState, {
      userId: "user-parent-jordan",
      channel: "push",
      notificationType: "schedule_changed",
      now: NOW
    });
    const failedState = {
      ...seedState,
      notifications: [{
        id: "notification-failed-retry",
        organizationId: seedState.organization.id,
        recipientUserId: "user-parent-jordan",
        teamId: "team-tigers",
        eventId: "event-tigers-game",
        notificationType: "schedule_changed" as const,
        title: "Schedule changed",
        body: "Updated time.",
        channel: "push" as const,
        status: "failed" as const,
        createdAt: NOW
      }]
    };

    expect(getVapidSendAdapterStatus().configured).toBe(false);
    expect(unsubscribed.state.notificationPreferences[0]?.enabled).toBe(false);
    expect(recipientAllowsNotification(unsubscribed.state, {
      userId: "user-parent-jordan",
      teamId: "team-tigers",
      channel: "push",
      notificationType: "schedule_changed"
    })).toBe(false);
    expect(getNotificationRetryLogs(failedState)).toHaveLength(1);
  });

  it("summarizes device, email fallback, SMS urgency, and open-rate rules", () => {
    const telemetryState = {
      ...seedState,
      notifications: [
        {
          id: "notification-sent-open-rate",
          organizationId: seedState.organization.id,
          recipientUserId: "user-parent-jordan",
          teamId: "team-tigers",
          notificationType: "schedule_changed" as const,
          title: "Schedule changed",
          body: "Updated time.",
          channel: "email" as const,
          status: "sent" as const,
          createdAt: NOW,
          sentAt: NOW
        },
        {
          id: "notification-read-open-rate",
          organizationId: seedState.organization.id,
          recipientUserId: "user-parent-riley",
          teamId: "team-tigers",
          notificationType: "schedule_changed" as const,
          title: "Schedule changed",
          body: "Updated time.",
          channel: "push" as const,
          status: "read" as const,
          createdAt: NOW,
          readAt: NOW
        }
      ],
      notificationPreferences: [{
        id: "pref-push",
        userId: "user-parent-jordan",
        channel: "push" as const,
        notificationType: "schedule_changed" as const,
        enabled: true,
        timezone: "America/Chicago"
      }]
    };

    expect(getDeviceManagementSummary(telemetryState).registeredUsers).toBe(1);
    expect(getEmailFallbackPlan(seedState, { notificationType: "schedule_changed" }).reachableCount).toBe(2);
    expect(smsUrgencyAllowed({ notificationType: "event_cancelled", urgent: true })).toBe(true);
    expect(smsUrgencyAllowed({ notificationType: "schedule_changed", urgent: false })).toBe(false);
    expect(getAlertOpenRateTracking(telemetryState).openRate).toBe(50);
  });

  it("computes launch readiness card counts", () => {
    const cards = computeAdminHealth(seedState, NOW);
    const missingCoaches = cards.find((card) => card.id === "missing-coaches");
    const failedInvites = cards.find((card) => card.id === "failed-invites");

    expect(missingCoaches?.count).toBe(2);
    expect(failedInvites?.count).toBe(1);
  });
});

describe("weather policy", () => {
  it("builds approval queue, retry logs, history, and sport thresholds", () => {
    const highRiskState = {
      ...seedState,
      weatherAlerts: [
        ...seedState.weatherAlerts,
        {
          id: "weather-cancel-risk",
          teamId: "team-tigers",
          eventId: "event-tigers-game",
          headline: "Lightning risk",
          detail: "Storm cell is approaching the field.",
          severity: "cancel_risk" as const,
          status: "draft" as const,
          createdAt: "2026-04-01T12:30:00.000Z"
        }
      ]
    };

    expect(getWeatherApprovalQueue(seedState)).toHaveLength(1);
    expect(getWeatherProviderRetryLogs(highRiskState)).toHaveLength(1);
    expect(getWeatherAlertHistory(highRiskState)[0]?.alert.headline).toBe("Lightning risk");
    expect(getSportWeatherThresholds("baseball").thresholds.lightningMiles).toBe(10);
    expect(getLeagueWeatherThresholds("3U").heatIndex).toBe(90);
    const thresholdReview = evaluateWeatherThresholds({ heatIndex: 91, lightningMiles: 8, airQualityIndex: 105, rainInchesPerHour: 0.3, thresholds: { heatIndex: 90, lightningMiles: 10, airQualityIndex: 100 } });
    expect(thresholdReview).toEqual({
      heat: "review",
      lightning: "review",
      airQuality: "review",
      rain: "review"
    });
    expect(createFieldClosureDraft({ eventTitle: "Tiny Tigers Practice", reason: "heavy rain" }).title).toContain("Field closure draft");
    expect(getWeatherEscalationRules(thresholdReview).level).toBe("escalate");
    expect(getWeatherSafetyNotes()).toHaveLength(3);
  });
});

describe("venue intelligence", () => {
  it("builds embedded map, markers, quota status, and field layout metadata", () => {
    const event = seedState.events.find((item) => item.id === "event-tigers-game")!;
    const map = getEmbeddedMapUi(event);
    const markers = getVenueMarkers(seedState.events.filter((item) => item.teamId === "team-tigers"));
    const quota = getMapQuotaStatus({ requestsToday: 90, dailyLimit: 100 });
    const layout = getFieldLayoutMetadata(event);

    expect(map.embedUrl).toContain("output=embed");
    expect(markers).toHaveLength(2);
    expect(quota.status).toBe("warning");
    expect(layout.entrance).toContain("Main gate");
    expect(getVenuePage(event).path).toBe("/venues/field-1");
    expect(getVenueAmenityNotes(event).restrooms).toContain("Restrooms");
    expect(getArrivalInstructions(event)).toContain("Arrive 20 minutes");
    expect(getVenueIntelligence(event).confidence).toBe("ready");
    expect(getMapFallbackUx({ quotaStatus: "danger", directionsUrl: "https://maps.example" }).useFallback).toBe(true);
    expect(highlightLocationChange("Field 1", "Field 3").changed).toBe(true);
  });
});

describe("team communication automation", () => {
  it("previews email automation recipients without provider sends", () => {
    const copy = defaultTeamCommunicationCopy(seedState, "team-tigers", "weekly_digest");
    const preview = previewTeamCommunication(seedState, {
      teamId: "team-tigers",
      actorUserId: "user-admin",
      channel: "email",
      template: "weekly_digest",
      subject: copy.subject,
      body: copy.body,
      sendAt: NOW,
      now: NOW
    });

    expect(preview.ok).toBe(true);
    expect(preview.recipients).toHaveLength(2);
    expect(preview.message).toContain("no provider send");
  });

  it("queues mass SMS records for active team families only", () => {
    const result = queueTeamCommunication(seedState, {
      teamId: "team-tigers",
      actorUserId: "user-admin",
      channel: "sms",
      template: "game_day_reminder",
      subject: "Tiny Tigers game-day essentials",
      body: "Arrive early, wear orange, and check weather before leaving.",
      sendAt: NOW,
      now: NOW
    });

    expect(result.ok).toBe(true);
    expect(result.state.notifications.filter((notification) => notification.notificationType === "team_broadcast")).toHaveLength(2);
    expect(result.message).toContain("no provider send");
  });

  it("blocks unassigned coaches from queueing another team's communication", () => {
    const result = queueTeamCommunication(seedState, {
      teamId: "team-hawks",
      actorUserId: "user-coach-taylor",
      channel: "email",
      template: "custom",
      subject: "Wrong team",
      body: "This should not queue.",
      sendAt: NOW,
      now: NOW
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain("Only org admins or assigned coaches");
  });
});

describe("sponsor placement", () => {
  it("summarizes public display policy and sponsor placements", () => {
    const placedSponsors = [{ ...seedState.sponsors[1]!, placementKey: "team_portal" as const }];

    expect(getSponsorPublicDisplayPolicy().status).toBe("review_required");
    expect(getTeamPortalSponsorPlacement(placedSponsors, "team-tigers").map((sponsor) => sponsor.name)).toContain("Corner Pizza");
    expect(getScheduleSponsorPlacement(seedState.sponsors)).toHaveLength(0);
    expect(getMediaGallerySponsorPlacement(seedState.sponsors)).toHaveLength(0);
    expect(getEmailSponsorPlacement(seedState.sponsors)).toHaveLength(0);
    expect(getBannerSponsorPlacement(seedState.sponsors)).toHaveLength(0);
    expect(getTouchTargetQa().minimumPixels).toBe(44);
    expect(getOfflineStateSummary().detail).toContain("read-only");
    expect(getCacheInvalidationPolicy().strategy).toBe("stale_while_revalidate");
    expect(getManualDarkToggleState(true).label).toBe("Dark mode on");
    expect(getAccessibilityContrastChecks()).toHaveLength(3);
  });
});

describe("parent replay evaluation", () => {
  it("keeps prompt/eval harness local and coach-reviewed", () => {
    const harness = getPromptEvalHarness();

    expect(harness.status).toBe("local");
    expect(harness.checks.join(" ")).toContain("Coach review");
  });
});

describe("analytics metrics", () => {
  it("tracks privacy filters and invite metrics", () => {
    expect(getPrivacyFilters()).toHaveLength(3);
    expect(getInviteAcceptanceRate(seedState)).toBe(25);
    expect(getAverageInviteToAccountTimeHours(seedState)).toBeGreaterThan(0);
    expect(getFailedInviteCount(seedState)).toBe(1);
  });
});

describe("start-of-season planning", () => {
  it("computes metrics that drive roster maker and bracket maker previews", () => {
    const metrics = computeSeasonPlanningMetrics(seedState, 10);
    const threeU = metrics.divisions.find((division) => division.division === "3U");
    const threeUBracket = metrics.bracketRounds.find((round) => round.division === "3U");

    expect(metrics.totalTeams).toBe(4);
    expect(metrics.rosterOpenings).toBeGreaterThan(0);
    expect(threeU?.teamCount).toBe(2);
    expect(threeU?.rosterMakerNote).toContain("Roster maker");
    expect(threeUBracket?.matchups[0]).toContain("vs");
  });
});

describe("safe team chat access", () => {
  it("summarizes reporting, retention, and media/message policy screens", () => {
    const reporting = getTeamChatReportingSummary(seedState, "team-tigers");
    const retention = getTeamChatRetentionJobs(seedState, "team-tigers");
    const policies = getMediaMessagePolicyScreens();

    expect(reporting.totalMessages).toBeGreaterThan(0);
    expect(retention[0]?.status).toBe("ready");
    expect(policies.map((policy) => policy.title)).toContain("No child accounts");
  });

  it("allows an assigned parent to view and post in their team chat", () => {
    const access = getTeamChatAccess(seedState, "user-parent-jordan", "team-tigers");
    const view = getTeamChatView(seedState, "user-parent-jordan", "team-tigers", NOW);

    expect(access.canView).toBe(true);
    expect(access.canPost).toBe(true);
    expect(access.canAnnounce).toBe(false);
    expect(access.canModerate).toBe(false);
    expect(view.pinnedMessage?.kind).toBe("announcement");
    expect(view.upcomingGame?.id).toBe("event-tigers-game");
    expect(view.gameDayMessages).toHaveLength(2);
    expect(view.safetyNote).toContain("No child accounts");
  });

  it("prevents a parent from accessing a team they are not assigned to", () => {
    const access = getTeamChatAccess(seedState, "user-parent-jordan", "team-hawks");

    expect(access.canView).toBe(false);
    expect(access.reason).toContain("private");
    expect(() => getTeamChatView(seedState, "user-parent-jordan", "team-hawks", NOW)).toThrow(/private/);
  });

  it("allows coaches to moderate only their assigned team chats", () => {
    expect(canModerateTeamChat(seedState, "user-coach-taylor", "team-tigers")).toBe(true);
    expect(canModerateTeamChat(seedState, "user-coach-taylor", "team-hawks")).toBe(false);
  });

  it("allows org admins to access and moderate all team chats", () => {
    const tigers = getTeamChatAccess(seedState, "user-admin", "team-tigers");
    const hawks = getTeamChatAccess(seedState, "user-admin", "team-hawks");

    expect(tigers.canView).toBe(true);
    expect(tigers.canModerate).toBe(true);
    expect(hawks.canView).toBe(true);
    expect(hawks.canModerate).toBe(true);
  });

  it("lets assigned parents post normal Team Chat messages", () => {
    const result = postTeamChatMessage(seedState, {
      teamId: "team-tigers",
      authorUserId: "user-parent-jordan",
      body: "Can someone confirm the Field 1 entrance?",
      now: NOW
    });
    const view = getTeamChatView(result.state, "user-parent-riley", "team-tigers", NOW);

    expect(result.ok).toBe(true);
    expect(result.createdMessage?.kind).toBe("message");
    expect(result.createdMessage?.authorRole).toBe("parent");
    expect(view.messages.some((message) => message.body.includes("Field 1 entrance"))).toBe(true);
  });

  it("blocks parents from posting in unassigned team chats", () => {
    const result = postTeamChatMessage(seedState, {
      teamId: "team-hawks",
      authorUserId: "user-parent-jordan",
      body: "Wrong team question",
      now: NOW
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain("private");
    expect(result.state.chatMessages).toHaveLength(seedState.chatMessages.length);
  });

  it("links parent questions to the upcoming game-day thread", () => {
    const result = postTeamChatMessage(seedState, {
      teamId: "team-tigers",
      authorUserId: "user-parent-jordan",
      body: "Which field entrance should we use?",
      eventId: "event-tigers-game",
      now: NOW
    });
    const view = getTeamChatView(result.state, "user-parent-riley", "team-tigers", NOW);

    expect(result.ok).toBe(true);
    expect(result.createdMessage?.eventId).toBe("event-tigers-game");
    expect(view.gameDayMessages.some((message) => message.id === result.createdMessage?.id)).toBe(true);
  });

  it("rejects game-day links for another team's event", () => {
    const result = postTeamChatMessage(seedState, {
      teamId: "team-tigers",
      authorUserId: "user-parent-jordan",
      body: "Wrong game link",
      eventId: "event-hawks-game",
      now: NOW
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain("this team");
  });

  it("lets assigned coaches send pinned Coach Notes", () => {
    const result = sendCoachAnnouncement(seedState, {
      teamId: "team-tigers",
      authorUserId: "user-coach-taylor",
      body: "Coach Note: yellow uniforms for Saturday.",
      topic: "uniforms",
      pinned: true,
      now: NOW
    });
    const view = getTeamChatView(result.state, "user-parent-jordan", "team-tigers", NOW);

    expect(result.ok).toBe(true);
    expect(result.createdMessage?.kind).toBe("announcement");
    expect(result.createdMessage?.topic).toBe("uniforms");
    expect(view.pinnedMessage?.id).toBe(result.createdMessage?.id);
  });

  it("prevents parents from sending Coach Notes", () => {
    const result = sendCoachAnnouncement(seedState, {
      teamId: "team-tigers",
      authorUserId: "user-parent-jordan",
      body: "Pretend coach note",
      topic: "reminder",
      pinned: true,
      now: NOW
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain("Only assigned coaches");
    expect(result.state.chatMessages).toHaveLength(seedState.chatMessages.length);
  });

  it("lets assigned coaches hide visible messages and records moderation audit", () => {
    const result = moderateTeamChatMessage(seedState, {
      messageId: "chat-msg-tigers-parent-question",
      actorUserId: "user-coach-taylor",
      action: "message_hidden",
      reason: "Answered elsewhere.",
      now: NOW
    });
    const view = getTeamChatView(result.state, "user-parent-riley", "team-tigers", NOW);

    expect(result.ok).toBe(true);
    expect(result.moderatedMessage?.moderationStatus).toBe("hidden");
    expect(view.messages.some((message) => message.id === "chat-msg-tigers-parent-question")).toBe(false);
    expect(result.state.chatModerationAuditEvents[0]?.action).toBe("message_hidden");
  });

  it("prevents coaches from moderating unassigned team messages", () => {
    const result = moderateTeamChatMessage(seedState, {
      messageId: "chat-msg-hawks-coach-note",
      actorUserId: "user-coach-taylor",
      action: "message_hidden",
      reason: "Wrong assignment.",
      now: NOW
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain("Only assigned coaches");
  });

  it("allows org admins to delete messages in any team chat", () => {
    const result = moderateTeamChatMessage(seedState, {
      messageId: "chat-msg-hawks-coach-note",
      actorUserId: "user-admin",
      action: "message_deleted",
      reason: "Admin cleanup.",
      now: NOW
    });

    expect(result.ok).toBe(true);
    expect(result.moderatedMessage?.moderationStatus).toBe("deleted");
    expect(result.state.chatModerationAuditEvents[0]?.actorRole).toBe("admin");
  });

  it("prevents parents from moderating messages", () => {
    const result = moderateTeamChatMessage(seedState, {
      messageId: "chat-msg-tigers-coach-note",
      actorUserId: "user-parent-jordan",
      action: "message_hidden",
      reason: "Parent moderation attempt.",
      now: NOW
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain("Only assigned coaches");
  });
});

describe("Parent Replay", () => {
  it("generates home activities, parent translations, aggregate streaks, memory, and a team quest from practice focus areas", () => {
    const draft = generateParentReplayDraft(seedState, {
      teamId: "team-tigers",
      coachUserId: "user-coach-taylor",
      focusAreas: ["catching", "spacing", "teamwork"],
      now: NOW
    });

    expect(draft.summary).toContain("catching, spacing, teamwork");
    expect(draft.homeActivities.map((activity) => activity.duration)).toEqual(["30_seconds", "2_minutes", "5_minutes"]);
    expect(draft.homeActivities[0]?.coachCue).toBe("catching");
    expect(draft.homeActivities[0]?.parentGoal).toContain("One confident rep");
    expect(draft.homeActivities[1]?.parentGoal).toContain("without equipment");
    expect(draft.homeActivities[2]?.parentGoal).toContain("pressure low");
    expect(draft.coachVideo.title).toContain("catching");
    expect(draft.parentTip).toContain("soft tosses");
    expect(draft.teamQuest).toContain("two-minute");
    expect(draft.parentTranslations.find((translation) => translation.coachTerm === "spacing")?.parentInstruction).toContain("open grass");
    expect(draft.microCoachingStreak.totalFamilies).toBe(2);
    expect(draft.memoryMoment.detail).toContain("season timeline");
    expect(draft.skillCards).toHaveLength(3);
  });

  it("allows assigned coaches to queue replay records without provider sends", () => {
    const result = createParentReplay(seedState, {
      teamId: "team-tigers",
      coachUserId: "user-coach-taylor",
      focusAreas: ["catching", "throwing", "teamwork"],
      now: NOW
    });

    expect(result.ok).toBe(true);
    expect(result.state.parentReplays).toHaveLength(1);
    expect(result.state.notifications.filter((notification) => notification.notificationType === "parent_replay_ready")).toHaveLength(2);
    expect(result.message).toContain("no provider sends");
  });

  it("prevents parents from creating replay records for a team", () => {
    const result = createParentReplay(seedState, {
      teamId: "team-tigers",
      coachUserId: "user-parent-jordan",
      focusAreas: ["catching"],
      now: NOW
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain("Only org admins or assigned coaches");
    expect(result.state.parentReplays).toHaveLength(0);
  });

  it("requires 2-3 focus areas before queueing a replay", () => {
    const result = createParentReplay(seedState, {
      teamId: "team-tigers",
      coachUserId: "user-coach-taylor",
      focusAreas: ["catching"],
      now: NOW
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain("2-3 practice focus areas");
  });
});

describe("assistive suggestions", () => {
  it("keeps admin, coach, and parent assistance recommendation-only and scoped", () => {
    const adminSuggestions = buildAdminAssistiveSuggestions(seedState, NOW);
    const coachSuggestions = buildCoachAssistiveSuggestions(seedState, "user-coach-taylor", NOW);
    const parentSuggestions = buildParentAssistiveSuggestions(seedState, "user-parent-jordan", NOW);

    expect(adminSuggestions[0]?.boundary).toContain("cannot approve");
    expect(coachSuggestions[0]?.boundary).toContain("coach must edit and save");
    expect(parentSuggestions[0]?.boundary).toContain("approved child/team records");
    expect(parentSuggestions[0]?.boundary).toContain("cannot RSVP");
  });
});

describe("team portal branding", () => {
  it("allows an assigned coach to update their team's colors and mascot", () => {
    const result = updateTeamPortalBranding(seedState, {
      teamId: "team-tigers",
      actorUserId: "user-coach-taylor",
      mascot: "Orange Tiger",
      primaryColor: "#ea580c",
      secondaryColor: "#2563eb",
      themeKey: "baseball",
      now: NOW
    });
    const updatedTeam = result.state.teams.find((team) => team.id === "team-tigers");

    expect(result.ok).toBe(true);
    expect(updatedTeam?.mascot).toBe("Orange Tiger");
    expect(updatedTeam?.primaryColor).toBe("#ea580c");
    expect(result.state.auditEvents[0]?.action).toBe("team_portal_branding_updated");
  });

  it("prevents an unassigned coach from updating another team's portal", () => {
    const result = updateTeamPortalBranding(seedState, {
      teamId: "team-hawks",
      actorUserId: "user-coach-taylor",
      mascot: "Wrong Hawk",
      primaryColor: "#111111",
      secondaryColor: "#eeeeee",
      themeKey: "football",
      now: NOW
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain("assigned coach");
    expect(result.state.teams.find((team) => team.id === "team-hawks")?.mascot).toBe("Hawk");
  });

  it("rejects invalid color values", () => {
    const result = updateTeamPortalBranding(seedState, {
      teamId: "team-tigers",
      actorUserId: "user-coach-taylor",
      mascot: "Tiger",
      primaryColor: "orange",
      secondaryColor: "#2563eb",
      themeKey: "baseball",
      now: NOW
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain("#RRGGBB");
  });
});

describe("registration system", () => {
  it("queues parent registration requests for admin review without granting access", () => {
    const result = createRegistrationRequest(seedState, {
      teamId: "team-tigers",
      parentName: "Taylor Parent",
      parentEmail: "taylor@example.com",
      playerFirstName: "Parker",
      playerLastInitial: "P",
      now: NOW
    });

    expect(result.ok).toBe(true);
    expect(result.request?.status).toBe("pending");
    expect(result.state.registrationRequests).toHaveLength(seedState.registrationRequests.length + 1);
    expect(result.message).toContain("No account access was granted");
  });

  it("rejects invalid registration emails", () => {
    const result = createRegistrationRequest(seedState, {
      teamId: "team-tigers",
      parentName: "Taylor Parent",
      parentEmail: "not-an-email",
      playerFirstName: "Parker",
      playerLastInitial: "P",
      now: NOW
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain("valid parent email");
  });
});
