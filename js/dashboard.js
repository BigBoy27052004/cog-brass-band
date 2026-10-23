// ============================================
// MEMBER DASHBOARD LOGIC
// ============================================

auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const snapshot = await db.ref("users/" + user.uid).once("value");
  const userData = snapshot.val();

  if (!userData) {
    window.location.href = "login.html";
    return;
  }

  if (userData.status === "pending") {
    const container = document.querySelector(".container");
    if (container) {
      container.innerHTML = `
                <div class="card" style="text-align: center; padding: 60px 24px; max-width: 500px; margin: 0 auto;">
                    <i class="fas fa-hourglass-half" style="font-size: 4rem; color: var(--gold); margin-bottom: 24px;"></i>
                    <h2>Pending Approval</h2>
                    <p>Your account is being reviewed by the band master. You'll be notified once approved.</p>
                </div>
            `;
    }
    return;
  }

  const welcomeName = document.getElementById("welcomeName");
  const memberInfo = document.getElementById("memberInfo");
  const memberStatus = document.getElementById("memberStatus");

  if (welcomeName) welcomeName.textContent = `Welcome back, ${userData.name}!`;
  if (memberInfo)
    memberInfo.textContent = `${userData.instrument || "Musician"} | Member since ${formatDate(userData.joinDate)}`;
  if (memberStatus) memberStatus.textContent = "Active Member";

  loadDashboardData();
});

async function loadDashboardData() {
  // Announcements
  try {
    const annSnap = await db.ref("announcements").limitToLast(5).once("value");
    const anns = annSnap.val();
    const el = document.getElementById("announcementsList");
    if (el) {
      el.innerHTML = anns
        ? Object.values(anns)
            .reverse()
            .map(
              (a) => `
                    <div class="card" style="margin-bottom: 12px; padding: 16px;">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <strong>${a.title}</strong>
                            <span class="badge badge-${a.priority === "high" ? "high" : "member"}">${a.priority || "normal"}</span>
                        </div>
                        <p style="margin-top: 8px;">${a.content}</p>
                        <small style="color: var(--text-light);">${formatDate(a.createdAt)}</small>
                    </div>
                `,
            )
            .join("")
        : '<div class="empty-state"><i class="fas fa-bullhorn"></i><h3>No announcements</h3></div>';
    }
  } catch (e) {
    console.log("Ann error:", e);
  }

  // Songs
  try {
    const songSnap = await db.ref("songs").once("value");
    const songs = songSnap.val();
    const el = document.getElementById("songsList");
    if (el) {
      el.innerHTML = songs
        ? Object.values(songs)
            .map(
              (s) => `
                    <div class="card">
                        <h4>${s.title}</h4>
                        <p style="font-size: 0.9rem; margin: 8px 0;">Arranged by ${s.arranger || "N/A"}</p>
                        <span class="badge badge-${s.status === "learned" ? "learned" : "learning"}">${s.status || "learning"}</span>
                        ${s.dueDate ? `<p style="font-size: 0.85rem; margin-top: 8px;"><i class="fas fa-calendar"></i> Due ${formatDate(s.dueDate)}</p>` : ""}
                    </div>
                `,
            )
            .join("")
        : '<div class="empty-state"><i class="fas fa-music"></i><h3>No songs assigned</h3></div>';
    }
  } catch (e) {
    console.log("Song error:", e);
  }

  // Events
  try {
    const eventSnap = await db.ref("events").once("value");
    const events = eventSnap.val();
    const el = document.getElementById("eventsList");
    if (el) {
      el.innerHTML = events
        ? Object.values(events)
            .map(
              (e) => `
                    <div class="card">
                        <h4>${e.title}</h4>
                        <p style="font-size: 0.9rem; margin: 8px 0;">${e.description || ""}</p>
                        <p style="font-size: 0.85rem; color: var(--text-light);">
                            <i class="fas fa-calendar"></i> ${formatDate(e.date)}<br>
                            <i class="fas fa-clock"></i> ${e.time}<br>
                            <i class="fas fa-map-marker-alt"></i> ${e.location}
                        </p>
                    </div>
                `,
            )
            .join("")
        : '<div class="empty-state"><i class="fas fa-calendar"></i><h3>No upcoming events</h3></div>';
    }
  } catch (e) {
    console.log("Event error:", e);
  }
}
