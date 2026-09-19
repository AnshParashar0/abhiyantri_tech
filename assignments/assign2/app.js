document.addEventListener("DOMContentLoaded", function () {

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

  // ---- SIDEBAR ----
  function initSidebar() {
    var desktopNav = document.getElementById("sidebarNav");
    var mobileTarget = document.getElementById("sidebarNavMobile");
    if (desktopNav && mobileTarget) mobileTarget.appendChild(desktopNav.cloneNode(true));
    document.querySelectorAll(".sidebar .nav-item, #sidebarNavMobile .nav-item").forEach(function (item) {
      item.addEventListener("click", function (e) {
        e.preventDefault();
        var nav = item.closest("nav") || item.closest("[id]");
        if (nav) nav.querySelectorAll(".nav-item").forEach(function (i) { i.classList.remove("active"); });
        item.classList.add("active");
      });
    });
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
      var el;
      el = document.getElementById("profileName");   if (el) el.textContent = user.name;
      el = document.getElementById("profileRole");   if (el) el.textContent = user.role;
      el = document.getElementById("profileEmail");  if (el) el.textContent = user.email;
      el = document.getElementById("profileAvatar"); if (el) el.src         = user.avatarUrl;
    });
  }

  // ---- INIT ----
  function init() {
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
    recomputeLoan();
  }

  // Execute initialization
  init();

});
