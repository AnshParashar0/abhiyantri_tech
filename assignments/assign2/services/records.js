// =====================================================
// services/records.js  |  Records Management Service
// =====================================================

var RecordsAPI = (function () {
  var STORAGE_KEY = "extej_records_v1";

  var DEFAULT_RECORDS = [
    {
      id: "REC-101",
      borrower: "Austin Robertson",
      email: "austin.robertson@extej.io",
      walletAddress: "0x71C...a29B",
      type: "Bitcoin-Backed Loan",
      amount: 5000,
      currency: "EUR",
      collateralAsset: "BTC",
      collateralAmount: 0.4146,
      collateral: "0.4146 BTC",
      term: "3 months",
      ltv: 50,
      interest: "0%",
      status: "active",
      maturityDate: "2025-06-15",
      repaymentType: "Monthly Amortized",
      riskRating: "Low",
      notes: "Prime tier zero-risk loan backed by institutional custody BTC."
    },
    {
      id: "REC-102",
      borrower: "Elena Rostova",
      email: "elena.rostova@cryptoalpha.ch",
      walletAddress: "0x89A...93F1",
      type: "Ethereum Smart Vault",
      amount: 12500,
      currency: "USD",
      collateralAsset: "ETH",
      collateralAmount: 5.2000,
      collateral: "5.2000 ETH",
      term: "6 months",
      ltv: 68,
      interest: "1.8%",
      status: "warning",
      maturityDate: "2025-04-20",
      repaymentType: "Monthly Amortized",
      riskRating: "Medium",
      notes: "Margin call warning issued due to ETH price fluctuation."
    },
    {
      id: "REC-103",
      borrower: "Marcus Vance",
      email: "marcus.vance@vancetech.co.uk",
      walletAddress: "bc1qxy...0wlh",
      type: "Institutional Credit Line",
      amount: 28000,
      currency: "GBP",
      collateralAsset: "BTC",
      collateralAmount: 2.2500,
      collateral: "2.2500 BTC",
      term: "12 months",
      ltv: 45,
      interest: "2.5%",
      status: "active",
      maturityDate: "2026-01-10",
      repaymentType: "Lump Sum at Maturity",
      riskRating: "Low",
      notes: "Over-collateralized enterprise facility with quarterly audits."
    },
    {
      id: "REC-104",
      borrower: "Sophia Chen",
      email: "sophia.chen@pacificdao.org",
      walletAddress: "So111...7gK2",
      type: "Solana High-Yield Collateral",
      amount: 3200,
      currency: "USD",
      collateralAsset: "SOL",
      collateralAmount: 45.0000,
      collateral: "45.0000 SOL",
      term: "1 month",
      ltv: 40,
      interest: "0%",
      status: "pending",
      maturityDate: "2025-05-01",
      repaymentType: "Monthly Amortized",
      riskRating: "Low",
      notes: "Application awaiting smart contract audit verification."
    },
    {
      id: "REC-105",
      borrower: "David K. Lindholm",
      email: "david.lindholm@nordicinvest.se",
      walletAddress: "0x44B...e21C",
      type: "Bitcoin-Backed Loan",
      amount: 8000,
      currency: "CHF",
      collateralAsset: "BTC",
      collateralAmount: 0.6835,
      collateral: "0.6835 BTC",
      term: "3 months",
      ltv: 50,
      interest: "0%",
      status: "completed",
      maturityDate: "2025-02-28",
      repaymentType: "Lump Sum at Maturity",
      riskRating: "Low",
      notes: "Loan fully settled and collateral returned to SmartVault."
    }
  ];

  function loadFromStorage() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("[RecordsAPI] Failed to read localStorage, falling back to defaults", e);
    }
    saveToStorage(DEFAULT_RECORDS);
    return DEFAULT_RECORDS.slice();
  }

  function saveToStorage(records) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
      console.warn("[RecordsAPI] Failed to save to localStorage", e);
    }
  }

  function getRecords() {
    return Promise.resolve(loadFromStorage());
  }

  function getRecordById(id) {
    var records = loadFromStorage();
    var match = records.find(function (r) { return r.id === id; });
    return Promise.resolve(match ? JSON.parse(JSON.stringify(match)) : null);
  }

  function saveRecord(data) {
    var records = loadFromStorage();
    var index = records.findIndex(function (r) { return r.id === data.id; });
    if (index >= 0) {
      // Update existing
      records[index] = Object.assign({}, records[index], data);
    } else {
      // Insert new
      if (!data.id) {
        var maxNum = records.reduce(function (max, r) {
          var match = r.id.match(/\d+/);
          return match ? Math.max(max, parseInt(match[0], 10)) : max;
        }, 100);
        data.id = "REC-" + (maxNum + 1);
      }
      records.unshift(data);
    }
    saveToStorage(records);
    return Promise.resolve(data);
  }

  function deleteRecord(id) {
    var records = loadFromStorage();
    var filtered = records.filter(function (r) { return r.id !== id; });
    saveToStorage(filtered);
    return Promise.resolve({ success: true, id: id });
  }

  function resetToDefaults() {
    saveToStorage(DEFAULT_RECORDS);
    return Promise.resolve(DEFAULT_RECORDS.slice());
  }

  return {
    getRecords: getRecords,
    getRecordById: getRecordById,
    saveRecord: saveRecord,
    deleteRecord: deleteRecord,
    resetToDefaults: resetToDefaults,
    DEFAULT_RECORDS: DEFAULT_RECORDS
  };
})();

if (typeof window !== "undefined") {
  window.RecordsAPI = RecordsAPI;
}
