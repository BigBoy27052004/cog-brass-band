// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCyPxTZzi3ptmEY136Zzdkt40r1HvbJvfg",
  authDomain: "cog-brass-band-13264.firebaseapp.com",
  databaseURL: "https://cog-brass-band-13264-default-rtdb.firebaseio.com",
  projectId: "cog-brass-band-13264",
  storageBucket: "cog-brass-band-13264.firebasestorage.app",
  messagingSenderId: "832036805169",
  appId: "1:832036805169:web:550011e97e5ab7db4e1310",
  measurementId: "G-PJFZQZ49WP",
};
// ============================================
// FIREBASE CONFIGURATION
// ============================================
// IMPORTANT: Replace these with YOUR Firebase credentials
// Get them from: Firebase Console > Project Settings > General > Your apps

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatRands(amount) {
  return (
    "R " +
    Number(amount)
      .toFixed(2)
      .replace(/\B(?=(\d{3})+(?!\d))/g, " ")
  );
}

function formatDate(dateString) {
  if (!dateString) return "N/A";
  const options = { year: "numeric", month: "long", day: "numeric" };
  return new Date(dateString).toLocaleDateString("en-ZA", options);
}

function formatDateShort(dateString) {
  if (!dateString) return "N/A";
  const options = { year: "numeric", month: "short", day: "numeric" };
  return new Date(dateString).toLocaleDateString("en-ZA", options);
}

function isBirthdayToday(birthDate) {
  if (!birthDate) return false;
  const today = new Date();
  const bday = new Date(birthDate);
  return (
    today.getDate() === bday.getDate() && today.getMonth() === bday.getMonth()
  );
}

function getMonthName(dateString) {
  if (!dateString) return "";
  return new Date(dateString).toLocaleString("en-ZA", { month: "long" });
}

function getDayOfMonth(dateString) {
  if (!dateString) return "";
  return new Date(dateString).getDate();
}

console.log("Firebase initialized:", firebaseConfig.projectId);
