  // The notebook keeps the exact workflow results and provides independent
  // verification cells. Python package versions and split choices may differ.
  const snapshot = JSON.stringify({ plan: analysisPlan, results: advancedAnalysis.results, skipped: advancedAnalysis.skipped }, null, 2);
  source.push("\n# Advanced analysis snapshot from the n8n Code nodes\n", `advanced_snapshot = ${py(snapshot)}\n`, "print(advanced_snapshot)\n");
  if (advancedAnalysis.results.some((r) => r.method === 'regression')) {
    const r = advancedAnalysis.results.find((x) => x.method === 'regression');
    source.push("\n# Independent regression check; use the workflow report for its exact holdout metrics.\n",
      "from sklearn.linear_model import LinearRegression, Ridge\nfrom sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score\n",
      `regression_columns = ${py([...r.features, r.target])}\n`,
      "regression_data = df_clean[regression_columns].dropna().copy()\n",
      "order = np.argsort((np.arange(len(regression_data), dtype=np.uint64) * np.uint64(2654435761)) % np.uint64(2**32))\n",
      "regression_data = regression_data.iloc[order]\n",
      "cut = int(len(regression_data) * .8)\n",
      `X_train = regression_data.iloc[:cut][${py(r.features)}]; X_test = regression_data.iloc[cut:][${py(r.features)}]\n`,
      `y_train = regression_data.iloc[:cut][${py(r.target)}]; y_test = regression_data.iloc[cut:][${py(r.target)}]\n`,
      "for name, model in [('linear', LinearRegression()), ('ridge', Ridge(alpha=len(X_train)))]:\n    model.fit(X_train, y_train)\n    pred = model.predict(X_test)\n    print(name, 'MAE', mean_absolute_error(y_test, pred), 'RMSE', np.sqrt(mean_squared_error(y_test, pred)), 'R2', r2_score(y_test, pred))\n");
  }
  if (advancedAnalysis.results.some((r) => r.method === 'forecast')) {
    const r = advancedAnalysis.results.find((x) => x.method === 'forecast');
    source.push("\n# Monthly series and a last-value baseline for forecast verification.\n",
      `forecast_data = df_clean[[${py(analysisPlan.date)}, ${py(r.target)}]].dropna().copy()\n`,
      `forecast_data[${py(analysisPlan.date)}] = pd.to_datetime(forecast_data[${py(analysisPlan.date)}])\n`,
      `monthly = forecast_data.groupby(forecast_data[${py(analysisPlan.date)}].dt.to_period('M'))[${py(r.target)}].${r.aggregation === 'mean' ? 'mean' : 'sum'}()\n`,
      "display(monthly.tail(24))\nprint('Last-value baseline for next period:', monthly.iloc[-1])\n");
  }
  if (advancedAnalysis.results.some((r) => r.method === 'clustering')) {
    const r = advancedAnalysis.results.find((x) => x.method === 'clustering');
    source.push("\n# Independent clustering check.\n",
      "from sklearn.cluster import KMeans\nfrom sklearn.preprocessing import StandardScaler\nfrom sklearn.metrics import silhouette_score\n",
      `cluster_data = df_clean[${py(r.features)}].dropna().copy()\n`,
      "cluster_sample = cluster_data.iloc[::max(1, int(np.ceil(len(cluster_data) / 2000)))].copy()\n",
      "Z = StandardScaler().fit_transform(cluster_sample)\n",
      `labels = KMeans(n_clusters=${r.selectedK}, random_state=0, n_init=10).fit_predict(Z)\n`,
      "print('Cluster sizes:', pd.Series(labels).value_counts().sort_index().to_dict())\nprint('Silhouette:', silhouette_score(Z, labels))\n");
  }
  if (advancedAnalysis.results.some((r) => r.method === 'hypothesis')) {
    const r = advancedAnalysis.results.find((x) => x.method === 'hypothesis');
    source.push("\n# Independent hypothesis-test check. Confirm independence and sampling design.\n", "from scipy import stats\n");
    if (r.test.startsWith('Welch')) source.push(
      `groups = ${py(r.groups)}\n`,
      `a = df_clean.loc[df_clean[${py(r.groupColumn)}] == groups[0], ${py(r.measure)}].dropna()\n`,
      `b = df_clean.loc[df_clean[${py(r.groupColumn)}] == groups[1], ${py(r.measure)}].dropna()\n`,
      "print(stats.ttest_ind(a, b, equal_var=False))\n");
    else if (r.test === 'One-way ANOVA') source.push(`samples = [df_clean.loc[df_clean[${py(r.groupColumn)}] == group, ${py(r.measure)}].dropna() for group in ${py(r.groups)}]\n`,
      "print(stats.f_oneway(*samples))\n");
    else source.push(`table = pd.crosstab(df_clean[${py(r.columns[0])}], df_clean[${py(r.columns[1])}])\n`,
      "print(stats.chi2_contingency(table, correction=False))\n");
  }
  if (advancedAnalysis.results.some((r) => r.method === 'exploratory')) {
    const r = advancedAnalysis.results.find((x) => x.method === 'exploratory');
    const cols = [...new Set(r.strongestPairs.flatMap((p) => p.columns))];
    source.push("\n# Pairwise Pearson correlations; association is not causality.\n",
      `display(df_clean[${py(cols)}].corr(method='pearson'))\n`);
  }
