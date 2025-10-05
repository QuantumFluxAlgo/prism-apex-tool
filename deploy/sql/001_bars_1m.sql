-- One-minute bars with unique constraint to prevent duplicates
CREATE TABLE IF NOT EXISTS bars_1m (
  symbol        text    NOT NULL,
  ts_utc        timestamptz NOT NULL, -- minute open time
  open          double precision NOT NULL,
  high          double precision NOT NULL,
  low           double precision NOT NULL,
  close         double precision NOT NULL,
  volume        double precision,
  PRIMARY KEY (symbol, ts_utc)
);

-- Ingest bookkeeping (optional, for gap checks later)
CREATE TABLE IF NOT EXISTS ingest_log (
  id           bigserial PRIMARY KEY,
  symbol       text NOT NULL,
  range        text NOT NULL,
  interval     text NOT NULL,
  fetched_at   timestamptz NOT NULL DEFAULT now(),
  bars_written integer NOT NULL DEFAULT 0
);
