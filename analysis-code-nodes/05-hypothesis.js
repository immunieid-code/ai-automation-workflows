const input = $input.first().json;
const plan = input.analysisPlan;
if (!plan.selected.includes('hypothesis')) return [{ json: input }];

// Lanczos log-gamma, continued-fraction beta, and regularized upper gamma.
// These supply p-values without external packages. Output is rounded only for display.
function logGamma(z) {
  const p = [0.9999999999998099, 676.5203681218851, -1259.1392167224028,
    771.3234287776531, -176.6150291621406, 12.507343278686905,
    -0.13857109526572012, 9.984369578019572e-6, 1.5056327351493116e-7];
  if (z < 0.5) return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);
  z -= 1;
  let x = p[0];
  for (let i = 1; i < p.length; i++) x += p[i] / (z + i);
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}
function betaFraction(a, b, x) {
  const tiny = 1e-30;
  let c = 1, d = 1 - (a + b) * x / (a + 1);
  if (Math.abs(d) < tiny) d = tiny;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 200; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((a + m2 - 1) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < tiny) d = tiny;
    c = 1 + aa / c; if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d; h *= d * c;
    aa = -(a + m) * (a + b + m) * x / ((a + m2) * (a + m2 + 1));
    d = 1 + aa * d; if (Math.abs(d) < tiny) d = tiny;
    c = 1 + aa / c; if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const delta = d * c; h *= delta;
    if (Math.abs(delta - 1) < 1e-12) break;
  }
  return h;
}
function incompleteBeta(a, b, x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const front = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log1p(-x));
  return x < (a + 1) / (a + b + 2) ? front * betaFraction(a, b, x) / a
    : 1 - front * betaFraction(b, a, 1 - x) / b;
}
function gammaQ(a, x) {
  if (x <= 0) return 1;
  if (x < a + 1) {
    let sum = 1 / a, term = sum;
    for (let n = 1; n <= 300; n++) { term *= x / (a + n); sum += term; if (Math.abs(term) < Math.abs(sum) * 1e-13) break; }
    return Math.max(0, 1 - sum * Math.exp(-x + a * Math.log(x) - logGamma(a)));
  }
  let b = x + 1 - a, c = 1e30, d = 1 / b, h = d;
  for (let i = 1; i <= 300; i++) {
    const an = -i * (i - a); b += 2;
    d = an * d + b; if (Math.abs(d) < 1e-30) d = 1e-30;
    c = b + an / c; if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const delta = d * c; h *= delta;
    if (Math.abs(delta - 1) < 1e-13) break;
  }
  return Math.max(0, Math.min(1, h * Math.exp(-x + a * Math.log(x) - logGamma(a))));
}
const group = plan.group, target = plan.target;
const groups = [...new Set(input.cleanedRows.map((r) => r[group]).filter((v) => v != null))];
if (groups.length === 2 && target && input.profiling.columnStats[target]?.type === 'numeric') {
  const samples = groups.map((g) => input.cleanedRows.filter((r) => r[group] === g && Number.isFinite(r[target])).map((r) => r[target]));
  const [a, b] = samples;
  if (a.length < 5 || b.length < 5) {
    input.advancedAnalysis.skipped.push({ method: 'hypothesis', reason: 'Each group needs at least five valid numeric observations.' });
  } else {
    const mean = (v) => v.reduce((s, x) => s + x, 0) / v.length;
    const variance = (v, m) => v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1);
    const ma = mean(a), mb = mean(b), va = variance(a, ma), vb = variance(b, mb);
    const se2 = va / a.length + vb / b.length;
    if (se2 <= 0) input.advancedAnalysis.skipped.push({ method: 'hypothesis', reason: 'Both groups have no measurable variance.' });
    else {
      const t = (ma - mb) / Math.sqrt(se2);
      const df = se2 ** 2 / ((va / a.length) ** 2 / (a.length - 1) + (vb / b.length) ** 2 / (b.length - 1));
      const pValue = incompleteBeta(df / 2, 0.5, df / (df + t * t));
      const pooledSd = Math.sqrt(((a.length - 1) * va + (b.length - 1) * vb) / (a.length + b.length - 2));
      input.advancedAnalysis.results.push({ method: 'hypothesis', status: 'ok', test: 'Welch two-sided t-test',
        groupColumn: group, measure: target, groups, counts: [a.length, b.length], means: [ma, mb],
        meanDifference: ma - mb, tStatistic: t, degreesOfFreedom: df, pValue,
        cohenD: pooledSd > 0 ? (ma - mb) / pooledSd : null,
        caveat: 'Observational group comparison. Independence and sampling design must be checked by an analyst; significance is not causality.' });
    }
  }
} else if (groups.length >= 3 && groups.length <= 10 && target && input.profiling.columnStats[target]?.type === 'numeric') {
  const samples = groups.map((g) => input.cleanedRows.filter((r) => r[group] === g && Number.isFinite(r[target])).map((r) => r[target]));
  if (samples.some((s) => s.length < 5)) input.advancedAnalysis.skipped.push({ method: 'hypothesis', reason: 'One-way ANOVA requires at least five valid observations per group.' });
  else {
    const n = samples.reduce((s, a) => s + a.length, 0);
    const grand = samples.reduce((s, a) => s + a.reduce((x, y) => x + y, 0), 0) / n;
    const means = samples.map((a) => a.reduce((s, x) => s + x, 0) / a.length);
    const between = samples.reduce((s, a, i) => s + a.length * (means[i] - grand) ** 2, 0);
    const within = samples.reduce((s, a, i) => s + a.reduce((t, x) => t + (x - means[i]) ** 2, 0), 0);
    if (within <= 0) input.advancedAnalysis.skipped.push({ method: 'hypothesis', reason: 'Within-group variation is zero; ANOVA cannot be evaluated.' });
    else {
      const df1 = groups.length - 1, df2 = n - groups.length;
      const fStatistic = (between / df1) / (within / df2);
      const pValue = incompleteBeta(df2 / 2, df1 / 2, df2 / (df2 + df1 * fStatistic));
      input.advancedAnalysis.results.push({ method: 'hypothesis', status: 'ok', test: 'One-way ANOVA',
        groupColumn: group, measure: target, groups, counts: samples.map((a) => a.length), means,
        fStatistic, degreesOfFreedom: [df1, df2], pValue, etaSquared: between / (between + within),
        caveat: 'Overall group difference only; no pairwise conclusion. Independence and variance assumptions require analyst review.' });
    }
  }
} else if (group && plan.chiColumn && (!target || input.profiling.columnStats[target]?.type !== 'numeric')) {
  const other = plan.chiColumn;
  const rowLabels = [...new Set(input.cleanedRows.map((r) => r[group]).filter((v) => v != null))];
  const colLabels = [...new Set(input.cleanedRows.map((r) => r[other]).filter((v) => v != null))];
  if (rowLabels.length > 20 || colLabels.length > 20) {
    input.advancedAnalysis.skipped.push({ method: 'hypothesis', reason: 'Chi-square table exceeds 20 categories on an axis; choose lower-cardinality columns.' });
    return [{ json: input }];
  }
  const table = rowLabels.map((g) => colLabels.map((c) => input.cleanedRows.filter((r) => r[group] === g && r[other] === c).length));
  const rowTotals = table.map((r) => r.reduce((a, b) => a + b, 0));
  const colTotals = colLabels.map((_, j) => table.reduce((s, r) => s + r[j], 0));
  const total = rowTotals.reduce((a, b) => a + b, 0);
  let chi2 = 0, minExpected = Infinity;
  table.forEach((row, i) => row.forEach((count, j) => {
    const expected = rowTotals[i] * colTotals[j] / total;
    minExpected = Math.min(minExpected, expected);
    if (expected > 0) chi2 += (count - expected) ** 2 / expected;
  }));
  const df = (rowLabels.length - 1) * (colLabels.length - 1);
  if (df < 1 || minExpected < 5) input.advancedAnalysis.skipped.push({ method: 'hypothesis', reason: 'Chi-square table has insufficient categories or expected cell count below five.' });
  else input.advancedAnalysis.results.push({ method: 'hypothesis', status: 'ok', test: 'Chi-square independence',
    columns: [group, other], sampleSize: total, statistic: chi2, degreesOfFreedom: df,
    pValue: gammaQ(df / 2, chi2 / 2), cramersV: Math.sqrt(chi2 / (total * Math.min(rowLabels.length - 1, colLabels.length - 1))),
    caveat: 'Association between categories, not a causal effect. Rows with missing or uncaptured categories are excluded.' });
} else input.advancedAnalysis.skipped.push({ method: 'hypothesis', reason: 'No supported two-group numeric or categorical comparison.' });
return [{ json: input }];
