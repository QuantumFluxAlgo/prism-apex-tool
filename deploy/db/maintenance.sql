-- SAFE maintenance for performance stats; does NOT delete user data.
-- Runs a whole-database VACUUM (ANALYZE). Adds autovacuum stats to the planner.
VACUUM (ANALYZE);

-- If you later want per-table targeting, copy these lines and name tables explicitly:
-- VACUUM (ANALYZE) public.bars;
-- VACUUM (ANALYZE) public.tickets;
