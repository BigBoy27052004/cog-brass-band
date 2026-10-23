// ============================================
// ADMIN PANEL LOGIC
// ============================================

// ============================================
// EMAIL NOTIFICATION FUNCTIONS (Universal Template)
// ============================================

const EMAILJS_CONFIG = {
  serviceId: "service_abu09wv",
  templateId: "template_universal", // ← ALL three use this one
};

// ----- MEMBERS -----
async function loadMembers() {
  const table = document.getElementById("membersTable");
  if (!table) return;

  const snapshot = await db.ref("users").once("value");
  const users = snapshot.val();
  const rolesSnapshot = await db.ref("roles").once("value");
  const roles = rolesSnapshot.val() || {};

  if (!users) {
    table.innerHTML =
      '<tr><td colspan="6" class="empty-state"><i class="fas fa-users"></i><h3>No members yet</h3></td></tr>';
    return;
  }

  const userList = Object.entries(users).map(([uid, u]) => ({
    uid,
    ...u,
    isAdmin: roles[uid] === "admin",
  }));

  const totalEl = document.getElementById("totalMembers");
  const pendingEl = document.getElementById("pendingMembers");
  const bdayEl = document.getElementById("birthdayCount");

  if (totalEl)
    totalEl.textContent = userList.filter((u) => u.status === "active").length;
  if (pendingEl)
    pendingEl.textContent = userList.filter(
      (u) => u.status === "pending",
    ).length;

  const currentMonth = new Date().getMonth();
  if (bdayEl)
    bdayEl.textContent = userList.filter(
      (u) => u.birthDate && new Date(u.birthDate).getMonth() === currentMonth,
    ).length;

  const currentUserId = auth.currentUser?.uid;

  table.innerHTML = userList
    .map((user) => {
      const isSelf = user.uid === currentUserId;
      return `
        <tr>
            <td>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 40px; height: 40px; border-radius: 50%; overflow: hidden; background: var(--navy); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; flex-shrink: 0;">
                        ${
                          user.photoURL
                            ? `<img src="${user.photoURL}" style="width:100%;height:100%;object-fit:cover;">`
                            : (user.name || "M").charAt(0).toUpperCase()
                        }
                    </div>
                    <div>
                        <strong>${user.name || "Unknown"} ${isSelf ? '<small style="color: var(--gold);">(You)</small>' : ""}</strong><br>
                        <small style="color: var(--text-light);">${user.email || ""}</small>
                    </div>
                </div>
            </td>
            <td>${user.instrument || "N/A"}</td>
            <td>${user.birthDate ? formatDateShort(user.birthDate) : "N/A"}</td>
            <td>
                <span class="badge badge-${user.status === "active" ? "learned" : "pending"}">
                    ${user.status || "active"}
                </span>
            </td>
            <td>
                <span class="badge badge-${user.isAdmin ? "admin" : "member"}">
                    ${user.isAdmin ? "👑 Admin" : "Member"}
                </span>
            </td>
            <td style="white-space: nowrap;">
                ${
                  user.status === "pending"
                    ? `<button class="btn btn-success btn-sm" onclick="approveMember('${user.uid}')" title="Approve member"><i class="fas fa-check"></i></button>`
                    : ""
                }
                ${
                  user.isAdmin
                    ? isSelf
                      ? `<button class="btn btn-secondary btn-sm" disabled title="You can't demote yourself"><i class="fas fa-shield-alt"></i> You</button>`
                      : `<button class="btn btn-secondary btn-sm" onclick="demoteFromAdmin('${user.uid}', '${(user.name || "").replace(/'/g, "\\'")}')" title="Demote to member"><i class="fas fa-arrow-down"></i> Demote</button>`
                    : `<button class="btn btn-gold btn-sm" onclick="promoteToAdmin('${user.uid}', '${(user.name || "").replace(/'/g, "\\'")}')" title="Promote to admin"><i class="fas fa-crown"></i> Promote</button>`
                }
                <button class="btn btn-danger btn-sm" onclick="removeMember('${user.uid}', '${(user.name || "").replace(/'/g, "\\'")}')" title="Remove member" ${isSelf ? 'disabled style="opacity:0.5;"' : ""}>
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `;
    })
    .join("");
}

async function approveMember(uid) {
  const snapshot = await db.ref("users/" + uid).once("value");
  const member = snapshot.val();
  const name = member?.name || "this member";

  const asAdmin = confirm(
    `Approve ${name}?\n\nOK = Approve as ADMIN\nCancel = Approve as MEMBER`,
  );

  try {
    await db.ref("users/" + uid).update({ status: "active" });
    await db.ref("roles/" + uid).set(asAdmin ? "admin" : "member");

    // Send welcome email
    if (member && member.email) {
      await sendMemberApprovalEmail(member);
    }

    alert(
      `✓ ${name} approved as ${asAdmin ? "Admin" : "Member"}! Welcome email sent.`,
    );
    loadMembers();
  } catch (error) {
    console.error("Approve error:", error);
    alert("Failed to approve. Please try again.");
  }
}

async function removeMember(uid, name) {
  if (!confirm(`Remove ${name} from the band? This cannot be undone.`)) return;
  await db.ref("users/" + uid).remove();
  await db.ref("roles/" + uid).remove();
  loadMembers();
  alert(`${name} has been removed from the band.`);
}

// ----- MERCHANDISE -----
async function loadMerchandise() {
  const table = document.getElementById("merchTable");
  if (!table) return;

  const snapshot = await db.ref("merchandise").once("value");
  const items = snapshot.val();

  if (!items) {
    table.innerHTML =
      '<tr><td colspan="5" class="empty-state"><i class="fas fa-shopping-bag"></i><h3>No items yet</h3></td></tr>';
    return;
  }

  table.innerHTML = Object.entries(items)
    .map(
      ([id, item]) => `
        <tr>
            <td>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <img src="${item.image}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 6px; border: 1px solid var(--gray-200);" onerror="this.style.display='none'">
                    <strong>${item.name}</strong>
                </div>
            </td>
            <td>${formatRands(item.price)}</td>
            <td>${(item.colors || []).join(", ") || "N/A"}</td>
            <td>
                <button class="btn btn-${item.inStock ? "success" : "secondary"} btn-sm" 
                        onclick="toggleStock('${id}', ${item.inStock})"
                        title="Click to toggle stock">
                    <i class="fas fa-${item.inStock ? "check-circle" : "times-circle"}"></i>
                    ${item.inStock ? "In Stock" : "Out of Stock"}
                </button>
            </td>
            <td style="white-space: nowrap;">
                <button class="btn btn-secondary btn-sm" onclick="openEditMerchModal('${id}')" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteMerch('${id}')" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `,
    )
    .join("");
}

