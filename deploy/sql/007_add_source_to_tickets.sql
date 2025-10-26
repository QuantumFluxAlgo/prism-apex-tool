-- 007_add_source_to_tickets.sql
-- Adds a nullable text column "source" to public.tickets if it doesn't exist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'source'
  ) THEN
    ALTER TABLE public.tickets ADD COLUMN source text;
  END IF;
END $$;

-- Optional: if you also track ticket events, keep this harmlessly idempotent.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'ticket_events'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'ticket_events' AND column_name = 'source'
  ) THEN
    ALTER TABLE public.ticket_events ADD COLUMN source text;
  END IF;
END $$;

-- If a materialized view or view expects "source", it will now resolve from the base tables.
-- We intentionally do not DROP/CREATE views here to avoid breaking other dependencies.
