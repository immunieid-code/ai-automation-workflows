const input = $input.first().json;
const rows = input.cleanedRows || [];
const stats = input.profiling?.columnStats || {};
const columns = input.meta?.columns || [];
const text = String(input.meta?.konteks || '').toLowerCase();
const requested = String(input.meta?.analysisMode || 'auto').toLowerCase();
const validModes = ['auto', 'descriptive', 'regression', 'forecast', 'clustering', 'hypothesis', 'exploratory'];
const mode = validModes.includes(requested) ? requested : 'auto';
const exactColumn = (name) => columns.find((c) => c.toLowerCase() === String(name || '').toLowerCase()) || null;
const mentioned = (type) => columns.filter((c) => stats[c]?.type === type && text.includes(c.toLowerCase()));
const numeric = columns.filter((c) => stats[c]?.type === 'numeric' && stats[c]?.numericStats?.count >= 10);
const categorical = columns.filter((c) => stats[c]?.type === 'categorical' && stats[c]?.uniqueCount >= 2);
const dates = columns.filter((c) => stats[c]?.type === 'date');
const target = input.meta?.targetColumn ? exactColumn(input.meta.targetColumn) : mentioned('numeric')[0] || input.aggregations?.primaryMeasure || null;
const date = input.meta?.timeColumn ? exactColumn(input.meta.timeColumn) : mentioned('date')[0] || dates[0] || null;
const group = input.meta?.groupColumn ? exactColumn(input.meta.groupColumn) : mentioned('categorical')[0] || input.aggregations?.primaryDimension || null;
const horizon = Math.max(1, Math.min(12, Number(input.meta?.forecastHorizon) || 3));
const wants = (name, pattern) => mode === name || (mode === 'auto' && pattern.test(text));
const intents = {
  regression: wants('regression', /regress|predict|prediksi|pengaruh|faktor|driver|hubungan.*nilai/),
  forecast: wants('forecast', /forecast|ramal|proyeksi|bulan depan|periode depan|masa depan/),
  clustering: wants('clustering', /cluster|segment|kelompokkan|pengelompokan/),
  hypothesis: wants('hypothesis', /uji hipotesis|signifikan|beda signifikan|significant|hypothesis|apakah.*berbeda/),
  exploratory: wants('exploratory', /korelasi|correlation|anomali|outlier|explor/),
};
const selected = [];
const skipped = [];
function decide(name, eligible, reason) {
  if (!intents[name]) return;
  if (eligible) selected.push(name);
  else skipped.push({ method: name, reason });
}
const regressionFeatures = numeric.filter((c) => c !== target && !/(^|[_\s-])(id|kode|code|year|tahun)([_\s-]|$)/i.test(c));
decide('regression', target && stats[target]?.type === 'numeric' && regressionFeatures.length && rows.length >= 30,
  'Requires a numeric target, another usable numeric feature, and at least 30 cleaned rows.');
const dateValues = date ? rows.map((r) => r[date]).filter(Boolean) : [];
decide('forecast', target && date && stats[target]?.type === 'numeric' && dateValues.length >= 8,
  'Requires a numeric target and usable dates; the forecasting node also requires at least eight complete monthly periods.');
decide('clustering', numeric.length >= 2 && rows.length >= 20,
  'Requires at least two numeric features and 20 cleaned rows.');
const numericGroups = group && stats[group]?.type === 'categorical' && stats[group]?.uniqueCount >= 2 && stats[group]?.uniqueCount <= 10;
const chiColumn = categorical.find((c) => c !== group);
decide('hypothesis', Boolean(group && (numericGroups && target && stats[target]?.type === 'numeric' || (!target || stats[target]?.type !== 'numeric') && chiColumn)),
  'Requires 2–10 groups with a numeric measure, or two categorical variables.');
decide('exploratory', numeric.length >= 2 && rows.length >= 10,
  'Requires at least two numeric columns and ten cleaned rows.');

const plan = { mode, target, date, group, horizon, numeric, categorical, regressionFeatures,
  chiColumn, selected, skipped, request: text.slice(0, 500), sampleSize: rows.length };
return [{ json: { ...input, analysisPlan: plan, advancedAnalysis: { results: [], skipped } } }];
