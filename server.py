"""
L&T EPS ADAS Partner Evaluation Dashboard — Local Server
Run: python server.py
Open: http://localhost:5000
"""

import csv
import io
import json
import os
import sys
import uuid
import shutil
from datetime import date
from pathlib import Path

try:
    from flask import Flask, jsonify, request, send_from_directory, abort, Response
except ImportError:
    print("Flask not found. Installing...")
    os.system(f"{sys.executable} -m pip install flask")
    from flask import Flask, jsonify, request, send_from_directory, abort

BASE_DIR = Path(__file__).parent.resolve()
DATA_DIR = BASE_DIR / "data"
STATIC_DIR = BASE_DIR / "static"
PARTNERS_FILE = DATA_DIR / "partners.json"
SCHEMA_FILE = BASE_DIR / "schema.json"

DATA_DIR.mkdir(exist_ok=True)

app = Flask(__name__, static_folder=str(STATIC_DIR))


# ── helpers ──────────────────────────────────────────────────────────────────

def load_partners():
    if not PARTNERS_FILE.exists():
        return {"version": 1, "partners": []}
    with open(PARTNERS_FILE, encoding="utf-8") as f:
        return json.load(f)


def save_partners(data):
    # Atomic write via temp file to prevent corruption on crash
    tmp = PARTNERS_FILE.with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    shutil.move(str(tmp), str(PARTNERS_FILE))


def load_schema():
    with open(SCHEMA_FILE, encoding="utf-8") as f:
        return json.load(f)


def save_schema(data):
    # Atomic write via temp file to prevent corruption on crash
    tmp = SCHEMA_FILE.with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    shutil.move(str(tmp), str(SCHEMA_FILE))


# ── static files ─────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return send_from_directory(STATIC_DIR, "index.html")


@app.route("/static/<path:filename>")
def static_files(filename):
    return send_from_directory(STATIC_DIR, filename)


# ── schema ───────────────────────────────────────────────────────────────────

@app.route("/api/schema")
def api_schema():
    return jsonify(load_schema())


# Promotes a partner-local draft question into the global question list.
# Always appends (never inserts mid-array) so existing questions' dotted
# numbering (schema.domains -> detailSections -> detailQuestions order)
# never shifts. sourceRef is null since this didn't come from a source
# spreadsheet, same as the other manually-authored questions already in
# schema.json.
@app.route("/api/schema/questions", methods=["POST"])
def api_publish_question():
    body = request.get_json(force=True)
    section_id = (body.get("sectionId") or "").strip()
    text = (body.get("text") or "").strip()
    priority = body.get("priority") or "medium"
    if not text:
        return jsonify({"error": "text is required"}), 400
    if priority not in ("high", "medium", "low"):
        priority = "medium"

    schema = load_schema()
    if not any(s["id"] == section_id for s in schema.get("detailSections", [])):
        return jsonify({"error": "unknown sectionId"}), 400

    next_id = max([q["id"] for q in schema.get("detailQuestions", [])], default=0) + 1
    new_question = {
        "id": next_id,
        "sectionId": section_id,
        "text": text,
        "sourceRef": None,
        "priority": priority,
    }
    schema["detailQuestions"].append(new_question)
    save_schema(schema)
    return jsonify(new_question), 201


def _answer_has_data(a):
    return bool(a.get("status") or (a.get("remarks") or "").strip()
                or (a.get("partnerResponse") or "").strip())


# Read-only impact check before a destructive removal — lets the client
# show exactly which partners/products already answered this question
# before the user commits to deleting it everywhere.
@app.route("/api/schema/questions/<int:q_id>/usage", methods=["GET"])
def api_question_usage(q_id):
    data = load_partners()
    usages = []
    for p in data["partners"]:
        for a in p.get("generalAnswers", []):
            if a.get("qId") == q_id and _answer_has_data(a):
                usages.append({"partnerName": p["name"], "scope": "general"})
        for prod in p.get("products", []):
            for a in prod.get("answers", []):
                if a.get("qId") == q_id and _answer_has_data(a):
                    usages.append({
                        "partnerName": p["name"],
                        "scope": "product",
                        "productName": prod.get("name", "Product"),
                    })
    return jsonify({"usages": usages})


# Removes a published question everywhere — from schema.detailQuestions
# and from every partner's saved answer to it (general or per-product),
# not just the partner currently open client-side. The client is expected
# to have already shown the impact (via the usage endpoint above) and
# confirmed before calling this.
@app.route("/api/schema/questions/<int:q_id>", methods=["DELETE"])
def api_remove_question(q_id):
    schema = load_schema()
    before = len(schema.get("detailQuestions", []))
    schema["detailQuestions"] = [q for q in schema.get("detailQuestions", []) if q["id"] != q_id]
    if len(schema["detailQuestions"]) == before:
        abort(404)
    save_schema(schema)

    data = load_partners()
    swept = 0
    for p in data["partners"]:
        before_g = len(p.get("generalAnswers", []))
        p["generalAnswers"] = [a for a in p.get("generalAnswers", []) if a.get("qId") != q_id]
        swept += before_g - len(p["generalAnswers"])
        for prod in p.get("products", []):
            before_p = len(prod.get("answers", []))
            prod["answers"] = [a for a in prod.get("answers", []) if a.get("qId") != q_id]
            swept += before_p - len(prod["answers"])
    save_partners(data)
    return jsonify({"ok": True, "answersRemoved": swept})


