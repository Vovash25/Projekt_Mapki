CREATE TABLE IF NOT EXISTS building (
    id                 INTEGER PRIMARY KEY CHECK (id = 1),
    name               TEXT NOT NULL,
    address            TEXT,
    managers           TEXT,
    transport          TEXT,
    lat                REAL,
    lon                REAL,

    entrances_count    INTEGER,
    entrances_info     TEXT,
    automatic_doors    INTEGER,

    stairs_handrails   INTEGER,
    elevator           INTEGER,
    stair_lift         INTEGER,
    ramp               INTEGER,
    accessible_toilet  INTEGER,

    disabled_parking   TEXT,
    assistance_dog     INTEGER,
    sign_language      TEXT,
    notes              TEXT
);

CREATE TABLE IF NOT EXISTS lecturers (
    id       TEXT PRIMARY KEY,
    name     TEXT NOT NULL,
    room_id  TEXT,
    notes    TEXT
);

CREATE TABLE IF NOT EXISTS search_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    item_type   TEXT NOT NULL CHECK (item_type IN ('sala', 'wykladowca')),
    item_id     TEXT NOT NULL,
    label       TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_search_log_time ON search_log (created_at);
CREATE INDEX IF NOT EXISTS idx_search_log_item ON search_log (item_type, item_id);

CREATE TABLE IF NOT EXISTS rooms (
    id           TEXT PRIMARY KEY,
    number       TEXT NOT NULL,
    wing         TEXT,
    floor        INTEGER,
    capacity     INTEGER CHECK (capacity >= 0),
    owner        TEXT,
    room_type    TEXT,
    equipment    TEXT,
    notes        TEXT
);
