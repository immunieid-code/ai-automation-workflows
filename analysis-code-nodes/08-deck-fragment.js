const advancedResults = advancedAnalysis?.results || [];
const advancedSkipped = advancedAnalysis?.skipped || [];
const advancedNarrative = plain(sections.advanced?.narrative,
  'Methods are selected from the request and checked against the available data. Results are descriptive or predictive, not causal.', 900);
function resultDetails(result) {
  if (result.method === 'regression') return `Target: ${esc(result.target)} · Features: ${esc(result.features.join(', '))} · ${esc(result.selectedModel)} · Test MAE: ${esc(num(result.models.find((m) => m.model === result.selectedModel)?.mae, 3))} · Mean baseline MAE: ${esc(num(result.models.find((m) => m.model === 'mean baseline')?.mae, 3))}`;
  if (result.method === 'forecast') return `Target: ${esc(result.target)} · Monthly ${esc(result.aggregation)} · ${esc(result.selectedModel)} · Holdout MAE: ${esc(num(result.models.find((m) => m.model === result.selectedModel)?.mae, 3))} · ${esc(result.forecast.length)} future monthly periods: ${result.forecast.map((p) => `${esc(p.period)} ${esc(num(p.value, 2))}`).join('; ')}`;
  if (result.method === 'clustering') return `${esc(result.selectedK)} clusters · ${esc(result.rowsUsed)} rows · Silhouette sample score: ${esc(num(result.silhouetteSampleScore, 3))} · Cluster sizes: ${esc(result.clusterSizes.join(', '))}`;
  if (result.method === 'hypothesis') return `${esc(result.test)} · p = ${esc(num(result.pValue, 5))} · ${result.test === 'One-way ANOVA' ? `η²: ${esc(num(result.etaSquared, 3))}` : result.meanDifference == null ? `Cramér's V: ${esc(num(result.cramersV, 3))}` : `Mean difference: ${esc(num(result.meanDifference, 3))}; Cohen's d: ${esc(num(result.cohenD, 3))}`}`;
  if (result.method === 'exploratory') return result.strongestPairs.map((p) => `${esc(p.columns.join(' / '))}: r = ${esc(num(p.pearsonR, 3))} (n=${esc(p.pairedRows)})`).join('; ');
  return '';
}
if (advancedResults.length || advancedSkipped.length || previous.analysisPlan?.mode !== 'auto') {
  const cards = advancedResults.map((r) => `<div class="card"><h3>${esc(r.method)}</h3><p>${resultDetails(r)}</p><p class="muted">${esc(r.caveat)}</p></div>`).join('');
  const skipped = advancedSkipped.length ? `<div class="card"><h3>Methods not run</h3><ul>${advancedSkipped.map((s) => `<li><strong>${esc(s.method)}:</strong> ${esc(s.reason)}</li>`).join('')}</ul></div>` : '';
  const advancedSlide = `<section class="slide" id="advanced"><span class="eyebrow">Advanced analysis</span><h2>${esc(plain(sections.advanced?.headline, 'Analysis matched to the data', 180))}</h2><p class="lead">${esc(advancedNarrative)}</p><div class="grid grid-2">${cards}${skipped}</div></section>`;
  html = html.replace('</main>', advancedSlide + '</main>');
}