async function deleteMerch(id) {
  if (!confirm("Delete this item?")) return;
  await db.ref("merchandise/" + id).remove();
  loadMerchandise();
}

function openEditMerchModal(id) {
  db.ref("merchandise/" + id)
    .once("value")
    .then((snapshot) => {
      const item = snapshot.val();
      if (!item) return;

      const modal = document.createElement("div");
      modal.id = "editMerchModal";
      modal.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;`;

      modal.innerHTML = `
            <div class="card" style="max-width: 500px; width: 100%; max-height: 90vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                    <h3>Edit Merchandise</h3>
                    <button onclick="document.getElementById('editMerchModal').remove()" 
                            style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
                </div>
                <div class="form-group">
                    <label>Item Name *</label>
                    <input type="text" id="editMerchName" class="form-control" value="${(item.name || "").replace(/"/g, "&quot;")}">
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea id="editMerchDesc" class="form-control" rows="2">${item.description || ""}</textarea>
                </div>
                <div class="form-group">
                    <label>Price (Rands) *</label>
                    <input type="number" id="editMerchPrice" class="form-control" value="${item.price || 0}" min="0" step="0.01">
                </div>
                <div class="form-group">
                    <label>Colors (comma-separated)</label>
                    <input type="text" id="editMerchColors" class="form-control" value="${(item.colors || []).join(", ")}">
                </div>
                <div class="form-group">
                    <label>Product Image *</label>
                    <input type="hidden" id="editMerchImageURL" value="${item.image || ""}">
                    <button type="button" id="editUploadMerchImgBtn" class="btn btn-secondary btn-block">
                        <i class="fas fa-image"></i> <span id="editMerchUploadText">Change Image</span>
                    </button>
                    <div id="editMerchPreview" style="margin-top: 12px; text-align: center; ${item.image ? "" : "display: none;"}">
                        <img id="editMerchPreviewImg" src="${item.image || ""}" style="max-width: 150px; border-radius: var(--radius); border: 2px solid var(--gold);">
                    </div>
                </div>
                <div class="form-group">
                    <label style="display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" id="editMerchInStock" ${item.inStock ? "checked" : ""}>
                        In Stock
                    </label>
                </div>
                <button class="btn btn-primary btn-block btn-lg" onclick="saveEditedMerch('${id}')">
                    <i class="fas fa-save"></i> Save Changes
                </button>
            </div>
        `;

      document.body.appendChild(modal);

      const editWidget = cloudinary.createUploadWidget(
        {
          cloudName: CLOUDINARY_CONFIG.cloudName,
          uploadPreset: CLOUDINARY_CONFIG.uploadPreset,
          sources: ["local", "camera"],
          multiple: false,
          maxFileSize: 3000000,
          folder: "cog-brass-band/merch",
          resourceType: "image",
          clientAllowedFormats: ["jpg", "jpeg", "png", "webp"],
          cropping: true,
          croppingAspectRatio: 1,
          showSkipCropButton: false,
        },
        (error, result) => {
          if (!error && result && result.event === "success") {
            document.getElementById("editMerchImageURL").value =
              result.info.secure_url;
            document.getElementById("editMerchPreview").style.display = "block";
            document.getElementById("editMerchPreviewImg").src =
              result.info.secure_url;
            document.getElementById("editMerchUploadText").textContent =
              "New Image Uploaded ✓";
          }
          if (error) alert("Upload error: " + error.message);
        },
      );

      document
        .getElementById("editUploadMerchImgBtn")
        .addEventListener("click", () => editWidget.open());
    });
}

async function saveEditedMerch(id) {
  const name = document.getElementById("editMerchName").value.trim();
  const price = document.getElementById("editMerchPrice").value;
  const image = document.getElementById("editMerchImageURL").value.trim();

  if (!name || !price || !image) {
    alert("Please fill in all required fields.");
    return;
  }

  try {
    await db.ref("merchandise/" + id).update({
      name: name,
      description: document.getElementById("editMerchDesc").value,
      price: Number(price),
      colors: document
        .getElementById("editMerchColors")
        .value.split(",")
        .map((c) => c.trim())
        .filter(Boolean),
      image: image,
      inStock: document.getElementById("editMerchInStock").checked,
    });

    document.getElementById("editMerchModal").remove();
    loadMerchandise();
    alert("✓ Item updated successfully!");
  } catch (error) {
    console.error("Edit error:", error);
    alert("Failed to update item.");
  }
}

// Toggle stock status
async function toggleStock(id, currentStatus) {
  try {
    await db.ref("merchandise/" + id).update({ inStock: !currentStatus });
    loadMerchandise();
  } catch (error) {
    console.error("Toggle stock error:", error);
    alert("Failed to update stock status.");
  }
}

function openMerchModal() {
  const modal = document.createElement("div");
  modal.id = "merchModal";
  modal.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;`;

  modal.innerHTML = `
        <div class="card" style="max-width: 500px; width: 100%; max-height: 90vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                <h3>Add Merchandise</h3>
                <button onclick="document.getElementById('merchModal').remove()" 
                        style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
            </div>
            <div class="form-group">
                <label>Item Name *</label>
                <input type="text" id="merchName" class="form-control" required>
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea id="merchDesc" class="form-control" rows="2"></textarea>
            </div>
            <div class="form-group">
                <label>Price (Rands) *</label>
                <input type="number" id="merchPrice" class="form-control" required min="0" step="0.01">
            </div>
            <div class="form-group">
                <label>Colors (comma-separated)</label>
                <input type="text" id="merchColors" class="form-control" placeholder="Navy Blue, Royal Blue">
            </div>
            <div class="form-group">
                <label>Product Image *</label>
                <input type="hidden" id="merchImageURL">
                <button type="button" id="uploadMerchImgBtn" class="btn btn-secondary btn-block">
                    <i class="fas fa-image"></i> <span id="merchUploadText">Upload Image</span>
                </button>
                <div id="merchPreview" style="margin-top: 12px; text-align: center; display: none;">
                    <img id="merchPreviewImg" style="max-width: 150px; border-radius: var(--radius); border: 2px solid var(--gold);">
                </div>
            </div>
            <div class="form-group">
                <label>
                    <input type="checkbox" id="merchInStock" checked> In Stock
                </label>
            </div>
            <button class="btn btn-primary btn-block btn-lg" onclick="saveMerch()">
                <i class="fas fa-save"></i> Save Item
            </button>
        </div>
    `;

  document.body.appendChild(modal);

  // Cloudinary widget for merch image
  const merchWidget = cloudinary.createUploadWidget(
    {
      cloudName: CLOUDINARY_CONFIG.cloudName,
      uploadPreset: CLOUDINARY_CONFIG.uploadPreset,
      sources: ["local", "camera"],
      multiple: false,
      maxFileSize: 3000000,
      folder: "cog-brass-band/merch",
      resourceType: "image",
      clientAllowedFormats: ["jpg", "jpeg", "png", "webp"],
      cropping: true,
      croppingAspectRatio: 1,
      showSkipCropButton: false,
    },
    (error, result) => {
      if (!error && result && result.event === "success") {
        document.getElementById("merchImageURL").value = result.info.secure_url;
        document.getElementById("merchPreview").style.display = "block";
        document.getElementById("merchPreviewImg").src = result.info.secure_url;
        document.getElementById("merchUploadText").textContent =
          "Image Uploaded ✓";
        document
          .getElementById("uploadMerchImgBtn")
          .classList.remove("btn-secondary");
        document
          .getElementById("uploadMerchImgBtn")
          .classList.add("btn-success");
      }
      if (error) alert("Upload error: " + error.message);
    },
  );

  document
    .getElementById("uploadMerchImgBtn")
    .addEventListener("click", () => merchWidget.open());
}

