// Quick test to see if profit calculation works
const results = [
  { profitLoss: { spread: 100, moneyline: 150, total: -110 } },
  { profitLoss: { spread: -110, moneyline: -110, total: 100 } },
  { profitLoss: { spread: 100, moneyline: 200, total: -110 } },
];

const spreadProfit = results.reduce((sum, r) => sum + (r.profitLoss?.spread || 0), 0);
const moneylineProfit = results.reduce((sum, r) => sum + (r.profitLoss?.moneyline || 0), 0);
const totalProfit = results.reduce((sum, r) => sum + (r.profitLoss?.total || 0), 0);

console.log('Spread Profit:', spreadProfit);
console.log('Moneyline Profit:', moneylineProfit);
console.log('Total Profit:', totalProfit);
