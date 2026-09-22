const input = $input.first().json;
const analysis = input.advancedAnalysis;
function finiteTree(value) {
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(finiteTree);
  if (value && typeof value === 'object') return Object.values(value).every(finiteTree);
  return true;
}
analysis.results = analysis.results.filter((result) => {
  if (result.status === 'ok' && finiteTree(result)) return true;
  analysis.skipped.push({ method: result.method || 'unknown', reason: 'Invalid or non-finite analysis result.' });
  return false;
});
analysis.summary = {
  requestedMode: input.analysisPlan.mode,
  completed: analysis.results.map((r) => r.method),
  skipped: analysis.skipped.map((r) => r.method),
  descriptiveAvailable: true,
};
return [{ json: input }];