async function saveMerch() {
  const name = document.getElementById("merchName").value.trim();
  const price = document.getElementById("merchPrice").value;
  const image = document.getElementById("merchImageURL").value.trim();

  if (!name || !price || !image) {
    alert("Please fill in all required fields.");
    return;
  }

  await db.ref("merchandise").push({
    name: name,
    description: document.getElementById("merchDesc").value,
    price: Number(price),
    colors: document
      .getElementById("merchColors")
      .value.split(",")
      .map((c) => c.trim())
      .filter(Boolean),
    image: image,
    inStock: document.getElementById("merchInStock").checked,
    createdAt: new Date().toISOString(),
  });

  document.getElementById("merchModal").remove();
  loadMerchandise();
}

// ----- EVENTS -----
async function loadEvents() {
  const grid = document.getElementById("eventsGrid");
  if (!grid) return;

  const snapshot = await db.ref("events").once("value");
  const events = snapshot.val();

  if (!events) {
    grid.innerHTML =
      '<div class="empty-state"><i class="fas fa-calendar"></i><h3>No events yet</h3></div>';
    return;
  }

  grid.innerHTML = Object.entries(events)
    .map(
      ([id, event]) => `
        <div class="card">
            ${event.poster ? `<img src="${event.poster}" style="width: 100%; height: 160px; object-fit: cover; border-radius: var(--radius); margin-bottom: 12px;" onerror="this.style.display='none'">` : ""}
            <h4>${event.title}</h4>
            <p style="font-size: 0.9rem; margin: 8px 0;">${event.description || ""}</p>
            <p style="font-size: 0.85rem; color: var(--text-light);">
                <i class="fas fa-calendar"></i> ${formatDateShort(event.date)}<br>
                <i class="fas fa-clock"></i> ${event.time || ""}<br>
                <i class="fas fa-map-marker-alt"></i> ${event.location || ""}
            </p>
            <div style="margin-top: 16px; display: flex; gap: 8px;">
                <button class="btn btn-secondary btn-sm" onclick="openEditEventModal('${id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteEvent('${id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `,
    )
    .join("");
}

