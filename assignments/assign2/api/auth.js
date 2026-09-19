// =====================================================
// api/auth.js  |  Auth API Stub
// =====================================================
// Replace mock data + stubs with real API calls.

var AuthAPI = (function () {

  // ── Mock Data (swap with real /api/auth/me) ────────
  var CURRENT_USER = {
    id:        "usr_001",
    name:      "Austin Robertson",
    role:      "Marketing Administrator",
    email:     "austin.robertson@extej.io",
    avatarUrl: "https://ui-avatars.com/api/?name=Austin+Robertson&background=4F46E5&color=fff&size=80",
    country:   "GB"
  };

  function getCurrentUser() {
    // TODO: return fetch("/api/auth/me").then(r => r.json());
    return Promise.resolve(CURRENT_USER);
  }

  function updatePreferences(prefs) {
    // TODO: return fetch("/api/auth/preferences", { method:"PATCH", body: JSON.stringify(prefs) });
    console.log("[AuthAPI] updatePreferences:", prefs);
    return Promise.resolve({ success: true });
  }

  function logout() {
    // TODO: return fetch("/api/auth/logout", { method:"POST" });
    console.log("[AuthAPI] logout() called");
    return Promise.resolve();
  }

  return { getCurrentUser: getCurrentUser, updatePreferences: updatePreferences, logout: logout };

})();

if (typeof window !== "undefined") {
  window.AuthAPI = AuthAPI;
}
