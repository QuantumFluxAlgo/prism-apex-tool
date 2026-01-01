DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='apex') THEN
    CREATE ROLE apex LOGIN PASSWORD 'apex' SUPERUSER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='prismapex') THEN
    CREATE ROLE prismapex LOGIN PASSWORD 'prismapex';
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname='prismapex') THEN
    CREATE DATABASE prismapex OWNER prismapex;
  END IF;
END $$;
GRANT ALL PRIVILEGES ON DATABASE prismapex TO prismapex;
GRANT ALL PRIVILEGES ON DATABASE prismapex TO apex;
