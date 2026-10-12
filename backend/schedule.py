import datetime as dt
import hashlib

USE_DEMO = True

_DEMO_SUBJECTS = ["Matematyka", "Mechanika techniczna", "Podstawy konstrukcji maszyn",
                  "Automatyka", "Materiałoznawstwo", "Grafika inżynierska", "Mechatronika"]
_DEMO_SLOTS = [("08:00", "09:30"), ("09:45", "11:15"), ("11:30", "13:00"),
               ("13:15", "14:45"), ("15:00", "16:30")]


def _demo_schedule(room_id: str, day: dt.date) -> list[dict]:
    seed = int(hashlib.md5(f"{room_id}{day}".encode()).hexdigest(), 16)
    if day.weekday() >= 5:
        return []
    lessons = []
    for i, (start, end) in enumerate(_DEMO_SLOTS):
        if (seed >> (2 * i)) & 3:
            subject = _DEMO_SUBJECTS[(seed >> (i + 8)) % len(_DEMO_SUBJECTS)]
            lecturer = f"Wykładowca {(seed >> (i + 16)) % 10 + 1}"
            lessons.append({"date": day.isoformat(), "start": start, "end": end,
                            "title": subject, "lecturer": lecturer, "group": None})
    return lessons


def get_schedule(room_id: str, day: dt.date | None = None) -> list[dict]:
    day = day or dt.date.today()
    if USE_DEMO:
        return _demo_schedule(room_id, day)

    return []
