// =====================================================
// api/loans.js  |  Loans API Stub
// =====================================================
// Replace mock data + stubs with real API calls.

var LoansAPI = (function () {

  // ── Mock Data ──────────────────────────────────────
  var BTC_RATES = { EUR: 24117.08, USD: 26160.40, GBP: 20721.76, CHF: 23408.10 };

  var MOCK_USER_LOANS = [
    { id: "LN-001", tag: "Bitcoin-backed", status: "active",  remainingLoan: 234.50, currency: "EUR", collateral: "0.0097 BTC", maturityDate: "2024-12-15", term: "3 months", ltv: "50" },
    { id: "LN-002", tag: "Bitcoin-backed", status: "warning", remainingLoan: 100.00, currency: "EUR", collateral: "0.0042 BTC", maturityDate: "2025-01-10", term: "3 months", ltv: "68" }
  ];

  var LOAN_AMOUNTS = {
    EUR: [50, 100, 250, 500],
    USD: [60, 110, 270, 550],
    GBP: [45,  90, 220, 440],
    CHF: [55, 105, 260, 520]
  };

  function getLoanOptions(currency) {
    // TODO: return fetch("/api/loans/options?currency=" + currency).then(r => r.json());
    var amounts = LOAN_AMOUNTS[currency] || LOAN_AMOUNTS.EUR;
    var options = amounts.map(function (a) {
      return { amount: a, label: a.toString(), currency: currency };
    });
    return Promise.resolve(options);
  }

  function calculateLoan(amount, currency, collateralBtc) {
    // TODO: return fetch("/api/loans/calculate", { method:"POST", body: JSON.stringify({amount,currency,collateralBtc}) }).then(r => r.json());
    var rate       = BTC_RATES[currency] || BTC_RATES.EUR;
    var ltv        = 50;
    var collateral = collateralBtc || parseFloat((amount / (rate * ltv / 100)).toFixed(6));
    var monthly    = (amount / 3).toFixed(2);

    return Promise.resolve({
      loanAmount:     amount.toFixed(2),
      interestRate:   "0%",
      loanToValue:    ltv.toString(),
      loanTerm:       "3 months",
      collateralBtc:  collateral.toFixed(6),
      exchangeRate:   rate.toFixed(2),
      originationFee: "2.5%",
      earlyRepayment: "Free",
      totalInterest:  "0.00",
      monthlyPayment: monthly
    });
  }

  function applyForLoan(data) {
    // TODO: return fetch("/api/loans/apply", { method:"POST", body: JSON.stringify(data) }).then(r => r.json());
    console.log("[LoansAPI] applyForLoan:", data);
    return new Promise(function (resolve) {
      setTimeout(function () {
        resolve({ success: true, loanId: "LN-" + String(Math.floor(Math.random() * 900) + 100).padStart(3, "0") });
      }, 1500);
    });
  }

  function getUserLoans() {
    // TODO: return fetch("/api/loans").then(r => r.json());
    return Promise.resolve(MOCK_USER_LOANS);
  }

  return { getLoanOptions: getLoanOptions, calculateLoan: calculateLoan, applyForLoan: applyForLoan, getUserLoans: getUserLoans };

})();

if (typeof window !== "undefined") {
  window.LoansAPI = LoansAPI;
}
