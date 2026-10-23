// ============================================
// SHARED HEADER & FOOTER + AUTH STATE
// ============================================

function renderHeader(activePage = "") {
  const headerHTML = `
    <header class="site-header">
        <div class="nav-container">
            <a href="index.html" class="brand">
                <img src="images/logo.jpg" alt="C.O.G Brass Band Logo" style="width: 44px; height: 44px; border-radius: 10px; object-fit: cover;">
                <div class="brand-text">
                    <h1>C.O.G Brass Band</h1>
                    <span>Royal Priesthood</span>
                </div>
            </a>
            
            <button class="mobile-toggle" id="mobileToggle">
                <i class="fas fa-bars"></i>
            </button>
            
            <ul class="nav-menu" id="navMenu">
                <li><a href="index.html" ${activePage === "home" ? 'class="active"' : ""}>Home</a></li>
                <li><a href="about.html" ${activePage === "about" ? 'class="active"' : ""}>About</a></li>
                <li><a href="music.html" ${activePage === "music" ? 'class="active"' : ""}>Music</a></li>
                <li><a href="events.html" ${activePage === "events" ? 'class="active"' : ""}>Events</a></li>
                <li><a href="merch.html" ${activePage === "merch" ? 'class="active"' : ""}>Merch</a></li>
                <li><a href="birthdays.html" ${activePage === "birthdays" ? 'class="active"' : ""}>Birthdays</a></li>
                <li><a href="contact.html" ${activePage === "contact" ? 'class="active"' : ""}>Contact</a></li>
            </ul>
            
            <div class="user-menu" id="userMenu" style="display: none;">
                <div class="user-avatar" id="userAvatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="user-dropdown" id="userDropdown">
    <div class="user-dropdown-header">
        <strong id="dropdownName">Member</strong>
        <small id="dropdownEmail">email@example.com</small>
    </div>
    <a href="profile.html"><i class="fas fa-user-edit"></i> My Profile</a>
    <a href="dashboard.html"><i class="fas fa-tachometer-alt"></i> My Dashboard</a>
    <a href="admin.html" id="adminLink" style="display: none;"><i class="fas fa-shield-alt"></i> Admin Panel</a>
    <a href="#" id="logoutBtn" class="danger"><i class="fas fa-sign-out-alt"></i> Logout</a>
</div>
            </div>
            
            <a href="login.html" class="btn btn-primary" id="loginNavBtn" style="display: none;">
                <i class="fas fa-sign-in-alt"></i> Login
            </a>
        </div>
    </header>
    `;

  const placeholder = document.getElementById("header-placeholder");
  if (placeholder) placeholder.innerHTML = headerHTML;

  document.getElementById("mobileToggle")?.addEventListener("click", () => {
    document.getElementById("navMenu").classList.toggle("show");
  });

  document.getElementById("userAvatar")?.addEventListener("click", (e) => {
    e.stopPropagation();
    document.getElementById("userDropdown").classList.toggle("show");
  });

  document.addEventListener("click", () => {
    document.getElementById("userDropdown")?.classList.remove("show");
  });

  document.getElementById("logoutBtn")?.addEventListener("click", async (e) => {
    e.preventDefault();
    await auth.signOut();
    window.location.href = "index.html";
  });
}

function renderFooter() {
  const footerHTML = `
    <footer class="site-footer">
        <div class="container">
            <div class="footer-grid">
                <div>
                    <h4><i class="fas fa-trumpet"></i> C.O.G Brass Band</h4>
                    <p>Royal Priesthood 👑</p>
                    <p>A family of musicians dedicated to worshipping God through the power of sound.</p>
                </div>
                <div>
                    <h4>Quick Links</h4>
                    <a href="about.html">About Us</a>
                    <a href="music.html">Our Music</a>
                    <a href="events.html">Events</a>
                    <a href="merch.html">Merchandise</a>
                    <a href="birthdays.html">Birthdays</a>
                </div>
                <div>
                    <h4>Contact</h4>
                    <p id="footerEmail"><i class="fas fa-envelope"></i> info@cogbrassband.org</p>
                    <p id="footerPhone"><i class="fas fa-phone"></i> +27 XX XXX XXXX</p>
                    <p id="footerAddress"><i class="fas fa-map-marker-alt"></i> Church of God</p>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; ${new Date().getFullYear()} C.O.G Brass Band - Royal Priesthood. More Grace More Blessings! 🇧🇷🙏</p>
            </div>
        </div>
    </footer>
    `;

  const placeholder = document.getElementById("footer-placeholder");
  if (placeholder) placeholder.innerHTML = footerHTML;

  db.ref("config/siteSettings")
    .once("value")
    .then((snapshot) => {
      const config = snapshot.val() || {};
      if (config.contactEmail && document.getElementById("footerEmail"))
        document.getElementById("footerEmail").innerHTML =
          `<i class="fas fa-envelope"></i> ${config.contactEmail}`;
      if (config.contactPhone && document.getElementById("footerPhone"))
        document.getElementById("footerPhone").innerHTML =
          `<i class="fas fa-phone"></i> ${config.contactPhone}`;
      if (config.address && document.getElementById("footerAddress"))
        document.getElementById("footerAddress").innerHTML =
          `<i class="fas fa-map-marker-alt"></i> ${config.address}`;
    })
    .catch((err) => console.log("Config load skipped:", err.message));
}

function initAuthState() {
  auth.onAuthStateChanged(async (user) => {
    const loginNavBtn = document.getElementById("loginNavBtn");
    const userMenu = document.getElementById("userMenu");

    if (user) {
      try {
        const snapshot = await db.ref("users/" + user.uid).once("value");
        const userData = snapshot.val();

        if (userData) {
          const roleSnapshot = await db.ref("roles/" + user.uid).once("value");
          const isAdminUser = roleSnapshot.val() === "admin";

          if (loginNavBtn) loginNavBtn.style.display = "none";
          if (userMenu) userMenu.style.display = "block";

          const avatar = document.getElementById("userAvatar");
          if (avatar) {
            avatar.innerHTML = userData.photoURL
              ? `<img src="${userData.photoURL}" alt="${userData.name}">`
              : userData.name.charAt(0).toUpperCase();
          }

          const dropdownName = document.getElementById("dropdownName");
          const dropdownEmail = document.getElementById("dropdownEmail");
          if (dropdownName) dropdownName.textContent = userData.name;
          if (dropdownEmail) dropdownEmail.textContent = userData.email;

          if (isAdminUser) {
            const adminLink = document.getElementById("adminLink");
            if (adminLink) adminLink.style.display = "flex";
          }
        } else {
          if (loginNavBtn) loginNavBtn.style.display = "flex";
          if (userMenu) userMenu.style.display = "none";
        }
      } catch (err) {
        console.log("Auth state check:", err.message);
        if (loginNavBtn) loginNavBtn.style.display = "flex";
        if (userMenu) userMenu.style.display = "none";
      }
    } else {
      if (loginNavBtn) loginNavBtn.style.display = "flex";
      if (userMenu) userMenu.style.display = "none";
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page || "";
  renderHeader(page);
  renderFooter();
  initAuthState();
});