async function deleteEvent(id) {
  if (!confirm("Delete this event?")) return;
  await db.ref("events/" + id).remove();
  loadEvents();
}

function openEditEventModal(id) {
  db.ref("events/" + id)
    .once("value")
    .then((snapshot) => {
      const event = snapshot.val();
      if (!event) return;

      const modal = document.createElement("div");
      modal.id = "editEventModal";
      modal.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;`;

      modal.innerHTML = `
            <div class="card" style="max-width: 500px; width: 100%; max-height: 90vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                    <h3>Edit Event</h3>
                    <button onclick="document.getElementById('editEventModal').remove()" 
                            style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
                </div>
                <div class="form-group">
                    <label>Event Title *</label>
                    <input type="text" id="editEvTitle" class="form-control" value="${(event.title || "").replace(/"/g, "&quot;")}">
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea id="editEvDesc" class="form-control" rows="2">${event.description || ""}</textarea>
                </div>
                <div class="form-group">
                    <label>Date *</label>
                    <input type="date" id="editEvDate" class="form-control" value="${event.date || ""}">
                </div>
                <div class="form-group">
                    <label>Time</label>
                    <input type="time" id="editEvTime" class="form-control" value="${event.time || ""}">
                </div>
                <div class="form-group">
                    <label>Location</label>
                    <input type="text" id="editEvLocation" class="form-control" value="${(event.location || "").replace(/"/g, "&quot;")}">
                </div>
                <div class="form-group">
                    <label>Event Poster</label>
                    <input type="hidden" id="editEvPoster" value="${event.poster || ""}">
                    <button type="button" id="editUploadPosterBtn" class="btn btn-secondary btn-block">
                        <i class="fas fa-image"></i> <span id="editUploadPosterText">Change Poster</span>
                    </button>
                    <div id="editPosterPreview" style="margin-top: 12px; text-align: center; ${event.poster ? "" : "display: none;"}">
                        <img id="editPosterPreviewImg" src="${event.poster || ""}" style="max-width: 200px; border-radius: var(--radius); border: 2px solid var(--gold);">
                    </div>
                </div>
                <div class="form-group">
                    <label>Notify all members about changes?</label>
                    <div style="display: flex; gap: 16px; margin-top: 8px;">
                        <label style="font-weight: normal;">
                            <input type="radio" name="editEvNotify" value="yes"> Yes
                        </label>
                        <label style="font-weight: normal;">
                            <input type="radio" name="editEvNotify" value="no" checked> No
                        </label>
                    </div>
                </div>
                <button class="btn btn-primary btn-block" onclick="saveEditedEvent('${id}')">
                    <i class="fas fa-save"></i> Save Changes
                </button>
            </div>
        `;

      document.body.appendChild(modal);

      // Poster widget
      const editPosterWidget = cloudinary.createUploadWidget(
        {
          cloudName: CLOUDINARY_CONFIG.cloudName,
          uploadPreset: CLOUDINARY_CONFIG.uploadPreset,
          sources: ["local", "camera"],
          multiple: false,
          maxFileSize: 5000000,
          folder: "cog-brass-band/events",
          resourceType: "image",
          clientAllowedFormats: ["jpg", "jpeg", "png", "webp"],
        },
        (error, result) => {
          if (!error && result && result.event === "success") {
            document.getElementById("editEvPoster").value =
              result.info.secure_url;
            document.getElementById("editPosterPreview").style.display =
              "block";
            document.getElementById("editPosterPreviewImg").src =
              result.info.secure_url;
            document.getElementById("editUploadPosterText").textContent =
              "New Poster Uploaded ✓";
          }
          if (error) alert("Upload error: " + error.message);
        },
      );

      document
        .getElementById("editUploadPosterBtn")
        .addEventListener("click", () => editPosterWidget.open());
    });
}

async function saveEditedEvent(id) {
  const title = document.getElementById("editEvTitle").value.trim();
  const date = document.getElementById("editEvDate").value;

  if (!title || !date) {
    alert("Title and date are required.");
    return;
  }

  const notify =
    document.querySelector('input[name="editEvNotify"]:checked')?.value ===
    "yes";
  const time = document.getElementById("editEvTime").value;
  const location = document.getElementById("editEvLocation").value;

  try {
    await db.ref("events/" + id).update({
      title: title,
      description: document.getElementById("editEvDesc").value,
      date: date,
      time: time,
      location: location,
      poster: document.getElementById("editEvPoster").value,
      updatedAt: new Date().toISOString(),
    });

    document.getElementById("editEventModal").remove();
    loadEvents();

    if (notify) {
      await sendEventNotification({ title, date, time, location });
      alert("✓ Event updated and members notified!");
    } else {
      alert("✓ Event updated successfully!");
    }
  } catch (error) {
    console.error("Edit event error:", error);
    alert("Failed to update event.");
  }
}

function openEventModal() {
  const modal = document.createElement("div");
  modal.id = "eventModal";
  modal.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;`;

  modal.innerHTML = `
        <div class="card" style="max-width: 500px; width: 100%; max-height: 90vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                <h3>Add Event</h3>
                <button onclick="document.getElementById('eventModal').remove()" 
                        style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
            </div>
            <div class="form-group">
                <label>Event Title *</label>
                <input type="text" id="evTitle" class="form-control" required>
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea id="evDesc" class="form-control" rows="2"></textarea>
            </div>
            <div class="form-group">
                <label>Date *</label>
                <input type="date" id="evDate" class="form-control" required>
            </div>
            <div class="form-group">
                <label>Time</label>
                <input type="time" id="evTime" class="form-control">
            </div>
            <div class="form-group">
                <label>Location</label>
                <input type="text" id="evLocation" class="form-control" placeholder="27 Rapulawa St, Meadowlands East Zone 2, Gauteng">
            </div>
            <div class="form-group">
                <label>Event Poster</label>
                <input type="hidden" id="evPoster">
                <button type="button" id="uploadPosterBtn" class="btn btn-secondary btn-block">
                    <i class="fas fa-image"></i> <span id="uploadPosterText">Upload Poster</span>
                </button>
                <div id="posterPreview" style="margin-top: 12px; text-align: center; display: none;">
                    <img id="posterPreviewImg" style="max-width: 200px; border-radius: var(--radius); border: 2px solid var(--gold);">
                </div>
            </div>
            <div class="form-group">
                <label>Notify all members via email?</label>
                <div style="display: flex; gap: 16px; margin-top: 8px;">
                    <label style="font-weight: normal;">
                        <input type="radio" name="evNotify" value="yes" checked> Yes
                    </label>
                    <label style="font-weight: normal;">
                        <input type="radio" name="evNotify" value="no"> No
                    </label>
                </div>
            </div>
            <button class="btn btn-primary btn-block" onclick="saveEvent()">
                <i class="fas fa-save"></i> Save Event
            </button>
        </div>
    `;

  document.body.appendChild(modal);

  // Cloudinary upload widget for event poster
  const posterWidget = cloudinary.createUploadWidget(
    {
      cloudName: CLOUDINARY_CONFIG.cloudName,
      uploadPreset: CLOUDINARY_CONFIG.uploadPreset,
      sources: ["local", "camera"],
      multiple: false,
      maxFileSize: 5000000,
      folder: "cog-brass-band/events",
      resourceType: "image",
      clientAllowedFormats: ["jpg", "jpeg", "png", "webp"],
    },
    (error, result) => {
      if (!error && result && result.event === "success") {
        document.getElementById("evPoster").value = result.info.secure_url;
        document.getElementById("posterPreview").style.display = "block";
        document.getElementById("posterPreviewImg").src =
          result.info.secure_url;
        document.getElementById("uploadPosterText").textContent =
          "Poster Uploaded ✓";
        document
          .getElementById("uploadPosterBtn")
          .classList.remove("btn-secondary");
        document.getElementById("uploadPosterBtn").classList.add("btn-success");
      }
      if (error) alert("Upload error: " + error.message);
    },
  );

  document
    .getElementById("uploadPosterBtn")
    .addEventListener("click", () => posterWidget.open());
}

