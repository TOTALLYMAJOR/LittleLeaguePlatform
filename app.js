const state = {
  isLoggedIn: false,
  role: "admin",
  route: "dashboard",
  activeThreadId: "thread-3u-tigers",
  invites: [
    { id: "invite-1", teamId: "team-3u-tigers", parentName: "Sam Brooks", channel: "email + sms", status: "queued" },
    { id: "invite-2", teamId: "team-5u-hawks", parentName: "Pat Quinn", channel: "email", status: "sent" }
  ],
  notifications: [
    { id: "note-1", title: "Schedule changed", body: "Tiny Tigers game moved to Field 1 at 9:00 AM.", type: "schedule", unread: true },
    { id: "note-2", title: "Score posted", body: "Tiny Tigers 8, Rookie Rockets 5.", type: "score", unread: true },
    { id: "note-3", title: "Private message", body: "Coach Taylor sent a parent message.", type: "chat", unread: false }
  ],
  preferences: {
    chat: true,
    privateMessages: true,
    scheduleChanges: true,
    scores: true,
    mediaLinks: false
  },
  teams: [
    { id: "team-3u-tigers", name: "Tiny Tigers", division: "3U", coach: "Coach Taylor", players: 9, color: "🐯" },
    { id: "team-3u-rockets", name: "Rookie Rockets", division: "3U", coach: "Coach Lee", players: 8, color: "🚀" },
    { id: "team-4u-bears", name: "Blue Bears", division: "4U", coach: "Coach Morgan", players: 10, color: "🐻" },
    { id: "team-5u-hawks", name: "Happy Hawks", division: "5U", coach: "Coach Rivera", players: 11, color: "🦅" },
    { id: "team-6u-comets", name: "Green Comets", division: "6U", coach: "Coach Johnson", players: 12, color: "☄️" },
    { id: "team-6u-sharks", name: "Little Sharks", division: "6U", coach: "Coach Smith", players: 10, color: "🦈" }
  ],
  players: [
    { id: "player-1", teamId: "team-3u-tigers", firstName: "Mason", lastInitial: "T", jersey: "7", parentName: "Jordan Taylor", email: "jordan@example.com", phone: "555-0101", access: "active" },
    { id: "player-2", teamId: "team-3u-tigers", firstName: "Avery", lastInitial: "P", jersey: "12", parentName: "Riley Parker", email: "riley@example.com", phone: "555-0102", access: "active" },
    { id: "player-3", teamId: "team-3u-rockets", firstName: "Noah", lastInitial: "B", jersey: "4", parentName: "Sam Brooks", email: "sam@example.com", phone: "555-0103", access: "pending" },
    { id: "player-4", teamId: "team-4u-bears", firstName: "Emma", lastInitial: "C", jersey: "10", parentName: "Casey Clark", email: "casey@example.com", phone: "555-0104", access: "active" },
    { id: "player-5", teamId: "team-6u-comets", firstName: "Liam", lastInitial: "R", jersey: "2", parentName: "Morgan Reed", email: "morgan@example.com", phone: "555-0105", access: "active" }
  ],
  registrations: [
    { id: "reg-1", parentName: "Jamie Owens", email: "jamie@example.com", phone: "555-0199", childFirst: "Mason", childLastInitial: "T", requestedTeamId: "team-3u-tigers", confidence: "High", status: "pending" },
    { id: "reg-2", parentName: "Pat Quinn", email: "pat@example.com", phone: "555-0188", childFirst: "Ella", childLastInitial: "Q", requestedTeamId: "team-5u-hawks", confidence: "Medium", status: "pending" },
    { id: "reg-3", parentName: "Chris Bell", email: "chris@example.com", phone: "555-0177", childFirst: "Noah", childLastInitial: "B", requestedTeamId: "team-3u-rockets", confidence: "High", status: "approved" }
  ],
  events: [
    { id: "event-1", date: "2026-04-04", time: "09:00", division: "3U", teamId: "team-3u-tigers", type: "game", opponent: "Rookie Rockets", location: "Field 1", homeAway: "home", status: "completed", teamScore: 8, opponentScore: 5 },
    { id: "event-2", date: "2026-04-04", time: "10:15", division: "4U", teamId: "team-4u-bears", type: "game", opponent: "North Cubs", location: "Field 2", homeAway: "home", status: "completed", teamScore: 6, opponentScore: 6 },
    { id: "event-3", date: "2026-04-11", time: "09:00", division: "5U", teamId: "team-5u-hawks", type: "game", opponent: "Red Foxes", location: "Field 1", homeAway: "away", status: "scheduled", teamScore: null, opponentScore: null },
    { id: "event-4", date: "2026-04-12", time: "13:30", division: "6U", teamId: "team-6u-comets", type: "practice", opponent: "", location: "Practice Field", homeAway: "neutral", status: "scheduled", teamScore: null, opponentScore: null },
    { id: "event-5", date: "2026-04-18", time: "11:00", division: "6U", teamId: "team-6u-sharks", type: "game", opponent: "Green Comets", location: "Field 3", homeAway: "home", status: "completed", teamScore: 4, opponentScore: 7 }
  ],
  mediaLinks: [
    { id: "media-1", title: "Opening Day Album", description: "Google Photos album for the whole league.", type: "google_photos", url: "https://photos.google.com/share/demo-opening-day", visibility: "shared_org", teamIds: [] },
    { id: "media-2", title: "How to tie cleats", description: "Quick coach help video.", type: "youtube", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", visibility: "shared_org", teamIds: [] },
    { id: "media-3", title: "Tiny Tigers photos", description: "Team-only Google Photos link.", type: "google_photos", url: "https://photos.google.com/share/demo-tigers", visibility: "team_only", teamIds: ["team-3u-tigers"] }
  ],
  threads: [
    { id: "thread-3u-tigers", title: "Tiny Tigers Team Chat", type: "team_group", teamId: "team-3u-tigers", members: "Coach Taylor + parents" },
    { id: "thread-6u-comets", title: "Green Comets Team Chat", type: "team_group", teamId: "team-6u-comets", members: "Coach Johnson + parents" },
    { id: "thread-private-1", title: "Coach Taylor ↔ Mason T. Parent", type: "private", teamId: "team-3u-tigers", members: "Private coach/parent message" },
    { id: "thread-admin", title: "Org Admin Broadcast", type: "admin_broadcast", teamId: null, members: "All coaches" }
  ],
  messages: [
    { id: "msg-1", threadId: "thread-3u-tigers", sender: "Coach Taylor", role: "coach", body: "Welcome, Tiny Tigers families! Schedule is posted.", createdAt: "2026-03-21 6:00 PM" },
    { id: "msg-2", threadId: "thread-3u-tigers", sender: "Avery P. Parent", role: "parent", body: "Thanks coach. Is snack signup coming soon?", createdAt: "2026-03-21 6:11 PM" },
    { id: "msg-3", threadId: "thread-3u-tigers", sender: "Org Admin", role: "admin", body: "Reminder: all player names display as first name + last initial.", createdAt: "2026-03-21 6:18 PM" },
    { id: "msg-4", threadId: "thread-private-1", sender: "Coach Taylor", role: "coach", body: "Mason did great at practice today.", createdAt: "2026-03-22 7:20 PM" },
    { id: "msg-5", threadId: "thread-admin", sender: "Org Admin", role: "admin", body: "Please confirm your roster by Friday.", createdAt: "2026-03-23 9:00 AM" }
  ],
  audit: [
    "Roster CSV validated by Org Admin",
    "Schedule change push notification sent to 3U families",
    "Google Photos link added to Tiny Tigers",
    "Score posted for Tiny Tigers vs Rookie Rockets"
  ]
};

const templates = {
  dashboard: document.getElementById("dashboardTemplate"),
  myteam: document.getElementById("myteamTemplate"),
  teams: document.getElementById("teamsTemplate"),
  roster: document.getElementById("rosterTemplate"),
  schedule: document.getElementById("scheduleTemplate"),
  standings: document.getElementById("standingsTemplate"),
  chat: document.getElementById("chatTemplate"),
  media: document.getElementById("mediaTemplate"),
  registrations: document.getElementById("registrationsTemplate"),
  imports: document.getElementById("importsTemplate"),
  notifications: document.getElementById("notificationsTemplate"),
  invites: document.getElementById("invitesTemplate"),
  permissions: document.getElementById("permissionsTemplate"),
  roadmap: document.getElementById("roadmapTemplate"),
  archive: document.getElementById("archiveTemplate")
};

const titles = {
  dashboard: ["Dashboard", "Private youth sports organization overview."],
  myteam: ["My Team", "Parent and coach friendly team home screen."],
  teams: ["Teams", "Login-required team spaces for 3U through 6U."],
  roster: ["Rosters", "Coach-editable child profiles with parent/guardian access."],
  schedule: ["Master Schedule", "CSV-importable events, scores, and push alerts."],
  standings: ["Standings", "Visible to all logged-in parents and coaches."],
  chat: ["Chat", "Team group chat and coach-parent private messages."],
  media: ["Media Links", "Google Photos and YouTube links opened inside the app."],
  registrations: ["Parent Registrations", "Self-registration requests linked to roster/team access."],
  imports: ["CSV Imports", "Validate roster and schedule spreadsheets before saving."],
  notifications: ["Notifications", "Push notification preferences and simulated send log."],
  invites: ["Invites", "Email and SMS invitation workflow simulation."],
  permissions: ["Permissions", "Role-based access and child privacy guardrails."],
  roadmap: ["Roadmap", "What it takes to turn this prototype into production."],
  archive: ["Season Archive", "Read-only archives and chat deletion after season."]
};

const roleDescriptions = {
  admin: "Can manage all teams, schedules, scores, standings, users, links, and archives.",
  coach: "Can manage assigned team roster/content and message parents.",
  parent: "Can view private team space, chat with coaches, and add media links."
};

function init() {
  document.getElementById("enterAppButton").addEventListener("click", () => {
    state.role = document.getElementById("loginRoleSelect").value;
    document.getElementById("roleSelect").value = state.role;
    state.isLoggedIn = true;
    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");
    document.getElementById("roleDescription").textContent = roleDescriptions[state.role];
    render();
    toast("Private portal unlocked.");
  });

  document.getElementById("openRegisterButton").addEventListener("click", openParentRegistrationModal);
  document.getElementById("logoutButton").addEventListener("click", () => {
    state.isLoggedIn = false;
    document.getElementById("app").classList.add("hidden");
    document.getElementById("loginScreen").classList.remove("hidden");
  });

  document.querySelectorAll(".nav-button").forEach((button) => {
    button.addEventListener("click", () => navigate(button.dataset.route));
  });

  document.getElementById("roleSelect").addEventListener("change", (event) => {
    state.role = event.target.value;
    document.getElementById("loginRoleSelect").value = state.role;
    document.getElementById("roleDescription").textContent = roleDescriptions[state.role];
    render();
    toast(`Viewing as ${event.target.options[event.target.selectedIndex].text}`);
  });

  document.getElementById("menuButton").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
  });

  document.getElementById("notificationBell").addEventListener("click", () => navigate("notifications"));
  document.getElementById("roleDescription").textContent = roleDescriptions[state.role];
  updateNotificationCount();
}

