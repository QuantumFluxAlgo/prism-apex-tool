CREATE TABLE IF NOT EXISTS operator_config (
  id integer PRIMARY KEY,
  config jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

INSERT INTO operator_config (id, config)
VALUES (
  1,
  jsonb_build_object(
    'dailyStartingBalance', NULL,
    'maxDailyDrawdownPct', NULL
  )
)
ON CONFLICT (id) DO NOTHING;
