

<!-- P1-4 SHADOW OUTCOMES START -->

## P1-4 — Shadow Outcomes (Minimal Ticket vs 1m Bars, Async)

**Goal:** For each ticket, compute a minimal “what would have happened?” outcome by scanning stored 1-minute bars forward in time.

### Scope (P1 baseline)
- **Horizons:** `60m`, `240m`
- **Variants:** `RAW`, `BE_1R`
- **Anchor timestamp:** `tickets.created_at_utc` (UTC)
  - Rationale: stable generation/record timestamp already used for recency gating in ops. Avoids ambiguity around “opened” vs “entered”.

### Source tables
- **Bars:** `public.bars_1m(symbol, ts_utc, open, high, low, close, volume)`
- **Tickets:** `public.tickets(...)` (must contain: `id`, `symbol`, `direction`, `entry_price`, `stop_price`, `target_price`, `created_at_utc`)

### Persistence
Table: `public.shadow_outcomes`
- Unique key: `(ticket_id, horizon_minutes, variant)`
- Stores: anchor/window end timestamps, touched flags, outcome + outcome timestamp, BE trigger info (variant-dependent), bars scanned/expected, meta JSON.

---

## Rule Spec

### A) Window definition
For each ticket and horizon:
- `anchor_ts = tickets.created_at_utc`
- `window_end_ts = anchor_ts + (horizon_minutes minutes)`
- Bars queried: `bars_1m` where:
  - `symbol = ticket.symbol`
  - `ts_utc > anchor_ts` and `ts_utc <= window_end_ts`
  - Ordered by `ts_utc ASC`

> Note: using `>` for anchor avoids counting the creation minute itself if it aligns exactly to a bar timestamp.

### B) Touch logic (RAW)
A level is considered “touched” on a bar if it lies within the bar’s traded range:
- `touched(level) := (bar.low <= level <= bar.high)`

Compute:
- `stop_touch` when stop_price is touched
- `target_touch` when target_price is touched

**First-touch wins** (earliest `ts_utc` with any touch).
**Tie-breaker (same bar touches stop and target):** choose **STOP** (conservative, order-unknown inside the minute).

Outcome mapping:
- If first touch is stop → `outcome = STOP`
- If first touch is target → `outcome = TARGET`
- If no touch in window → `outcome = NONE`
- If insufficient bars → `outcome = INSUFFICIENT_DATA`

### C) BE_1R variant (Break-even after +1R)
Definitions:
- `R = abs(entry_price - stop_price)`
- For `LONG`:
  - `be_trigger_level = entry_price + R`
  - Trigger condition: `bar.high >= be_trigger_level`
- For `SHORT`:
  - `be_trigger_level = entry_price - R`
  - Trigger condition: `bar.low <= be_trigger_level`

Behaviour:
1) Before BE triggers, stop is the original `stop_price`.
2) When BE triggers, the stop is moved to **entry_price** for subsequent bars.
3) Stop/target touch logic remains `bar.low <= level <= bar.high`.

Tie-breakers (minute-order ambiguity):
- If a bar would both (a) touch original stop and (b) trigger BE: choose **STOP** (conservative).
- If BE triggers and target touches in the same bar (and stop does not): choose **TARGET**.
- If after BE triggers, a bar touches entry_price (new stop): outcome is **BREAKEVEN**.

Outcome mapping for BE_1R:
- First decisive event by time:
  - STOP (pre-trigger stop) → `STOP`
  - TARGET → `TARGET`
  - BE stop (entry_price) after trigger → `BREAKEVEN`
  - none → `NONE`
  - insufficient → `INSUFFICIENT_DATA`

### D) Insufficient data handling
Set `INSUFFICIENT_DATA` if:
- There are **zero** bars in the window, or
- The bars are materially incomplete (implementation chooses threshold; baseline is “zero bars”).
Always persist:
- `bars_expected = horizon_minutes`
- `bars_scanned = count(bars returned)`
- `meta` may include missing minutes estimate if needed.

---

## Bounded batch job requirements (implementation notes)
- Idempotent upserts into `shadow_outcomes` (conflict on PK).
- Bounded work per run: cap tickets processed per run (e.g., 100 tickets).
- No impact to live ops: run async/off critical path.

<!-- P1-4 SHADOW OUTCOMES END -->

## P1-4 — Shadow Outcomes (always-on, async)

**Goal:** For every ticket we generate (OPEN and CLOSED), compute minimal “would it have hit stop/target?” outcomes from stored 1m bars.

**Inputs**
- Tickets: `public.tickets` (anchor uses `created_at_utc`)
- Bars: `public.bars_1m` (1-minute OHLC, use high/low for touches)

**Outputs**
- Table: `public.shadow_outcomes` (PK: `ticket_id + horizon_minutes + variant`)
- Variants: `RAW`, `BE_1R`
- Horizons (default): `60m`, `240m`

**Rules (high level)**
- Window: `[anchor_ts_utc, anchor_ts_utc + horizon]` where `anchor_ts_utc = tickets.created_at_utc`.
- Touch logic: within the window, STOP is touched if bar low/high crosses stop (direction-aware), TARGET is touched if bar high/low crosses target.
- Tie-break: if both touch within the same minute, use a deterministic ordering (prefer the first timestamped touch; if still ambiguous, record meta and mark outcome conservatively).
- `BE_1R`: if price reaches +1R first, move the stop to entry and then evaluate remaining window.
- Insufficient data: if bars missing for the window, record `INSUFFICIENT_DATA` with meta for gaps.

**Always-on compute**
- Service: `shadow-outcomes-cron` runs on every deploy (no manual step) and is gated on:
  - `db` healthy
  - `migrate` completed successfully
- It is idempotent (upserts) and bounded per cycle.

**Read APIs**
- `GET /api/system-records/shadow-outcomes/:ticketId` — all rows for one ticket
- Optional bounded aggregate:
  - `GET /api/system-records/shadow-outcomes?sessionDate=YYYY-MM-DD&strategy=ORR` (bounded response)

**Operational note**
Shadow outcomes are *hypothetical projections* over the bar stream. CLOSED tickets allow later comparison to realized outcomes; OPEN tickets allow historical analysis of “what would have happened next”.

