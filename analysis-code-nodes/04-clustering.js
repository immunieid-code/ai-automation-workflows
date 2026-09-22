const input = $input.first().json;
const plan = input.analysisPlan;
if (!plan.selected.includes('clustering')) return [{ json: input }];
const features = plan.clusterFeatures.slice(0, 5);
const complete = input.cleanedRows.filter((r) => features.every((f) => Number.isFinite(r[f])));
if (complete.length < 20) {
  input.advancedAnalysis.skipped.push({ method: 'clustering', reason: 'Fewer than 20 complete rows across selected numeric features.' });
  return [{ json: input }];
}
const sample = complete.length > 2000 ? complete.filter((_, i) => i % Math.ceil(complete.length / 2000) === 0) : complete;
const means = features.map((f) => sample.reduce((s, r) => s + r[f], 0) / sample.length);
const scales = features.map((f, j) => Math.sqrt(sample.reduce((s, r) => s + (r[f] - means[j]) ** 2, 0) / sample.length));
const usable = features.filter((_, j) => scales[j] > 1e-10);
if (usable.length < 2) {
  input.advancedAnalysis.skipped.push({ method: 'clustering', reason: 'Fewer than two selected features vary across records.' });
  return [{ json: input }];
}
const indices = features.map((f, j) => usable.includes(f) ? j : -1).filter((j) => j >= 0);
const data = sample.map((r) => indices.map((j) => (r[features[j]] - means[j]) / scales[j]));
const dist2 = (a, b) => a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0);
function cluster(k) {
  const centers = [data[0].slice()];
  for (let c = 1; c < k; c++) {
    let best = 0, farthest = -1;
    data.forEach((p, i) => {
      const distance = Math.min(...centers.map((center) => dist2(p, center)));
      if (distance > farthest) { farthest = distance; best = i; }
    });
    centers.push(data[best].slice());
  }
  let assignment = Array(data.length).fill(-1);
  for (let iteration = 0; iteration < 50; iteration++) {
    const next = data.map((p) => centers.reduce((best, center, i) => dist2(p, center) < dist2(p, centers[best]) ? i : best, 0));
    if (next.every((v, i) => v === assignment[i])) break;
    assignment = next;
    const sums = Array.from({ length: k }, () => Array(usable.length).fill(0));
    const counts = Array(k).fill(0);
    data.forEach((p, i) => { counts[assignment[i]]++; p.forEach((v, j) => sums[assignment[i]][j] += v); });
    centers.forEach((center, i) => { if (counts[i]) center.forEach((_, j) => centers[i][j] = sums[i][j] / counts[i]); });
  }
  const counts = Array(k).fill(0);
  assignment.forEach((a) => counts[a]++);
  if (counts.some((n) => n < 2)) return null;
  const sampleIndices = Array.from({ length: Math.min(150, data.length) }, (_, i) => Math.floor(i * data.length / Math.min(150, data.length)));
  const scores = sampleIndices.map((idx) => {
    const own = assignment[idx];
    const sum = Array(k).fill(0), count = Array(k).fill(0);
    data.forEach((p, j) => { if (j !== idx) { sum[assignment[j]] += Math.sqrt(dist2(data[idx], p)); count[assignment[j]]++; } });
    const a = count[own] ? sum[own] / count[own] : 0;
    const b = Math.min(...sum.map((v, c) => c === own || !count[c] ? Infinity : v / count[c]));
    return (b - a) / Math.max(a, b);
  });
  return { k, score: scores.reduce((a, b) => a + b, 0) / scores.length, counts,
    centers: centers.map((center) => Object.fromEntries(center.map((v, j) => [usable[j], v * scales[indices[j]] + means[indices[j]]]))) };
}
const candidates = [];
for (let k = 2; k <= Math.min(5, Math.floor(sample.length / 5)); k++) {
  const candidate = cluster(k);
  if (candidate) candidates.push(candidate);
}
if (!candidates.length) {
  input.advancedAnalysis.skipped.push({ method: 'clustering', reason: 'No stable candidate with at least two records per cluster.' });
  return [{ json: input }];
}
candidates.sort((a, b) => b.score - a.score);
input.advancedAnalysis.results.push({ method: 'clustering', status: 'ok', features: usable,
  rowsUsed: sample.length, rowsAvailable: complete.length, algorithm: 'standardized k-means',
  selectedK: candidates[0].k, silhouetteSampleScore: candidates[0].score,
  clusterSizes: candidates[0].counts, centroids: candidates[0].centers,
  candidateScores: candidates.map(({ k, score }) => ({ k, score })),
  caveat: 'Exploratory segments, not validated business personas. Silhouette estimated on up to 150 records.' });
return [{ json: input }];
