const fs = require('fs');
const path = require('path');
const assert = require('assert');

const workflow = JSON.parse(fs.readFileSync(path.join(__dirname, 'workflows/autodata-analyst-deck-notebook.json'), 'utf8'));
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const codeNodes = workflow.nodes.filter((node) => node.type === 'n8n-nodes-base.code');
for (const node of codeNodes) {
  try { new AsyncFunction('$input', '$', node.parameters.jsCode); }
  catch (error) { throw new Error(`${node.name}: ${error.message}`); }
}
const run = async (name, value) => {
  const node = workflow.nodes.find((n) => n.name === name);
  const fn = new AsyncFunction('$input', node.parameters.jsCode);
  const output = await fn({ first: () => ({ json: value }) });
  return output[0].json;
};
const stages = ['Plan Advanced Analysis', 'Run Regression Models', 'Run Forecast Models',
  'Run Clustering Models', 'Run Hypothesis Test', 'Run Exploratory Analysis', 'Validate Advanced Results'];

async function main() {
  const rows = Array.from({ length: 48 }, (_, i) => ({
    date: `${2022 + Math.floor(i / 12)}-${String(i % 12 + 1).padStart(2, '0')}-01`,
    sales: 100 + i * 3 + (i % 2 ? 12 : -7),
    ad_spend: 20 + i * 1.2 + (i % 3) * 4,
    visits: 1000 + i * 22 + (i % 5) * 11,
    region: i % 2 ? 'East' : 'West',
  }));
  const stat = (type, count, uniqueCount = 30) => ({ type, uniqueCount, numericStats: type === 'numeric' ? { count } : null });
  let value = {
    meta: { columns: ['date', 'sales', 'ad_spend', 'visits', 'region'],
      konteks: 'Forecast sales, predict sales with regression, cluster records, test significant difference by region, and find correlations.',
      analysisMode: 'auto', targetColumn: 'sales', timeColumn: 'date', groupColumn: 'region', forecastHorizon: 3 },
    profiling: { columnStats: { date: stat('date', 0), sales: stat('numeric', 48),
      ad_spend: stat('numeric', 48), visits: stat('numeric', 48), region: stat('categorical', 0, 2) } },
    aggregations: { primaryMeasure: 'sales', primaryDimension: 'region' }, cleanedRows: rows,
  };
  for (const stage of stages) value = await run(stage, value);
  const results = value.advancedAnalysis.results;
  assert.deepEqual(new Set(results.map((r) => r.method)), new Set(['regression', 'forecast', 'clustering', 'hypothesis', 'exploratory']));
  assert.equal(results.find((r) => r.method === 'forecast').forecast.length, 3);
  assert(results.find((r) => r.method === 'hypothesis').pValue >= 0);
  assert(results.find((r) => r.method === 'clustering').silhouetteSampleScore <= 1);

  value.meta = { ...value.meta, fileName: 'sample.csv', judul: 'Sample analysis', targetAudience: 'Analysts', outputLanguage: 'en', email: 'test@example.com' };
  value.profiling = { ...value.profiling, dataHealthScore: 95, dataHealthGrade: 'A', completenessPct: 100 };
  value.cleaningSummary = { cleanedRowsCount: 48, removedDuplicates: 0, invalidValues: 0, logs: [] };
  value.aggregations = { ...value.aggregations, overallTotal: 5000, validMeasureRows: 48,
    dimBreakdown: [], timeSeriesBreakdown: [] };
  value.engineeredKPIs = { totalRecords: 48, periodGrowthPct: null, profitMarginPct: null,
    paretoSummaryText: 'Not available.' };
  const promptResult = await run('Susun Prompt Scrollytelling AI', value);
  assert(promptResult.analysisPlan);
  assert(promptResult.prompt.includes('advancedResults'));
  const deckNode = workflow.nodes.find((n) => n.name === 'Susun Scrollytelling Deck HTML');
  const deckFn = new AsyncFunction('$input', '$', deckNode.parameters.jsCode);
  const helperContext = { helpers: { prepareBinaryData: async (buffer, fileName, mimeType) => ({ data: buffer.toString('base64'), fileName, mimeType }) } };
  const deckOutput = await deckFn.call(helperContext,
    { first: () => ({ json: { choices: [{ message: { content: '{}' } }] } }) },
    () => ({ first: () => ({ json: promptResult }) }));
  const html = Buffer.from(deckOutput[0].binary.deck.data, 'base64').toString('utf8');
  assert(html.includes('id="advanced"') && html.includes('ridge regression') && html.includes('forecast'));
  const notebookNode = workflow.nodes.find((n) => n.name === 'Generate Jupyter Notebook (.ipynb)');
  const notebookFn = new AsyncFunction('$input', '$', notebookNode.parameters.jsCode);
  const notebookOutput = await notebookFn.call(helperContext,
    { first: () => ({ json: {}, binary: { deck: deckOutput[0].binary.deck } }) },
    (name) => ({ first: () => name === 'Susun Prompt Scrollytelling AI'
      ? { json: promptResult }
      : { binary: { file: { data: 'ZGF0YQ==', fileName: 'sample.csv' } } } }));
  const notebook = JSON.parse(Buffer.from(notebookOutput[0].binary.notebook.data, 'base64').toString('utf8'));
  assert.equal(notebook.nbformat, 4);
  assert(notebook.cells[1].source.join('').includes('advanced_snapshot'));
  assert(notebook.cells[1].source.join('').includes('KMeans'));

  const anovaRows = Array.from({ length: 30 }, (_, i) => ({ team: ['A', 'B', 'C'][Math.floor(i / 10)], value: i % 10 + 4 * Math.floor(i / 10) }));
  const anova = await run('Run Hypothesis Test', { cleanedRows: anovaRows,
    profiling: { columnStats: { value: stat('numeric', 30) } },
    analysisPlan: { selected: ['hypothesis'], group: 'team', target: 'value' },
    advancedAnalysis: { results: [], skipped: [] } });
  assert.equal(anova.advancedAnalysis.results[0].test, 'One-way ANOVA');
  assert(anova.advancedAnalysis.results[0].pValue < .05);
  const chiRows = [['A', 'yes', 30], ['A', 'no', 10], ['B', 'yes', 10], ['B', 'no', 30]]
    .flatMap(([team, outcome, count]) => Array.from({ length: count }, () => ({ team, outcome })));
  const chi = await run('Run Hypothesis Test', { cleanedRows: chiRows,
    profiling: { columnStats: { outcome: stat('categorical', 0, 2) } },
    analysisPlan: { selected: ['hypothesis'], group: 'team', target: 'outcome', chiColumn: 'outcome' },
    advancedAnalysis: { results: [], skipped: [] } });
  assert.equal(chi.advancedAnalysis.results[0].test, 'Chi-square independence');
  assert(chi.advancedAnalysis.results[0].pValue < .001);

  const invalidTarget = await run('Plan Advanced Analysis', { ...value,
    meta: { ...value.meta, analysisMode: 'regression', targetColumn: 'does_not_exist' } });
  assert(invalidTarget.advancedAnalysis.skipped.some((s) => s.method === 'regression'));
  const meanPlan = await run('Plan Advanced Analysis', { ...value,
    meta: { ...value.meta, analysisMode: 'forecast', targetColumn: 'sales', forecastAggregation: 'mean' } });
  assert.equal(meanPlan.analysisPlan.forecastAggregation, 'mean');

  let small = { ...value, cleanedRows: rows.slice(0, 3), advancedAnalysis: undefined, analysisPlan: undefined,
    meta: { ...value.meta, analysisMode: 'regression' } };
  for (const stage of stages) small = await run(stage, small);
  assert.equal(small.advancedAnalysis.results.length, 0);
  assert(small.advancedAnalysis.skipped.some((s) => s.method === 'regression'));
  console.log('PASS: Code nodes parse; five methods, three hypothesis tests, column checks, fallback, prompt, deck and notebook verified');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
