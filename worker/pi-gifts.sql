CREATE TABLE IF NOT EXISTS gifts (
  payment_id TEXT PRIMARY KEY NOT NULL,
  room_id TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS gifts_room ON gifts (room_id);
