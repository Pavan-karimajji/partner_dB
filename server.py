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


def compute_weighted_score(tech_scores, schema):
    total_weight = sum(s["weight"] for s in schema["techSections"])
    weighted_sum = 0.0
    for sec_score in tech_scores:
        score = sec_score.get("score")
        if score is None:
            continue
        sec_def = next((s for s in schema["techSections"] if s["id"] == sec_score["sectionId"]), None)
        if sec_def:
            weighted_sum += (score / 5.0) * sec_def["weight"]
    # Normalised to 0-5 scale
    if total_weight == 0:
        return None
    return round((weighted_sum / total_weight) * 5.0, 2)


def derive_verdict(weighted_avg, thresholds):
    if weighted_avg is None:
        return "Pending"
    if weighted_avg >= thresholds["approved"]:
        return "Approved"
    if weighted_avg >= thresholds["conditional"]:
        return "Conditionally Approved"
    return "Not Approved"


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


# ── partners list ─────────────────────────────────────────────────────────────

@app.route("/api/partners", methods=["GET"])
def api_partners_list():
    data = load_partners()
    schema = load_schema()
    summary = []
    for p in data["partners"]:
        wav = compute_weighted_score(p.get("techScores", []), schema)
        summary.append({
            "id": p["id"],
            "name": p["name"],
            "shortName": p.get("shortName", p["name"][:2].upper()),
            "stage": p.get("stage", "Under Evaluation"),
            "evaluationDate": p.get("evaluationDate"),
            "evaluator": p.get("evaluator", ""),
            "weightedScore": wav,
            "verdict": derive_verdict(wav, schema["verdictThresholds"]),
            "decisionStatus": p.get("decision", {}).get("status", ""),
            "sectionScores": [
                {"sectionId": s["sectionId"], "score": s.get("score")}
                for s in p.get("techScores", [])
            ],
        })
    return jsonify(summary)


@app.route("/api/partners/<partner_id>", methods=["GET"])
def api_partner_detail(partner_id):
    data = load_partners()
    partner = next((p for p in data["partners"] if p["id"] == partner_id), None)
    if not partner:
        abort(404)
    schema = load_schema()
    wav = compute_weighted_score(partner.get("techScores", []), schema)
    partner["weightedScore"] = wav
    partner["verdict"] = derive_verdict(wav, schema["verdictThresholds"])
    return jsonify(partner)


# ── create partner ────────────────────────────────────────────────────────────

@app.route("/api/partners", methods=["POST"])
def api_create_partner():
    body = request.get_json(force=True)
    name = (body.get("name") or "").strip()
    if not name:
        return jsonify({"error": "name is required"}), 400

    schema = load_schema()

    def empty_tech_scores():
        result = []
        for sec in schema["techSections"]:
            questions = [
                {"qId": q["id"], "score": None, "applicability": "Applicable", "remarks": ""}
                for q in schema["techQuestions"] if q["sectionId"] == sec["id"]
            ]
            result.append({"sectionId": sec["id"], "score": None, "remarks": "", "questions": questions})
        return result

    def empty_perception():
        result = []
        for sec in schema["perceptionSections"]:
            questions = [
                {"qId": q["id"], "sectionTag": q.get("sectionTag", ""),
                 "response": "", "lntRemark": "", "judgement": "TBD"}
                for q in sec["questions"]
            ]
            result.append({"sectionId": sec["id"], "questions": questions})
        return result

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
        "techScores": empty_tech_scores(),
        "perceptionResponses": empty_perception(),
        "hardDisqualifiers": [],
        "decision": {
            "verdict": "",
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
    schema = load_schema()
    sections = schema["techSections"]

    buf = io.StringIO()
    writer = csv.writer(buf)

    # Header row
    writer.writerow(
        ["Partner", "Stage", "Evaluator", "Eval Date"]
        + [s["name"] for s in sections]
        + ["Weighted Score", "Verdict", "Decision Status", "Reviewer", "Decision Date", "Rationale"]
    )

    for p in data["partners"]:
        scores_by_sid = {s["sectionId"]: s.get("score") for s in p.get("techScores", [])}
        section_cols = [scores_by_sid.get(s["id"], "") for s in sections]
        wav = compute_weighted_score(p.get("techScores", []), schema)
        verdict = derive_verdict(wav, schema["verdictThresholds"])
        d = p.get("decision") or {}
        writer.writerow(
            [p["name"], p.get("stage", ""), p.get("evaluator", ""), p.get("evaluationDate", "")]
            + [("" if v is None else v) for v in section_cols]
            + [
                ("" if wav is None else round(wav, 2)),
                verdict,
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