# ── partners list ─────────────────────────────────────────────────────────────

@app.route("/api/partners", methods=["GET"])
def api_partners_list():
    data = load_partners()
    summary = []
    for p in data["partners"]:
        summary.append({
            "id": p["id"],
            "name": p["name"],
            "shortName": p.get("shortName", p["name"][:2].upper()),
            "stage": p.get("stage", "Under Evaluation"),
            "evaluationDate": p.get("evaluationDate"),
            "evaluator": p.get("evaluator", ""),
            "decisionStatus": p.get("decision", {}).get("status", ""),
            "productCount": len(p.get("products", [])),
        })
    return jsonify(summary)


@app.route("/api/partners/<partner_id>", methods=["GET"])
def api_partner_detail(partner_id):
    data = load_partners()
    partner = next((p for p in data["partners"] if p["id"] == partner_id), None)
    if not partner:
        abort(404)
    return jsonify(partner)


# ── create partner ────────────────────────────────────────────────────────────

@app.route("/api/partners", methods=["POST"])
def api_create_partner():
    body = request.get_json(force=True)
    name = (body.get("name") or "").strip()
    if not name:
        return jsonify({"error": "name is required"}), 400

    new_partner = {
        "id": str(uuid.uuid4()),
        "name": name,
        "shortName": body.get("shortName", name[:2].upper()),
        "addedDate": date.today().isoformat(),
        "evaluator": body.get("evaluator", ""),
        "productVersion": body.get("productVersion", ""),
        "evaluationDate": body.get("evaluationDate", ""),
        "stage": body.get("stage", "Under Evaluation"),
        "businessModel": [],
        "products": [],
        "generalAnswers": [],
        "draftQuestions": [],
        "sectionGrades": [],
        "domainGrades": [],
        "patents": [],
        "hardDisqualifiers": [],
        "decision": {
            "rationale": "",
            "reviewer": "",
            "date": "",
            "status": "",
        },
        "notes": body.get("notes", ""),
    }

    data = load_partners()
    data["partners"].append(new_partner)
    save_partners(data)
    return jsonify({"id": new_partner["id"]}), 201


# ── update partner ────────────────────────────────────────────────────────────

@app.route("/api/partners/<partner_id>", methods=["PUT"])
def api_update_partner(partner_id):
    data = load_partners()
    idx = next((i for i, p in enumerate(data["partners"]) if p["id"] == partner_id), None)
    if idx is None:
        abort(404)

    body = request.get_json(force=True)
    # Preserve id and addedDate
    body["id"] = partner_id
    body.setdefault("addedDate", data["partners"][idx].get("addedDate", date.today().isoformat()))

    data["partners"][idx] = body
    save_partners(data)
    return jsonify({"ok": True})


# ── delete partner ────────────────────────────────────────────────────────────

@app.route("/api/partners/<partner_id>", methods=["DELETE"])
def api_delete_partner(partner_id):
    data = load_partners()
    before = len(data["partners"])
    data["partners"] = [p for p in data["partners"] if p["id"] != partner_id]
    if len(data["partners"]) == before:
        abort(404)
    save_partners(data)
    return jsonify({"ok": True})


# ── CSV export ───────────────────────────────────────────────────────────────

@app.route("/api/export/csv")
def api_export_csv():
    data = load_partners()

    buf = io.StringIO()
    writer = csv.writer(buf)

    # Header row
    writer.writerow(
        ["Partner", "Stage", "Evaluator", "Eval Date", "Decision Status", "Reviewer", "Decision Date", "Rationale"]
    )

    for p in data["partners"]:
        d = p.get("decision") or {}
        writer.writerow(
            [p["name"], p.get("stage", ""), p.get("evaluator", ""), p.get("evaluationDate", "")]
            + [
                d.get("status", ""),
                d.get("reviewer", ""),
                d.get("date", ""),
                d.get("rationale", ""),
            ]
        )

    filename = f"adas_partner_evaluation_{date.today().isoformat()}.csv"
    return Response(
        buf.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# ── entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import webbrowser
    port = 5000
    print(f"\n  L&T EPS ADAS Partner Evaluation Dashboard")
    print(f"  Open: http://localhost:{port}")
    print(f"  Press Ctrl+C to stop\n")
    webbrowser.open(f"http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=False)
