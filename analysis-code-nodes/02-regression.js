const input = $input.first().json;
const plan = input.analysisPlan;
if (!plan.selected.includes('regression')) return [{ json: input }];
const target = plan.target;
const candidates = plan.regressionFeatures;
const complete = input.cleanedRows.filter((r) => Number.isFinite(r[target]));
const split = Math.floor(complete.length * 0.8);
// Deterministic index order avoids random outcomes. Time-based prediction belongs to forecasting.
const ordered = complete.map((row, i) => ({ row, key: (i * 2654435761) >>> 0 })).sort((a, b) => a.key - b.key).map((x) => x.row);
const trainRaw = ordered.slice(0, split);
const testRaw = ordered.slice(split);
const featureScores = candidates.map((name) => {
  const pairs = trainRaw.filter((r) => Number.isFinite(r[name]));
  if (pairs.length < 20) return { name, score: -1 };
  const mx = pairs.reduce((s, r) => s + r[name], 0) / pairs.length;
  const my = pairs.reduce((s, r) => s + r[target], 0) / pairs.length;
  const cov = pairs.reduce((s, r) => s + (r[name] - mx) * (r[target] - my), 0);
  const vx = pairs.reduce((s, r) => s + (r[name] - mx) ** 2, 0);
  const vy = pairs.reduce((s, r) => s + (r[target] - my) ** 2, 0);
  return { name, score: vx > 0 && vy > 0 ? Math.abs(cov / Math.sqrt(vx * vy)) : -1 };
}).sort((a, b) => b.score - a.score).slice(0, 3).filter((x) => x.score > 0);
const features = featureScores.map((x) => x.name);
if (!features.length) {
  input.advancedAnalysis.skipped.push({ method: 'regression', reason: 'No numeric predictor varies enough in training data.' });
  return [{ json: input }];
}
const train = trainRaw.filter((r) => features.every((f) => Number.isFinite(r[f])));
const test = testRaw.filter((r) => features.every((f) => Number.isFinite(r[f])));
if (train.length < 20 || test.length < 5) {
  input.advancedAnalysis.skipped.push({ method: 'regression', reason: 'Too few complete train/test rows after filtering missing values.' });
  return [{ json: input }];
}
const means = features.map((f) => train.reduce((s, r) => s + r[f], 0) / train.length);
const scales = features.map((f, j) => Math.sqrt(train.reduce((s, r) => s + (r[f] - means[j]) ** 2, 0) / train.length) || 1);
const vector = (r) => [1, ...features.map((f, j) => (r[f] - means[j]) / scales[j])];
function fit(lambda) {
  const size = features.length + 1;
  const matrix = Array.from({ length: size }, () => Array(size + 1).fill(0));
  for (const r of train) {
    const x = vector(r);
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) matrix[i][j] += x[i] * x[j];
      matrix[i][size] += x[i] * r[target];
    }
  }
  for (let i = 1; i < size; i++) matrix[i][i] += lambda;
  for (let i = 0; i < size; i++) {
    let pivot = i;
    for (let r = i + 1; r < size; r++) if (Math.abs(matrix[r][i]) > Math.abs(matrix[pivot][i])) pivot = r;
    if (Math.abs(matrix[pivot][i]) < 1e-10) return null;
    [matrix[i], matrix[pivot]] = [matrix[pivot], matrix[i]];
    const divisor = matrix[i][i];
    for (let j = i; j <= size; j++) matrix[i][j] /= divisor;
    for (let r = 0; r < size; r++) if (r !== i) {
      const factor = matrix[r][i];
      for (let j = i; j <= size; j++) matrix[r][j] -= factor * matrix[i][j];
    }
  }
  return matrix.map((r) => r[size]);
}
const yMean = train.reduce((s, r) => s + r[target], 0) / train.length;
const models = [
  { name: 'mean baseline', predict: () => yMean },
  ...[[0.000001, 'linear regression'], [train.length, 'ridge regression']].map(([lambda, name]) => {
    const coefficients = fit(lambda);
    return coefficients && { name, predict: (r) => vector(r).reduce((s, x, i) => s + x * coefficients[i], 0), coefficients };
  }).filter(Boolean),
];
const evaluated = models.map((m) => {
  const actual = test.map((r) => r[target]);
  const predicted = test.map((r) => m.predict(r));
  const mae = actual.reduce((s, y, i) => s + Math.abs(y - predicted[i]), 0) / actual.length;
  const rmse = Math.sqrt(actual.reduce((s, y, i) => s + (y - predicted[i]) ** 2, 0) / actual.length);
  const avg = actual.reduce((s, y) => s + y, 0) / actual.length;
  const denominator = actual.reduce((s, y) => s + (y - avg) ** 2, 0);
  const r2 = denominator > 0 ? 1 - actual.reduce((s, y, i) => s + (y - predicted[i]) ** 2, 0) / denominator : null;
  return { model: m.name, mae, rmse, r2 };
}).sort((a, b) => a.mae - b.mae);
input.advancedAnalysis.results.push({ method: 'regression', status: 'ok', target, features,
  trainRows: train.length, testRows: test.length, split: 'deterministic 80/20 holdout',
  models: evaluated, selectedModel: evaluated.some((m) => m.model === 'ridge regression') ? 'ridge regression' : 'linear regression',
  caveat: 'Ridge is the prespecified primary model, with linear and mean baselines shown. Predictive association only; single holdout, no causal claim.' });
return [{ json: input }];
