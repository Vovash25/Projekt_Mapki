import datetime as dt
import sys
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory

PROJECT = Path(__file__).resolve().parent.parent
FRONTEND = PROJECT / "frontend"
sys.path.insert(0, str(PROJECT / "baza_danych"))

from room_info import get_room_info, get_building_info
from popular import get_popular, log_selection
from schedule import get_schedule

app = Flask(__name__, static_folder=None)
app.json.ensure_ascii = False


@app.get("/")
def index():
    return send_from_directory(FRONTEND, "index.html")


@app.get("/<path:filename>")
def frontend_files(filename):
    return send_from_directory(FRONTEND, filename)


def error(message, status):
    return jsonify({"error": message}), status


@app.get("/api/rooms/<room_id>")
def api_room(room_id):
    info = get_room_info(room_id)
    if info is None:
        return error(f"Nie ma sali o id {room_id}", 404)
    return jsonify(info)


@app.get("/api/rooms/<room_id>/schedule")
def api_room_schedule(room_id):
    day_param = request.args.get("date")
    try:
        day = dt.date.fromisoformat(day_param) if day_param else None
    except ValueError:
        return error("date musi mieć format RRRR-MM-DD", 400)
    return jsonify(get_schedule(room_id, day))


@app.get("/api/building")
def api_building():
    return jsonify(get_building_info())


@app.get("/api/popular")
def api_popular():
    try:
        return jsonify(get_popular(
            item_type=request.args.get("type") or None,
            limit=int(request.args.get("limit", 5)),
            days=int(request.args.get("days", 30)),
        ))
    except ValueError as e:
        return error(str(e), 400)


@app.post("/api/search-log")
def api_search_log():
    data = request.get_json(silent=True) or {}
    try:
        log_selection(data.get("type"), str(data.get("id") or ""), data.get("label"))
    except ValueError as e:
        return error(str(e), 400)
    return "", 204


@app.errorhandler(404)
def not_found(_):
    if request.path.startswith("/api/"):
        return error("Nie ma takiego adresu API", 404)
    return "Nie znaleziono", 404


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
