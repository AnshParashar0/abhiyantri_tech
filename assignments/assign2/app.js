document.addEventListener("DOMContentLoaded", function () {

  // ---- RESILIENT API BINDINGS ----
  var AuthAPI = window.AuthAPI || {
    getCurrentUser: function () {
      return Promise.resolve({
        id: "usr_001",
        name: "Austin Robertson",
        role: "Marketing Administrator",
        email: "austin.robertson@extej.io",
        avatarUrl: "https://ui-avatars.com/api/?name=Austin+Robertson&background=2563EB&color=fff&size=80",
        country: "GB"
      });
    },
    updatePreferences: function () { return Promise.resolve({ success: true }); },
    logout: function () { return Promise.resolve(); }
  };

  var LoansAPI = window.LoansAPI || {
    getLoanOptions: function () {
      return Promise.resolve([
        { amount: 50, label: "50", currency: "EUR" },
        { amount: 100, label: "100", currency: "EUR" },
        { amount: 250, label: "250", currency: "EUR" },
        { amount: 500, label: "500", currency: "EUR" }
      ]);
    },
    calculateLoan: function (amount, currency, collateralBtc) {
      var rate = 24117.08;
      var ltv = 50;
      var collateral = collateralBtc || parseFloat((amount / (rate * ltv / 100)).toFixed(6));
      return Promise.resolve({
        loanAmount: amount.toFixed(2),
        currency: currency,
        collateralBtc: collateral.toString(),
        loanToValue: ltv + "%",
        interestRate: "0%",
        loanTerm: "3 months",
        originationFee: "2.5%",
        exchangeRate: rate.toFixed(2),
        totalInterest: "0.00",
        monthlyPayment: (amount / 3).toFixed(2)
      });
    },
    applyForLoan: function () { return Promise.resolve({ loanId: "LN-" + Math.floor(1000 + Math.random() * 9000) }); },
    getUserLoans: function () {
      return Promise.resolve([
        { id: "LN-001", tag: "Bitcoin-backed", status: "active", remainingLoan: 234.50, currency: "EUR", collateral: "0.0097 BTC", maturityDate: "2024-12-15", term: "3 months", ltv: "50" },
        { id: "LN-002", tag: "Bitcoin-backed", status: "warning", remainingLoan: 100.00, currency: "EUR", collateral: "0.0042 BTC", maturityDate: "2025-01-10", term: "3 months", ltv: "68" }
      ]);
    }
  };

  var WalletAPI = window.WalletAPI || {
    getWalletBalance: function () { return Promise.resolve({ btc: 0.25, eur: 6029.27, usd: 6540.10, gbp: 5180.44 }); },
    getSupportedCurrencies: function () {
      return Promise.resolve([
        { code: "EUR", name: "Euro", flag: "\uD83C\uDDEA\uD83C\uDDFA", rate: 24117.08 },
        { code: "USD", name: "US Dollar", flag: "\uD83C\uDDFA\uD83C\uDDF8", rate: 26160.40 },
        { code: "GBP", name: "British Pound", flag: "\uD83C\uDDEC\uD83C\uDDE7", rate: 20721.76 },
        { code: "CHF", name: "Swiss Franc", flag: "\uD83C\uDDE8\uD83C\uDDED", rate: 23408.10 }
      ]);
    },
    getExchangeRate: function () { return Promise.resolve(24117.08); }
  };

  var NotificationsAPI = window.NotificationsAPI || {
    getNotifications: function () {
      return Promise.resolve([
        { id: "n1", type: "info", title: "Margin Call Alert", message: "LTV ratio reached 68% on Loan #LN-002.", timestamp: new Date(Date.now() - 7200000).toISOString(), read: false },
        { id: "n2", type: "success", title: "Loan Approved", message: "Your 100 EUR loan application was approved.", timestamp: new Date(Date.now() - 86400000).toISOString(), read: false }
      ]);
    },
    getUnreadCount: function () { return Promise.resolve(2); },
    markAsRead: function () { return Promise.resolve(); },
    markAllRead: function () { return Promise.resolve(); }
  };

  var RecordsAPI = window.RecordsAPI || {
    getRecords: function () { return Promise.resolve([]); },
    saveRecord: function (r) { return Promise.resolve(r); },
    deleteRecord: function (id) { return Promise.resolve({ success: true, id: id }); },
    resetToDefaults: function () { return Promise.resolve([]); }
  };

  var State = {
    selectedAmount: 100,
    selectedCurrency: "EUR",
    collateralBtc: null,
    loanSummary: null,
    currencies: [],
    walletBalance: null,
    notifications: [],
    loansData: [],
    user: null,
    records: [],
    editingRecordId: null,
    recordToDeleteId: null,
    theme: localStorage.getItem("extej_theme") || "light"
  };

  // ---- UTILITIES ----
  function showToast(message, type) {
    type = type || "info";
    var container = document.getElementById("toastContainer");
    var toast = document.createElement("div");
    var typeClass = type === "success" ? "success-toast" : type === "error" ? "error-toast" : type === "warn" ? "warn-toast" : "";
    var icons = { success: "bi-check-circle-fill", error: "bi-x-circle-fill", warn: "bi-exclamation-circle-fill", info: "bi-info-circle-fill" };
    toast.className = "toast " + typeClass;
    toast.innerHTML = '<i class="bi ' + (icons[type] || icons.info) + '"></i><span>' + message + "</span>";
    container.appendChild(toast);
    setTimeout(function () {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(20px)";
      toast.style.transition = "opacity .3s, transform .3s";
      setTimeout(function () { toast.remove(); }, 350);
    }, 3800);
  }

  function timeAgo(iso) {
    var diff = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (diff < 60) return diff + "s ago";
    if (diff < 3600) return Math.floor(diff / 60) + "m ago";
    if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
    return Math.floor(diff / 86400) + "d ago";
  }

  function fmt(amount, currency) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  }

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  // ---- AUTH ----
  function initUser() {
    AuthAPI.getCurrentUser().then(function (user) {
      State.user = user;
      setText("userName", user.name);
      setText("userRole", user.role);
      var avatar = document.getElementById("userAvatar");
      if (avatar) avatar.src = user.avatarUrl;
    });
  }

  // ---- CLOSE ALL PANELS ----
  function closeAllPanels() {
    document.querySelectorAll(".notif-panel, .settings-panel, .profile-panel").forEach(function (p) { p.classList.remove("open"); });
    var bd = document.getElementById("panelBackdrop");
    if (bd) bd.classList.remove("open");
    var ddMenu = document.getElementById("currencyDropdownMenu");
    var ddBtn = document.getElementById("currencySelectBtn");
    if (ddMenu) ddMenu.classList.remove("open");
    if (ddBtn) { ddBtn.classList.remove("open"); ddBtn.setAttribute("aria-expanded", "false"); }
    var filterMenu = document.getElementById("filterDropdownMenu");
    if (filterMenu) filterMenu.classList.remove("open");
  }

  // ---- NOTIFICATIONS ----
  function initNotifications() {
    var btn = document.getElementById("notifBtn");
    var panel = document.getElementById("notifPanel");
    var backdrop = document.getElementById("panelBackdrop");
    var badge = document.getElementById("notifBadge");
    var list = document.getElementById("notifList");
    var clearBtn = document.getElementById("markAllReadBtn");
    if (!btn || !panel) return;

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (panel.classList.contains("open")) { panel.classList.remove("open"); backdrop.classList.remove("open"); }
      else { closeAllPanels(); panel.classList.add("open"); backdrop.classList.add("open"); loadNotifications(); }
    });

    backdrop.addEventListener("click", closeAllPanels);

    clearBtn && clearBtn.addEventListener("click", function () {
      State.notifications.forEach(function (n) { if (!n.read) NotificationsAPI.markAsRead(n.id); n.read = true; });
      renderNotifications(); if (badge) badge.style.display = "none";
    });

    function loadNotifications() {
      NotificationsAPI.getNotifications().then(function (notifs) {
        State.notifications = notifs; renderNotifications();
        var unread = notifs.filter(function (n) { return !n.read; }).length;
        if (badge) { badge.textContent = unread; badge.style.display = unread > 0 ? "flex" : "none"; }
      });
    }

    function renderNotifications() {
      if (!State.notifications.length) { list.innerHTML = '<div style="padding:20px;text-align:center;color:#94A3B8;font-size:.78rem;">No notifications</div>'; return; }
      var iconMap = { info: "bi-info-circle", success: "bi-check-circle", warning: "bi-exclamation-triangle", danger: "bi-x-circle" };
      list.innerHTML = State.notifications.map(function (n) {
        return '<div class="notif-item ' + (n.read ? "" : "unread") + '" data-id="' + n.id + '">'
          + '<div class="notif-icon ' + n.type + '"><i class="bi ' + (iconMap[n.type] || "bi-info-circle") + '"></i></div>'
          + '<div class="notif-content"><div class="notif-title">' + n.title + "</div>"
          + '<div class="notif-message">' + n.message + "</div>"
          + '<div class="notif-time">' + timeAgo(n.timestamp) + "</div></div>"
          + (n.read ? "" : '<div class="unread-dot"></div>') + "</div>";
      }).join("");
      list.querySelectorAll(".notif-item").forEach(function (item) {
        item.addEventListener("click", function () {
          var id = item.dataset.id;
          var notif = State.notifications.find(function (n) { return n.id === id; });
          if (notif && !notif.read) {
            NotificationsAPI.markAsRead(id).then(function () {
              notif.read = true; renderNotifications();
              var u = State.notifications.filter(function (n) { return !n.read; }).length;
              if (badge) { badge.textContent = u; badge.style.display = u > 0 ? "flex" : "none"; }
            });
          }
        });
      });
    }

    NotificationsAPI.getUnreadCount().then(function (count) {
      if (badge) { badge.textContent = count; badge.style.display = count > 0 ? "flex" : "none"; }
    });
  }

  // ---- SETTINGS ----
  function initSettings() {
    var btn = document.getElementById("settingsBtn");
    var panel = document.getElementById("settingsPanel");
    var closeX = document.getElementById("settingsPanelClose");
    var summaryGear = document.getElementById("summarySettingsBtn");
    if (!btn || !panel) return;

    function openSettings() { closeAllPanels(); panel.classList.add("open"); document.getElementById("panelBackdrop").classList.add("open"); }
    function closeSettings() { panel.classList.remove("open"); document.getElementById("panelBackdrop").classList.remove("open"); }

    btn.addEventListener("click", function (e) { e.stopPropagation(); panel.classList.contains("open") ? closeSettings() : openSettings(); });
    summaryGear && summaryGear.addEventListener("click", function (e) { e.stopPropagation(); panel.classList.contains("open") ? closeSettings() : openSettings(); });
    closeX && closeX.addEventListener("click", closeSettings);

    var darkToggle = document.getElementById("darkModeToggle");
    darkToggle && darkToggle.addEventListener("change", function () { showToast(darkToggle.checked ? "Dark mode coming soon!" : "Light mode active.", "info"); });
    var notifToggle = document.getElementById("notifToggle");
    notifToggle && notifToggle.addEventListener("change", function () {
      AuthAPI.updatePreferences({ notificationsEnabled: notifToggle.checked });
      showToast(notifToggle.checked ? "Notifications enabled." : "Notifications disabled.", "info");
    });
  }

  // ---- CURRENCY DROPDOWN ----
  function initCurrencyDropdown() {
    var btn = document.getElementById("currencySelectBtn");
    var menu = document.getElementById("currencyDropdownMenu");
    if (!btn || !menu) return;

    WalletAPI.getSupportedCurrencies().then(function (currencies) {
      State.currencies = currencies;
      menu.innerHTML = currencies.map(function (c) {
        var sel = c.code === State.selectedCurrency;
        return '<button class="currency-option ' + (sel ? "selected" : "") + '" role="option" data-code="' + c.code + '" aria-selected="' + sel + '" type="button">'
          + '<span class="currency-flag">' + c.flag + '</span><span class="currency-code">' + c.code + '</span><span class="currency-name">' + c.name + "</span></button>";
      }).join("");

      menu.querySelectorAll(".currency-option").forEach(function (opt) {
        opt.addEventListener("click", function () {
          selectCurrency(opt.dataset.code);
          menu.classList.remove("open"); btn.classList.remove("open"); btn.setAttribute("aria-expanded", "false");
        });
      });
    });

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var isOpen = menu.classList.contains("open");
      closeAllPanels();
      if (!isOpen) { menu.classList.add("open"); btn.classList.add("open"); btn.setAttribute("aria-expanded", "true"); }
    });

    document.addEventListener("click", function () {
      menu.classList.remove("open"); btn.classList.remove("open"); btn.setAttribute("aria-expanded", "false");
    });
  }

  function selectCurrency(code) {
    if (!code || code === State.selectedCurrency) return;
    State.selectedCurrency = code;
    var currency = State.currencies.find(function (c) { return c.code === code; });
    if (currency) {
      setText("selectedCurrencyFlag", currency.flag);
      setText("selectedCurrencyCode", currency.code);
      setText("selectedCurrencyName", currency.name);
      setText("sumCurrencyLabel", currency.code);
    }
    refreshAmountCards(); recomputeLoan();
    showToast("Currency switched to " + code, "info");
  }

  // ---- AMOUNT CARDS ----
  function initAmountCards() { refreshAmountCards(); }

  function refreshAmountCards() {
    LoansAPI.getLoanOptions(State.selectedCurrency).then(function (options) {
      var grid = document.getElementById("amountGrid");
      if (!grid) return;

      var cardsHTML = options.map(function (opt) {
        var isSelected = opt.amount === State.selectedAmount;
        return '<div class="amount-card ' + (isSelected ? "selected" : "") + '" data-amount="' + opt.amount + '">'
          + '<span class="amount-check"><i class="bi bi-check"></i></span>'
          + '<span class="amount-value">' + opt.label + '</span>'
          + '<span class="amount-label">' + opt.currency + '</span></div>';
      }).join("");

      var customSelected = !options.some(function (o) { return o.amount === State.selectedAmount; });
      var customCard = '<div class="amount-card custom-card ' + (customSelected ? "selected" : "") + '" data-amount="custom">'
        + '<span class="amount-check"><i class="bi bi-check"></i></span>'
        + '<span class="amount-value" style="font-size:1rem;"><i class="bi bi-pencil me-1" style="font-size:.85rem;"></i>Custom</span>'
        + '<span class="amount-label">Enter amount</span></div>';

      grid.innerHTML = cardsHTML + customCard;

      grid.querySelectorAll(".amount-card").forEach(function (card) {
        card.addEventListener("click", function () {
          grid.querySelectorAll(".amount-card").forEach(function (c) { c.classList.remove("selected"); });
          card.classList.add("selected");
          var amountVal = card.dataset.amount;
          var customWrap = document.getElementById("customAmountWrap");
          if (amountVal === "custom") {
            customWrap && customWrap.classList.add("visible");
            var ci = document.getElementById("customAmountInput");
            ci && ci.focus();
          } else {
            customWrap && customWrap.classList.remove("visible");
            State.selectedAmount = parseFloat(amountVal);
            recomputeLoan();
          }
        });
      });
    });
  }

  function initCustomAmountInput() {
    var input = document.getElementById("customAmountInput");
    if (!input) return;
    var timer;
    input.addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        var val = parseFloat(input.value);
        if (val && val >= 10) { State.selectedAmount = val; recomputeLoan(); }
      }, 400);
    });
  }

  // ---- COLLATERAL ----
  function initCollateral() {
    WalletAPI.getWalletBalance().then(function (balance) {
      State.walletBalance = balance;
      setText("collateralBalance", "Balance: " + (balance.btc || 0).toFixed(6) + " BTC");
    });
    var input = document.getElementById("collateralInput");
    if (!input) return;
    var timer;
    input.addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        var val = parseFloat(input.value);
        State.collateralBtc = (val && val > 0) ? val : null;
        recomputeLoan();
      }, 300);
    });
  }

  function updateLtvBar(ltv) {
    var fill = document.getElementById("ltvFill");
    var badge = document.getElementById("ltvBadge");
    var barVal = document.getElementById("ltvBarValue");
    if (!fill) return;
    var pct = Math.min(ltv, 100);
    fill.style.width = pct + "%";
    var isSafe = ltv <= 60, isWarn = ltv > 60 && ltv <= 80, isDanger = ltv > 80;
    fill.className = "ltv-fill" + (isWarn ? " warn" : "") + (isDanger ? " danger" : "");
    if (badge) { badge.className = "ltv-badge " + (isSafe ? "safe" : isWarn ? "warn" : "danger"); badge.textContent = "LTV " + ltv.toFixed(1) + "%"; }
    if (barVal) barVal.textContent = ltv.toFixed(1) + "%";
  }

  // ---- LOAN PANEL ----
  function recomputeLoan() {
    if (!State.selectedAmount || State.selectedAmount <= 0) return;
    LoansAPI.calculateLoan(State.selectedAmount, State.selectedCurrency, State.collateralBtc).then(function (summary) {
      State.loanSummary = summary;
      updateLoanPanel(summary);
      var ci = document.getElementById("collateralInput");
      if (ci && State.collateralBtc === null) ci.value = summary.collateralBtc;
    });
  }

  function updateLoanPanel(d) {
    var cur = State.selectedCurrency;
    setText("sumTotalRepayment", "\u25CF " + fmt(d.loanAmount, cur));
    setText("sumInterestRate", d.interestRate);
    setText("sumLtv", d.loanToValue);
    setText("sumLoanTerm", d.loanTerm);
    setText("sumCollateral", d.collateralBtc + " BTC");
    setText("sumExchangeRate", parseFloat(d.exchangeRate).toLocaleString("en-US") + " " + cur);
    setText("sumOriginationFee", d.originationFee);
    setText("sumLoanAmount", fmt(d.loanAmount, cur));
    setText("sumTotalInterest", d.totalInterest + " " + cur);
    setText("sumMonthlyPayment", fmt(parseFloat(d.monthlyPayment), cur) + " / mo");
    setText("sumCurrencyLabel", cur);
    updateLtvBar(parseFloat(d.loanToValue));
  }

  // ---- LOAN MODAL ----
  function initGetLoanModal() {
    var overlay = document.getElementById("loanModal");
    var closeBtn = document.getElementById("loanModalClose");
    var cancelBtn = document.getElementById("loanModalCancel");
    var confirmBtn = document.getElementById("confirmLoanBtn");
    var retryBtn = document.getElementById("loanRetryBtn");
    var doneBtn = document.getElementById("loanSuccessDone");
    var errorClose = document.getElementById("loanErrorClose");
    if (!overlay) return;

    function showStep(n) {
      overlay.querySelectorAll(".modal-step").forEach(function (s) { s.classList.remove("active"); });
      var step = document.getElementById("loanStep" + n);
      if (step) step.classList.add("active");
    }

    function openModal() {
      if (!State.selectedAmount || State.selectedAmount < 10) { showToast("Please select or enter a loan amount.", "warn"); return; }
      var d = State.loanSummary, cur = State.selectedCurrency;
      if (d) {
        setText("reviewAmount", fmt(d.loanAmount, cur));
        setText("reviewCurrency", cur);
        setText("reviewCollateral", d.collateralBtc + " BTC");
        setText("reviewLtv", d.loanToValue);
        setText("reviewMonthly", fmt(parseFloat(d.monthlyPayment), cur) + " / mo");
      }
      showStep(1); overlay.classList.add("open"); document.body.style.overflow = "hidden";
    }

    function closeModal() { overlay.classList.remove("open"); document.body.style.overflow = ""; showStep(1); }

    var getLoanBtn = document.getElementById("getLoanBtn");
    getLoanBtn && getLoanBtn.addEventListener("click", openModal);
    closeBtn && closeBtn.addEventListener("click", closeModal);
    cancelBtn && cancelBtn.addEventListener("click", closeModal);
    doneBtn && doneBtn.addEventListener("click", function () { closeModal(); setTimeout(loadLoansTable, 600); });
    errorClose && errorClose.addEventListener("click", closeModal);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) closeModal(); });

    confirmBtn && confirmBtn.addEventListener("click", function () {
      showStep(2); confirmBtn.disabled = true;
      LoansAPI.applyForLoan({
        amount: State.selectedAmount, currency: State.selectedCurrency,
        collateralBtc: parseFloat(State.loanSummary ? State.loanSummary.collateralBtc : 0), term: 3,
      }).then(function (result) {
        setText("successLoanId", "Loan ID: " + result.loanId);
        showStep(3); showToast("Loan approved! Funds arriving in ~2 minutes.", "success");
      }).catch(function (err) {
        setText("loanErrorMsg", err.message || "Unexpected error. Please try again."); showStep(4);
      }).finally(function () { confirmBtn.disabled = false; });
    });

    retryBtn && retryBtn.addEventListener("click", function () { showStep(1); });
  }

  // ---- ZERO RISK MODAL ----
  function initZeroRiskModal() {
    var overlay = document.getElementById("zeroRiskModal");
    var closeBtn = document.getElementById("zeroRiskClose");
    var dismiss = document.getElementById("zeroRiskDismiss");
    var applyBtn = document.getElementById("applyZeroRiskBtn");
    var zeroRiskBtn = document.getElementById("zeroRiskBtn");
    var zeroRiskLink = document.getElementById("zeroRiskQuickLink");
    if (!overlay) return;

    function openZR() { overlay.classList.add("open"); document.body.style.overflow = "hidden"; }
    function closeZR() { overlay.classList.remove("open"); document.body.style.overflow = ""; }

    zeroRiskBtn && zeroRiskBtn.addEventListener("click", function (e) { e.preventDefault(); openZR(); });
    zeroRiskLink && zeroRiskLink.addEventListener("click", function (e) { e.preventDefault(); openZR(); });
    closeBtn && closeBtn.addEventListener("click", closeZR);
    dismiss && dismiss.addEventListener("click", closeZR);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) closeZR(); });

    applyBtn && applyBtn.addEventListener("click", function () {
      closeZR(); State.selectedAmount = 100; State.selectedCurrency = "EUR";
      recomputeLoan();
      setTimeout(function () { var lb = document.getElementById("getLoanBtn"); lb && lb.click(); }, 300);
    });
  }

  // ---- LOANS TABLE ----
  function initLoansTable() { loadLoansTable(); }

  function loadLoansTable() {
    var tbody = document.getElementById("loansTableBody");
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8"><div style="padding:28px;text-align:center;color:#94A3B8;font-size:.78rem;">Loading your loans...</div></td></tr>';
    LoansAPI.getUserLoans().then(function (loans) {
      State.loansData = loans; renderLoansTable(loans);
      var meta = document.getElementById("loansTableMeta");
      if (meta) meta.textContent = loans.length + " active loan" + (loans.length !== 1 ? "s" : "");
    });
  }

  function renderLoansTable(loans) {
    var tbody = document.getElementById("loansTableBody");
    if (!tbody) return;
    if (!loans || !loans.length) {
      tbody.innerHTML = '<tr><td colspan="8"><div class="table-empty"><i class="bi bi-inbox"></i><p>No active loans. Get your first loan above!</p></div></td></tr>';
      return;
    }
    tbody.innerHTML = loans.map(function (loan) {
      var rowClass = loan.status === "danger" ? "row-danger" : "";
      var statusLabel = loan.status.charAt(0).toUpperCase() + loan.status.slice(1);
      var remainColor = loan.status === "active" ? "text-success" : loan.status === "warning" ? "text-warning" : loan.status === "danger" ? "text-danger" : "";
      var ltvNum = parseFloat(loan.ltv);
      var ltvClass = ltvNum <= 60 ? "safe" : ltvNum <= 80 ? "warn" : "danger";
      return '<tr class="' + rowClass + '">'
        + '<td><span class="loan-id">' + loan.id + '</span><span class="loan-tag">' + loan.tag + '</span></td>'
        + '<td><span class="status-pill ' + loan.status + '"><span class="status-dot"></span>' + statusLabel + '</span></td>'
        + '<td class="' + remainColor + '" style="font-weight:600;">' + fmt(loan.remainingLoan, loan.currency) + '</td>'
        + '<td>' + loan.collateral + '</td>'
        + '<td>' + loan.maturityDate + '</td>'
        + '<td>' + loan.term + '</td>'
        + '<td><span class="ltv-badge ' + ltvClass + '">' + loan.ltv + '</span></td>'
        + '<td class="text-end" style="white-space:nowrap;">'
        + '<button class="btn-details me-1" type="button" onclick="alert(\'Loan ' + loan.id + '\\nStatus: ' + statusLabel + '\\nRemaining: ' + fmt(loan.remainingLoan, loan.currency) + '\')">Details</button>'
        + '<button class="btn-repay" type="button" onclick="alert(\'Initiating repayment for ' + loan.id + '...\')">Repay</button>'
        + '</td></tr>';
    }).join("");
  }

  // ---- TABS ----
  function initTabs() {
    var flexTab = document.getElementById("flexLoanTab");
    var quickTab = document.getElementById("quickLoanTab");
    if (!flexTab || !quickTab) return;
    [flexTab, quickTab].forEach(function (tab) {
      tab.addEventListener("click", function () {
        flexTab.classList.remove("active"); quickTab.classList.remove("active"); tab.classList.add("active");
        showToast("Switched to " + tab.textContent.trim() + " mode", "info");
      });
    });
  }

  // ---- VIDEO ----
  function initVideo() {
    var videoThumb  = document.getElementById("videoThumb");
    var ytPlayer    = document.getElementById("ytPlayer");
    var playBtnWrap = document.querySelector(".play-btn-wrap");
    var YT_VIDEO_ID = "C5J6trjtVDk";

    function playVideo() {
      if (ytPlayer && videoThumb) {
        ytPlayer.src = "https://www.youtube.com/embed/" + YT_VIDEO_ID + "?autoplay=1&rel=0";
        videoThumb.classList.add("hidden");
        ytPlayer.style.display = "block";
      }
    }

    if (playBtnWrap) playBtnWrap.addEventListener("click", playVideo);
    if (videoThumb) videoThumb.addEventListener("click", playVideo);
  }

  // ---- FILTER ----
  function initFilter() {
    var filterBtn = document.getElementById("filterBtn");
    var filterMenu = document.getElementById("filterDropdownMenu");
    if (!filterBtn || !filterMenu) return;

    filterBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      var isOpen = filterMenu.classList.contains("open");
      closeAllPanels();
      if (!isOpen) filterMenu.classList.add("open");
    });

    filterMenu.querySelectorAll(".filter-dropdown-item").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var filter = btn.dataset.filter;
        filterMenu.querySelectorAll(".filter-dropdown-item").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        filterMenu.classList.remove("open");

        if (filter === "all") {
          renderLoansTable(State.loansData);
        } else if (filter === "active") {
          renderLoansTable(State.loansData.filter(function (l) { return l.status === "active"; }));
        } else if (filter === "warning") {
          renderLoansTable(State.loansData.filter(function (l) { return l.status === "warning" || l.status === "danger"; }));
        }
        showToast("Filter applied: " + btn.textContent.trim(), "info");
      });
    });

    document.addEventListener("click", function () {
      filterMenu.classList.remove("open");
    });
  }

  // ---- SIDEBAR & VIEW ROUTING ----
  function switchView(viewName) {
    if (!viewName) return;
    viewName = viewName.replace(/^#/, "");
    var target = document.getElementById("view-" + viewName);
    if (!target) return;

    document.querySelectorAll(".view-section").forEach(function (sec) {
      sec.classList.remove("active");
    });
    target.classList.add("active");

    document.querySelectorAll(".sidebar .nav-item, #sidebarNavMobile .nav-item").forEach(function (item) {
      var itemTarget = item.getAttribute("data-view") || (item.getAttribute("href") || "").replace(/^#/, "");
      if (itemTarget === viewName) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });

    if (window.location.hash !== "#" + viewName) {
      history.pushState(null, null, "#" + viewName);
    }

    var offcanvasEl = document.getElementById("mobileSidebar");
    if (offcanvasEl) {
      var inst = bootstrap.Offcanvas.getInstance(offcanvasEl);
      if (inst) inst.hide();
    }
    closeAllPanels();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function initSidebar() {
    var desktopNav = document.getElementById("sidebarNav");
    var mobileTarget = document.getElementById("sidebarNavMobile");
    if (desktopNav && mobileTarget && mobileTarget.children.length === 0) {
      mobileTarget.appendChild(desktopNav.cloneNode(true));
    }

    document.addEventListener("click", function (e) {
      var navItem = e.target.closest("[data-view], a[href^='#']");
      if (!navItem) return;
      var targetView = navItem.getAttribute("data-view") || navItem.getAttribute("href");
      if (targetView && targetView.startsWith("#")) targetView = targetView.slice(1);
      if (targetView && document.getElementById("view-" + targetView)) {
        e.preventDefault();
        switchView(targetView);
      }
    });

    window.addEventListener("hashchange", function () {
      var hash = (window.location.hash || "").replace(/^#/, "");
      if (hash && document.getElementById("view-" + hash)) {
        switchView(hash);
      }
    });

    // Handle initial hash routing
    var initHash = (window.location.hash || "").replace(/^#/, "");
    if (initHash && document.getElementById("view-" + initHash)) {
      switchView(initHash);
    }
  }

  // ---- THEME (DARK / LIGHT MODE) ----
  function initTheme() {
    var savedTheme = localStorage.getItem("extej_theme") || "light";
    applyTheme(savedTheme, false);

    var drawerToggle = document.getElementById("darkModeToggle");
    var pageToggle = document.getElementById("settingsPageDarkToggle");

    function onThemeToggle(e) {
      var isDark = e.target.checked;
      applyTheme(isDark ? "dark" : "light", true);
    }

    if (drawerToggle) drawerToggle.addEventListener("change", onThemeToggle);
    if (pageToggle) pageToggle.addEventListener("change", onThemeToggle);
  }

  function applyTheme(theme, notify) {
    State.theme = theme;
    var isDark = theme === "dark";
    if (isDark) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    localStorage.setItem("extej_theme", theme);

    var drawerToggle = document.getElementById("darkModeToggle");
    var pageToggle = document.getElementById("settingsPageDarkToggle");
    if (drawerToggle) drawerToggle.checked = isDark;
    if (pageToggle) pageToggle.checked = isDark;

    if (notify) {
      showToast(isDark ? "Dark theme activated." : "Light theme activated.", "info");
    }
  }

  // ---- RECORDS TABLE & MANAGEMENT ----
  function initRecordsManagement() {
    loadRecordsData();

    var searchInput = document.getElementById("recordsSearchInput");
    var statusFilter = document.getElementById("recordsStatusFilter");
    var typeFilter = document.getElementById("recordsTypeFilter");
    var sortSelect = document.getElementById("recordsSortSelect");
    var addBtn = document.getElementById("tableAddRecordBtn");
    var exportBtn = document.getElementById("tableExportBtn");
    var resetBtn = document.getElementById("tableResetBtn");
    var globalSearch = document.getElementById("globalSearch");

    if (searchInput) {
      searchInput.addEventListener("input", function () {
        filterAndRenderRecords();
      });
    }

    if (globalSearch) {
      globalSearch.addEventListener("input", function () {
        var query = globalSearch.value.trim();
        if (query.length > 0) {
          switchView("table");
          if (searchInput) searchInput.value = query;
          filterAndRenderRecords();
        }
      });
    }

    if (statusFilter) statusFilter.addEventListener("change", filterAndRenderRecords);
    if (typeFilter) typeFilter.addEventListener("change", filterAndRenderRecords);
    if (sortSelect) sortSelect.addEventListener("change", filterAndRenderRecords);

    if (addBtn) {
      addBtn.addEventListener("click", function () {
        resetFormToCreateMode();
        switchView("form");
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener("click", function () {
        exportRecordsJSON();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        if (confirm("Reset records table back to initial demo dataset?")) {
          RecordsAPI.resetToDefaults().then(function (recs) {
            State.records = recs;
            filterAndRenderRecords();
            updateKpiWidgets(recs);
            showToast("Demo records restored.", "info");
          });
        }
      });
    }

    initDeleteRecordModal();
  }

  function loadRecordsData() {
    RecordsAPI.getRecords().then(function (records) {
      State.records = records;
      filterAndRenderRecords();
      updateKpiWidgets(records);
      var badge = document.getElementById("navRecordsBadge");
      if (badge) badge.textContent = records.length;
    });
  }

  function updateKpiWidgets(records) {
    setText("kpiTotalRecords", records.length);
    var badge = document.getElementById("navRecordsBadge");
    if (badge) badge.textContent = records.length;
    var profileCount = document.getElementById("profileLoansCount");
    if (profileCount) profileCount.textContent = records.length;

    var totalExposure = records.reduce(function (sum, r) {
      return sum + (parseFloat(r.amount) || 0);
    }, 0);
    setText("kpiTotalVolume", "€" + totalExposure.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

    var btcCollateral = records.reduce(function (sum, r) {
      if (r.collateralAsset === "BTC") return sum + (parseFloat(r.collateralAmount) || 0);
      return sum;
    }, 0);
    setText("kpiTotalCollateral", btcCollateral.toFixed(4) + " BTC");

    if (records.length > 0) {
      var avgLtv = records.reduce(function (sum, r) { return sum + (parseFloat(r.ltv) || 50); }, 0) / records.length;
      setText("kpiAvgLtv", avgLtv.toFixed(1) + "%");
    }
  }

  function filterAndRenderRecords() {
    var search = (document.getElementById("recordsSearchInput") ? document.getElementById("recordsSearchInput").value : "").toLowerCase().trim();
    var status = document.getElementById("recordsStatusFilter") ? document.getElementById("recordsStatusFilter").value : "all";
    var type = document.getElementById("recordsTypeFilter") ? document.getElementById("recordsTypeFilter").value : "all";
    var sort = document.getElementById("recordsSortSelect") ? document.getElementById("recordsSortSelect").value : "newest";

    var filtered = State.records.filter(function (r) {
      if (status !== "all" && r.status !== status) return false;
      if (type !== "all" && r.type !== type) return false;
      if (search) {
        var match = (r.id || "").toLowerCase().indexOf(search) >= 0 ||
                    (r.borrower || "").toLowerCase().indexOf(search) >= 0 ||
                    (r.email || "").toLowerCase().indexOf(search) >= 0 ||
                    (r.type || "").toLowerCase().indexOf(search) >= 0 ||
                    (r.collateralAsset || "").toLowerCase().indexOf(search) >= 0 ||
                    (r.notes || "").toLowerCase().indexOf(search) >= 0;
        if (!match) return false;
      }
      return true;
    });

    // Sorting
    filtered.sort(function (a, b) {
      if (sort === "amount-high") return (parseFloat(b.amount) || 0) - (parseFloat(a.amount) || 0);
      if (sort === "amount-low") return (parseFloat(a.amount) || 0) - (parseFloat(b.amount) || 0);
      if (sort === "ltv-high") return (parseFloat(b.ltv) || 0) - (parseFloat(a.ltv) || 0);
      return (b.id || "").localeCompare(a.id || "");
    });

    renderRecordsTable(filtered);
    var counter = document.getElementById("recordsTableCounter");
    if (counter) counter.textContent = "Showing " + filtered.length + " of " + State.records.length + " records";
  }

  function renderRecordsTable(records) {
    var tbody = document.getElementById("recordsTableBody");
    if (!tbody) return;

    if (!records.length) {
      tbody.innerHTML = '<tr><td colspan="8"><div class="table-empty"><i class="bi bi-inbox fs-2 mb-2"></i><p class="mb-1 fw-semibold">No records match your filters</p><p class="text-muted small">Try adjusting your search criteria or add a new record.</p></div></td></tr>';
      return;
    }

    var assetIcons = {
      BTC: '<span class="text-warning">&#8383;</span>',
      ETH: '<span class="text-primary">&#9830;</span>',
      SOL: '<span class="text-info">&#9678;</span>',
      USDT: '<span class="text-success">&#36;</span>'
    };

    tbody.innerHTML = records.map(function (r) {
      var ltvNum = parseFloat(r.ltv) || 50;
      var ltvClass = ltvNum <= 55 ? "safe" : ltvNum <= 70 ? "warn" : "danger";
      var statusMap = {
        active: { label: "Active", dotClass: "status-pill active" },
        pending: { label: "Pending", dotClass: "status-pill text-warning" },
        warning: { label: "Warning", dotClass: "status-pill danger" },
        completed: { label: "Completed", dotClass: "status-pill active" }
      };
      var stat = statusMap[r.status] || { label: r.status, dotClass: "status-pill active" };
      var initials = (r.borrower || "User").split(" ").map(function(n) { return n[0]; }).join("").slice(0, 2).toUpperCase();

      return '<tr id="row-' + r.id + '">'
        + '<td><span class="loan-id fw-bold">' + r.id + '</span><span class="record-badge mt-1">' + (r.type || "Loan") + '</span></td>'
        + '<td><div class="user-cell"><div class="user-cell-avatar">' + initials + '</div><div class="user-cell-info"><span class="user-cell-name">' + r.borrower + '</span><span class="user-cell-email">' + (r.email || "-") + '</span></div></div></td>'
        + '<td class="fw-bold">' + fmt(parseFloat(r.amount) || 0, r.currency || "EUR") + '</td>'
        + '<td><span class="asset-pill">' + (assetIcons[r.collateralAsset] || "") + ' ' + (r.collateral || (r.collateralAmount + " " + r.collateralAsset)) + '</span></td>'
        + '<td><span class="ltv-badge ' + ltvClass + '">' + ltvNum + '%</span></td>'
        + '<td><span class="' + stat.dotClass + '"><span class="status-dot"></span>' + stat.label + '</span></td>'
        + '<td><div class="small fw-semibold">' + (r.maturityDate || "-") + '</div><div class="text-muted" style="font-size:.68rem;">' + (r.term || "3 months") + '</div></td>'
        + '<td class="text-end">'
        + '<div class="d-inline-flex gap-1">'
        + '<button class="btn-action-view record-edit-btn" data-id="' + r.id + '" type="button" title="View & Edit Record"><i class="bi bi-pencil-square"></i> View/Edit</button>'
        + '<button class="btn-action-delete record-delete-btn" data-id="' + r.id + '" type="button" title="Delete Record"><i class="bi bi-trash"></i></button>'
        + '</div>'
        + '</td>'
        + '</tr>';
    }).join("");

    // Attach listeners
    tbody.querySelectorAll(".record-edit-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.dataset.id;
        openRecordInForm(id);
      });
    });

    tbody.querySelectorAll(".record-delete-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.dataset.id;
        openDeleteRecordModal(id);
      });
    });
  }

  function exportRecordsJSON() {
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(State.records, null, 2));
    var dlAnchor = document.createElement("a");
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", "extej-records-export.json");
    dlAnchor.click();
    showToast("Exported " + State.records.length + " records as JSON.", "success");
  }

  // ---- DELETE RECORD MODAL ----
  function initDeleteRecordModal() {
    var modal = document.getElementById("deleteRecordModal");
    var closeBtn = document.getElementById("deleteModalClose");
    var cancelBtn = document.getElementById("cancelDeleteRecordBtn");
    var confirmBtn = document.getElementById("confirmDeleteRecordBtn");
    if (!modal) return;

    function closeModal() {
      modal.classList.remove("open");
      State.recordToDeleteId = null;
    }

    closeBtn && closeBtn.addEventListener("click", closeModal);
    cancelBtn && cancelBtn.addEventListener("click", closeModal);
    modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });

    confirmBtn && confirmBtn.addEventListener("click", function () {
      if (!State.recordToDeleteId) return;
      var id = State.recordToDeleteId;
      RecordsAPI.deleteRecord(id).then(function () {
        State.records = State.records.filter(function (r) { return r.id !== id; });
        filterAndRenderRecords();
        updateKpiWidgets(State.records);
        closeModal();
        showToast("Record #" + id + " has been deleted.", "warn");
      });
    });
  }

  function openDeleteRecordModal(id) {
    var modal = document.getElementById("deleteRecordModal");
    var desc = document.getElementById("deleteModalDesc");
    var rec = State.records.find(function (r) { return r.id === id; });
    State.recordToDeleteId = id;
    if (desc && rec) {
      desc.textContent = "Are you sure you want to delete Record #" + id + " (" + rec.borrower + " - " + fmt(parseFloat(rec.amount) || 0, rec.currency || "EUR") + ")?";
    }
    if (modal) modal.classList.add("open");
  }

  // ---- ADD / MANAGE FORM CONTROLLER ----
  function initRecordForm() {
    var form = document.getElementById("recordForm");
    var slider = document.getElementById("formLtvSlider");
    var autofillBtn = document.getElementById("formAutofillBtn");
    var backBtn = document.getElementById("formBackToTableBtn");
    var cancelBtn = document.getElementById("recordFormCancelBtn");
    var resetBtn = document.getElementById("recordFormResetBtn");

    if (slider) {
      slider.addEventListener("input", function () {
        setText("formLtvBadge", slider.value + "%");
        updateFormLivePreview();
      });
    }

    var inputsToWatch = ["formAmount", "formCurrency", "formCollateralAmount", "formCollateralAsset", "formTerm", "formBorrower", "formType", "formInterest", "formStatus", "formMaturityDate"];
    inputsToWatch.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.addEventListener("input", updateFormLivePreview);
        el.addEventListener("change", updateFormLivePreview);
      }
    });

    if (autofillBtn) {
      autofillBtn.addEventListener("click", function () {
        var samples = [
          { borrower: "Charlotte Dubois", email: "charlotte.d@luxecap.fr", wallet: "0x3F8...9B2a", type: "Ethereum Smart Vault", amount: 15000, cur: "EUR", asset: "ETH", col: 6.25, ltv: 60, term: "6 months", status: "active", notes: "Collateral verified via Ledger Vault." },
          { borrower: "William Sterling", email: "w.sterling@sterlingfunds.co.uk", wallet: "bc1qxy...29c4", type: "Bitcoin-Backed Loan", amount: 35000, cur: "GBP", asset: "BTC", col: 2.85, ltv: 50, term: "12 months", status: "active", notes: "Annual revolving line of credit." },
          { borrower: "Liam Tanaka", email: "tanaka@tokyovaults.jp", wallet: "So111...4kM9", type: "Solana High-Yield Collateral", amount: 6500, cur: "USD", asset: "SOL", col: 85.0, ltv: 45, term: "3 months", status: "pending", notes: "Pending validator custody receipt." }
        ];
        var s = samples[Math.floor(Math.random() * samples.length)];
        var el;
        el = document.getElementById("formBorrower"); if (el) el.value = s.borrower;
        el = document.getElementById("formEmail"); if (el) el.value = s.email;
        el = document.getElementById("formWalletAddress"); if (el) el.value = s.wallet;
        el = document.getElementById("formType"); if (el) el.value = s.type;
        el = document.getElementById("formCurrency"); if (el) el.value = s.cur;
        el = document.getElementById("formAmount"); if (el) el.value = s.amount;
        el = document.getElementById("formCollateralAsset"); if (el) el.value = s.asset;
        el = document.getElementById("formCollateralAmount"); if (el) el.value = s.col;
        el = document.getElementById("formLtvSlider"); if (el) { el.value = s.ltv; setText("formLtvBadge", s.ltv + "%"); }
        el = document.getElementById("formTerm"); if (el) el.value = s.term;
        el = document.getElementById("formStatus"); if (el) el.value = s.status;
        el = document.getElementById("formNotes"); if (el) el.value = s.notes;
        updateFormLivePreview();
        showToast("Autofilled sample client data.", "info");
      });
    }

    if (backBtn) backBtn.addEventListener("click", function () { switchView("table"); });
    if (cancelBtn) cancelBtn.addEventListener("click", function () { switchView("table"); });
    if (resetBtn) resetBtn.addEventListener("click", function () { resetFormToCreateMode(); });

    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var borrowerInput = document.getElementById("formBorrower");
        var emailInput = document.getElementById("formEmail");
        var amountInput = document.getElementById("formAmount");

        if (!borrowerInput.value.trim() || !emailInput.value.trim() || !amountInput.value) {
          showToast("Please fill in all required fields.", "warn");
          return;
        }

        var isEdit = !!State.editingRecordId;
        var recordId = isEdit ? State.editingRecordId : (document.getElementById("formRecordId").value || ("REC-" + (State.records.length + 101)));
        var amount = parseFloat(amountInput.value) || 0;
        var cur = document.getElementById("formCurrency").value || "EUR";
        var colAsset = document.getElementById("formCollateralAsset").value || "BTC";
        var colAmount = parseFloat(document.getElementById("formCollateralAmount").value) || 0;
        var ltv = parseInt(document.getElementById("formLtvSlider").value, 10) || 50;

        var recordData = {
          id: recordId,
          borrower: borrowerInput.value.trim(),
          email: emailInput.value.trim(),
          walletAddress: document.getElementById("formWalletAddress").value.trim(),
          type: document.getElementById("formType").value,
          currency: cur,
          amount: amount,
          collateralAsset: colAsset,
          collateralAmount: colAmount,
          collateral: colAmount + " " + colAsset,
          ltv: ltv,
          interest: document.getElementById("formInterest").value.trim() || "0%",
          term: document.getElementById("formTerm").value,
          repaymentType: document.getElementById("formRepaymentType").value,
          status: document.getElementById("formStatus").value,
          maturityDate: document.getElementById("formMaturityDate").value || new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0],
          riskRating: document.getElementById("formRiskRating").value,
          notes: document.getElementById("formNotes").value.trim()
        };

        RecordsAPI.saveRecord(recordData).then(function (saved) {
          var existingIdx = State.records.findIndex(function (r) { return r.id === saved.id; });
          if (existingIdx >= 0) {
            State.records[existingIdx] = saved;
          } else {
            State.records.unshift(saved);
          }

          updateKpiWidgets(State.records);
          filterAndRenderRecords();
          showToast(isEdit ? "Record #" + saved.id + " updated successfully!" : "New Record #" + saved.id + " created successfully!", "success");

          resetFormToCreateMode();
          switchView("table");

          setTimeout(function () {
            var row = document.getElementById("row-" + saved.id);
            if (row) {
              row.classList.add("highlight-updated");
              row.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }
          }, 200);
        });
      });
    }

    resetFormToCreateMode();
  }

  function resetFormToCreateMode() {
    State.editingRecordId = null;
    var nextNum = State.records.reduce(function (max, r) {
      var match = (r.id || "").match(/\d+/);
      return match ? Math.max(max, parseInt(match[0], 10)) : max;
    }, 105);
    var nextId = "REC-" + (nextNum + 1);

    var el;
    el = document.getElementById("formRecordId"); if (el) el.value = nextId;
    el = document.getElementById("formBorrower"); if (el) el.value = "";
    el = document.getElementById("formEmail"); if (el) el.value = "";
    el = document.getElementById("formWalletAddress"); if (el) el.value = "";
    el = document.getElementById("formType"); if (el) el.value = "Bitcoin-Backed Loan";
    el = document.getElementById("formCurrency"); if (el) el.value = "EUR";
    el = document.getElementById("formAmount"); if (el) el.value = "5000";
    el = document.getElementById("formCollateralAsset"); if (el) el.value = "BTC";
    el = document.getElementById("formCollateralAmount"); if (el) el.value = "0.4146";
    el = document.getElementById("formLtvSlider"); if (el) { el.value = "50"; setText("formLtvBadge", "50%"); }
    el = document.getElementById("formInterest"); if (el) el.value = "0%";
    el = document.getElementById("formTerm"); if (el) el.value = "3 months";
    el = document.getElementById("formRepaymentType"); if (el) el.value = "Monthly Amortized";
    el = document.getElementById("formStatus"); if (el) el.value = "active";
    el = document.getElementById("formRiskRating"); if (el) el.value = "Low";
    el = document.getElementById("formNotes"); if (el) el.value = "";

    var matDate = new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0];
    el = document.getElementById("formMaturityDate"); if (el) el.value = matDate;

    var badge = document.getElementById("formModeBadge");
    if (badge) {
      badge.className = "view-mode-pill create";
      badge.innerHTML = '<i class="bi bi-plus-circle"></i> Create Mode';
    }
    setText("formHeaderTitle", "Add / Manage Record");
    setText("submitBtnText", "Save Record");
    setText("formBreadcrumbAction", "Add Record");

    updateFormLivePreview();
  }

  function openRecordInForm(id) {
    var rec = State.records.find(function (r) { return r.id === id; });
    if (!rec) return;

    State.editingRecordId = rec.id;
    var el;
    el = document.getElementById("formRecordId"); if (el) el.value = rec.id;
    el = document.getElementById("formBorrower"); if (el) el.value = rec.borrower || "";
    el = document.getElementById("formEmail"); if (el) el.value = rec.email || "";
    el = document.getElementById("formWalletAddress"); if (el) el.value = rec.walletAddress || "";
    el = document.getElementById("formType"); if (el) el.value = rec.type || "Bitcoin-Backed Loan";
    el = document.getElementById("formCurrency"); if (el) el.value = rec.currency || "EUR";
    el = document.getElementById("formAmount"); if (el) el.value = rec.amount || "";
    el = document.getElementById("formCollateralAsset"); if (el) el.value = rec.collateralAsset || "BTC";
    el = document.getElementById("formCollateralAmount"); if (el) el.value = rec.collateralAmount || "";
    el = document.getElementById("formLtvSlider"); if (el) { el.value = rec.ltv || 50; setText("formLtvBadge", (rec.ltv || 50) + "%"); }
    el = document.getElementById("formInterest"); if (el) el.value = rec.interest || "0%";
    el = document.getElementById("formTerm"); if (el) el.value = rec.term || "3 months";
    el = document.getElementById("formRepaymentType"); if (el) el.value = rec.repaymentType || "Monthly Amortized";
    el = document.getElementById("formStatus"); if (el) el.value = rec.status || "active";
    el = document.getElementById("formMaturityDate"); if (el) el.value = rec.maturityDate || "";
    el = document.getElementById("formRiskRating"); if (el) el.value = rec.riskRating || "Low";
    el = document.getElementById("formNotes"); if (el) el.value = rec.notes || "";

    var badge = document.getElementById("formModeBadge");
    if (badge) {
      badge.className = "view-mode-pill edit";
      badge.innerHTML = '<i class="bi bi-pencil-square"></i> Editing: #' + rec.id;
    }
    setText("formHeaderTitle", "Edit Record: #" + rec.id);
    setText("submitBtnText", "Update Record #" + rec.id);
    setText("formBreadcrumbAction", "Edit #" + rec.id);

    updateFormLivePreview();
    switchView("form");
    showToast("Opened Record #" + rec.id + " for editing.", "info");
  }

  function updateFormLivePreview() {
    var borrower = (document.getElementById("formBorrower") ? document.getElementById("formBorrower").value : "") || "Austin Robertson";
    var type = (document.getElementById("formType") ? document.getElementById("formType").value : "") || "Bitcoin-Backed Loan";
    var cur = (document.getElementById("formCurrency") ? document.getElementById("formCurrency").value : "") || "EUR";
    var amt = parseFloat(document.getElementById("formAmount") ? document.getElementById("formAmount").value : 5000) || 0;
    var colAmt = parseFloat(document.getElementById("formCollateralAmount") ? document.getElementById("formCollateralAmount").value : 0.4146) || 0;
    var colAsset = (document.getElementById("formCollateralAsset") ? document.getElementById("formCollateralAsset").value : "") || "BTC";
    var ltv = (document.getElementById("formLtvSlider") ? document.getElementById("formLtvSlider").value : "50") + "%";
    var term = (document.getElementById("formTerm") ? document.getElementById("formTerm").value : "") || "3 months";
    var mat = (document.getElementById("formMaturityDate") ? document.getElementById("formMaturityDate").value : "") || "2025-06-15";
    var interest = (document.getElementById("formInterest") ? document.getElementById("formInterest").value : "") || "0%";
    var status = (document.getElementById("formStatus") ? document.getElementById("formStatus").value : "") || "active";

    setText("prevBorrower", borrower);
    setText("prevType", type);
    setText("prevAmount", fmt(amt, cur));
    setText("prevCollateral", colAmt + " " + colAsset);
    setText("prevLtv", ltv);
    setText("prevInterest", interest);
    setText("prevTerm", term);
    setText("prevMaturity", mat);
    setText("prevTotalDue", fmt(amt, cur));

    var termMonths = parseInt(term, 10) || 3;
    var monthly = amt / termMonths;
    setText("prevMonthly", fmt(monthly, cur) + " / mo");

    var statusBadge = document.getElementById("previewStatusBadge");
    if (statusBadge) {
      statusBadge.textContent = status.charAt(0).toUpperCase() + status.slice(1);
      statusBadge.className = "badge px-2 " + (status === "active" ? "bg-success-subtle text-success border border-success-subtle" : status === "warning" ? "bg-warning-subtle text-warning border border-warning-subtle" : status === "pending" ? "bg-info-subtle text-info border border-info-subtle" : "bg-secondary-subtle text-secondary border border-secondary-subtle");
    }
  }

  // ---- SETTINGS PAGE CONTROLLER ----
  function initSettingsPage() {
    var saveBtn = document.getElementById("saveAllSettingsBtn");
    var clearBtn = document.getElementById("clearAppDataBtn");
    var compactToggle = document.getElementById("compactTableToggle");

    if (compactToggle) {
      compactToggle.addEventListener("change", function () {
        var table = document.getElementById("recordsDataTable");
        if (table) {
          if (compactToggle.checked) table.classList.add("table-sm");
          else table.classList.remove("table-sm");
        }
      });
    }

    document.querySelectorAll(".theme-card-option").forEach(function (card) {
      card.addEventListener("click", function () {
        document.querySelectorAll(".theme-card-option").forEach(function (c) { c.classList.remove("active"); });
        card.classList.add("active");
        showToast("Theme accent set to " + card.dataset.color, "info");
      });
    });

    if (saveBtn) {
      saveBtn.addEventListener("click", function () {
        showToast("All settings saved and applied successfully!", "success");
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        if (confirm("Reset all local application storage to defaults?")) {
          localStorage.clear();
          showToast("Application storage reset. Reloading...", "info");
          setTimeout(function () { window.location.reload(); }, 600);
        }
      });
    }
  }

  // ---- PROFILE PAGE CONTROLLER ----
  function initProfilePage() {
    var form = document.getElementById("profileForm");
    var editBtn = document.getElementById("profileQuickEditBtn");

    try {
      var savedProfile = localStorage.getItem("extej_user_profile");
      if (savedProfile) {
        var p = JSON.parse(savedProfile);
        updateProfileDOM(p);
      }
    } catch (e) {}

    if (editBtn) {
      editBtn.addEventListener("click", function () {
        var firstInput = document.getElementById("profileFormName");
        if (firstInput) firstInput.focus();
      });
    }

    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var profileData = {
          name: document.getElementById("profileFormName").value.trim(),
          role: document.getElementById("profileFormRole").value.trim(),
          email: document.getElementById("profileFormEmail").value.trim(),
          phone: document.getElementById("profileFormPhone").value.trim(),
          country: document.getElementById("profileFormCountry").value,
          bio: document.getElementById("profileFormBio").value.trim(),
          avatarUrl: "https://ui-avatars.com/api/?name=" + encodeURIComponent(document.getElementById("profileFormName").value.trim()) + "&background=2563EB&color=fff&size=80"
        };

        localStorage.setItem("extej_user_profile", JSON.stringify(profileData));
        updateProfileDOM(profileData);
        showToast("Profile updated successfully!", "success");
      });
    }
  }

  function updateProfileDOM(user) {
    if (!user) return;
    setText("userName", user.name);
    setText("userRole", user.role);
    setText("profileName", user.name);
    setText("profileRole", user.role);
    setText("profileEmail", user.email);
    setText("profileHeroName", user.name);
    setText("profileHeroRole", user.role + " \u2022 Extej Custody");
    setText("profileHeroEmail", user.email);

    var avatarUrl = user.avatarUrl || ("https://ui-avatars.com/api/?name=" + encodeURIComponent(user.name) + "&background=2563EB&color=fff&size=80");
    var userAvatar = document.getElementById("userAvatar"); if (userAvatar) userAvatar.src = avatarUrl;
    var profileAvatar = document.getElementById("profileAvatar"); if (profileAvatar) profileAvatar.src = avatarUrl;
    var profileHeroAvatar = document.getElementById("profileHeroAvatar"); if (profileHeroAvatar) profileHeroAvatar.src = avatarUrl;
  }

  // ---- NOTIFICATIONS PAGE CONTROLLER ----
  function initNotificationsPage() {
    var fullList = document.getElementById("fullNotifList");
    var markAllBtn = document.getElementById("pageMarkAllReadBtn");
    var simulateBtn = document.getElementById("simulateNotifBtn");
    var clearBtn = document.getElementById("clearAllNotifsBtn");

    var filterBtns = document.querySelectorAll("[data-notif-filter]");
    var currentFilter = "all";

    filterBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        filterBtns.forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        currentFilter = btn.dataset.notifFilter;
        renderFullNotifications();
      });
    });

    if (markAllBtn) {
      markAllBtn.addEventListener("click", function () {
        NotificationsAPI.markAllRead().then(function () {
          State.notifications.forEach(function (n) { n.read = true; });
          renderFullNotifications();
          updateNotificationBadges();
          showToast("All notifications marked as read.", "success");
        });
      });
    }

    if (simulateBtn) {
      simulateBtn.addEventListener("click", function () {
        var alerts = [
          { type: "info", title: "BTC Collateral Rebalanced", message: "SmartVault auto-balanced collateral ratio at 48.5% safe zone." },
          { type: "success", title: "Loan Payment Processed", message: "Monthly payment for #LN-001 received. Status updated to Good Standing." },
          { type: "warning", title: "Market Volatility Alert", message: "Ethereum price moved 5.4% in 1 hour. Margin monitored closely." },
          { type: "success", title: "New Record Added", message: "Custody record created and signed by compliance multisig." }
        ];
        var item = alerts[Math.floor(Math.random() * alerts.length)];
        var newNotif = {
          id: "n_" + Date.now(),
          type: item.type,
          title: item.title,
          message: item.message,
          timestamp: new Date().toISOString(),
          read: false
        };
        State.notifications.unshift(newNotif);
        renderFullNotifications();
        updateNotificationBadges();
        showToast("New notification alert triggered!", "info");
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        State.notifications = [];
        renderFullNotifications();
        updateNotificationBadges();
        showToast("Notification history cleared.", "info");
      });
    }

    renderFullNotifications();
    updateNotificationBadges();

    function renderFullNotifications() {
      if (!fullList) return;
      var notifs = State.notifications;
      if (currentFilter === "unread") notifs = notifs.filter(function (n) { return !n.read; });
      else if (currentFilter === "loan") notifs = notifs.filter(function (n) { return n.title.toLowerCase().indexOf("loan") >= 0 || n.title.toLowerCase().indexOf("collateral") >= 0; });
      else if (currentFilter === "security") notifs = notifs.filter(function (n) { return n.type === "warning" || n.type === "danger"; });

      if (!notifs.length) {
        fullList.innerHTML = '<div style="padding:48px 20px;text-align:center;color:var(--text-muted);"><i class="bi bi-bell-slash fs-1 d-block mb-2"></i>No notifications in this filter</div>';
        return;
      }

      var iconMap = { info: "bi-info-circle-fill text-primary", success: "bi-check-circle-fill text-success", warning: "bi-exclamation-triangle-fill text-warning", danger: "bi-x-circle-fill text-danger" };

      fullList.innerHTML = notifs.map(function (n) {
        return '<div class="notif-page-card ' + (n.read ? "" : "unread") + '" data-id="' + n.id + '">'
          + '<div class="notif-page-icon"><i class="bi ' + (iconMap[n.type] || "bi-bell") + '"></i></div>'
          + '<div class="notif-page-content">'
          + '<div class="d-flex align-items-center justify-content-between">'
          + '<span class="notif-page-title">' + n.title + '</span>'
          + '<span class="text-muted small" style="font-size:.68rem;">' + timeAgo(n.timestamp) + '</span>'
          + '</div>'
          + '<p class="notif-page-message mb-2">' + n.message + '</p>'
          + '<div class="d-flex align-items-center gap-2">'
          + (n.read ? '' : '<button class="btn btn-sm btn-light border py-0 px-2 notif-mark-single-btn" data-id="' + n.id + '" style="font-size:.68rem;">Mark as read</button>')
          + '<button class="btn btn-sm btn-link text-muted p-0 text-decoration-none notif-dismiss-single-btn" data-id="' + n.id + '" style="font-size:.68rem;">Dismiss</button>'
          + '</div>'
          + '</div>'
          + '</div>';
      }).join("");

      fullList.querySelectorAll(".notif-mark-single-btn").forEach(function (b) {
        b.addEventListener("click", function (e) {
          e.stopPropagation();
          var id = b.dataset.id;
          var match = State.notifications.find(function (n) { return n.id === id; });
          if (match) { match.read = true; renderFullNotifications(); updateNotificationBadges(); }
        });
      });

      fullList.querySelectorAll(".notif-dismiss-single-btn").forEach(function (b) {
        b.addEventListener("click", function (e) {
          e.stopPropagation();
          var id = b.dataset.id;
          State.notifications = State.notifications.filter(function (n) { return n.id !== id; });
          renderFullNotifications(); updateNotificationBadges();
        });
      });
    }

    function updateNotificationBadges() {
      var unread = State.notifications.filter(function (n) { return !n.read; }).length;
      setText("notifBadge", unread);
      setText("navNotifBadge", unread);
      setText("notifBadgeUnread", unread);
      setText("notifBadgeAll", State.notifications.length);

      var badge = document.getElementById("notifBadge");
      if (badge) badge.style.display = unread > 0 ? "flex" : "none";
    }
  }

  // ---- SORT ----
  function initSort() {
    var sortState = {};
    document.querySelectorAll(".sort-icon[data-col]").forEach(function (icon) {
      icon.addEventListener("click", function () {
        var col = icon.dataset.col;
        document.querySelectorAll(".sort-icon").forEach(function (i) {
          i.classList.remove("bi-arrow-up", "bi-arrow-down", "asc", "desc"); i.classList.add("bi-arrow-down-up");
        });
        var dir = sortState[col] === "asc" ? "desc" : "asc";
        sortState = {}; sortState[col] = dir;
        icon.classList.remove("bi-arrow-down-up");
        icon.classList.add(dir === "asc" ? "bi-arrow-up" : "bi-arrow-down", dir);
        var sorted = State.loansData.slice().sort(function (a, b) {
          var va = a[col], vb = b[col];
          if (col === "remainingLoan" || col === "ltv") { va = parseFloat(va); vb = parseFloat(vb); }
          return va < vb ? (dir === "asc" ? -1 : 1) : va > vb ? (dir === "asc" ? 1 : -1) : 0;
        });
        renderLoansTable(sorted);
      });
    });
  }

  // ---- PROFILE PANEL ----
  function initProfilePanel() {
    var profilePanel      = document.getElementById("profilePanel");
    var profileBtn        = document.getElementById("profileBtn");
    var profilePanelClose = document.getElementById("profilePanelClose");
    var profileLogoutBtn  = document.getElementById("profileLogoutBtn");
    var backdrop          = document.getElementById("panelBackdrop");

    if (!profilePanel || !profileBtn) return;

    function openProfilePanel() {
      closeAllPanels();
      profilePanel.classList.add("open");
      if (backdrop) backdrop.classList.add("open");
    }

    function closeProfilePanel() {
      profilePanel.classList.remove("open");
      if (backdrop) backdrop.classList.remove("open");
    }

    profileBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      profilePanel.classList.contains("open") ? closeProfilePanel() : openProfilePanel();
    });

    profileBtn.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); profileBtn.click(); }
    });

    profilePanelClose && profilePanelClose.addEventListener("click", closeProfilePanel);

    if (profileLogoutBtn) {
      profileLogoutBtn.addEventListener("click", function () {
        closeProfilePanel();
        AuthAPI.logout().then(function () {
          showToast("You have been logged out.", "info");
        });
      });
    }

    AuthAPI.getCurrentUser().then(function (user) {
      var saved = null;
      try {
        var raw = localStorage.getItem("extej_user_profile");
        if (raw) saved = JSON.parse(raw);
      } catch (e) {}

      var u = saved || user;
      updateProfileDOM(u);
    });
  }

  // ---- INIT ----
  function init() {
    initTheme();
    initUser();
    initNotifications();
    initFilter();
    initSettings();
    initCurrencyDropdown();
    initAmountCards();
    initCustomAmountInput();
    initCollateral();
    initGetLoanModal();
    initZeroRiskModal();
    initLoansTable();
    initTabs();
    initVideo();
    initSidebar();
    initSort();
    initProfilePanel();
    initRecordsManagement();
    initRecordForm();
    initSettingsPage();
    initProfilePage();
    initNotificationsPage();
    recomputeLoan();
  }

  // Execute initialization
  init();

});