async function saveEvent() {
  const title = document.getElementById("evTitle").value.trim();
  const date = document.getElementById("evDate").value;

  if (!title || !date) {
    alert("Title and date are required.");
    return;
  }

  const notify =
    document.querySelector('input[name="evNotify"]:checked')?.value === "yes";
  const poster = document.getElementById("evPoster")?.value.trim() || "";
  const time = document.getElementById("evTime").value;
  const location = document.getElementById("evLocation").value;
  const description = document.getElementById("evDesc").value;

  try {
    await db.ref("events").push({
      title: title,
      description: description,
      date: date,
      time: time,
      location: location,
      poster: poster,
      createdBy: auth.currentUser.uid,
      createdAt: new Date().toISOString(),
    });

    document.getElementById("eventModal").remove();
    loadEvents();

    if (notify) {
      await sendEventNotification({ title, date, time, location });
    }

    alert("✓ Event saved successfully!");
  } catch (error) {
    console.error("Error saving event:", error);
    alert("Failed to save event. Please try again.");
  }
}

// ----- SONGS -----
async function loadSongs() {
  const grid = document.getElementById("songsGrid");
  if (!grid) return;

  const snapshot = await db.ref("songs").once("value");
  const songs = snapshot.val();

  if (!songs) {
    grid.innerHTML =
      '<div class="empty-state"><i class="fas fa-music"></i><h3>No songs yet</h3></div>';
    return;
  }

  grid.innerHTML = Object.entries(songs)
    .map(
      ([id, song]) => `
        <div class="card">
            <h4>${song.title}</h4>
            <p style="font-size: 0.9rem; margin: 8px 0;">Arranger: ${song.arranger || "N/A"}</p>
            <span class="badge badge-${song.status === "learned" ? "learned" : "learning"}">
                ${song.status === "learned" ? "Learned" : "Learning"}
            </span>
            ${song.dueDate ? `<p style="font-size: 0.85rem; margin-top: 8px;"><i class="fas fa-calendar"></i> Due: ${formatDateShort(song.dueDate)}</p>` : ""}
            <div style="margin-top: 16px;">
                <button class="btn btn-danger btn-sm" onclick="deleteSong('${id}')"><i class="fas fa-trash"></i> Delete</button>
            </div>
        </div>
    `,
    )
    .join("");
}

