# Tickets lifecycle + Ticketizer rejects ledger

_Last updated: 2026-01-04_

## 1) Why this exists

We had two operational gaps:

1) **Operators could not see “why a ticket never appeared”** because Ticketizer-only rejects were not persisted as first-class history.
2) **/api/tickets totals were numerically wrong** (total drifted with limit), undermining pagination and analytics trust.

This implementation fixes both by:
- persisting Ticketizer rejects into a dedicated ledger table (**ticket_candidates**),
- exposing a merged “single-pane” endpoint (**/api/tickets-lifecycle**) for the dashboard,
- fixing invariant totals in **/api/tickets**.

Worklist behavior is explicitly **unchanged**.

---

## 2) Data model: ticket_candidates (Ticketizer rejects only)

### 2.1 Purpose
`ticket_candidates` is a forward-only ledger of **Ticketizer rejections**.  
It is not meant to replace canonical lifecycle tickets; it exists to capture “dropped at the gate” decisions so operators can audit rejections.

### 2.2 What gets written
Only rows where Ticketizer produced `accepted=false` are recorded (best effort, non-blocking).
Accepted tickets are not duplicated here.

### 2.3 Key columns (operator-relevant)
- `session_ts_utc` (TIMESTAMPTZ): authoritative session timestamp for ordering and filtering
- `session_date` (generated): UTC date derived from `session_ts_utc`
- `symbol`, `strategy`, `direction`
- `entry_price`, `stop_price`, `target_price`
- `qty` (0 for rejects, or post-sizing attempt if available)
- `rr_multiple`, `risk_dollars` (when computable)
- `rejection_reason` (primary reason string)
- `reject_reasons` (TEXT[] reason codes; supports multi-reason rejects)
- `meta` (JSONB): raw context (guardrails, risk evaluation, sizing context, etc.)
- `source` default `'ticketizer'`

### 2.4 Uniqueness / idempotency
Uniqueness is enforced across `(symbol, strategy, direction, session_ts_utc)` to prevent duplicate ledger spam for the same candidate.

### 2.5 Migration
- `deploy/sql/036_ticket_candidates.sql`

---

## 3) APIs

### 3.1 /api/ticket-candidates (raw ledger)
Purpose: direct access to Ticketizer rejects ledger.

Query parameters (typical):
- `from`, `to` (ISO timestamps, applied to session_ts_utc)
- `symbol`, `strategy`, `direction`
- `limit` (page size)
- `cursor` (offset cursor)

Response shape (UI-compatible):
- `{ total, rows, tickets, nextCursor }`

---

### 3.2 /api/tickets-lifecycle (merged accepted + rejected)
Purpose: dashboard-grade merged view combining:
- Accepted lifecycle tickets from `tickets`
- Rejected Ticketizer candidates from `ticket_candidates`

Key semantics:
- Rejected ledger rows always surface with:
  - `outcome = 'REJECTED'`
  - `status = 'REJECTED'`
  - `actionable = false`
  - `rejection_reason` / `reject_reasons` populated
- Accepted rows surface with:
  - `outcome = 'ACCEPTED'`
  - canonical lifecycle `status` from `tickets`
  - canonical `actionable` from `tickets`

Filters supported (operator-centric):
- outcome toggle: `ACCEPTED` vs `REJECTED`
- symbol / strategy / side(direction)
- status (applies to accepted; rejected is always REJECTED)
- from/to time range

Response shape:
- `{ total, rows, tickets, nextCursor }`
- Total reflects the **full filtered unified dataset**, independent of `limit`.

---

## 4) /api/tickets totals invariance (trust fix)

We fixed the prior failure mode where:
- `total == page size` (i.e., total changed with limit)

Now:
- total is computed from the full dataset (count query / store count), and remains invariant across limit values.

This restores trust for:
- pagination UX
- analytics (counts/ratios)
- operator audit workflows

---

## 5) Dashboard: Tickets page behavior

### 5.1 Primary UX
Tickets is now a “single pane of glass” over `/api/tickets-lifecycle`.

Operators get a top-level toggle:
- **Accepted**
- **Rejected (Ticketizer)**

### 5.2 Columns (operator-grade, low-noise)
We intentionally exclude low-value noise:
- no ticket ID / candidate ID
- no created_at display

Recommended table columns:
- Session timestamp (UTC)
- Session date (derived)
- Symbol
- Strategy
- Side/Direction
- Outcome (Accepted / Rejected)
- Status (Accepted: lifecycle status; Rejected: REJECTED)
- Actionable (Accepted only; rejected forced false)
- Entry / Stop / Target
- RR multiple
- Rejection reason (Rejected only; empty on Accepted)

### 5.3 Drilldown
Row selection shows:
- full reason codes (`reject_reasons[]`)
- primary `rejection_reason`
- meta (JSON) for audit

---

## 6) Non-goals / guardrails

- Worklist selection logic is untouched.
- We do not backfill historical rejects unless explicitly planned as a later migration.
- Reject ledger is Ticketizer-only (not planner envelope rejects unless later expanded).

