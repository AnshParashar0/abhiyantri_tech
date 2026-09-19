// =====================================================
// api/notifications.js  |  Notifications API Stub
// =====================================================
// Replace mock data + stubs with real API calls.

var NotificationsAPI = (function () {

  // ── Mock Data (swap with real /api/notifications) ──
  var _notifications = [
    { id: "n1", type: "info",    title: "Loan Due Soon",       message: "Your loan #LN-001 is due in 7 days.",     timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),  read: false },
    { id: "n2", type: "success", title: "Collateral Updated",  message: "BTC collateral value has been updated.",   timestamp: new Date(Date.now() - 5 * 3600000).toISOString(),  read: false },
    { id: "n3", type: "info",    title: "Rate Reminder",       message: "0% interest rate offer is still active.",  timestamp: new Date(Date.now() - 24 * 3600000).toISOString(), read: true  },
    { id: "n4", type: "success", title: "Loan Approved",       message: "Loan #LN-002 has been approved and disbursed.", timestamp: new Date(Date.now() - 72 * 3600000).toISOString(), read: true }
  ];

  function getNotifications() {
    // TODO: return fetch("/api/notifications").then(r => r.json());
    return Promise.resolve(_notifications.slice());
  }

  function getUnreadCount() {
    // TODO: return fetch("/api/notifications/unread-count").then(r => r.json()).then(d => d.count);
    var count = _notifications.filter(function (n) { return !n.read; }).length;
    return Promise.resolve(count);
  }

  function markAsRead(id) {
    // TODO: return fetch("/api/notifications/" + id + "/read", { method:"POST" });
    var n = _notifications.find(function (n) { return n.id === id; });
    if (n) n.read = true;
    return Promise.resolve({ success: true });
  }

  function markAllRead() {
    // TODO: return fetch("/api/notifications/mark-all-read", { method:"POST" });
    _notifications.forEach(function (n) { n.read = true; });
    return Promise.resolve({ success: true });
  }

  return { getNotifications: getNotifications, getUnreadCount: getUnreadCount, markAsRead: markAsRead, markAllRead: markAllRead };

})();

if (typeof window !== "undefined") {
  window.NotificationsAPI = NotificationsAPI;
}