async function deleteSong(id) {
  if (!confirm("Delete this song?")) return;
  await db.ref("songs/" + id).remove();
  loadSongs();
}

function openSongModal() {
  const modal = document.createElement("div");
  modal.id = "songModal";
  modal.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;`;

  modal.innerHTML = `
        <div class="card" style="max-width: 500px; width: 100%;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                <h3>Add Song</h3>
                <button onclick="document.getElementById('songModal').remove()" 
                        style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
            </div>
            <div class="form-group">
                <label>Song Title *</label>
                <input type="text" id="songTitle" class="form-control" required>
            </div>
            <div class="form-group">
                <label>Arranger</label>
                <input type="text" id="songArranger" class="form-control">
            </div>
            <div class="form-group">
                <label>Due Date</label>
                <input type="date" id="songDueDate" class="form-control">
            </div>
            <div class="form-group">
                <label>Status</label>
                <select id="songStatus" class="form-control">
                    <option value="learning">Learning</option>
                    <option value="learned">Learned</option>
                </select>
            </div>
            <button class="btn btn-primary btn-block" onclick="saveSong()">
                <i class="fas fa-save"></i> Save Song
            </button>
        </div>
    `;

  document.body.appendChild(modal);
}

async function saveSong() {
  const title = document.getElementById("songTitle").value.trim();
  if (!title) {
    alert("Song title required");
    return;
  }

  await db.ref("songs").push({
    title: title,
    arranger: document.getElementById("songArranger").value,
    dueDate: document.getElementById("songDueDate").value,
    status: document.getElementById("songStatus").value,
    createdAt: new Date().toISOString(),
  });

  document.getElementById("songModal").remove();
  loadSongs();
}

// ----- ANNOUNCEMENTS -----
async function loadAnnouncements() {
  const list = document.getElementById("announcementsList");
  if (!list) return;

  const snapshot = await db.ref("announcements").once("value");
  const anns = snapshot.val();

  if (!anns) {
    list.innerHTML =
      '<div class="empty-state"><i class="fas fa-bullhorn"></i><h3>No announcements yet</h3></div>';
    return;
  }

  const sorted = Object.entries(anns).sort(
    (a, b) => new Date(b[1].createdAt) - new Date(a[1].createdAt),
  );

  list.innerHTML = sorted
    .map(
      ([id, ann]) => `
        <div class="card" style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between;">
                <h4>${ann.title}</h4>
                <span class="badge badge-${ann.priority === "high" ? "high" : "member"}">${ann.priority || "normal"}</span>
            </div>
            <p style="margin: 8px 0;">${ann.content}</p>
            <small style="color: var(--text-light);">${formatDate(ann.createdAt)}</small>
            <div style="margin-top: 12px;">
                <button class="btn btn-danger btn-sm" onclick="deleteAnnouncement('${id}')"><i class="fas fa-trash"></i> Delete</button>
            </div>
        </div>
    `,
    )
    .join("");
}

async function deleteAnnouncement(id) {
  if (!confirm("Delete this announcement?")) return;
  await db.ref("announcements/" + id).remove();
  loadAnnouncements();
}

function openAnnouncementModal() {
  const modal = document.createElement("div");
  modal.id = "annModal";
  modal.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;`;

  modal.innerHTML = `
        <div class="card" style="max-width: 500px; width: 100%;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                <h3>New Announcement</h3>
                <button onclick="document.getElementById('annModal').remove()" 
                        style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
            </div>
            <div class="form-group">
                <label>Title *</label>
                <input type="text" id="annTitle" class="form-control" required>
            </div>
            <div class="form-group">
                <label>Content *</label>
                <textarea id="annContent" class="form-control" rows="4" required></textarea>
            </div>
            <div class="form-group">
                <label>Priority</label>
                <select id="annPriority" class="form-control">
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                </select>
            </div>
            <button class="btn btn-primary btn-block" onclick="saveAnnouncement()">
                <i class="fas fa-save"></i> Post Announcement
            </button>
        </div>
    `;

  document.body.appendChild(modal);
}

