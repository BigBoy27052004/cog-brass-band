// ============================================
// PROFILE EDIT PAGE
// ============================================

let currentUserData = null;

// ============================================
// CLOUDINARY UPLOAD WIDGET (must be set up BEFORE auth check)
// ============================================
let profileUploadWidget = null;

function initProfileUploadWidget() {
  if (typeof cloudinary === "undefined") {
    console.warn("Cloudinary not loaded");
    return;
  }

  profileUploadWidget = cloudinary.createUploadWidget(
    {
      cloudName: CLOUDINARY_CONFIG.cloudName,
      uploadPreset: CLOUDINARY_CONFIG.uploadPreset,
      sources: ["local", "camera"],
      multiple: false,
      maxFileSize: 2000000,
      cropping: true,
      croppingAspectRatio: 1,
      croppingShowDimensions: true,
      showSkipCropButton: false,
      folder: "cog-brass-band/members",
      resourceType: "image",
      clientAllowedFormats: ["jpg", "jpeg", "png", "webp"],
    },
    (error, result) => {
      if (!error && result && result.event === "success") {
        const photoURL = result.info.secure_url;
        document.getElementById("profilePhotoURL").value = photoURL;
        document.getElementById("profilePhotoContainer").innerHTML =
          `<img src="${photoURL}" style="width:100%;height:100%;object-fit:cover;">`;
      }
      if (error) alert("Upload error: " + error.message);
    },
  );
}

// Attach click handler once widget is created
document.addEventListener("DOMContentLoaded", () => {
  // Widget creation can happen right away
  initProfileUploadWidget();

  const uploadBtn = document.getElementById("uploadProfilePhoto");
  if (uploadBtn) {
    uploadBtn.addEventListener("click", () => {
      if (profileUploadWidget) {
        profileUploadWidget.open();
      } else {
        alert("Image upload is not ready yet. Please try again.");
      }
    });
  }
});

// ============================================
// LOAD PROFILE DATA
// ============================================
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const snapshot = await db.ref("users/" + user.uid).once("value");
  currentUserData = { uid: user.uid, ...snapshot.val() };

  if (!currentUserData) {
    window.location.href = "login.html";
    return;
  }

  // Fill the form
  document.getElementById("profileName").value = currentUserData.name || "";
  document.getElementById("profileEmail").value =
    currentUserData.email || user.email || "";
  document.getElementById("profilePhone").value = currentUserData.phone || "";
  document.getElementById("profileBirthDate").value =
    currentUserData.birthDate || "";
  document.getElementById("profileInstrument").value =
    currentUserData.instrument || "Trumpet";
  document.getElementById("profilePhotoURL").value =
    currentUserData.photoURL || "";

  // Set photo
  const photoContainer = document.getElementById("profilePhotoContainer");
  if (currentUserData.photoURL) {
    photoContainer.innerHTML = `<img src="${currentUserData.photoURL}" style="width:100%;height:100%;object-fit:cover;">`;
  } else {
    photoContainer.textContent = (currentUserData.name || "U")
      .charAt(0)
      .toUpperCase();
  }
});

// ============================================
// SAVE PROFILE
// ============================================
document
  .getElementById("profileForm")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!currentUserData) return;

    const statusDiv = document.getElementById("profileStatus");
    const btn = document.getElementById("saveProfileBtn");

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    try {
      await db.ref("users/" + currentUserData.uid).update({
        name: document.getElementById("profileName").value.trim(),
        phone: document.getElementById("profilePhone").value.trim(),
        birthDate: document.getElementById("profileBirthDate").value,
        instrument: document.getElementById("profileInstrument").value,
        photoURL: document.getElementById("profilePhotoURL").value,
      });

      statusDiv.className = "alert alert-success";
      statusDiv.style.display = "flex";
      statusDiv.innerHTML =
        '<i class="fas fa-check-circle"></i> Profile updated successfully!';

      // Update avatar in header
      const avatar = document.getElementById("userAvatar");
      const photoURL = document.getElementById("profilePhotoURL").value;
      const name = document.getElementById("profileName").value;
      if (avatar) {
        avatar.innerHTML = photoURL
          ? `<img src="${photoURL}" style="width:100%;height:100%;object-fit:cover;">`
          : name.charAt(0).toUpperCase();
      }
    } catch (error) {
      console.error(error);
      statusDiv.className = "alert alert-danger";
      statusDiv.style.display = "flex";
      statusDiv.innerHTML =
        '<i class="fas fa-exclamation-triangle"></i> Failed to save. Try again.';
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
    }
  });

// ============================================
// CHANGE PASSWORD
// ============================================
document
  .getElementById("passwordForm")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const statusDiv = document.getElementById("passwordStatus");
    const btn = document.getElementById("savePasswordBtn");
    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';

    try {
      const credential = firebase.auth.EmailAuthProvider.credential(
        auth.currentUser.email,
        currentPassword,
      );
      await auth.currentUser.reauthenticateWithCredential(credential);
      await auth.currentUser.updatePassword(newPassword);

      statusDiv.className = "alert alert-success";
      statusDiv.style.display = "flex";
      statusDiv.innerHTML =
        '<i class="fas fa-check-circle"></i> Password updated successfully!';

      document.getElementById("passwordForm").reset();
    } catch (error) {
      let msg = "Failed to change password.";
      if (error.code === "auth/wrong-password")
        msg = "Current password is incorrect.";
      if (error.code === "auth/weak-password")
        msg = "New password is too weak.";

      statusDiv.className = "alert alert-danger";
      statusDiv.style.display = "flex";
      statusDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${msg}`;
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-key"></i> Change Password';
    }
  });
