"""Apply the Code-node analytics extension to the local AutoData export.

The private source export remains local. Run sanitize_exports.py afterward to
refresh the public JSON without publishing credentials or instance metadata.
"""

import json
import pathlib
import uuid


ROOT = pathlib.Path(__file__).resolve().parent
PRIVATE = ROOT.parent.parent / "Project Automation" / "AutoData Analyst — Scrollytelling Sleyd Deck & Colab Notebook Generator.json"
CODE = ROOT / "analysis-code-nodes"
NODE_FILES = [
    ("Plan Advanced Analysis", "01-plan.js"),
    ("Run Regression Models", "02-regression.js"),
    ("Run Forecast Models", "03-forecast.js"),
    ("Run Clustering Models", "04-clustering.js"),
    ("Run Hypothesis Test", "05-hypothesis.js"),
    ("Run Exploratory Analysis", "06-exploratory.js"),
    ("Validate Advanced Results", "07-validate.js"),
]


def find(data, name):
    return next(n for n in data["nodes"] if n["name"] == name)


def add_form_field(fields, label, **kwargs):
    if not any(f["fieldLabel"] == label for f in fields):
        fields.append({"fieldLabel": label, **kwargs})


def main():
    data = json.loads(PRIVATE.read_text(encoding="utf-8"))
    if any(n["name"] == NODE_FILES[0][0] for n in data["nodes"]):
        for name, filename in NODE_FILES:
            find(data, name)["parameters"]["jsCode"] = (CODE / filename).read_text(encoding="utf-8")
        deck_node = find(data, "Susun Scrollytelling Deck HTML")
        deck = deck_node["parameters"]["jsCode"]
        start = deck.index("const advancedResults =")
        end = deck.index("const deck = await this.helpers.prepareBinaryData", start)
        deck_node["parameters"]["jsCode"] = deck[:start] + (CODE / "08-deck-fragment.js").read_text(encoding="utf-8") + "\n  " + deck[end:]
        notebook_node = find(data, "Generate Jupyter Notebook (.ipynb)")
        notebook = notebook_node["parameters"]["jsCode"]
        start = notebook.index("// The notebook keeps")
        end = notebook.index("const notebook = {", start)
        notebook_node["parameters"]["jsCode"] = notebook[:start] + (CODE / "09-notebook-fragment.js").read_text(encoding="utf-8") + "\n  " + notebook[end:]
        prompt_node = find(data, "Susun Prompt Scrollytelling AI")
        prompt = prompt_node["parameters"]["jsCode"]
        prompt_node["parameters"]["jsCode"] = prompt.replace("advancedAnalysis: advanced, evidence", "advancedAnalysis: advanced, analysisPlan: input.analysisPlan, evidence")
        PRIVATE.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print("Refreshed seven advanced Code nodes")
        return

    fields = find(data, "Form Input Data")["parameters"]["formFields"]["values"]
    add_form_field(fields, "Analysis Mode", fieldType="dropdown", defaultValue="auto",
        fieldOptions={"values": [{"option": x} for x in ["auto", "descriptive", "regression", "forecast", "clustering", "hypothesis", "exploratory"]]})
    add_form_field(fields, "Target Column", placeholder="Exact numeric column name, if needed")
    add_form_field(fields, "Time Column", placeholder="Exact date column name, if needed")
    add_form_field(fields, "Group Column", placeholder="Exact category column name, if needed")
    add_form_field(fields, "Forecast Horizon (months)", placeholder="1–12; default 3")

    detector = find(data, "Susun & Deteksi Input")["parameters"]["jsCode"]
    detector = detector.replace("const outputLanguage = raw['Bahasa Output'] === 'en' ? 'en' : 'id';",
        "const outputLanguage = raw['Bahasa Output'] === 'en' ? 'en' : 'id';\n"
        "  const analysisMode = text(raw['Analysis Mode'], 30).toLowerCase() || 'auto';\n"
        "  const targetColumn = text(raw['Target Column'], 180);\n"
        "  const timeColumn = text(raw['Time Column'], 180);\n"
        "  const groupColumn = text(raw['Group Column'], 180);\n"
        "  const forecastHorizon = Number(raw['Forecast Horizon (months)']) || 3;")
    detector = detector.replace("outputLanguage,\n      defaultMode", "outputLanguage, analysisMode, targetColumn, timeColumn, groupColumn, forecastHorizon,\n      defaultMode")
    find(data, "Susun & Deteksi Input")["parameters"]["jsCode"] = detector

    # Make room for seven additional Code nodes in the central spine.
    for node in data["nodes"]:
        if node["position"][0] >= 4912:
            node["position"][0] += 7 * 240
    for i, (name, filename) in enumerate(NODE_FILES):
        data["nodes"].append({
            "parameters": {"jsCode": (CODE / filename).read_text(encoding="utf-8")},
            "id": str(uuid.uuid4()), "name": name, "type": "n8n-nodes-base.code",
            "typeVersion": 2, "position": [4912 + i * 240, 624],
        })
    connections = data["connections"]
    connections["Data Engineering & KPI Engine"]["main"][0] = [{"node": NODE_FILES[0][0], "type": "main", "index": 0}]
    for i, (name, _) in enumerate(NODE_FILES):
        destination = NODE_FILES[i + 1][0] if i + 1 < len(NODE_FILES) else "Susun Prompt Scrollytelling AI"
        connections[name] = {"main": [[{"node": destination, "type": "main", "index": 0}]]}

    prompt = find(data, "Susun Prompt Scrollytelling AI")["parameters"]["jsCode"]
    prompt = prompt.replace("const kpi = input.engineeredKPIs;", "const kpi = input.engineeredKPIs;\n  const advanced = input.advancedAnalysis;")
    prompt = prompt.replace("      trend,\n    },", "      trend,\n      advancedResults: advanced.results,\n      advancedSkipped: advanced.skipped,\n    },")
    prompt = prompt.replace("8. Jangan mengubah chart", "8. Jika analisis lanjutan ada, sebutkan metode, evaluasi/baseline, keterbatasan, dan alasan metode yang dilewati. Nilai p bukan ukuran dampak dan korelasi bukan kausalitas.\n9. Jangan mengubah chart")
    prompt = prompt.replace("9. Hindari slogan", "10. Hindari slogan")
    prompt = prompt.replace('"nextSteps": {"headline":"", "actions"', '"advanced": {"headline":"", "narrative":""},\n    "nextSteps": {"headline":"", "actions"')
    prompt = prompt.replace("engineeredKPIs: kpi, evidence", "engineeredKPIs: kpi, advancedAnalysis: advanced, analysisPlan: input.analysisPlan, evidence")
    find(data, "Susun Prompt Scrollytelling AI")["parameters"]["jsCode"] = prompt

    deck = find(data, "Susun Scrollytelling Deck HTML")["parameters"]["jsCode"]
    deck = deck.replace("engineeredKPIs } = previous", "engineeredKPIs, advancedAnalysis } = previous")
    deck = deck.replace("const html = `<!doctype html>", "let html = `<!doctype html>")
    marker = "const deck = await this.helpers.prepareBinaryData"
    if marker not in deck:
        raise RuntimeError("Cannot find deck binary creation")
    deck = deck.replace(marker, (CODE / "08-deck-fragment.js").read_text(encoding="utf-8") + "\n  " + marker)
    find(data, "Susun Scrollytelling Deck HTML")["parameters"]["jsCode"] = deck

    notebook = find(data, "Generate Jupyter Notebook (.ipynb)")["parameters"]["jsCode"]
    notebook = notebook.replace("const { meta, profiling, aggregations } = previous;", "const { meta, profiling, aggregations, advancedAnalysis, analysisPlan } = previous;")
    notebook = notebook.replace("  const notebook = {", (CODE / "09-notebook-fragment.js").read_text(encoding="utf-8") + "\n  const notebook = {")
    find(data, "Generate Jupyter Notebook (.ipynb)")["parameters"]["jsCode"] = notebook

    PRIVATE.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Updated private workflow: {len(data['nodes'])} nodes")


if __name__ == "__main__":
    main()