async function saveAnnouncement() {
  const title = document.getElementById("annTitle").value.trim();
  const content = document.getElementById("annContent").value.trim();

  if (!title || !content) {
    alert("Title and content required");
    return;
  }

  await db.ref("announcements").push({
    title: title,
    content: content,
    priority: document.getElementById("annPriority").value,
    createdAt: new Date().toISOString(),
    createdBy: auth.currentUser.uid,
  });

  document.getElementById("annModal").remove();
  loadAnnouncements();
}

// ----- SETTINGS -----
async function loadSettings() {
  const snapshot = await db.ref("config/siteSettings").once("value");
  const config = snapshot.val() || {};

  const fields = {
    settingBandName: config.bandName || "C.O.G Brass Band",
    settingTagline: config.tagline || "Royal Priesthood",
    settingBio: config.bio || "",
    settingEmail: config.contactEmail || "kealebogabigboy@gmail.com",
    settingPhone: config.contactPhone || "",
    settingAddress:
      config.address || "27 Rapulawa St, Meadowlands East Zone 2, Gauteng",
    settingRehearsals:
      config.rehearsals || "Communicated based on upcoming events",
  };

  Object.entries(fields).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.value = value;
  });

  const form = document.getElementById("settingsForm");
  if (form && !form.dataset.bound) {
    form.dataset.bound = "true";
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await db.ref("config/siteSettings").set({
        bandName: document.getElementById("settingBandName").value,
        tagline: document.getElementById("settingTagline").value,
        bio: document.getElementById("settingBio").value,
        contactEmail: document.getElementById("settingEmail").value,
        contactPhone: document.getElementById("settingPhone").value,
        address: document.getElementById("settingAddress").value,
        rehearsals: document.getElementById("settingRehearsals").value,
      });
      alert("✓ Settings saved! Changes reflect on the site immediately.");
    });
  }
}

// ============================================
// EMAIL NOTIFICATION FUNCTIONS
// ============================================

// Welcome email when member approved
async function sendMemberApprovalEmail(member) {
  if (!member || !member.email) return;

  try {
    await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, {
      to_email: member.email,
      to_name: member.name || "Member",
      email_title: "🎺 Welcome to the Royal Priesthood!",
      email_body: `
                <p>Your membership has been <strong>APPROVED</strong>! You can now log in and access:</p>
                <ul style="line-height: 1.8;">
                    <li>🎵 Songs to learn</li>
                    <li>📅 Upcoming events & rehearsals</li>
                    <li>📢 Band announcements</li>
                    <li>👤 Your member profile</li>
                </ul>
            `,
      cta_url: window.location.origin + "/login.html",
      cta_text: "Login to Your Dashboard",
    });
    console.log("✓ Approval email sent to", member.email);
  } catch (err) {
    console.error("Email error:", err);
    throw err;
  }
}

// Event notification to all active members
async function sendEventNotification(event) {
  try {
    const snapshot = await db.ref("users").once("value");
    const users = snapshot.val();
    if (!users) return;

    const activeMembers = Object.values(users).filter(
      (u) => u.status === "active" && u.email,
    );

    for (const member of activeMembers) {
      try {
        await emailjs.send(
          EMAILJS_CONFIG.serviceId,
          EMAILJS_CONFIG.templateId,
          {
            to_email: member.email,
            to_name: member.name || "Member",
            email_title: `🎺 New Event: ${event.title}`,
            email_body: `
                        <p>There's a new event for the band:</p>
                        <div style="background: #F8F9FB; border-left: 4px solid #C9A227; padding: 16px; margin: 16px 0; border-radius: 4px;">
                            <h3 style="margin: 0 0 12px 0; color: #0A1F44;">${event.title}</h3>
                            <p style="margin: 4px 0;"><strong>📅 Date:</strong> ${formatDate(event.date)}</p>
                            <p style="margin: 4px 0;"><strong>⏰ Time:</strong> ${event.time || "TBA"}</p>
                            <p style="margin: 4px 0;"><strong>📍 Location:</strong> ${event.location || "TBA"}</p>
                        </div>
                        <p>Please mark your calendar and prepare accordingly.</p>
                    `,
            cta_url: window.location.origin + "/dashboard.html",
            cta_text: "View in Dashboard",
          },
        );
      } catch (err) {
        console.error(`Failed to email ${member.email}:`, err);
      }
    }
    console.log(`✓ Event notification sent to ${activeMembers.length} members`);
  } catch (err) {
    console.error("Event notification error:", err);
  }
}

