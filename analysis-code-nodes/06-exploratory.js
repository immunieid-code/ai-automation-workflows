const input = $input.first().json;
const plan = input.analysisPlan;
if (!plan.selected.includes('exploratory')) return [{ json: input }];
const columns = plan.numeric.slice(0, 12);
const correlations = [];
for (let i = 0; i < columns.length; i++) for (let j = i + 1; j < columns.length; j++) {
  const xcol = columns[i], ycol = columns[j];
  const pairs = input.cleanedRows.filter((r) => Number.isFinite(r[xcol]) && Number.isFinite(r[ycol]));
  if (pairs.length < 10) continue;
  const mx = pairs.reduce((s, r) => s + r[xcol], 0) / pairs.length;
  const my = pairs.reduce((s, r) => s + r[ycol], 0) / pairs.length;
  const cross = pairs.reduce((s, r) => s + (r[xcol] - mx) * (r[ycol] - my), 0);
  const xx = pairs.reduce((s, r) => s + (r[xcol] - mx) ** 2, 0);
  const yy = pairs.reduce((s, r) => s + (r[ycol] - my) ** 2, 0);
  if (xx > 0 && yy > 0) correlations.push({ columns: [xcol, ycol], pearsonR: cross / Math.sqrt(xx * yy), pairedRows: pairs.length });
}
correlations.sort((a, b) => Math.abs(b.pearsonR) - Math.abs(a.pearsonR));
if (!correlations.length) input.advancedAnalysis.skipped.push({ method: 'exploratory', reason: 'No numeric pair has at least ten valid observations and nonzero variance.' });
else input.advancedAnalysis.results.push({ method: 'exploratory', status: 'ok', analysis: 'Pearson correlation',
  strongestPairs: correlations.slice(0, 5), columnsExamined: columns.length,
  caveat: 'Exploratory linear association only; correlation does not establish causation. Multiple pairs were screened.' });
return [{ json: input }];
