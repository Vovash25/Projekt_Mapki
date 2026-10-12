import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).with_name("uczelnia.db")

BOOL_COLUMNS = {"automatic_doors", "stairs_handrails", "elevator", "stair_lift",
                "ramp", "accessible_toilet", "assistance_dog"}


def get_connection():
    if not DB_PATH.exists():
        raise FileNotFoundError(f"Brak bazy {DB_PATH} - uruchom najpierw: python baza_danych/create_db.py")
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _row_to_dict(row):
    if row is None:
        return None
    d = dict(row)
    for k in BOOL_COLUMNS & d.keys():
        if d[k] is not None:
            d[k] = bool(d[k])
    return d


def _building(conn):
    b = _row_to_dict(conn.execute("SELECT * FROM building WHERE id = 1").fetchone())
    if b:
        b.pop("id")
    return b


def get_building_info() -> dict | None:
    with get_connection() as conn:
        return _building(conn)


def get_room_info(room_id: str) -> dict | None:
    with get_connection() as conn:
        room = conn.execute(
            "SELECT * FROM rooms WHERE id = ?",
            (room_id,),
        ).fetchone()
        if room is None:
            return None
        building = _building(conn)

    return {"room": _row_to_dict(room), "building": building}


if __name__ == "__main__":
    import json
    import sys
    if len(sys.argv) > 1:
        print(json.dumps(get_room_info(sys.argv[1]), ensure_ascii=False, indent=2))
    else:
        print(json.dumps(get_building_info(), ensure_ascii=False, indent=2))