function navigate(route) {
  state.route = route;
  document.querySelectorAll(".nav-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.route === route);
  });
  document.getElementById("sidebar").classList.remove("open");
  render();
}

function render() {
  const [title, subtitle] = titles[state.route];
  document.getElementById("pageTitle").textContent = title;
  document.getElementById("pageSubtitle").textContent = subtitle;

  const view = document.getElementById("view");
  view.replaceChildren(templates[state.route].content.cloneNode(true));

  const renderer = {
    dashboard: renderDashboard,
    myteam: renderMyTeam,
    teams: renderTeams,
    roster: renderRoster,
    schedule: renderSchedule,
    standings: renderStandings,
    chat: renderChat,
    media: renderMedia,
    registrations: renderRegistrations,
    imports: renderImports,
    notifications: renderNotifications,
    invites: renderInvites,
    permissions: renderPermissions,
    roadmap: renderRoadmap,
    archive: renderArchive
  }[state.route];

  renderer();
  updateNotificationCount();
}

function renderDashboard() {
  document.getElementById("statTeams").textContent = state.teams.length;
  document.getElementById("statPlayers").textContent = state.players.length;
  document.getElementById("statEvents").textContent = state.events.length;
  document.getElementById("statPending").textContent = state.registrations.filter((request) => request.status === "pending").length;

  const queue = document.getElementById("adminQueue");
  const tasks = state.role === "admin"
    ? ["Review pending self-registration matches", "Enter final scores from Saturday games", "Upload next schedule CSV", "Archive season after final weekend"]
    : state.role === "coach"
      ? ["Confirm roster names use first + last initial", "Check team chat questions", "Add YouTube practice help links"]
      : ["Check this week’s schedule", "Review team chat", "Add Google Photos link for team album"];
  queue.innerHTML = tasks.map((task) => `<li>${escapeHtml(task)}</li>`).join("");

  const feed = document.getElementById("activityFeed");
  feed.innerHTML = state.audit.map((item) => `
    <div class="activity-item">
      <strong>${escapeHtml(item)}</strong>
      <span class="muted">Spring 2026 · private portal event</span>
    </div>
  `).join("");
}


