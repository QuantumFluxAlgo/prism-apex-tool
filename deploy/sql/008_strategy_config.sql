-- Strategy configuration tables for ORR, OSB, and VWAP-FT

CREATE TABLE IF NOT EXISTS orr_config (
  id integer PRIMARY KEY DEFAULT 1,
  version integer NOT NULL DEFAULT 1,
  operator text,
  param_a double precision,
  param_b double precision,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS osb_config (
  id integer PRIMARY KEY DEFAULT 1,
  version integer NOT NULL DEFAULT 1,
  operator text,
  param_a double precision,
  param_b double precision,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vwap_ft_config (
  id integer PRIMARY KEY DEFAULT 1,
  version integer NOT NULL DEFAULT 1,
  operator text,
  param_a double precision,
  param_b double precision,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION set_strategy_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orr_config_set_updated_at
BEFORE UPDATE ON orr_config
FOR EACH ROW EXECUTE FUNCTION set_strategy_config_updated_at();

CREATE TRIGGER osb_config_set_updated_at
BEFORE UPDATE ON osb_config
FOR EACH ROW EXECUTE FUNCTION set_strategy_config_updated_at();

CREATE TRIGGER vwap_ft_config_set_updated_at
BEFORE UPDATE ON vwap_ft_config
FOR EACH ROW EXECUTE FUNCTION set_strategy_config_updated_at();
