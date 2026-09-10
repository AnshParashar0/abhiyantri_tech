// =====================================================
// Extej - Wallet Page  |  app.js
// =====================================================

// Wait until the full HTML page is loaded before running JavaScript
document.addEventListener("DOMContentLoaded", function () {


  // ---------------------------------------------------
  // 1. LOAN TABS  (Flexible Loan / Quick Loan switch)
  // ---------------------------------------------------

  var flexTab  = document.getElementById("flexLoanTab");
  var quickTab = document.getElementById("quickLoanTab");

  function activateTab(clickedTab) {
    flexTab.classList.remove("active");
    quickTab.classList.remove("active");
    clickedTab.classList.add("active");
  }

  if (flexTab) {
    flexTab.addEventListener("click", function () {
      activateTab(flexTab);
    });
  }

  if (quickTab) {
    quickTab.addEventListener("click", function () {
      activateTab(quickTab);
    });
  }


  // ---------------------------------------------------
  // 2. AMOUNT CARD SELECTION  (50 / 100 / 250 / 500)
  // ---------------------------------------------------

  var amountCards = document.querySelectorAll(".amount-card");

  // Loan details for each selectable amount
  var loanDetails = {
    "50": {
      totalRepayment: "50.0 EUR",
      interestRate:   "0%",
      loanToValue:    "50%",
      loanTerm:       "3 months",
      collateral:     "0.004146 B",
      exchangeRate:   "24117.08 EUR",
      originationFee: "2.5%",
      earlyRepayment: "Free",
      loanAmount:     "50.00 EUR",
      totalInterest:  "0.00 EUR",
      monthlyPayment: "16.67 EUR"
    },
    "100": {
      totalRepayment: "100.0 EUR",
      interestRate:   "0%",
      loanToValue:    "50%",
      loanTerm:       "3 months",
      collateral:     "0.008293 B",
      exchangeRate:   "24117.08 EUR",
      originationFee: "2.5%",
      earlyRepayment: "Free",
      loanAmount:     "100.00 EUR",
      totalInterest:  "0.00 EUR",
      monthlyPayment: "33.34 EUR"
    },
    "250": {
      totalRepayment: "250.0 EUR",
      interestRate:   "0%",
      loanToValue:    "50%",
      loanTerm:       "3 months",
      collateral:     "0.020733 B",
      exchangeRate:   "24117.08 EUR",
      originationFee: "2.5%",
      earlyRepayment: "Free",
      loanAmount:     "250.00 EUR",
      totalInterest:  "0.00 EUR",
      monthlyPayment: "83.34 EUR"
    },
    "500": {
      totalRepayment: "500.0 EUR",
      interestRate:   "0%",
      loanToValue:    "50%",
      loanTerm:       "3 months",
      collateral:     "0.041465 B",
      exchangeRate:   "24117.08 EUR",
      originationFee: "2.5%",
      earlyRepayment: "Free",
      loanAmount:     "500.00 EUR",
      totalInterest:  "0.00 EUR",
      monthlyPayment: "166.67 EUR"
    }
  };

  // The four amounts match the four cards left-to-right, top-to-bottom
  var cardAmounts = ["50", "100", "250", "500"];

  // References to the right-side loan detail panel elements
  var totalRepaymentEl = document.querySelector(".detail-value.highlight");
  var detailRows       = document.querySelectorAll(".detail-row .detail-value:not(.highlight)");

  // Fill the loan details panel with data for the chosen amount
  function updateLoanPanel(amount) {
    var data = loanDetails[amount];
    if (!data) return;

    // Update the big highlighted total at the top
    if (totalRepaymentEl) {
      totalRepaymentEl.textContent = "● " + data.totalRepayment;
    }

    // Update all other detail rows in the same order as the HTML
    var rowValues = [
      data.interestRate,
      data.loanToValue,
      data.loanTerm,
      data.collateral,
      data.exchangeRate,
      data.originationFee,
      data.earlyRepayment,
      data.loanAmount,
      data.totalInterest,
      data.monthlyPayment
    ];

    detailRows.forEach(function (el, index) {
      if (rowValues[index] !== undefined) {
        el.textContent = rowValues[index];
      }
    });
  }

  // Attach click listeners to each amount card
  amountCards.forEach(function (card, index) {
    card.addEventListener("click", function () {
      // Remove the selected highlight from every card
      amountCards.forEach(function (c) {
        c.classList.remove("selected");
      });

      // Highlight the card that was just clicked
      card.classList.add("selected");

      // Refresh the loan details panel
      updateLoanPanel(cardAmounts[index]);
    });
  });


  // ---------------------------------------------------
  // 3. MOBILE SIDEBAR  (copy the desktop nav into the offcanvas drawer)
  // ---------------------------------------------------

  var desktopNav   = document.querySelector(".sidebar .sidebar-nav");
  var mobileTarget = document.getElementById("sidebarNavMobile");

  if (desktopNav && mobileTarget) {
    var navClone = desktopNav.cloneNode(true);
    mobileTarget.appendChild(navClone);
  }


  // ---------------------------------------------------
  // 4. DEMO VIDEO  (play button click)
  // ---------------------------------------------------

  var playButton = document.querySelector(".play-btn");

  if (playButton) {
    playButton.addEventListener("click", function () {
      alert("Demo video would play here.");
    });
  }


  // ---------------------------------------------------
  // 5. GET A LOAN BUTTON
  // ---------------------------------------------------

  var getLoanBtn = document.querySelector(".btn-get-loan");

  if (getLoanBtn) {
    getLoanBtn.addEventListener("click", function () {
      var selectedCard = document.querySelector(".amount-card.selected");

      if (selectedCard) {
        var amountText = selectedCard.querySelector(".amount-value").textContent.trim();
        alert("Applying for loan: " + amountText);
      } else {
        alert("Please select a loan amount first.");
      }
    });
  }


  // ---------------------------------------------------
  // 6. ZERO RISK LOANS BUTTON
  // ---------------------------------------------------

  var zeroRiskBtn = document.querySelector(".btn-zero-risk");

  if (zeroRiskBtn) {
    zeroRiskBtn.addEventListener("click", function () {
      alert("Showing zero risk loan options...");
    });
  }


  // ---------------------------------------------------
  // 7. TABLE COLUMN SORT  (visual indicator only, no data sort)
  // ---------------------------------------------------

  var sortIcons = document.querySelectorAll(".sort-icon");

  sortIcons.forEach(function (icon) {
    icon.style.cursor = "pointer";

    icon.addEventListener("click", function () {
      // Reset every column header back to the neutral double-arrow icon
      sortIcons.forEach(function (i) {
        i.classList.remove("bi-arrow-up", "bi-arrow-down");
        i.classList.add("bi-arrow-down-up");
      });

      // Show a descending arrow on the column that was clicked
      icon.classList.remove("bi-arrow-down-up");
      icon.classList.add("bi-arrow-down");
    });
  });


}); // end DOMContentLoaded