function renderMyTeam() {
  const team = getPrimaryTeamForRole();
  const players = getPlayersForTeam(team.id);
  const teamEvents = state.events.filter((event) => event.teamId === team.id).slice(0, 4);
  const media = state.mediaLinks.filter((link) => link.visibility === "shared_org" || link.teamIds.includes(team.id));

  document.getElementById("myTeamCard").innerHTML = `
    <div class="hero-team-main">
      <div>
        <span class="tag">${escapeHtml(team.division)} · Private Team Space</span>
        <h3>${escapeHtml(team.name)}</h3>
        <p class="muted">${escapeHtml(team.coach)} · ${players.length} players · ${state.role === "parent" ? "Parent view" : state.role === "coach" ? "Coach view" : "Admin view"}</p>
        <div class="meta-row" style="margin-top: 18px;">
          <span class="meta-chip">Chat enabled</span>
          <span class="meta-chip">Schedule alerts on</span>
          <span class="meta-chip">Media links inside app</span>
        </div>
      </div>
      <div class="big-team-logo">${team.color}</div>
    </div>
  `;

  const checklistItems = [
    ["Roster imported", true],
    ["Parent invites sent", state.invites.some((invite) => invite.teamId === team.id)],
    ["Schedule CSV uploaded", state.events.some((event) => event.teamId === team.id)],
    ["Scores entered", state.events.some((event) => event.teamId === team.id && event.status === "completed")],
    ["Media links added", media.length > 0]
  ];

  document.getElementById("checklist").innerHTML = checklistItems.map(([label, done]) => `
    <div class="check-item">
      <div class="check-dot ${done ? "" : "pending"}">${done ? "✓" : "!"}</div>
      <div>
        <strong>${escapeHtml(label)}</strong>
        <p class="muted">${done ? "Ready for families." : "Still needs attention before launch."}</p>
      </div>
    </div>
  `).join("");

  document.getElementById("teamScheduleCards").innerHTML = teamEvents.map((event) => {
    const date = new Date(`${event.date}T12:00:00`);
    return `
      <div class="calendar-card">
        <div class="calendar-date"><span>${date.toLocaleDateString(undefined, { month: "short" })}</span>${date.getDate()}</div>
        <div>
          <strong>${capitalize(event.type)} ${event.opponent ? "vs " + escapeHtml(event.opponent) : ""}</strong>
          <p class="muted">${escapeHtml(event.time)} · ${escapeHtml(event.location)} · ${escapeHtml(event.status)}</p>
        </div>
      </div>
    `;
  }).join("") || `<p class="muted">No upcoming events for this team.</p>`;

  document.getElementById("teamMediaList").innerHTML = media.map((link) => `
    <div class="activity-item">
      <strong>${link.type === "youtube" ? "▶️" : "📷"} ${escapeHtml(link.title)}</strong>
      <span class="muted">${escapeHtml(link.description)} · ${link.visibility === "shared_org" ? "Shared org" : "Team only"}</span>
    </div>
  `).join("") || `<p class="muted">No links yet.</p>`;
}


function renderTeams() {
  const grid = document.getElementById("teamsGrid");
  const search = document.getElementById("teamSearch");
  const addButton = document.getElementById("addTeamButton");

  addButton.disabled = state.role !== "admin";
  addButton.title = state.role === "admin" ? "Add team" : "Only org admin can add teams";
  addButton.addEventListener("click", openAddTeamModal);

  function draw() {
    const query = search.value.trim().toLowerCase();
    const teams = state.teams.filter((team) => {
      return [team.name, team.division, team.coach].join(" ").toLowerCase().includes(query);
    });

    grid.innerHTML = teams.map((team) => `
      <article class="card team-card">
        <div class="team-card-top">
          <div>
            <h3>${escapeHtml(team.name)}</h3>
            <p class="muted">${escapeHtml(team.coach)}</p>
          </div>
          <div class="team-logo">${team.color}</div>
        </div>
        <div class="meta-row">
          <span class="meta-chip">${escapeHtml(team.division)}</span>
          <span class="meta-chip">${getPlayersForTeam(team.id).length} players</span>
          <span class="meta-chip">Private</span>
        </div>
        <p class="muted">Team space includes roster, schedule, standings, chat, and media links.</p>
      </article>
    `).join("");
  }

  search.addEventListener("input", draw);
  draw();
}

function renderRoster() {
  const teamFilter = document.getElementById("rosterTeamFilter");
  const table = document.getElementById("rosterTable");
  const addButton = document.getElementById("addPlayerButton");

  teamFilter.innerHTML = state.teams.map((team) => `<option value="${team.id}">${escapeHtml(team.name)} · ${team.division}</option>`).join("");
  addButton.disabled = state.role === "parent";
  addButton.addEventListener("click", openAddPlayerModal);
  document.getElementById("exportRosterButton").addEventListener("click", exportRosterCsv);

  function draw() {
    const teamId = teamFilter.value;
    table.innerHTML = state.players.filter((player) => player.teamId === teamId).map((player) => {
      const canEdit = state.role !== "parent";
      return `
        <tr>
          <td><strong>${escapeHtml(player.firstName)} ${escapeHtml(player.lastInitial)}.</strong><br><span class="muted">Child profile · no login</span></td>
          <td>${escapeHtml(player.jersey)}</td>
          <td>${escapeHtml(player.parentName)}</td>
          <td>${escapeHtml(player.email)}<br><span class="muted">${escapeHtml(player.phone)}</span></td>
          <td><span class="meta-chip ${player.access === "active" ? "status-approved" : "status-pending"}">${escapeHtml(player.access)}</span></td>
          <td>
            <button class="mini-button" ${canEdit ? "" : "disabled"} data-edit-player="${player.id}">Edit</button>
          </td>
        </tr>
      `;
    }).join("") || `<tr><td colspan="6">No players on this roster yet.</td></tr>`;

    document.querySelectorAll("[data-edit-player]").forEach((button) => {
      button.addEventListener("click", () => openEditPlayerModal(button.dataset.editPlayer));
    });
  }

  teamFilter.addEventListener("change", draw);
  draw();
}

