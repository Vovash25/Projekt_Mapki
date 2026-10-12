from room_info import get_connection

ITEM_TYPES = {"sala", "wykladowca"}
MAX_LABEL = 200


def log_selection(item_type: str, item_id: str, label: str | None = None) -> None:
    if item_type not in ITEM_TYPES:
        raise ValueError(f"item_type musi być jednym z {sorted(ITEM_TYPES)}, jest: {item_type!r}")
    item_id = (item_id or "").strip()
    if not item_id:
        raise ValueError("item_id nie może być pusty")
    label = (label or "").strip()[:MAX_LABEL] or None

    with get_connection() as conn:
        conn.execute(
            "INSERT INTO search_log (item_type, item_id, label) VALUES (?, ?, ?)",
            (item_type, item_id, label),
        )


def get_popular(item_type: str | None = None, limit: int = 5, days: int = 30) -> list[dict]:
    if item_type is not None and item_type not in ITEM_TYPES:
        raise ValueError(f"item_type musi być None albo jednym z {sorted(ITEM_TYPES)}")
    limit = max(1, min(int(limit), 50))
    days = max(1, int(days))

    sql = """
        SELECT
            item_type,
            item_id,
            COUNT(*)         AS cnt,
            MAX(created_at)  AS last_at,
            -- etykieta z NAJNOWSZEGO wyboru (gdyby nazwa się zmieniła, np. nowy tytuł)
            (SELECT s2.label FROM search_log s2
              WHERE s2.item_type = s.item_type AND s2.item_id = s.item_id
                AND s2.label IS NOT NULL
              ORDER BY s2.created_at DESC, s2.id DESC LIMIT 1) AS label
        FROM search_log s
        WHERE created_at >= datetime('now', ?)
          AND (? IS NULL OR item_type = ?)
        GROUP BY item_type, item_id
        ORDER BY cnt DESC, last_at DESC          -- przy remisie: ostatnio wybierany wyżej
        LIMIT ?
    """
    with get_connection() as conn:
        rows = conn.execute(sql, (f"-{days} days", item_type, item_type, limit)).fetchall()

    return [
        {"type": r["item_type"], "id": r["item_id"], "label": r["label"] or r["item_id"], "count": r["cnt"]}
        for r in rows
    ]


if __name__ == "__main__":
    import json
    import sys
    t = sys.argv[1] if len(sys.argv) > 1 else None
    print(json.dumps(get_popular(t), ensure_ascii=False, indent=2))
