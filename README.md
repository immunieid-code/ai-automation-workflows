# AI automation workflow source

Three n8n workflow exports from Nur Rahman Shalahudin's [AI automation portfolio](https://nrshalahudin-ai.vercel.app/). Each export is a **workflow design**, with its node and connection graph intact. The source files have `active: false`; they do not establish production usage, client deployment, or measured time savings. [Sleyd AI](https://sleyd.com/) is a separate live product described on the portfolio site.

The deployed portfolio page and its referenced public assets are also versioned in [`portfolio/`](portfolio/). This is the static website source used for the Vercel deployment; the private Vercel project link and environment file are excluded.

| Workflow | Problem | Designed path | Source |
| --- | --- | --- | --- |
| Sleyd Presentation · form pipeline | Uploaded documents and revisions need a coherent slide plan before rendering. | PDF/DOCX/PPTX extraction, validation, content classification, slide outline review and edits, image retrieval, HTML sanitation, Vercel deployment and aliasing. 35 nodes. | [`sleyd-presentation-form.json`](workflows/sleyd-presentation-form.json) |
| Sleyd Scrollytelling · form pipeline | Long visual stories need consistent section structure and a human review step. | Input sanitation, AI outline review, section edits, looped rendering, image retrieval, HTML sanitation and Vercel deployment. 29 nodes. | [`sleyd-scrollytelling-form.json`](workflows/sleyd-scrollytelling-form.json) |
| AutoData Analyst · deck and notebook | Mixed data files require profiling, cleaning and KPI preparation before reporting. | CSV/TSV/XLS/XLSX/JSON routing, health audit, cleaning, aggregation, AI narrative, HTML deck, Jupyter notebook, artifact checks and email delivery. 25 nodes. | [`autodata-analyst-deck-notebook.json`](workflows/autodata-analyst-deck-notebook.json) |

## Project Overview

### Sleyd AI — live product

Sleyd is a solo-built presentation SaaS that accepts text, documents and voice, then returns a shareable web deck with PPTX/PDF export. Its app, backend and five production n8n workflows are described in the [portfolio case study](https://nrshalahudin-ai.vercel.app/#cut). The three form exports below are separate workflow designs; this repository is not the private Sleyd application backend.

### Sleyd Presentation — form workflow

An inactive 35-node n8n export for turning uploaded documents into a slide plan that can be reviewed and edited before HTML rendering and publication. The export shows the designed checks and deploy path; it does not establish production adoption or time saved.

### Sleyd Scrollytelling — form workflow

An inactive 29-node n8n export for section-based visual stories. A person can review and edit the outline before the sections are rendered and assembled. The export does not include measured usage or client outcomes.

### AutoData Analyst — deck and notebook

An inactive 25-node n8n export for routing CSV, TSV, Excel and JSON files through profiling, cleaning, aggregation and KPI steps to produce a visual deck and notebook. The file describes the design, not a verified runtime saving or deployment to a client.

## Import and configure

Import a JSON file into n8n, then supply your **own** OpenAI, Pexels, Gmail and/or Vercel credentials as needed. Review form URLs, deployment settings, recipients, model choices, and external service limits before activating a workflow. The exports are provided for code review and adaptation; they have not been validated against an independent n8n instance with real credentials.

The `sanitize_exports.py` script documents the publication step. It removes instance IDs, webhook IDs, credential references and editor metadata while retaining node parameters and connections. It does not include private datasets, tokens, or the original export metadata. The source files were prepared from the local `Project Automation` folder; raw exports stay out of this repository.
