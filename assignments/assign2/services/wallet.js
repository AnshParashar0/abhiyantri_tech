// =====================================================
// api/wallet.js  |  Wallet API Stub
// =====================================================
// Replace mock data + stubs with real API calls.

var WalletAPI = (function () {

  // ── Mock Data ──────────────────────────────────────
  var MOCK_BALANCE = { btc: 0.25, eur: 6029.27, usd: 6540.10, gbp: 5180.44 };

  var MOCK_CURRENCIES = [
    { code: "EUR", name: "Euro",           flag: "\uD83C\uDDEA\uD83C\uDDFA", rate: 24117.08 },
    { code: "USD", name: "US Dollar",      flag: "\uD83C\uDDFA\uD83C\uDDF8", rate: 26160.40 },
    { code: "GBP", name: "British Pound",  flag: "\uD83C\uDDEC\uD83C\uDDE7", rate: 20721.76 },
    { code: "CHF", name: "Swiss Franc",    flag: "\uD83C\uDDE8\uD83C\uDDED", rate: 23408.10 }
  ];

  function getWalletBalance() {
    // TODO: return fetch("/api/wallet/balance").then(r => r.json());
    return Promise.resolve(MOCK_BALANCE);
  }

  function getSupportedCurrencies() {
    // TODO: return fetch("/api/wallet/currencies").then(r => r.json());
    return Promise.resolve(MOCK_CURRENCIES);
  }

  function getExchangeRate(from, to) {
    // TODO: return fetch("/api/wallet/rates?from=" + from + "&to=" + to).then(r => r.json());
    var currency = MOCK_CURRENCIES.find(function (c) { return c.code === to; });
    return Promise.resolve(currency ? currency.rate : null);
  }

  return { getWalletBalance: getWalletBalance, getSupportedCurrencies: getSupportedCurrencies, getExchangeRate: getExchangeRate };

})();

if (typeof window !== "undefined") {
  window.WalletAPI = WalletAPI;
}