function renderSchedule() {
  const divisionFilter = document.getElementById("scheduleDivisionFilter");
  const teamFilter = document.getElementById("scheduleTeamFilter");
  const table = document.getElementById("scheduleTable");

  teamFilter.innerHTML = `<option value="all">All teams</option>` + state.teams.map((team) => `<option value="${team.id}">${escapeHtml(team.name)}</option>`).join("");

  document.getElementById("addEventButton").disabled = state.role !== "admin";
  document.getElementById("addEventButton").addEventListener("click", openAddEventModal);
  document.getElementById("simulateScheduleChangeButton").addEventListener("click", () => {
    addNotification("Schedule changed", "Affected parents and coaches would receive a push alert.", "schedule");
    state.audit.unshift("Schedule change push notification simulated");
  });

  function draw() {
    const division = divisionFilter.value;
    const teamId = teamFilter.value;
    const filtered = state.events.filter((event) => {
      return (division === "all" || event.division === division) && (teamId === "all" || event.teamId === teamId);
    });

    table.innerHTML = filtered.map((event) => {
      const team = state.teams.find((item) => item.id === event.teamId);
      const scoreCell = state.role === "admin" && event.type === "game"
        ? `<div class="score-inputs">
             <input type="number" aria-label="Team score" value="${event.teamScore ?? ""}" data-score-team="${event.id}">
             <span>-</span>
             <input type="number" aria-label="Opponent score" value="${event.opponentScore ?? ""}" data-score-opp="${event.id}">
             <button class="mini-button" data-save-score="${event.id}">Save</button>
           </div>`
        : event.teamScore !== null
          ? `${event.teamScore} - ${event.opponentScore}`
          : "—";

      return `
        <tr>
          <td><strong>${formatDate(event.date)}</strong><br><span class="muted">${escapeHtml(event.time)}</span></td>
          <td>${escapeHtml(team?.name || "Unknown")}<br><span class="muted">${escapeHtml(event.division)}</span></td>
          <td>${capitalize(event.type)}</td>
          <td>${escapeHtml(event.opponent || "—")}</td>
          <td>${escapeHtml(event.location)}</td>
          <td>${scoreCell}</td>
          <td><span class="meta-chip">${escapeHtml(event.status)}</span></td>
        </tr>
      `;
    }).join("");

    document.querySelectorAll("[data-save-score]").forEach((button) => {
      button.addEventListener("click", () => saveScore(button.dataset.saveScore));
    });
  }

  divisionFilter.addEventListener("change", draw);
  teamFilter.addEventListener("change", draw);
  draw();
}

function saveScore(eventId) {
  const event = state.events.find((item) => item.id === eventId);
  const teamInput = document.querySelector(`[data-score-team="${eventId}"]`);
  const oppInput = document.querySelector(`[data-score-opp="${eventId}"]`);
  const teamScore = Number(teamInput.value);
  const opponentScore = Number(oppInput.value);

  if (!Number.isFinite(teamScore) || !Number.isFinite(opponentScore) || teamInput.value === "" || oppInput.value === "") {
    toast("Enter both scores before saving.");
    return;
  }

  event.teamScore = teamScore;
  event.opponentScore = opponentScore;
  event.status = "completed";
  state.audit.unshift(`Score posted for ${getTeamName(event.teamId)}: ${teamScore}-${opponentScore}`);
  addNotification("Score posted", `${getTeamName(event.teamId)} score saved: ${teamScore}-${opponentScore}.`, "score");
  renderSchedule();
}

