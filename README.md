# AI automation workflow source

Three n8n workflow exports from Nur Rahman Shalahudin's [AI automation portfolio](https://nrshalahudin-ai.vercel.app/). Each export is a **workflow design**, with its node and connection graph intact. The source files have `active: false`; they do not establish production usage, client deployment, or measured time savings. [Sleyd AI](https://sleyd.com/) is a separate live product described on the portfolio site.

The deployed portfolio page and its referenced public assets are also versioned in [`portfolio/`](portfolio/). This is the static website source used for the Vercel deployment; the private Vercel project link and environment file are excluded.

| Workflow | Problem | Designed path | Source |
| --- | --- | --- | --- |
| Sleyd Presentation · form pipeline | Uploaded documents and revisions need a coherent slide plan before rendering. | PDF/DOCX/PPTX extraction, validation, content classification, slide outline review and edits, image retrieval, HTML sanitation, Vercel deployment and aliasing. 35 nodes. | [`sleyd-presentation-form.json`](workflows/sleyd-presentation-form.json) |
| Sleyd Scrollytelling · form pipeline | Long visual stories need consistent section structure and a human review step. | Input sanitation, AI outline review, section edits, looped rendering, image retrieval, HTML sanitation and Vercel deployment. 29 nodes. | [`sleyd-scrollytelling-form.json`](workflows/sleyd-scrollytelling-form.json) |
| AutoData Analyst · deck and notebook | Mixed data files and different business questions require analysis methods that fit the available columns. | CSV/TSV/XLS/XLSX/JSON routing, health audit, cleaning, KPIs, conditional regression, monthly forecasting, clustering, hypothesis tests, exploratory correlations, AI narrative, HTML deck, Jupyter notebook, artifact checks and email delivery. 32 nodes. | [`autodata-analyst-deck-notebook.json`](workflows/autodata-analyst-deck-notebook.json) |

## Project Overview

### Sleyd AI — live product

Sleyd is a solo-built presentation SaaS that accepts text, documents and voice, then returns a shareable web deck with PPTX/PDF export. Its app, backend and five production n8n workflows are described in the [portfolio case study](https://nrshalahudin-ai.vercel.app/#cut). The three form exports below are separate workflow designs; this repository is not the private Sleyd application backend.

### Sleyd Presentation — form workflow

An inactive 35-node n8n export for turning uploaded documents into a slide plan that can be reviewed and edited before HTML rendering and publication. The export shows the designed checks and deploy path; it does not establish production adoption or time saved.

### Sleyd Scrollytelling — form workflow

An inactive 29-node n8n export for section-based visual stories. A person can review and edit the outline before the sections are rendered and assembled. The export does not include measured usage or client outcomes.

### AutoData Analyst — deck and notebook

An inactive 32-node n8n export for routing CSV, TSV, Excel and JSON files through profiling, cleaning, aggregation and KPI steps. Seven added JavaScript Code nodes inspect the user's question and the dataset, then conditionally run supported advanced analyses:

- **Regression:** numeric target, up to three numeric predictors selected from training data, deterministic 80/20 holdout, mean baseline, linear regression and prespecified ridge regression. Reports MAE, RMSE and R² where defined.
- **Forecasting:** consecutive monthly periods only, at least eight observed months, rolling validation to select last-value, three-period average or simple exponential smoothing; later holdout metrics and a 1–12 month forecast. Monthly aggregation can be sum or mean; auto mode treats rate/price/average-like targets as a mean. No missing months are invented.
- **Clustering:** standardized numeric features, deterministic k-means for 2–5 candidate clusters, sample silhouette comparison, sizes and centroids. Complete-row sample is capped at 2,000.
- **Hypothesis tests:** two-sided Welch t-test for two groups, one-way ANOVA for 3–10 groups, or chi-square independence for categorical variables when expected counts are adequate. Reports a p-value and an effect-size measure. Assumptions still require analyst review.
- **Exploratory analysis:** pairwise Pearson correlations across up to 12 numeric columns, with paired sample counts and no causal interpretation.

The form now includes optional analysis mode, exact target/time/group names, predictor and cluster feature lists, forecast horizon and monthly aggregation. An explicit but unmatched column name is not silently replaced. Unsupported methods are skipped with a reason; descriptive output remains available. Results enter the AI prompt as computed evidence, and the deck and notebook include an advanced-analysis section. The notebook includes independent Python verification cells; its package implementation may differ from the embedded JavaScript calculations.

The seven editable Code-node sources are in [`analysis-code-nodes/`](analysis-code-nodes/). Run `python assemble_advanced_autodata.py` in this repository to install or refresh them in the **local private export**, then run `python sanitize_exports.py "../../Project Automation"` to regenerate the public export. `node verify_advanced_autodata.js` checks syntax, representative analytic paths, unsuitable-data fallback and generated artifacts. None of these tests replaces an end-to-end execution in an n8n instance with real credentials.

## Import and configure

Import a JSON file into n8n, then supply your **own** OpenAI, Pexels, Gmail and/or Vercel credentials as needed. Review form URLs, deployment settings, recipients, model choices, and external service limits before activating a workflow. The exports are provided for code review and adaptation; they have not been validated against an independent n8n instance with real credentials.

The `sanitize_exports.py` script documents the publication step. It removes instance IDs, webhook IDs, credential references and editor metadata while retaining node parameters and connections. It does not include private datasets, tokens, or the original export metadata. The source files were prepared from the local `Project Automation` folder; raw exports stay out of this repository.
