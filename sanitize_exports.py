"""Prepare shareable n8n exports from the private Project Automation folder.

Usage: python sanitize_exports.py "path/to/Project Automation"
The published workflows keep their nodes, parameters, and connections but omit
instance IDs, webhook IDs, credential references, and editor metadata.
"""

import json
import pathlib
import sys


FILES = {
    "Sleyd Presentation - Form.json": "sleyd-presentation-form.json",
    "Sleyd Scrollytelling - Form.json": "sleyd-scrollytelling-form.json",
    "AutoData Analyst — Scrollytelling Sleyd Deck & Colab Notebook Generator.json": "autodata-analyst-deck-notebook.json",
}


def sanitize(source):
    nodes = []
    for node in source["nodes"]:
        nodes.append(
            {
                key: value
                for key, value in node.items()
                if key not in {"id", "webhookId", "credentials"}
            }
        )
    return {
        "name": source["name"],
        "nodes": nodes,
        "connections": source["connections"],
        "settings": source.get("settings", {}),
        "active": False,
    }


def main():
    source_dir = pathlib.Path(sys.argv[1])
    output_dir = pathlib.Path(__file__).parent / "workflows"
    output_dir.mkdir(exist_ok=True)
    for source_name, output_name in FILES.items():
        source = json.loads((source_dir / source_name).read_text(encoding="utf-8"))
        cleaned = sanitize(source)
        assert len(cleaned["nodes"]) == len(source["nodes"])
        assert cleaned["connections"] == source["connections"]
        target = output_dir / output_name
        target.write_text(json.dumps(cleaned, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"{output_name}: {len(cleaned['nodes'])} nodes")


if __name__ == "__main__":
    main()