// Admin promotion notification (optional)
async function sendAdminPromotionEmail(member) {
  if (!member || !member.email) return;

  try {
    await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, {
      to_email: member.email,
      to_name: member.name || "Member",
      email_title: "👑 You've been promoted to Admin!",
      email_body: `
                <p>Congratulations! You have been promoted to <strong>Administrator</strong> of the C.O.G Brass Band.</p>
                <p>You now have access to the admin panel where you can:</p>
                <ul style="line-height: 1.8;">
                    <li>👥 Manage band members</li>
                    <li>📅 Create and edit events</li>
                    <li>🛍️ Manage merchandise</li>
                    <li>🎵 Add songs to learn</li>
                    <li>📢 Post announcements</li>
                </ul>
            `,
      cta_url: window.location.origin + "/admin.html",
      cta_text: "Open Admin Panel",
    });
  } catch (err) {
    console.error("Promotion email error:", err);
  }
}

// ============================================
// PROMOTE / DEMOTE ADMIN
// ============================================

async function promoteToAdmin(uid, name) {
  if (
    !confirm(
      `Promote "${name}" to Admin?\n\nThey will have full access to manage members, events, merchandise, songs, announcements, and settings.`,
    )
  ) {
    return;
  }

  try {
    await db.ref("roles/" + uid).set("admin");

    // Optional: send them a notification via email
    const snapshot = await db.ref("users/" + uid).once("value");
    const member = snapshot.val();
    if (
      member &&
      member.email &&
      typeof sendAdminPromotionEmail === "function"
    ) {
      await sendAdminPromotionEmail(member);
    }

    alert(`✓ ${name} has been promoted to Admin!`);
    loadMembers();
  } catch (error) {
    console.error("Promote error:", error);
    alert("Failed to promote. Please try again.");
  }
}

async function demoteFromAdmin(uid, name) {
  if (
    !confirm(
      `Demote "${name}" from Admin to Member?\n\nThey will lose access to the admin panel but remain a band member.`,
    )
  ) {
    return;
  }

  try {
    await db.ref("roles/" + uid).set("member");
    alert(`✓ ${name} has been demoted to Member.`);
    loadMembers();
  } catch (error) {
    console.error("Demote error:", error);
    alert("Failed to demote. Please try again.");
  }
}

// ----- MESSAGES -----
async function loadMessages() {
  const list = document.getElementById("messagesList");
  if (!list) return;

  const snapshot = await db.ref("messages").once("value");
  const messages = snapshot.val();

  if (!messages) {
    list.innerHTML =
      '<div class="empty-state"><i class="fas fa-envelope"></i><h3>No messages yet</h3></div>';
    if (document.getElementById("unreadCount"))
      document.getElementById("unreadCount").textContent = "0 unread";
    return;
  }

  const sorted = Object.entries(messages).sort(
    (a, b) => new Date(b[1].createdAt) - new Date(a[1].createdAt),
  );

  const unread = Object.values(messages).filter(
    (m) => m.status === "unread",
  ).length;
  if (document.getElementById("unreadCount")) {
    document.getElementById("unreadCount").textContent = `${unread} unread`;
  }

  list.innerHTML = sorted
    .map(
      ([id, msg]) => `
        <div class="card" style="margin-bottom: 12px; ${msg.status === "unread" ? "border-left: 4px solid var(--gold);" : ""}">
            <div style="display: flex; justify-content: space-between; align-items: start; gap: 12px;">
                <div>
                    <h4 style="margin-bottom: 4px;">${msg.subject}</h4>
                    <p style="font-size: 0.85rem; color: var(--text-light); margin-bottom: 8px;">
                        From: <strong>${msg.name}</strong> &lt;${msg.email}&gt; · ${formatDate(msg.createdAt)}
                    </p>
                </div>
                ${msg.status === "unread" ? '<span class="badge badge-high">NEW</span>' : ""}
            </div>
            <p style="margin: 12px 0; padding: 12px; background: var(--gray-100); border-radius: var(--radius); white-space: pre-wrap;">${msg.message}</p>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <a href="mailto:${msg.email}?subject=Re: ${msg.subject}" class="btn btn-primary btn-sm">
                    <i class="fas fa-reply"></i> Reply via Email
                </a>
                ${
                  msg.status === "unread"
                    ? `<button class="btn btn-secondary btn-sm" onclick="markMessageRead('${id}')"><i class="fas fa-check"></i> Mark Read</button>`
                    : ""
                }
                <button class="btn btn-danger btn-sm" onclick="deleteMessage('${id}')"><i class="fas fa-trash"></i> Delete</button>
            </div>
        </div>
    `,
    )
    .join("");
}

async function markMessageRead(id) {
  await db.ref("messages/" + id).update({ status: "read" });
  loadMessages();
}

async function deleteMessage(id) {
  if (!confirm("Delete this message?")) return;
  await db.ref("messages/" + id).remove();
  loadMessages();
}
