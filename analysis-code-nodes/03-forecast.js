const input = $input.first().json;
const plan = input.analysisPlan;
if (!plan.selected.includes('forecast')) return [{ json: input }];
const bucket = new Map();
for (const row of input.cleanedRows) {
  if (!row[plan.date] || !Number.isFinite(row[plan.target])) continue;
  const period = String(row[plan.date]).slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(period)) continue;
  bucket.set(period, (bucket.get(period) || 0) + row[plan.target]);
}
const periods = [...bucket.keys()].sort();
const ordinal = (s) => Number(s.slice(0, 4)) * 12 + Number(s.slice(5, 7));
const consecutive = periods.every((s, i) => !i || ordinal(s) === ordinal(periods[i - 1]) + 1);
if (periods.length < 8 || !consecutive) {
  input.advancedAnalysis.skipped.push({ method: 'forecast', reason: 'Requires at least eight consecutive observed monthly periods. Missing months are not invented.' });
  return [{ json: input }];
}
const values = periods.map((p) => bucket.get(p));
const testCount = Math.max(2, Math.min(6, Math.floor(values.length * 0.2)));
const train = values.slice(0, -testCount);
const test = values.slice(-testCount);
const strategies = [
  { name: 'last-value naive', predict: (history) => history.at(-1) },
  { name: '3-period moving average', predict: (history) => history.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, history.length) },
  ...[0.2, 0.5, 0.8].map((alpha) => ({ name: `exponential smoothing α=${alpha}`, predict: (history) => {
    let level = history[0];
    for (let i = 1; i < history.length; i++) level = alpha * history[i] + (1 - alpha) * level;
    return level;
  } })),
];
const validationStart = Math.max(4, Math.floor(train.length * 0.6));
const validation = strategies.map((method) => {
  const errors = [];
  for (let i = validationStart; i < train.length; i++) errors.push(Math.abs(train[i] - method.predict(train.slice(0, i))));
  return { model: method.name, mae: errors.reduce((a, b) => a + b, 0) / errors.length };
}).sort((a, b) => a.mae - b.mae);
const winner = strategies.find((m) => m.name === validation[0].model);
const evaluated = strategies.map((method) => {
  const predictions = test.map((_, i) => method.predict(values.slice(0, train.length + i)));
  const mae = test.reduce((s, y, i) => s + Math.abs(y - predictions[i]), 0) / test.length;
  const rmse = Math.sqrt(test.reduce((s, y, i) => s + (y - predictions[i]) ** 2, 0) / test.length);
  return { model: method.name, mae, rmse };
}).sort((a, b) => a.mae - b.mae);
const future = [];
const history = values.slice();
for (let i = 1; i <= plan.horizon; i++) {
  const predicted = winner.predict(history);
  const stamp = ordinal(periods.at(-1)) + i;
  future.push({ period: `${Math.floor((stamp - 1) / 12)}-${String((stamp - 1) % 12 + 1).padStart(2, '0')}`, value: predicted });
  history.push(predicted);
}
input.advancedAnalysis.results.push({ method: 'forecast', status: 'ok', target: plan.target,
  frequency: 'monthly', observedPeriods: periods.length, holdoutPeriods: testCount,
  models: evaluated, validation, selectedModel: winner.name, forecast: future,
  caveat: 'Simple univariate forecast. Model selected on earlier rolling validation and evaluated on a later holdout; no causal drivers or calibrated prediction interval.' });
return [{ json: input }];
