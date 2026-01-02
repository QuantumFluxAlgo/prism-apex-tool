-- 032_orr_gate_results_cleanup.sql
--
-- Purpose:
--   The first ORR gate system-record writer (P1-1) mistakenly persisted planner/strategy
--   outcomes under canonical_strategy_key='orr' (e.g., NEWS_SESSION / NO_CLEAR_EDGE).
--   That created confusion between planner outcomes and the shared ORR gate.
--
--   P1-2 corrects semantics by writing canonical_strategy_key='orr_gate' and
--   engine_strategy_id='ORR_GATE'. This cleanup removes the earlier planner-labelled rows.

BEGIN;

DELETE FROM orr_gate_results
WHERE canonical_strategy_key = 'orr'
   OR reason IN (
     'NEWS_SESSION',
     'NO_SESSION_METRICS',
     'OR_ATR_OUT_OF_RANGE',
     'NO_CLEAR_EDGE',
     'CLEAN_OR_UPTREND',
     'CLEAN_OR_DOWNTREND',
     'ENGINE_PREVIEW_ERROR'
   );

COMMIT;
