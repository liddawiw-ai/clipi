CREATE TABLE IF NOT EXISTS gifts (
  payment_id TEXT PRIMARY KEY NOT NULL,
  room_id TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS gifts_room ON gifts (room_id);

CREATE TABLE IF NOT EXISTS mainnet_gifts (
  payment_id TEXT PRIMARY KEY NOT NULL,
  room_id TEXT NOT NULL,
  gift TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS mainnet_gifts_room ON mainnet_gifts(room_id);
