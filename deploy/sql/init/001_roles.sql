-- Prism Apex local DB roles normalization (fresh volume init)
-- Runs automatically via /docker-entrypoint-initdb.d/ when the Postgres data volume is empty.
-- Goal: ensure BOTH roles exist for compatibility:
--  - apex/apex (canonical engine/user)
--  - prismapex/prismapex (compat)
-- and grant schema/table/sequence privileges on prismapex DB.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='apex') THEN
    CREATE ROLE apex LOGIN PASSWORD 'apex';
  ELSE
    ALTER ROLE apex WITH LOGIN PASSWORD 'apex';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='prismapex') THEN
    CREATE ROLE prismapex LOGIN PASSWORD 'prismapex';
  ELSE
    ALTER ROLE prismapex WITH LOGIN PASSWORD 'prismapex';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname='prismapex') THEN
    CREATE DATABASE prismapex;
  END IF;
END $$;

GRANT ALL PRIVILEGES ON DATABASE prismapex TO apex;
GRANT ALL PRIVILEGES ON DATABASE prismapex TO prismapex;

\connect prismapex

GRANT ALL ON SCHEMA public TO apex;
GRANT ALL ON SCHEMA public TO prismapex;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO apex;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO prismapex;

GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO apex;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO prismapex;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO apex;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO prismapex;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO apex;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO prismapex;