function renderStandings() {
  const filter = document.getElementById("standingsDivisionFilter");
  const groups = document.getElementById("standingsGroups");
  document.getElementById("recalculateStandingsButton").addEventListener("click", () => {
    toast("Standings recalculated from completed admin-entered scores.");
    draw();
  });

  function draw() {
    const selected = filter.value;
    const divisions = ["3U", "4U", "5U", "6U"].filter((division) => selected === "all" || selected === division);
    const standings = calculateStandings();

    groups.innerHTML = divisions.map((division) => {
      const rows = standings.filter((row) => row.division === division);
      return `
        <article class="card table-card">
          <div class="card-header" style="padding: 18px 18px 0;">
            <h3>${division} Standings</h3>
            <span class="tag">All parents can view</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Team</th>
                <th>W</th>
                <th>L</th>
                <th>T</th>
                <th>PF</th>
                <th>PA</th>
                <th>Diff</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map((row, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${escapeHtml(row.team)}</td>
                  <td>${row.wins}</td>
                  <td>${row.losses}</td>
                  <td>${row.ties}</td>
                  <td>${row.pointsFor}</td>
                  <td>${row.pointsAgainst}</td>
                  <td>${row.diff}</td>
                </tr>
              `).join("") || `<tr><td colspan="8">No completed games yet.</td></tr>`}
            </tbody>
          </table>
        </article>
      `;
    }).join("");
  }

  filter.addEventListener("change", draw);
  draw();
}

function calculateStandings() {
  const rows = state.teams.map((team) => ({
    teamId: team.id,
    team: team.name,
    division: team.division,
    wins: 0,
    losses: 0,
    ties: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    diff: 0
  }));

  state.events.filter((event) => event.type === "game" && event.status === "completed" && event.teamScore !== null).forEach((event) => {
    const row = rows.find((item) => item.teamId === event.teamId);
    if (!row) return;
    row.pointsFor += event.teamScore;
    row.pointsAgainst += event.opponentScore;
    if (event.teamScore > event.opponentScore) row.wins += 1;
    if (event.teamScore < event.opponentScore) row.losses += 1;
    if (event.teamScore === event.opponentScore) row.ties += 1;
    row.diff = row.pointsFor - row.pointsAgainst;
  });

  return rows.sort((a, b) => b.wins - a.wins || b.ties - a.ties || b.diff - a.diff || b.pointsFor - a.pointsFor || a.team.localeCompare(b.team));
}

function renderChat() {
  const list = document.getElementById("threadList");
  const messages = document.getElementById("messages");
  const form = document.getElementById("messageForm");
  const input = document.getElementById("messageInput");

  function drawThreads() {
    list.innerHTML = state.threads.map((thread) => `
      <button class="thread-button ${thread.id === state.activeThreadId ? "active" : ""}" data-thread-id="${thread.id}">
        <strong>${escapeHtml(thread.title)}</strong>
        <span>${escapeHtml(thread.members)}</span>
      </button>
    `).join("");

    document.querySelectorAll("[data-thread-id]").forEach((button) => {
      button.addEventListener("click", () => {
        state.activeThreadId = button.dataset.threadId;
        draw();
      });
    });
  }

  function drawMessages() {
    const thread = state.threads.find((item) => item.id === state.activeThreadId);
    document.getElementById("activeThreadTitle").textContent = thread.title;
    document.getElementById("activeThreadMeta").textContent = `${thread.type.replaceAll("_", " ")} · chat deletes after season`;
    messages.innerHTML = state.messages
      .filter((message) => message.threadId === state.activeThreadId)
      .map((message) => `
        <div class="message ${message.role === state.role ? "mine" : ""}">
          <strong>${escapeHtml(message.sender)}</strong>
          <div>${escapeHtml(message.body)}</div>
          <time>${escapeHtml(message.createdAt)}</time>
        </div>
      `).join("");
    messages.scrollTop = messages.scrollHeight;
  }

  function draw() {
    drawThreads();
    drawMessages();
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const body = input.value.trim();
    if (!body) return;

    const sender = state.role === "admin" ? "Org Admin" : state.role === "coach" ? "Coach Taylor" : "Mason T. Parent";
    state.messages.push({
      id: `msg-${safeId()}`,
      threadId: state.activeThreadId,
      sender,
      role: state.role,
      body,
      createdAt: new Date().toLocaleString()
    });
    input.value = "";
    addNotification("New chat message", `${sender}: ${body.slice(0, 44)}${body.length > 44 ? "…" : ""}`, "chat");
    drawMessages();
  });

  draw();
}

function renderMedia() {
  const typeFilter = document.getElementById("mediaTypeFilter");
  const visibilityFilter = document.getElementById("mediaVisibilityFilter");
  const grid = document.getElementById("mediaGrid");
  document.getElementById("addMediaButton").addEventListener("click", openAddMediaModal);

  function draw() {
    const type = typeFilter.value;
    const visibility = visibilityFilter.value;
    const links = state.mediaLinks.filter((link) => {
      return (type === "all" || link.type === type) && (visibility === "all" || link.visibility === visibility);
    });

    grid.innerHTML = links.map((link) => `
      <article class="card media-card">
        <div class="media-preview">${link.type === "youtube" ? "▶️" : "📷"}</div>
        <div>
          <h3>${escapeHtml(link.title)}</h3>
          <p class="muted">${escapeHtml(link.description)}</p>
        </div>
        <div class="meta-row">
          <span class="meta-chip">${link.type === "youtube" ? "YouTube" : "Google Photos"}</span>
          <span class="meta-chip">${link.visibility === "shared_org" ? "Shared org" : "Team only"}</span>
        </div>
        <div class="media-actions">
          <button class="primary-button" data-open-media="${link.id}">Open Inside App</button>
          <button class="secondary-button" data-report-media="${link.id}">Report</button>
          <button class="secondary-button" data-remove-media="${link.id}">Remove</button>
        </div>
      </article>
    `).join("");

    document.querySelectorAll("[data-open-media]").forEach((button) => {
      button.addEventListener("click", () => {
        const item = state.mediaLinks.find((link) => link.id === button.dataset.openMedia);
        openInAppBrowser(item);
      });
    });

    document.querySelectorAll("[data-report-media]").forEach((button) => {
      button.addEventListener("click", () => toast("Media report submitted for coach/admin review."));
    });

    document.querySelectorAll("[data-remove-media]").forEach((button) => {
      button.addEventListener("click", () => {
        if (state.role === "parent") {
          toast("Only coaches and org admin can remove links.");
          return;
        }
        state.mediaLinks = state.mediaLinks.filter((link) => link.id !== button.dataset.removeMedia);
        toast("Media link removed.");
        draw();
      });
    });
  }

  typeFilter.addEventListener("change", draw);
  visibilityFilter.addEventListener("change", draw);
  draw();
}

function renderRegistrations() {
  const filter = document.getElementById("registrationStatusFilter");
  const table = document.getElementById("registrationTable");

  document.getElementById("newRegistrationButton").addEventListener("click", openParentRegistrationModal);

  function draw() {
    const status = filter.value;
    const rows = state.registrations.filter((request) => status === "all" || request.status === status);
    table.innerHTML = rows.map((request) => `
      <tr>
        <td><strong>${escapeHtml(request.parentName)}</strong><br><span class="muted">${escapeHtml(request.email)} · ${escapeHtml(request.phone)}</span></td>
        <td>${escapeHtml(request.childFirst)} ${escapeHtml(request.childLastInitial)}.</td>
        <td>${escapeHtml(getTeamName(request.requestedTeamId))}</td>
        <td>${escapeHtml(request.confidence)}</td>
        <td><span class="meta-chip status-${escapeHtml(request.status)}">${escapeHtml(request.status)}</span></td>
        <td>
          <button class="mini-button" data-approve-registration="${request.id}" ${state.role !== "admin" || request.status !== "pending" ? "disabled" : ""}>Approve</button>
          <button class="mini-button" data-reject-registration="${request.id}" ${state.role !== "admin" || request.status !== "pending" ? "disabled" : ""}>Reject</button>
        </td>
      </tr>
    `).join("") || `<tr><td colspan="6">No registration requests match this filter.</td></tr>`;

    document.querySelectorAll("[data-approve-registration]").forEach((button) => {
      button.addEventListener("click", () => reviewRegistration(button.dataset.approveRegistration, "approved"));
    });
    document.querySelectorAll("[data-reject-registration]").forEach((button) => {
      button.addEventListener("click", () => reviewRegistration(button.dataset.rejectRegistration, "rejected"));
    });
  }

  filter.addEventListener("change", draw);
  draw();
}

function reviewRegistration(id, status) {
  const request = state.registrations.find((item) => item.id === id);
  request.status = status;
  state.audit.unshift(`Registration ${status} for ${request.parentName}`);
  addNotification(`Registration ${status}`, `${request.parentName} request marked ${status}.`, "registration");
  renderRegistrations();
}

function renderImports() {
  const rosterBox = document.getElementById("rosterCsv");
  const scheduleBox = document.getElementById("scheduleCsv");

  rosterBox.value = [
    "team,division,player_first,last_initial,jersey,parent_name,parent_email,parent_phone",
    "Tiny Tigers,3U,Mason,T,7,Jordan Taylor,jordan@example.com,555-0101",
    "Tiny Tigers,3U,Avery,P,12,Riley Parker,riley@example.com,555-0102"
  ].join("\n");

  scheduleBox.value = [
    "date,time,division,team,type,opponent,location,home_away",
    "2026-04-25,09:00,3U,Tiny Tigers,game,Rookie Rockets,Field 1,home",
    "2026-04-25,10:15,6U,Green Comets,practice,,Practice Field,neutral"
  ].join("\n");

  document.getElementById("importRosterButton").disabled = state.role !== "admin";
  document.getElementById("importScheduleButton").disabled = state.role !== "admin";

  document.getElementById("importRosterButton").addEventListener("click", () => {
    document.getElementById("rosterImportResult").textContent = validateCsv(rosterBox.value, ["team", "division", "player_first", "last_initial", "jersey", "parent_name", "parent_email", "parent_phone"]);
  });

  document.getElementById("importScheduleButton").addEventListener("click", () => {
    document.getElementById("scheduleImportResult").textContent = validateCsv(scheduleBox.value, ["date", "time", "division", "team", "type", "opponent", "location", "home_away"]);
  });
}

function renderNotifications() {
  const prefs = document.getElementById("preferenceList");
  const log = document.getElementById("notificationLog");

  const labels = {
    chat: "Team chat messages",
    privateMessages: "Private coach-parent messages",
    scheduleChanges: "Schedule changes",
    scores: "Score updates",
    mediaLinks: "New media links"
  };

  prefs.innerHTML = Object.entries(state.preferences).map(([key, value]) => `
    <div class="preference-row">
      <div>
        <strong>${escapeHtml(labels[key])}</strong>
        <p class="muted">Push notification ${value ? "enabled" : "muted"}</p>
      </div>
      <label class="toggle">
        <input type="checkbox" ${value ? "checked" : ""} data-pref="${key}">
        <span></span>
      </label>
    </div>
  `).join("");

  document.querySelectorAll("[data-pref]").forEach((input) => {
    input.addEventListener("change", () => {
      state.preferences[input.dataset.pref] = input.checked;
      renderNotifications();
    });
  });

  log.innerHTML = state.notifications.map((note) => `
    <div class="activity-item">
      <strong>${escapeHtml(note.title)}</strong>
      <span class="muted">${escapeHtml(note.body)}</span>
    </div>
  `).join("");
}


function renderInvites() {
  const teamSelect = document.getElementById("inviteTeamSelect");
  const result = document.getElementById("inviteResult");
  const statusList = document.getElementById("inviteStatusList");

  teamSelect.innerHTML = state.teams.map((team) => `<option value="${team.id}">${escapeHtml(team.name)} · ${team.division}</option>`).join("");

  function draw() {
    statusList.innerHTML = state.invites.map((invite) => `
      <div class="activity-item">
        <strong>${escapeHtml(invite.parentName)} · ${escapeHtml(getTeamName(invite.teamId))}</strong>
        <span class="muted">${escapeHtml(invite.channel)} · ${escapeHtml(invite.status)}</span>
      </div>
    `).join("");
  }

  document.getElementById("sendInvitesButton").disabled = state.role !== "admin";
  document.getElementById("sendInvitesButton").addEventListener("click", () => {
    const teamId = teamSelect.value;
    const pendingParents = state.players.filter((player) => player.teamId === teamId && player.access === "pending");
    const created = pendingParents.length || 1;

    if (pendingParents.length) {
      pendingParents.forEach((player) => {
        state.invites.unshift({
          id: `invite-${safeId()}`,
          teamId,
          parentName: player.parentName,
          channel: "email + sms",
          status: "sent"
        });
      });
    } else {
      state.invites.unshift({
        id: `invite-${safeId()}`,
        teamId,
        parentName: "Demo Parent",
        channel: "email + sms",
        status: "sent"
      });
    }

    result.textContent = `Invite simulation complete.\nTeam: ${getTeamName(teamId)}\nInvites sent: ${created}\nChannels: email + SMS\nProduction would create expiring invite tokens and delivery logs.`;
    addNotification("Invites sent", `${created} parent invite${created === 1 ? "" : "s"} sent for ${getTeamName(teamId)}.`, "invite");
    draw();
  });

  draw();
}

function renderPermissions() {
  const actions = [
    ["Create teams", true, false, false],
    ["Upload roster CSV", true, false, false],
    ["Edit assigned roster", true, true, false],
    ["Enter scores", true, false, false],
    ["View standings", true, true, true],
    ["Team group chat", true, true, true],
    ["Private coach-parent messages", true, true, true],
    ["Add media links", true, true, true],
    ["Remove media links", true, true, false],
    ["Archive season", true, false, false]
  ];

  document.getElementById("permissionMatrix").innerHTML = `
    <div class="permission-grid">
      <div class="head">Action</div>
      <div class="head">Admin</div>
      <div class="head">Coach</div>
      <div class="head">Parent</div>
      ${actions.map((row) => `
        <div>${escapeHtml(row[0])}</div>
        <div class="${row[1] ? "yes" : "no"}">${row[1] ? "Yes" : "No"}</div>
        <div class="${row[2] ? "yes" : "no"}">${row[2] ? "Yes" : "No"}</div>
        <div class="${row[3] ? "yes" : "no"}">${row[3] ? "Yes" : "No"}</div>
      `).join("")}
    </div>
  `;
}

function renderRoadmap() {}

function getPrimaryTeamForRole() {
  if (state.role === "coach") return state.teams.find((team) => team.id === "team-3u-tigers") || state.teams[0];
  if (state.role === "parent") {
    const player = state.players.find((item) => item.parentName.includes("Jordan")) || state.players[0];
    return state.teams.find((team) => team.id === player.teamId) || state.teams[0];
  }
  return state.teams[0];
}


function validateCsv(csv, requiredHeaders) {
  const lines = csv.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return "Error: CSV must include a header row and at least one data row.";

  const headers = parseCsvLine(lines[0]);
  const missing = requiredHeaders.filter((header) => !headers.includes(header));
  if (missing.length) return `Error: Missing required columns: ${missing.join(", ")}`;

  const errors = [];
  lines.slice(1).forEach((line, index) => {
    const values = parseCsvLine(line);
    if (values.length !== headers.length) errors.push(`Row ${index + 2}: expected ${headers.length} values, got ${values.length}.`);
    const row = Object.fromEntries(headers.map((header, i) => [header, values[i] || ""]));
    if (row.division && !["3U", "4U", "5U", "6U"].includes(row.division)) errors.push(`Row ${index + 2}: division must be 3U, 4U, 5U, or 6U.`);
    if (row.parent_email && !row.parent_email.includes("@")) errors.push(`Row ${index + 2}: parent_email is invalid.`);
    if (row.date && Number.isNaN(Date.parse(row.date))) errors.push(`Row ${index + 2}: date is invalid.`);
  });

  if (errors.length) return `Validation failed:\n${errors.join("\n")}`;
  state.audit.unshift(`CSV validated with ${lines.length - 1} rows`);
  toast("CSV validated successfully. In production, admin could now import.");
  return `Validation passed.\nRows ready for import: ${lines.length - 1}\nNo records were saved in this static prototype.`;
}

function renderArchive() {
  document.getElementById("archiveSeasonButton").disabled = state.role !== "admin";
  document.getElementById("archiveSeasonButton").addEventListener("click", () => {
    const count = state.messages.length;
    state.messages = [];
    state.audit.unshift(`Archived Spring 2026 and deleted ${count} chat messages`);
    document.getElementById("archiveResult").textContent = `Spring 2026 archived as read-only.\nDeleted chat messages: ${count}\nSchedules, scores, rosters, standings, and media links retained.`;
    toast("Season archived. Chat history deleted.");
  });
}

function openParentRegistrationModal() {
  openModal("Parent Self-Registration", `
    <div class="form-grid">
      <label>Parent/guardian name<input id="regParentName" value="Taylor Green"></label>
      <label>Email<input id="regEmail" value="taylor@example.com"></label>
      <label>Phone<input id="regPhone" value="555-0166"></label>
      <label>Child first name<input id="regChildFirst" value="Mason"></label>
      <label>Child last initial<input id="regChildInitial" maxlength="1" value="T"></label>
      <label>Requested team
        <select id="regTeam">
          ${state.teams.map((team) => `<option value="${team.id}">${escapeHtml(team.name)} · ${team.division}</option>`).join("")}
        </select>
      </label>
      <div class="privacy-note">Access remains pending until org admin approval unless the invitation link is verified.</div>
    </div>
  `, () => {
    const request = {
      id: `reg-${safeId()}`,
      parentName: document.getElementById("regParentName").value.trim(),
      email: document.getElementById("regEmail").value.trim(),
      phone: document.getElementById("regPhone").value.trim(),
      childFirst: document.getElementById("regChildFirst").value.trim(),
      childLastInitial: document.getElementById("regChildInitial").value.trim().slice(0, 1).toUpperCase(),
      requestedTeamId: document.getElementById("regTeam").value,
      confidence: "Medium",
      status: "pending"
    };
    state.registrations.unshift(request);
    addNotification("New registration", `${request.parentName} requested access for ${request.childFirst} ${request.childLastInitial}.`, "registration");
    if (state.isLoggedIn && state.route === "registrations") renderRegistrations();
  });
}

function openAddTeamModal() {
  openModal("Add Team", `
    <div class="form-grid">
      <label>Team name<input id="newTeamName" value="Golden Gators"></label>
      <label>Division
        <select id="newTeamDivision">
          <option>3U</option><option>4U</option><option>5U</option><option>6U</option>
        </select>
      </label>
      <label>Coach name<input id="newTeamCoach" value="Coach Davis"></label>
      <label>Emoji logo<input id="newTeamEmoji" value="🐊"></label>
    </div>
  `, () => {
    const name = document.getElementById("newTeamName").value.trim();
    const division = document.getElementById("newTeamDivision").value;
    const coach = document.getElementById("newTeamCoach").value.trim();
    const color = document.getElementById("newTeamEmoji").value.trim() || "⭐";
    if (!name || !coach) return toast("Team name and coach are required.");
    state.teams.push({ id: `team-${slugify(name)}`, name, division, coach, players: 0, color });
    toast("Team added.");
    renderTeams();
  });
}

function openAddPlayerModal() {
  const selectedTeamId = document.getElementById("rosterTeamFilter").value;
  openModal("Add Player", playerFormHtml({
    teamId: selectedTeamId,
    firstName: "New",
    lastInitial: "P",
    jersey: "1",
    parentName: "Parent Name",
    email: "parent@example.com",
    phone: "555-0000",
    access: "pending"
  }), () => {
    const player = readPlayerForm();
    player.id = `player-${safeId()}`;
    state.players.push(player);
    state.audit.unshift(`Player added: ${player.firstName} ${player.lastInitial}.`);
    toast("Player added.");
    renderRoster();
  });
}

function openEditPlayerModal(playerId) {
  const player = state.players.find((item) => item.id === playerId);
  openModal("Edit Player", playerFormHtml(player), () => {
    Object.assign(player, readPlayerForm());
    state.audit.unshift(`Player updated: ${player.firstName} ${player.lastInitial}.`);
    toast("Roster updated.");
    renderRoster();
  });
}

function playerFormHtml(player) {
  return `
    <div class="form-grid">
      <label>Team
        <select id="playerTeam">
          ${state.teams.map((team) => `<option value="${team.id}" ${team.id === player.teamId ? "selected" : ""}>${escapeHtml(team.name)} · ${team.division}</option>`).join("")}
        </select>
      </label>
      <label>First name<input id="playerFirst" value="${escapeHtml(player.firstName)}"></label>
      <label>Last initial<input id="playerInitial" maxlength="1" value="${escapeHtml(player.lastInitial)}"></label>
      <label>Jersey<input id="playerJersey" value="${escapeHtml(player.jersey)}"></label>
      <label>Parent/guardian<input id="playerParent" value="${escapeHtml(player.parentName)}"></label>
      <label>Email<input id="playerEmail" value="${escapeHtml(player.email)}"></label>
      <label>Phone<input id="playerPhone" value="${escapeHtml(player.phone)}"></label>
      <label>Access
        <select id="playerAccess">
          <option value="active" ${player.access === "active" ? "selected" : ""}>active</option>
          <option value="pending" ${player.access === "pending" ? "selected" : ""}>pending</option>
        </select>
      </label>
    </div>
  `;
}

function readPlayerForm() {
  return {
    teamId: document.getElementById("playerTeam").value,
    firstName: document.getElementById("playerFirst").value.trim(),
    lastInitial: document.getElementById("playerInitial").value.trim().slice(0, 1).toUpperCase(),
    jersey: document.getElementById("playerJersey").value.trim(),
    parentName: document.getElementById("playerParent").value.trim(),
    email: document.getElementById("playerEmail").value.trim(),
    phone: document.getElementById("playerPhone").value.trim(),
    access: document.getElementById("playerAccess").value
  };
}

function openAddEventModal() {
  openModal("Add Schedule Event", `
    <div class="form-grid">
      <label>Date<input id="newEventDate" type="date" value="2026-04-25"></label>
      <label>Time<input id="newEventTime" type="time" value="09:00"></label>
      <label>Team
        <select id="newEventTeam">
          ${state.teams.map((team) => `<option value="${team.id}">${escapeHtml(team.name)} · ${team.division}</option>`).join("")}
        </select>
      </label>
      <label>Type
        <select id="newEventType">
          <option>game</option><option>practice</option><option>tournament</option><option>meeting</option>
        </select>
      </label>
      <label>Opponent<input id="newEventOpponent" value="Rookie Rockets"></label>
      <label>Location<input id="newEventLocation" value="Field 1"></label>
    </div>
  `, () => {
    const teamId = document.getElementById("newEventTeam").value;
    const team = state.teams.find((item) => item.id === teamId);
    state.events.push({
      id: `event-${safeId()}`,
      date: document.getElementById("newEventDate").value,
      time: document.getElementById("newEventTime").value,
      division: team.division,
      teamId,
      type: document.getElementById("newEventType").value,
      opponent: document.getElementById("newEventOpponent").value.trim(),
      location: document.getElementById("newEventLocation").value.trim(),
      homeAway: "home",
      status: "scheduled",
      teamScore: null,
      opponentScore: null
    });
    addNotification("New schedule event", `New event added for ${team.name}.`, "schedule");
    renderSchedule();
  });
}

function openAddMediaModal() {
  openModal("Add Media Link", `
    <div class="form-grid">
      <label>Title<input id="newMediaTitle" value="Weekend photos"></label>
      <label>Description<input id="newMediaDescription" value="Shared team album or practice video."></label>
      <label>Type
        <select id="newMediaType">
          <option value="google_photos">Google Photos</option>
          <option value="youtube">YouTube</option>
        </select>
      </label>
      <label>URL<input id="newMediaUrl" value="https://photos.google.com/share/team-album"></label>
      <label>Visibility
        <select id="newMediaVisibility">
          <option value="team_only">Team only</option>
          <option value="shared_org">Shared organization</option>
        </select>
      </label>
      <label>Team
        <select id="newMediaTeam">
          ${state.teams.map((team) => `<option value="${team.id}">${escapeHtml(team.name)} · ${team.division}</option>`).join("")}
        </select>
      </label>
    </div>
  `, () => {
    const title = document.getElementById("newMediaTitle").value.trim();
    const url = document.getElementById("newMediaUrl").value.trim();
    if (!title || !url.startsWith("http")) return toast("Title and valid URL are required.");
    state.mediaLinks.unshift({
      id: `media-${safeId()}`,
      title,
      description: document.getElementById("newMediaDescription").value.trim(),
      type: document.getElementById("newMediaType").value,
      url,
      visibility: document.getElementById("newMediaVisibility").value,
      teamIds: [document.getElementById("newMediaTeam").value]
    });
    addNotification("New media link", `${title} was added.`, "media");
    renderMedia();
  });
}

function openModal(title, bodyHtml, onSave) {
  const modal = document.getElementById("modal");
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("modalBody").innerHTML = bodyHtml;

  const saveButton = document.getElementById("modalSaveButton");
  const newSaveButton = saveButton.cloneNode(true);
  saveButton.replaceWith(newSaveButton);
  newSaveButton.addEventListener("click", (event) => {
    event.preventDefault();
    onSave();
    modal.close();
  });

  modal.showModal();
}

function openInAppBrowser(item) {
  const isYoutube = item.type === "youtube";
  const videoId = isYoutube ? extractYoutubeId(item.url) : "";
  const embedHtml = isYoutube && videoId
    ? `<iframe class="in-app-frame" src="https://www.youtube.com/embed/${encodeURIComponent(videoId)}" title="${escapeHtml(item.title)}" allowfullscreen></iframe>`
    : `<div class="in-app-frame" style="display:grid;place-items:center;padding:24px;text-align:center;"><div><strong>Google Photos in-app browser preview</strong><p class="muted">Production mobile app opens this inside a secure in-app browser. This static preview does not embed Google Photos.</p><div class="import-result">${escapeHtml(item.url)}</div></div></div>`;

  openModal(`In-app ${isYoutube ? "YouTube" : "Google Photos"} view`, `
    <div class="form-grid">
      ${embedHtml}
      <button class="secondary-button" id="copyMediaUrlButton" type="button">Copy Link</button>
    </div>
  `, () => {});
  document.getElementById("copyMediaUrlButton").addEventListener("click", async () => {
    await navigator.clipboard.writeText(item.url);
    toast("Link copied.");
  });
}

function exportRosterCsv() {
  const teamId = document.getElementById("rosterTeamFilter").value;
  const rows = [["team", "division", "player_first", "last_initial", "jersey", "parent_name", "parent_email", "parent_phone"]];
  const team = state.teams.find((item) => item.id === teamId);
  getPlayersForTeam(teamId).forEach((player) => {
    rows.push([team.name, team.division, player.firstName, player.lastInitial, player.jersey, player.parentName, player.email, player.phone]);
  });
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${slugify(team.name)}-roster.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
  toast("Roster CSV exported.");
}

function addNotification(title, body, type) {
  state.notifications.unshift({ id: `note-${safeId()}`, title, body, type, unread: true });
  toast(`${title}: ${body}`);
  updateNotificationCount();
}

function updateNotificationCount() {
  const count = state.notifications.filter((note) => note.unread).length;
  const node = document.getElementById("notificationCount");
  if (node) node.textContent = count;
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && insideQuotes && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

function getPlayersForTeam(teamId) {
  return state.players.filter((player) => player.teamId === teamId);
}

function getTeamName(teamId) {
  return state.teams.find((team) => team.id === teamId)?.name || "Unknown team";
}

function formatDate(dateString) {
  return new Date(`${dateString}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function capitalize(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function safeId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function extractYoutubeId(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) return parsed.pathname.slice(1);
    return parsed.searchParams.get("v") || "";
  } catch {
    return "";
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function toast(message) {
  const node = document.getElementById("toast");
  node.textContent = message;
  node.classList.add("show");
  window.clearTimeout(toast.timeoutId);
  toast.timeoutId = window.setTimeout(() => node.classList.remove("show"), 2800);
}

init();
