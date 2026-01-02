
# PRISM APEX – SINGLE SOURCE OF TRUTH (SOT)

_Last updated: 2025-12-10_  
_Authority: This document supersedes any conflicting older docs once sections are marked **LOCKED**._

---

## 0. Purpose & scope

This file is the **single source of truth** for the current Prism Apex system:

- Describes the **real implementation** as checked into the repo.
- Maps **data flow** from external feeds (e.g. Yahoo, Tradovate) through:
  - Ingest jobs
  - Engine / rules / risk / ticketizer
  - API routes
  - Dashboard A3 surfaces
- Identifies what is **production**, what is **stubbed**, and what is **deprecated**.
- Defines what can be **archived or deleted** safely.

This document is **normative** over:

- `PRISM_APEX_V2_MASTER_PLAN.md`
- `PRISM_APEX_V2_ENGINE_WIRING_BACKLOG.md`
- `REPO_INDEX_V2.md`
- Older delivery/state/spec docs now classed as legacy.

When in doubt, the **code + this SOT** win.

---

## 1. Repo & service map

### 1.1 Monorepo structure (high level)

- `apps/api` – Fastify API, jobs, ingest and engine wiring.
- `apps/dashboard` – React operator dashboard (A3 surfaces).
- `apps/e2e` – Playwright smoke tests (TEST fixture safeguarding A2/A3 flows).
- `packages/shared` – Canonical shared types: tickets, sessions, audit, etc.
- `packages/rules-apex` – Strategy/risk rules used by the engine/ticketizer.
- `packages/ticketizer` – Ticket generation logic.
- `scripts` – Operational scripts (recon, deployment helpers, etc.).
- `docs` – Documentation set, with this file as the **entrypoint**.

_See also: `docs/REPO_INDEX_V2.md` for a raw index of paths; this SOT is the curated view._

### 1.2 Environments

- `local-dev` – Run via Docker Compose; mocked / partial engine wiring acceptable.
- `prod` – Docker-based runtime aligned with **Server Specs** doc.

_TODO: Wire precise environment profiles here once deployment section is locked._

---

2\. Contracts & DTOs (Canonical Types)
--------------------------------------

**Scope of this section**

This section defines the **canonical data contracts** that all engines, jobs, APIs, and dashboards must respect:

*   Tickets (engine + worklist)
    
*   Session metrics
    
*   PnL buckets
    
*   Strategy config + audit
    
*   Engine status / account
    

Everything else (jobs, routes, dashboards) should be considered **implementation detail on top of these contracts**.

### 2.1 Canonical Ticket Model

**Source of truth**

*   packages/shared/src/tickets.ts
    
*   API worklist view: apps/api/src/routes/worklist.ts
    
*   Canonical ticket view DTO: apps/api/src/routes/dto/canonicalTicketView.ts
    

#### 2.1.1 Status & Source Enums

**Status**

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   export const canonicalTicketStatusValues = [    'PENDING',    'ACTIONED',    'EXPIRED',    'CANCELLED',    'REJECTED',    'FILLED',    // Transitional legacy statuses – remove once Worklist V2 is fully migrated:    'OPEN',    'CLOSED',    'COMPLETE',  ] as const;  export type CanonicalTicketStatus = (typeof canonicalTicketStatusValues)[number];   `

Interpretation (current, engine-facing truth):

*   PENDING – ticket is live and awaiting operator action.
    
*   ACTIONED – operator has taken an action (order sent / strategy toggled) but outcome may still be in-flight.
    
*   EXPIRED – guardrail or time window invalidated the ticket.
    
*   CANCELLED – explicitly cancelled by operator or engine.
    
*   REJECTED – rejected by broker or engine validation.
    
*   FILLED – fully executed at broker.
    
*   OPEN / CLOSED / COMPLETE – **legacy dashboard statuses only**; to be removed from canonical enum once Worklist V2 is fully wired.
    

**Source**

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   export const canonicalTicketSourceValues = ['ENGINE', 'LAB', 'MANUAL'] as const;  export type CanonicalTicketSource = (typeof canonicalTicketSourceValues)[number];   `

*   ENGINE – produced by runtime engine/guardrails.
    
*   LAB – produced from Strategy Lab / experimentation.
    
*   MANUAL – hand-created by operator.
    

#### 2.1.2 CanonicalTicket (engine & analytics contract)

**Type**

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   export type CanonicalTicket = {    id: string;    createdAtUtc: string;    updatedAtUtc?: string | null;    sessionId?: string | null;    sessionDate?: string | null;      // YYYY-MM-DD    sessionLabel?: string | null;    // Identity & routing    symbol: string;    symbolDisplay?: string | null;    broker: string;    brokerAccountId?: string | null;    brokerSymbol: string;    // Strategy & classification    strategyId?: string | null;    strategyName?: string | null;    strategyCategory?: string | null;    direction: 'LONG' | 'SHORT';    kind: string;                     // engine-defined ticket kind (e.g., 'ENTRY', 'ADD', 'EXIT')    source: CanonicalTicketSource;    status: CanonicalTicketStatus;    // Price / size / guardrails    entryPrice: number;    targetPrice?: number | null;    stopPrice?: number | null;    quantity: number;    maxQuantity?: number | null;    notionalUsd?: number | null;    maxNotionalUsd?: number | null;    leverage?: number | null;    riskBucket?: string | null;       // e.g. 'LOW', 'MEDIUM', 'HIGH'    volatilityBucket?: string | null;    atrPoints?: number | null;    atrMultiplier?: number | null;    // Engine signals & scores    score?: number | null;            // strategy-defined ticket score    confidence?: number | null;    regime?: string | null;           // vol/regime tag    edgeEstimateTicks?: number | null;    // Time windows    validFromUtc?: string | null;    validToUtc?: string | null;    expiresAtUtc?: string | null;    completedAtUtc?: string | null;    // Risk / PnL snapshot fields (optional today, expected to be “attached” in view DTOs)    realisedPnlTicks?: number | null;    unrealisedPnlTicks?: number | null;    realisedPnlUsd?: number | null;    unrealisedPnlUsd?: number | null;    // UX/meta    notes?: string | null;    tags?: string[] | null;  };   `

**Schema**

*   canonicalTicketSchema in packages/shared/src/tickets.ts is the **single Zod schema** for runtime validation of CanonicalTicket (used by API and tests).
    
*   canonicalTicketSchemaWithAudit extends this with audit metadata (see below).
    

**Norms**

*   **All engine ticket producers** must emit CanonicalTicket.
    
*   **All dashboards and analytics** should **only** depend on CanonicalTicket or its documented view DTOs (e.g., CanonicalApprovedTicketView, WorklistTicketDto).
    
*   Any new field for tickets **must be added here first**, then threaded through jobs and views.
    

#### 2.1.3 CanonicalApprovedTicketView (tickets ready to execute)

**Source**

*   apps/api/src/routes/dto/canonicalTicketView.ts
    

This DTO is a **derived view** for tickets that are fully resolved/routable (e.g. used by the Tickets/Execution views). It is built from CanonicalTicket plus:

*   Broker-ready routing info (account, symbol, exchange).
    
*   Execution constraints (slippage, max slippage, child order count).
    
*   Current fill/execution state.
    

This is the **only contract** that execution-facing UI should rely on for **“ready to send” tickets**.

#### 2.1.4 TicketAuditEntry & ticket audit trail

Ticket audit lives in the same domain (packages/shared/src/tickets.ts) and engine/API layers. The pattern:

*   **Append-only audit log** per ticket:
    
    *   status changes (PENDING → ACTIONED → FILLED),
        
    *   parameter edits (size changes, stop changes),
        
    *   execution events (orders sent/filled/cancelled),
        
    *   operator actions (ignored/snoozed).
        
*   Stored as CanonicalTicketWithAudit = CanonicalTicket & { audit: TicketAuditEntry\[\] }.
    
*   **All auditable events** must go through a single audit writer in the engine (see Phase 2 – Engine & Jobs).
    

### 2.2 WorklistTicketDto (API → Worklist V2)

**Source of truth**

*   apps/api/src/routes/worklist.ts
    
*   Worklist dashboard: apps/dashboard/src/pages/WorklistV2.tsx
    

**Type (simplified)**

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   export interface WorklistTicketDto {    ticketId: string;    symbol: string;    direction: 'LONG' | 'SHORT';    strategyName: string | null;    riskBucket: string | null;    score: number | null;    sessionDate: string | null;          // YYYY-MM-DD    sessionType: string | null;    ageMinutes: number | null;    createdAtUtc: string;    status: CanonicalTicketStatus;    source: CanonicalTicketSource;    // PnL summary (optional today)    realisedPnlTicks?: number | null;    unrealisedPnlTicks?: number | null;    // UX-facing    notes?: string | null;  }   `

**Mapping**

*   WorklistTicketDto is derived **only** from CanonicalTicket (+ joined PnL when available).
    
*   Any field shown in Worklist V2 table or details panel should be traceable back to either:
    
    *   CanonicalTicket, or
        
    *   Clearly defined supplementary contracts (session metrics, PnL buckets).
        

**Rule:** Do **not** add “random one-off” fields to WorklistTicketDto. Add them to CanonicalTicket (or a referenced canonical contract) first.

### 2.3 Session Metrics Contract

**Source of truth**

*   Job: apps/api/src/jobs/session-metrics/runtime.ts
    
*   API route: apps/api/src/routes/session-metrics.ts
    
*   Dashboard use: apps/dashboard/src/pages/Analytics.tsx (and any sessions panel in other pages)
    

#### 2.3.1 SessionMetricsDto

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   export interface SessionMetricsDto {    symbol: string;    sessionDate: string;             // YYYY-MM-DD (UTC)    sessionType: SessionType;        // e.g. 'REGULAR', 'EXTENDED'    // Session timing    sessionStartTs: string | null;    sessionEndTs: string | null;    // Volatility & ranges    sessionAtrPoints: number | null;    sessionAtrBucket: string | null;    intradayRangePoints: number | null;    overnightRangePoints: number | null;    volRegime: VolRegime | null;    // Opening range (OR)    orStartTs: string | null;    orEndTs: string | null;    orLengthMinutes: number | null;    orHigh: number | null;    orLow: number | null;    // Derived strategy metrics (current job)    // (mid-block fields omitted here for brevity, but must stay canonical – see runtime.ts)    // Health / diagnostics    status: 'OK' | 'ERROR';    errorCode: string | null;    errorMessage: string | null;    computedAt: string;              // ISO timestamp    version: string;                 // 'v1' etc.  }   `

**Notes**

*   This is the **canonical analytics/session contract**: all dashboards showing session info must use this.
    
*   All future metrics (e.g. “avg OR breakout return”, “gap size”) should be added here and versioned via version.
    
*   The session metrics job is **the only producer**; dashboards must not recompute metrics ad-hoc.
    

### 2.4 PnL Contracts

**Source of truth**

*   PnL library: packages/shared/src/pnl.ts
    
*   Jobs / routes:
    
    *   PnL time-bucket job/route (where present)
        
    *   Worklist & ticket views (who consume realised/unrealised PnL fields)
        

#### 2.4.1 Core PnL structures

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   export type TimeBucketPosition = {    symbol: string;    accountId: string;    ts: string;                 // ISO timestamp for the bucket    quantity: number;    avgPrice: number;  };  export type TimeBucketPnL = {    symbol: string;    accountId: string;    ts: string;    realisedPnlTicks: number;    unrealisedPnlTicks: number;    realisedPnlUsd: number;    unrealisedPnlUsd: number;  };  export type RealisedPnLBucket = {    fromTs: string;    toTs: string;    realisedPnlTicks: number;    realisedPnlUsd: number;  };  export type UnrealisedPnLBucket = {    ts: string;    unrealisedPnlTicks: number;    unrealisedPnlUsd: number;  };   `

**Usage norms**

*   All PnL computations (tick and USD) must use these structures.
    
*   Any PnL values attached to tickets or sessions must be expressible as:
    
    *   A single TimeBucketPnL, or
        
    *   An aggregation over RealisedPnLBucket / UnrealisedPnLBucket.
        

**Open gap / to-do**

*   There is **no single canonical PnLDto yet** exposed via API.
    
*   For V2, define **TimeBucketPnLDto** in apps/api/src/dto/pnl.ts as a thin DTO wrapper around TimeBucketPnL and standardise all PnL API responses on that.
    

### 2.5 Strategy Config & Audit Contracts

**Source of truth**

*   DTO index: apps/api/src/dto/strategy-config/index.ts
    
*   Types: apps/api/src/dto/strategy-config/types.ts
    
*   Audit DTOs: apps/api/src/dto/strategy-config/audit.ts
    
*   Engine side: strategy orchestrator & config storage (Phase 2 scope)
    

#### 2.5.1 StrategyConfigDto

High-level fields (see types.ts for exact shape):

*   id: string – strategy identifier.
    
*   name: string – human-readable name.
    
*   symbol: string – instrument symbol.
    
*   enabled: boolean.
    
*   Risk/config params:
    
    *   max leverage / position size,
        
    *   entry/exit rule flags,
        
    *   guardrails (time windows, OR rules, etc.).
        
*   Metadata:
    
    *   labels/tags,
        
    *   group/category,
        
    *   notes.
        

This is the **single contract** for:

*   UI configuration forms.
    
*   Engine strategy configuration snapshot.
    
*   Strategy Lab view of current settings.
    

#### 2.5.2 StrategyConfigAuditDto

From audit.ts:

*   Represents **append-only audit events** for any strategy configuration change:
    
    *   strategyId
        
    *   changedBy (operator)
        
    *   changedAt (timestamp)
        
    *   changeType (CREATE/UPDATE/DELETE)
        
    *   diff payload (before/after or changed fields).
        

**Rule**

*   All strategy config mutations must **emit an audit event** of this form.
    
*   UI surfaces must render audit history using this contract, not custom logs.
    

### 2.6 Engine Status & Account Contracts

**Source of truth**

*   apps/api/src/dto/account.ts
    
*   apps/api/src/dto/engine-status.ts
    

#### 2.6.1 AccountDto

Key fields:

*   broker: string (e.g. TRADOVATE).
    
*   accountId: string.
    
*   currency: string.
    
*   balance: number.
    
*   marginUsed: number | null.
    
*   marginAvailable: number | null.
    
*   buyingPower: number | null.
    
*   status: 'OK' | 'ERROR' plus error codes/messages if relevant.
    

This is the **canonical account snapshot** used by:

*   System/Status page.
    
*   Any per-ticket “account health” view.
    

#### 2.6.2 EngineStatusDto

Key fields:

*   engineName: string.
    
*   status: 'STARTING' | 'RUNNING' | 'DEGRADED' | 'STOPPED'.
    
*   startedAt: string.
    
*   updatedAt: string.
    
*   errorCode / errorMessage: optional.
    
*   version: string (engine build).
    

All health/status monitors and dashboards should consume **only this DTO** for engine state.

### 2.7 Trading Contract Specs (Broker Mapping)

**Source of truth**

*   packages/shared/src/contracts.ts
    

This module defines:

*   ContractKind – category of instrument (e.g. futures, CFD, etc.).
    
*   ContractSpec – canonical description of a tradable contract:
    
    *   symbol / displaySymbol
        
    *   tickSize
        
    *   tickValue
        
    *   minQty
        
    *   maxQty
        
    *   margin and notional scaling
        
*   Helper functions:
    
    *   resolveContractSpec(symbol: string, broker: string): ContractSpec
        
    *   normalizeTraderSymbol(...) etc.
        

This is the **single mapping** layer between:

*   Our canonical symbol / ContractSpec, and
    
*   Broker-specific symbols and increments (Tradovate, etc.).
    

All ticket sizing, PnL (in ticks), and guardrail checks must be consistent with ContractSpec.

### 2.8 Legacy / Unused Contract Types (Deletion & Quarantine)

This is based on a static search over the current branch.

#### 2.8.1 Safe to remove now (no usages)

1.  If you later need an “update” DTO distinct from the full config, introduce it _with real usage_.
    
    *   Defined in: apps/api/src/dto/strategy-config/index.ts
        
    *   Usage count: **1** (definition only; not referenced anywhere else).
        
    *   Recommendation:
        
        *   Either **delete** it outright, or
            
        *   Replace it with a simple alias to StrategyConfigDto if you prefer a semantic type.
            

#### 2.8.2 Likely safe, but keep for one more cycle

1.  **Recommendation**
    
    *   export type TicketType = 'ENTRY' | 'EXIT' | 'ADD'; // (example – check exact literals)
        
    *   Usage count in repo: **1** (the definition itself).
        
    *   No imports or references elsewhere.
        
    
    *   Mark in code as **deprecated** in a comment, and either:
        
        *   Delete it when all engine/ticket code is fully on CanonicalTicket.kind, or
            
        *   Wire it into the canonical model as CanonicalTicket.kind if that’s exactly what it represents.
            

#### 2.8.3 Legacy fields & enums

*   OPEN / CLOSED / COMPLETE in canonicalTicketStatusValues:
    
    *   These are documented as transitional and **should be removed** once:
        
        *   Worklist V2 no longer expects them, and
            
        *   Any legacy dashboards that surfaced these are retired.
            
*   Any DTOs/types under apps/api/src/dto/ that do **not** appear in:
    
    *   apps/api/src/routes/\*\*
        
    *   apps/dashboard/src/\*\*are candidates for deletion or movement into a legacy/ folder.
        

### 2.9 Contract Governance Rules (How to Keep This SOT Canonical)

1.  **Single definition per concept**
    
    *   There must be **exactly one** canonical definition of:
        
        *   Ticket (CanonicalTicket)
            
        *   Ticket view (CanonicalApprovedTicketView, WorklistTicketDto)
            
        *   Session metrics (SessionMetricsDto)
            
        *   PnL (TimeBucketPnL, buckets, and future TimeBucketPnLDto)
            
        *   Strategy config (StrategyConfigDto, StrategyConfigAuditDto)
            
        *   Account/Engine status (AccountDto, EngineStatusDto)
            
    *   If another module needs the same concept, it **imports** these types – it doesn’t re-define them.
        
2.  **Change discipline**
    
    *   Any change to a contract type requires:
        
        *   Update to this section of PRISM\_APEX\_SOT.md.
            
        *   A matching Zod schema change (where one exists).
            
        *   A migration plan for any consumers (jobs, routes, dashboards).
            
3.  **Deprecation**
    
    *   Types identified as unused/legacy (see 2.8) should:
        
        *   Be marked @deprecated in code, and/or
            
        *   Be moved to a legacy/ or archive/ module pending deletion in the next cleanup pass.
            
4.  **Cross-linking**
    
    *   All higher-level docs (e.g. V2 Dashboard Plan, Engine Jobs plan) must **refer back** to the exact contract names and file paths defined here.
        

### What you can delete / quarantine **right now** from Phase 1

Concrete actions you can take in this branch today, based on the repo scan:

1.  **Remove StrategyConfigUpdateDto**
    
    *   File: apps/api/src/dto/strategy-config/index.ts
        
    *   Action:
        
        *   Delete the type and re-export only StrategyConfigDto and the audit DTOs.
            
2.  **Mark TicketType as deprecated and prepare to remove**
    
    *   File: apps/api/src/store.ts
        
    *   Action:
        
        *   // DEPRECATED – use CanonicalTicket.kind instead. Candidate for deletion once engine is fully on CanonicalTicket.
            
        *   Once you confirm there are no runtime references (and engine/guardrail code uses CanonicalTicket.kind), delete this alias.
            
3.  **Avoid adding any new ad-hoc** _**ticket**_ **or** _**session**_ **DTOs**
    
    *   If you need a new field, add it **here** (in this contract layer) and thread it through.
        
    *   Do **not** define FooTicketDto or FooSessionDto beside routes unless you are explicitly building a view on top of the canonical types and documenting it in this section.
---

3\. Canonical contracts & DTOs (single source of truth)
-------------------------------------------------------

This section defines the **canonical domain contracts** for Prism Apex V2 and how they are wired across:

*   Shared library: packages/shared
    
*   API: apps/api
    
*   Dashboard: apps/dashboard
    
*   Legacy/global v1: types/global, packages/sdk
    

Anything **not** referenced here is either:

*   Transitional glue we intend to retire, or
    
*   Legacy v1 that can be archived or deleted once dependencies are removed.
    

### 3.1 Contract principles

1.  **Single canonical type per concept**
    
    *   One canonical ticket shape.
        
    *   One canonical ticket view for operators.
        
    *   One canonical session metrics DTO.
        
    *   One canonical strategy config shape.
        
    *   One canonical PnL contract.
        
2.  **Ownership**
    
    *   **packages/shared** owns _core domain contracts_ (symbols, tick sizes, PnL, canonical ticket schema, etc).
        
    *   **apps/api DTOs** own _what leaves the API_ (operator views, strategy config, risk decisions, sizing).
        
    *   **apps/dashboard DTOs** are thin client mirrors of the API DTOs – they must **not diverge** in shape.
        
3.  **Legacy surface**
    
    *   **types/global/contracts.d.ts + packages/sdk** represent the **older SDK-facing ticket model**.
        
    *   These are **not used** by the V2 dashboard flow and should be treated as **legacy** until either:
        
        *   The SDK is rebuilt on top of @prism-apex/shared, or
            
        *   The SDK is formally retired and removed.
            

### 3.2 Shared contracts – packages/shared

#### 3.2.1 Instrument & risk contracts

**File:** packages/shared/src/contracts.ts**File (spec data):** packages/shared/src/contracts-spec.json

**Exports (key ones):**

*   lookupContract(symbol: string)
    
*   priceToTicks, ticksToPrice, ticksToDollars, priceDiffToTicks
    
*   ContractSpec (type inferred via zod schema around contracts-spec.json)
    

**Role:**

*   This is the **canonical instrument / contract spec source** (tick size, point value, symbol metadata).
    
*   It underpins:
    
    *   PnL calculations (via point value, tick size).
        
    *   Risk/sizing decisions (contract size, multiplier).
        
    *   Display formatting for prices and PnL on the dashboard.
        

**Where it is used (examples):**

*   apps/api/src/jobs/pnl/runtime.ts
    
*   apps/api/src/jobs/session-metrics/runtime.ts
    
*   Any place importing from @prism-apex/shared and using contract lookup or tick math.
    

**Deletion guidance:**

*   contracts.ts and contracts-spec.json are **hard canonical** and **must not be deleted**.
    
*   Any ad-hoc tick/point calculations outside this module should be refactored to use this contract in V2/V3.
    

#### 3.2.2 Ticket lifecycle contracts

**File:** packages/shared/src/tickets.ts

**Key exports:**

*   canonicalTicketStatusValues / CanonicalTicketStatus
    
*   canonicalTicketSourceValues / CanonicalTicketSource
    
*   canonicalTicketSchema (zod)
    
*   CanonicalTicket (z.infer)
    
*   CanonicalCandidateTicket = CanonicalTicket & { status: 'PENDING' }
    

**Role:**

*   This is the **canonical ticket lifecycle and status model** shared across:
    
    *   Engine / jobs
        
    *   API worklist / tickets endpoints
        
    *   Dashboard Worklist V2 / Tickets pages
        
    *   Analytics where ticket lifecycle is needed
        

**Where it is used (examples):**

*   Engine / jobs:
    
    *   apps/api/src/jobs/worklist/runtime.ts
        
    *   apps/api/src/jobs/order-routing/runtime.ts (ORR)
        
*   API:
    
    *   apps/api/src/routes/worklist.ts
        
    *   apps/api/src/routes/tickets.ts
        
    *   apps/api/src/routes/dto/canonicalTicketView.ts
        
*   Dashboard:
    
    *   apps/dashboard/src/lib/canonicalTickets.ts
        
    *   apps/dashboard/src/pages/WorklistV2.tsx
        
    *   apps/dashboard/src/pages/Tickets.tsx
        

**Deletion guidance:**

*   packages/shared/src/tickets.ts is **canonical**.Do **not** delete or fork it. Everything else should move _towards_ this.
    

#### 3.2.3 PnL contracts

**File:** packages/shared/src/pnl.ts

**Key exports:**

*   Direction ('LONG' | 'SHORT')
    
*   PnLInput
    
*   PnLResult
    
*   calculatePnL(input: PnLInput): PnLResult
    

**Role:**

*   Canonical **contract-level PnL calculation**:
    
    *   Uses Direction, entry price, exit price, and contract spec (via contracts.ts) to compute:
        
        *   ticks
            
        *   dollars
            
        *   Possibly per-contract and aggregate values.
            

**Where it is used (examples):**

*   apps/api/src/jobs/pnl/runtime.ts
    
*   Any engine/job computing session or ticket-level PnL.
    

**Deletion guidance:**

*   pnl.ts is **canonical**.
    
*   Any PnL logic embedded in other modules should be refactored to call this, then the duplicates can be deleted as part of V3 cleanup.
    

#### 3.2.4 Ticket fixtures (non-production)

**File:** packages/shared/src/tickets.fixtures.ts**Key exports:**

*   longTrendPullbackMesFixture
    
*   longVwapTouchEsFixture
    
*   shortOpeningBreakNqFixture
    

**Where used:**

*   apps/dashboard/src/lib/worklistMock.ts (mock worklist data)
    

**Role:**

*   **Developer fixtures only** – realistic sample tickets for UI development / demos.
    

**Deletion guidance:**

*   They are only used by the **Worklist mock**.
    
*   As soon as Worklist V2 is fully backed by the engine + canonical view and worklistMock is removed, **you can delete**:
    
    *   packages/shared/src/tickets.fixtures.ts
        
    *   The export from packages/shared/src/index.ts
        
*   Until then, treat them as **non-production** but still required for local mock flows.
    

### 3.3 API DTO contracts – apps/api/src/routes/dto

These define what leaves the API. The dashboard mirrors these one-for-one under apps/dashboard/src/lib/dto.

#### 3.3.1 Canonical ticket view (operator-facing)

**API file:** apps/api/src/routes/dto/canonicalTicketView.ts**Dashboard mirror:** apps/dashboard/src/lib/dto/canonicalTicketView.ts

**Key exports (API):**

*   canonicalTicketViewSchema (zod)
    
*   CanonicalApprovedTicketView (z.infer)
    

**Key exports (Dashboard):**

*   CanonicalApprovedTicketView
    
*   mapApiCanonicalTicketViewToClient(...) (if present)
    

**Role:**

*   This is the **operator-facing ticket row** used by:
    
    *   Worklist V2
        
    *   Tickets page
        
    *   Any future A3 cockpit that surfaces tickets.
        
*   It is built from the engine-side CanonicalTicket but:
    
    *   Flattens / enriches fields for view (e.g. symbol, side, size, prices, risk flags, timestamps).
        
    *   Ensures the UI doesn’t know about internal engine bookkeeping.
        

**Where referenced:**

*   API:
    
    *   apps/api/src/routes/worklist.ts
        
    *   apps/api/src/routes/tickets.ts
        
*   Dashboard:
    
    *   apps/dashboard/src/lib/api.ts (fetchers)
        
    *   apps/dashboard/src/pages/WorklistV2.tsx
        
    *   apps/dashboard/src/pages/Tickets.tsx
        

**Deletion guidance:**

*   This is **canonical** for operator ticket views.
    
*   Any other ad-hoc ticket row shapes on the frontend should be **deleted or migrated** to this.
    

Specifically:

*   WorklistTicketDto in apps/api/src/routes/worklist.ts
    
    *   Transitional – used only by the older worklist shape.
        
    *   Once Worklist V2 is purely using CanonicalApprovedTicketView, this DTO and associated mapping code can be removed.
        
*   apps/dashboard/src/lib/worklistTickets.ts (local WorklistTicket client type)
    
    *   Transitional shim.
        
    *   Target: delete once Worklist V2 rows use CanonicalApprovedTicketView directly.
        

#### 3.3.2 Operator risk DTO

**File:** apps/api/src/routes/dto/operatorRisk.ts

**Key exports:**

*   operatorRiskSchema
    
*   OperatorRiskDto
    

**Role:**

*   Canonical representation of **operator-facing risk information** (e.g. session risk flags, limit breaches, guardrail triggers) bundled for the UI.
    

**Where used:**

*   API routes that surface session risk summary (e.g. apps/api/src/routes/risk.ts if present).
    
*   Possibly included in SessionMetricsDto payloads or a dedicated risk endpoint.
    

**Dashboard mirror:**

*   If not yet present, the V2 SOT requires a **1:1 mirror** in apps/dashboard/src/lib/dto/operatorRisk.ts using the same field names.
    

**Deletion guidance:**

*   Keep as canonical.
    
*   If there are any older, inconsistent risk payloads in apps/api/src/routes/\* they should be either:
    
    *   Mapped into OperatorRiskDto, or
        
    *   Marked as legacy and scheduled for deletion once all surfaces use this DTO.
        

#### 3.3.3 Operator sizing DTO

**File:** apps/api/src/routes/dto/operatorSizing.ts

**Key exports:**

*   operatorSizingSchema
    
*   OperatorSizingDto
    

**Role:**

*   Canonical representation for **how the system suggests size** (contracts, risk-weighting, leverage equivalents, etc.) for an operator.
    

**Where used:**

*   Sizing-related routes (e.g. apps/api/src/routes/sizing.ts) and/or inside ORR / worklist flows where size recommendations are shown.
    

**Dashboard mirror:**

*   Mirror under apps/dashboard/src/lib/dto/operatorSizing.ts for A3 surfaces that show sizing suggestions.
    

**Deletion guidance:**

*   Keep as canonical.
    
*   Any old “manual size” fields in other DTOs should be harmonised into this or dropped.
    

#### 3.3.4 Risk decision DTO

**File:** apps/api/src/routes/dto/riskDecisionDto.ts

**Key exports:**

*   riskDecisionSchema
    
*   RiskDecisionDto
    

**Role:**

*   Canonical contract for **decisions made by the risk engine**, such as:
    
    *   Allow / block ticket
        
    *   Adjusted size
        
    *   Reasons / guardrail explanations
        

**Where used:**

*   ORR jobs and routes:
    
    *   apps/api/src/jobs/order-routing/runtime.ts
        
    *   apps/api/src/routes/order-routing.ts (or similarly named)
        

**Dashboard mirror:**

*   For an operator-facing ORR console, this should be mirrored under apps/dashboard/src/lib/dto/riskDecisionDto.ts.
    

**Deletion guidance:**

*   Keep as canonical.
    
*   Any ad-hoc “risk decision” shapes elsewhere should be mapped to this or removed.
    

### 3.4 Strategy config contracts – apps/api/src/dto/strategy-config

**Files:**

*   apps/api/src/dto/strategy-config/schema.ts
    
*   apps/api/src/dto/strategy-config/types.ts
    
*   apps/api/src/dto/strategy-config/index.ts
    

**Key exports:**

From schema.ts:

*   Zod schema for **strategy configuration** (parameters, risk limits, session toggles, etc.)
    

From types.ts:

*   StrategyConfigDto
    
*   StrategyConfigParameter (and related enums/aliases)
    

From index.ts:

*   Re-exports for API and jobs.
    

**Role:**

*   Canonical wire format for **strategy configuration**:
    
    *   What the engine expects.
        
    *   What the API exposes.
        
    *   What the UI Strategy Lab should read/write.
        

**Where used (examples):**

*   API routes:
    
    *   apps/api/src/routes/strategy-config.ts
        
*   Engine / jobs:
    
    *   apps/api/src/jobs/strategy-orchestrator/runtime.ts (or similar)
        
*   Dashboard (should be):
    
    *   apps/dashboard/src/lib/dto/strategyConfig.ts backing Strategy Lab.
        

**Deletion guidance:**

*   This folder is **canonical**.
    
*   Any previous strategy config shapes should be migrated and then deleted.
    
*   Ensure that Strategy Lab V2 uses _only_ these types on the wire.
    

### 3.5 Session metrics contracts

**Primary location (runtime):**

*   apps/api/src/jobs/session-metrics/runtime.ts
    
    *   Defines SessionMetricsDto and internal snapshot types.
        

**API surface:**

*   apps/api/src/routes/session-metrics.ts
    
    *   Exposes SessionMetricsDto via GET /api/session-metrics.
        

**Role:**

*   Canonical representation of **per-session metrics**:
    
    *   PnL (per session / per symbol / per strategy).
        
    *   Risk utilisation.
        
    *   Ticket / trade counts.
        
    *   Latency / performance metrics as needed.
        

**Dashboard expectations:**

*   apps/dashboard/src/lib/dto/sessionMetrics.ts (or equivalent) should contain a **mirror of SessionMetricsDto**, and:
    
    *   apps/dashboard/src/pages/Analytics.tsx
        
    *   apps/dashboard/src/pages/Status.tsxshould consume only that DTO as their source of truth.
        

**Deletion guidance:**

*   The SessionMetricsDto produced in runtime.ts is canonical.
    
*   Any bespoke “analytics metrics” or “status metrics” DTOs that diverge from this should be:
    
    *   Marked as legacy, and
        
    *   Deleted once Analytics/Status V2 are fully wired to SessionMetricsDto.
        

### 3.6 Legacy/global contracts & SDK

#### 3.6.1 Global contracts (v1)

**File:** types/global/contracts.d.ts**Namespace:** PrismApex

Defines ambient types such as:

*   PrismApex.Ticket
    
*   PrismApex.TicketStatus
    
*   PrismApex.TicketSource
    
*   PrismApex.StrategyId
    
*   And related v1-era ticket and session types.
    

**Where used:**

*   Primarily by the SDK:
    
    *   packages/sdk/src/types.ts and related files.
        

**Role:**

*   This is the **pre-V2, SDK-centric ticket model**.
    
*   It is **not used** by the V2 dashboard or engine contracts in @prism-apex/shared.
    

**Deletion guidance:**

*   If you **still intend to ship or support the SDK**, keep:
    
    *   types/global/contracts.d.ts
        
    *   packages/sdk/\*and clearly mark them as **“v1 SDK – legacy”** in the SOT.
        
*   If you decide the SDK is **out of scope for V2 production**, you have two options:
    
    1.  Move types/global/contracts.d.ts and packages/sdk to an /archive/v1 folder.
        
    2.  Remove them entirely once you’re sure no external clients depend on them.
        

In all cases, **do not use these types for new V2 work** – use the canonical contracts described in 3.2–3.5.

### 3.7 Dashboard-side DTO mirrors & mocks

#### 3.7.1 DTO mirrors

**Folder:** apps/dashboard/src/lib/dto

Key mirrors (must remain 1:1 with API DTOs):

*   canonicalTicketView.ts → mirrors apps/api/src/routes/dto/canonicalTicketView.ts
    
*   operatorRisk.ts (once created) → mirrors apps/api/src/routes/dto/operatorRisk.ts
    
*   operatorSizing.ts (once created) → mirrors apps/api/src/routes/dto/operatorSizing.ts
    
*   riskDecisionDto.ts (once created) → mirrors apps/api/src/routes/dto/riskDecisionDto.ts
    
*   strategyConfig.ts → mirrors apps/api/src/dto/strategy-config/types.ts
    
*   sessionMetrics.ts → mirrors SessionMetricsDto
    

**Role:**

*   Provide strongly-typed client models that are **strict mirrors** of API DTOs.
    
*   Any divergence between API and dashboard DTOs is considered a **bug**.
    

**Deletion guidance:**

*   Keep these mirrors; they are part of the canonical V2 surface.
    
*   If you find client DTOs that **don’t have an API source** (i.e. they’re purely UI-invented shapes), they should be:
    
    *   Either backed by a corresponding API DTO, or
        
    *   Deleted as part of cleanup.
        

#### 3.7.2 Worklist mocks

**Files:**

*   apps/dashboard/src/lib/worklistMock.ts
    
*   apps/dashboard/src/hooks/useWorklistTickets.ts
    
*   packages/shared/src/tickets.fixtures.ts (already covered above)
    

**Role:**

*   Provide mock data and a hook to populate Worklist V2 in the absence of a live engine/API.
    

**Deletion guidance:**

*   Mark these as **“mock-only, non-production”** in the SOT.
    
*   Once the /api/worklist endpoint is fully wired to the engine and the FE uses CanonicalApprovedTicketView end-to-end:
    
    *   Delete worklistMock.ts
        
    *   Delete or simplify useWorklistTickets.ts to be a thin fetch hook
        
    *   Delete tickets.fixtures.ts and its export from packages/shared/src/index.ts
        

### 3.8 Cleanup summary – Contracts layer

**Keep (canonical, V2):**

*   packages/shared/src/contracts.ts + contracts-spec.json
    
*   packages/shared/src/tickets.ts
    
*   packages/shared/src/pnl.ts
    
*   apps/api/src/routes/dto/\*.ts (canonicalTicketView, operatorRisk, operatorSizing, riskDecisionDto)
    
*   apps/api/src/dto/strategy-config/\*.ts
    
*   apps/api/src/jobs/session-metrics/runtime.ts (SessionMetricsDto)
    
*   Dashboard DTO mirrors in apps/dashboard/src/lib/dto/\* that correspond to these.
    

**Keep (transitional until V2 wiring is finished):**

*   apps/dashboard/src/lib/worklistMock.ts
    
*   apps/dashboard/src/hooks/useWorklistTickets.ts
    
*   packages/shared/src/tickets.fixtures.ts
    
*   Any non-canonical ticket DTOs such as WorklistTicketDto in apps/api/src/routes/worklist.ts→ these must be clearly marked as **legacy/transitional**.
    

**Candidates for deletion / archival once dependencies are gone:**

*   packages/shared/src/tickets.fixtures.ts and related exports (when mock flow is retired).
    
*   apps/dashboard/src/lib/worklistMock.ts and any pure-mock hooks.
    
*   types/global/contracts.d.ts + packages/sdk/\*→ if and only if you no longer support the v1 SDK.

---

4\. Engine, Strategies & Jobs (Sessions, Risk, Tickets)
-------------------------------------------------------

This section is the **engine truth**: how raw market data and strategy configs are turned into:

*   **Session metrics** (PnL, drawdown, exposure, risk stats).
    
*   **Guarded strategy signals** (post–risk engine).
    
*   **Operator tickets** (what the dashboards actually show).
    

It is the glue between:

*   **Contracts** (see §3 Canonical Contracts & DTOs).
    
*   **Database & ingest** (see §2 Data Ingest & Storage).
    
*   **Dashboards** (see §6 Dashboard Surfaces).
    

> All paths below are from repo root; /apps/api/src/... unless explicitly stated otherwise.

### 4.1 Strategy Config Contracts (API + Shared)

This layer defines **what “a strategy config” means** across the system. Everything else (engine, jobs, dashboards, runbooks) must align with these types and IDs.

#### 4.1.1 API DTOs (external contract)

**Source:**

*   apps/api/src/dto/strategy-config/types.ts
    

**Responsibilities:**

*   Define canonical identifiers:
    
    *   StrategyConfigId
        
    *   StrategyCode (e.g. OSB, ORR, VWAP\_FT, etc.).
        
*   Define the base shape:
    
    *   BaseStrategyConfig – common fields such as:
        
        *   symbol / instrument.
            
        *   session identifiers.
            
        *   Sizing parameters.
            
        *   Risk caps / limits.
            
*   Define strategy-specific DTOs:
    
    *   OSBConfigDto
        
    *   ORRConfigDto
        
    *   VWAPFTConfigDto
        
*   Provide a **typed union** so the engine can safely switch on StrategyCode and get correct config fields.
    

#### 4.1.2 Config service & HTTP surface

**Sources:**

*   Loader:
    
    *   apps/api/src/services/strategy-config/index.ts
        
*   Validators:
    
    *   apps/api/src/services/strategy-config/validators/orr.ts
        
    *   apps/api/src/services/strategy-config/validators/osb.ts
        
    *   apps/api/src/services/strategy-config/validators/vwapft.ts
        
*   HTTP route:
    
    *   apps/api/src/routes/strategy-config.ts
        
*   JSON config sources:
    
    *   configs/strategies/\*.json
        
        *   Live configs (e.g. opening-session-breakout.json, vwap-first-touch.json).
            
        *   Templates (e.g. \*.example.json).
            

**Responsibilities:**

*   Load config JSON from configs/strategies/\*.json using helpers in packages/strategies.
    
*   Validate each config against the correct DTO (ORR, OSB, VWAP\_FT).
    
*   Normalise everything into the DTO shapes defined in dto/strategy-config.
    
*   Expose read (and future write) endpoints via /api/strategy-config.
    

> **Canonical rule:**The DTOs in apps/api/src/dto/strategy-config and the JSON in configs/strategies/\*.json are the **single source of truth** for strategy configuration. Any UI, runbook, or engine logic must align to these IDs, field names, and validation rules.

### 4.2 Job Scheduler (Job Orchestration)

Central, engine-side scheduler used to run all recurring jobs.

**Sources:**

*   apps/api/src/jobs/scheduler.ts
    
*   Tests:
    
    *   apps/api/src/jobs/\_\_tests\_\_/scheduler.test.ts
        

**Responsibilities:**

*   Define job primitives:
    
    *   JobName, JobKind, JobStatus, JobConfig, etc.
        
*   Boot job runners and wire them into the API process on startup.
    
*   Track job state in PostgreSQL via setJobBeat:
    
    *   Last run timestamp.
        
    *   Status (success/failure/in-progress).
        
    *   Error info where relevant.
        
*   Orchestrate core jobs:
    
    *   **Session metrics pipeline** (see §4.3).
        
    *   **Engine run job** (strategy execution; see §4.4).
        
    *   **Ticketization job** (see §4.6).
        
    *   Future jobs (reconciliation, cleanup, etc.).
        

**Inputs:**

*   PG connection (job metadata + engine data).
    
*   Job implementations (e.g. session-metrics, engineRunJob, ticketizer).
    

**Outputs:**

*   Persistent job state in DB.
    
*   Execution of downstream pipelines described in §4.3–§4.6 on schedule.
    

> **Keep:** scheduler.ts and tests are core platform infrastructure. No current safe deletions.

### 4.3 Session Metrics Pipeline (PnL, Drawdown, Risk Stats)

This pipeline computes and persists per-session metrics that underpin **risk monitoring** and **dashboard KPIs**.

#### 4.3.1 Core modules

*   apps/api/src/jobs/session-metrics/index.ts
    
    *   Job entrypoint used by scheduler.ts.
        
*   apps/api/src/jobs/session-metrics/runtime.ts
    
    *   Runtime loop:
        
        *   Fetches bar/session data from DB.
            
        *   Calls metrics calculation pipeline.
            
        *   Writes results back to DB.
            
*   apps/api/src/jobs/session-metrics/batch.ts
    
    *   Batch/backfill wrapper for running the pipeline over historical periods.
        
*   apps/api/src/jobs/session-metrics/populate-session-metrics.ts
    
    *   Core metric maths:
        
        *   PnL over time.
            
        *   Drawdown.
            
        *   Volatility-like measures.
            
        *   Exposure and other risk stats.
            
*   apps/api/src/jobs/session-metrics/types.ts
    
    *   Types:
        
        *   SessionMetricsJobContext
            
        *   SessionMetricsInputRow / SessionMetricsOutputRow
            
        *   Metric categories and feature flags.
            
*   Fixtures:
    
    *   apps/api/src/jobs/session-metrics/golden-days/\*
        
        *   Known-good “golden days” for regression.
            

#### 4.3.2 Data model

**Inputs:**

*   Raw or normalised bar/trade data from DB (see §2 Data Ingest & Storage).
    
*   Strategy/session identifiers:
    
    *   ORR session ID.
        
    *   Symbol.
        
    *   Timeframe / bar size.
        
    *   Strategy code (OSB/ORR/VWAP\_FT, etc.).
        

**Outputs:**

*   Session metrics rows in DB:
    
    *   PnL.
        
    *   Drawdown.
        
    *   Exposure.
        
    *   Supporting stats.
        

These metrics feed:

*   Risk engine thresholds and guardrails (see §4.5).
    
*   Dashboard KPIs:
    
    *   Worklist V2.
        
    *   Analytics.
        
    *   Historical performance views.
        

#### 4.3.3 Contracts integration

*   Uses the same session IDs, instrument IDs, and timestamps as:
    
    *   CanonicalTicket and CanonicalApprovedTicketView (see §3).
        
*   Exposed as:
    
    *   SessionMetricsDto via apps/api/src/routes/session-metrics.ts.
        

#### 4.3.4 Deletion / cleanup guidance

*   **KEEP:**runtime.ts, batch.ts, populate-session-metrics.ts, types.ts, index.ts – core PnL/risk metrics pipeline.
    
*   **KEEP:**golden-days/\* fixtures – critical for regression.Optionally move under a dedicated tests/fixtures/ namespace in future, but do **not** delete unless you explicitly accept losing regression reference data.
    

### 4.4 Strategy Engines (ORR, OSB, VWAP FT) & Engine Run Job

This layer runs live strategies, using configs + market data to produce **raw engine signals**, which then feed the risk engine and ticket pipeline.

We treat three key strategies as first-class citizens:

*   **Opening Range family** – ORR / OSB.
    
*   **VWAP First Touch** – VWAP\_FT.
    

#### 4.4.1 Engine run job (orchestration)

**Source:**

*   apps/api/src/jobs/engineRunJob.ts
    

**Responsibilities:**

*   Scheduled entrypoint that:
    
    *   Loads strategy configs via the strategy-config service (see §4.1).
        
    *   Fetches current market state (bars, sessions).
        
    *   Builds a strategy execution context (session, symbol, risk caps).
        
    *   Calls the strategy engine (see below).
        
    *   Feeds raw engine outputs into:
        
        *   Risk engine V2 (see §4.5).
            
        *   Ticket pipeline (see §4.6).
            

> **KEEP:** engineRunJob.ts – this is the core “generate signals” job.

#### 4.4.2 Strategy engine entrypoint (dispatch layer)

**Source:**

*   apps/api/src/services/strategy-engine/index.ts
    

**Responsibilities:**

*   Act as the **single entrypoint** for running strategies:
    
    *   Dispatch on StrategyCode (OSB, ORR, VWAP\_FT, etc.).
        
*   For each strategy:
    
    *   Validate/normalise config DTO.
        
    *   Call the specific engine implementation:
        
        *   ORR: services/strategy-engine/orr.ts
            
        *   OSB: services/strategy-engine/osb.ts
            
        *   VWAP FT: services/strategy-engine/vwapft.ts
            
    *   Return a typed list of engine signals:
        
        *   Direction.
            
        *   Size suggestion.
            
        *   Symbol / timeframe.
            
        *   Rationale / signal metadata.
            

#### 4.4.3 Opening Range family – ORR / OSB

**Design docs (math & intent):**

*   docs/PRISM\_APEX\_ORR\_V3\_DESIGN.md
    
*   docs/PRISM\_APEX\_OSB\_DESIGN.md
    

**Engine implementations (money logic):**

*   ORR:
    
    *   apps/api/src/strategy/orr/orr-v3.ts
        
    *   apps/api/src/strategy/orr/orr-v3.test.ts
        
*   OSB:
    
    *   apps/api/src/strategy/osb/osb.ts
        
    *   apps/api/src/strategy/osb/osb.test.ts
        

**Strategy engine integration:**

*   Dispatch:
    
    *   apps/api/src/services/strategy-engine/index.ts
        
*   ORR integration:
    
    *   apps/api/src/services/strategy-engine/orr.ts
        
*   OSB integration:
    
    *   apps/api/src/services/strategy-engine/osb.ts
        

**Config DTO + validation (what config “looks like”):**

*   DTOs:
    
    *   apps/api/src/dto/strategy-config/orr.ts
        
    *   apps/api/src/dto/strategy-config/osb.ts
        
*   Validators:
    
    *   apps/api/src/services/strategy-config/validators/orr.ts
        
    *   apps/api/src/services/strategy-config/validators/osb.ts
        

**Runtime configs:**

*   Live:
    
    *   configs/strategies/opening-session-breakout.json
        
*   Template (non-prod example):
    
    *   configs/strategies/opening-session-breakout.example.json
        

**Signals & indicators:**

*   Signals:
    
    *   packages/signals/src/osb.ts
        
*   Strategy wrapper:
    
    *   packages/strategies/src/osbBreakout.ts
        
    *   packages/strategies/tests/osbBreakout.spec.ts
        
*   Gating / operator risk:
    
    *   apps/api/src/lib/orrGate.ts
        
    *   apps/api/src/services/operatorRisk.ts
        
    *   apps/api/src/routes/dto/operatorRisk.ts
        
    *   apps/dashboard/src/lib/operatorRisk.ts
        
*   Backfill:
    
    *   apps/tickets/src/backfill-orr.ts
        
        *   One-off operational script to backfill legacy ORR tickets.
            

> This chain gives:**Config JSON → DTO → Validator → ORR/OSB engine → Risk → Ticketizer → Dashboards.**

#### 4.4.4 VWAP First Touch (VWAP\_FT)

**Design doc:**

*   docs/PRISM\_APEX\_VWAP\_FT\_DESIGN.md
    

**Engine implementation:**

*   Strategy:
    
    *   apps/api/src/strategy/vwap-ft/vwap-ft.ts
        
*   Tests:
    
    *   apps/api/src/strategy/vwap-ft/vwap-ft.test.ts
        

**Strategy engine integration:**

*   Entrypoint:
    
    *   apps/api/src/services/strategy-engine/vwapft.ts
        
*   Dispatch wiring:
    
    *   apps/api/src/services/strategy-engine/index.ts(switch on StrategyCode === "VWAP\_FT" or equivalent).
        

**Config DTO + validation:**

*   DTO:
    
    *   apps/api/src/dto/strategy-config/vwapft.ts
        
*   Validator:
    
    *   apps/api/src/services/strategy-config/validators/vwapft.ts
        

**Runtime configs:**

*   Live:
    
    *   configs/strategies/vwap-first-touch.json
        
*   Template:
    
    *   configs/strategies/vwap-first-touch.example.json
        

**Indicators & Yahoo data plumbing:**

*   VWAP indicator:
    
    *   packages/indicators/src/vwap.ts
        
    *   Tests: packages/indicators/\_\_tests\_\_/vwap.spec.ts
        
*   Yahoo data VWAP:
    
    *   packages/data-yahoo/src/vwap.ts
        
    *   Tests: packages/data-yahoo/test/vwap.test.ts
        
*   VWAP FT signal + strategy wrapper:
    
    *   packages/signals/src/vwapFT.ts
        
    *   packages/strategies/src/vwapFirstTouch.ts
        
    *   Tests: packages/strategies/tests/vwapFirstTouch.spec.ts
        

> Again, the chain is:**Config JSON → DTO → Validator → VWAP FT engine → Risk → Ticketizer → Dashboards.**

### 4.5 Risk Engine V2

Risk Engine V2 is the **safety gate** between raw strategy outputs and operator tickets.

**Sources:**

*   Primary implementation:
    
    *   apps/api/src/risk/risk-engine-v2.ts
        
*   Guards:
    
    *   apps/api/src/risk/guards/\*
        

**Responsibilities:**

*   Apply risk guardrails to raw strategy outputs:
    
    *   Position sizing rules.
        
    *   Max exposure and leverage constraints.
        
    *   Drawdown / loss limits.
        
*   Take engine signals and either:
    
    *   Approve with a final, risk-sanctioned size.
        
    *   Adjust parameters (size, direction) according to caps.
        
    *   Reject, with reasons.
        

**Implementation detail:**

*   Uses helpers such as:
    
    *   applyGuardWithSizing
        
    *   applyGuardWithoutSizing
        
*   Consumes:
    
    *   Strategy outputs from §4.4.
        
    *   Session metrics from §4.3.
        
    *   Account/risk config (limits/caps) from config layer.
        

**Outputs:**

*   Risk-approved actions ready for ticketization:
    
    *   Direction.
        
    *   Quantity.
        
    *   Instrument.
        
    *   Risk notes / guard reasons (optionally surfaced in dashboards).
        

> **Keep:** risk-engine-v2.ts and all guards – this is the core safety mechanism. There is no obvious v1 to retire in this branch.

### 4.6 Ticket Pipeline (Ticketizer + Engine Tickets)

This pipeline turns **risk-approved engine outputs** into **persistent operator tickets** with a clear lifecycle.

#### 4.6.1 Core modules

*   Job wrapper:
    
    *   apps/api/src/jobs/ticketizer.ts
        
*   Orchestrator:
    
    *   apps/api/src/services/tickets/engineTicketsOrchestrator.ts
        
*   Store:
    
    *   apps/api/src/services/tickets/engineTicketsStore.ts
        
*   Mapping helpers:
    
    *   apps/api/src/services/tickets/engineTickets.ts
        
*   HTTP route:
    
    *   apps/api/src/routes/tickets.ts
        

#### 4.6.2 Responsibilities

*   ticketizer.ts (job):
    
    *   Periodically:
        
        *   Pull risk-approved engine outputs (from §4.5).
            
        *   Call engineTicketsOrchestrator.
            
        *   Write results into DB.
            
*   engineTicketsOrchestrator.ts:
    
    *   Orchestrate:
        
        *   Fetch engine outputs (already risk-checked).
            
        *   Map engine objects into canonical ticket objects.
            
        *   Persist via engineTicketsStore.
            
    *   Ensure idempotency so repeated runs do not duplicate tickets.
        
*   engineTicketsStore.ts:
    
    *   Handle:
        
        *   Insert/update of engine tickets in DB.
            
        *   Dedupe/idempotency semantics.
            
        *   Metadata enrichment:
            
            *   Strategy IDs.
                
            *   Session IDs.
                
            *   Timestamps.
                
            *   Source = ENGINE.
                
*   engineTickets.ts:
    
    *   Define mapping logic from low-level engine representation to:
        
        *   CanonicalTicket
            
        *   CanonicalApprovedTicketView
            
*   routes/tickets.ts:
    
    *   HTTP surface for tickets:
        
        *   Returns CanonicalTicket / CanonicalApprovedTicketView arrays.
            
    *   Serves:
        
        *   /api/tickets
            
        *   /api/worklist (Worklist V2 view over canonical tickets).
            

#### 4.6.3 Data model

**Inputs:**

*   Risk-approved engine outputs from Risk Engine V2 (see §4.5).
    
*   Session and strategy context:
    
    *   Strategy code (OSB/ORR/VWAP\_FT).
        
    *   Session ID.
        
    *   Instrument.
        
    *   Operator account.
        

**Outputs:**

*   Ticket rows in DB, aligned to §3 contracts:
    
    *   CanonicalTicket
        
    *   CanonicalApprovedTicketView
        
    *   CanonicalTicketStatus / CanonicalTicketSource
        
*   JSON responses consumed by dashboards:
    
    *   Worklist V2 (A3 cockpit).
        
    *   Tickets dashboards.
        

> **Keep:** ticketizer.ts, engineTicketsOrchestrator.ts, engineTicketsStore.ts, engineTickets.ts, routes/tickets.ts – this is the live ticketisation path.

### 4.7 End-to-End Dataflow Summary

This is the **canonical engine flow** we treat as non-negotiable:

1.  **Strategy config is defined and validated**
    
    *   configs/strategies/\*.json → dto/strategy-config/\*.ts → services/strategy-config/\* → /api/strategy-config.
        
2.  **Scheduler runs the engine jobs**
    
    *   jobs/scheduler.ts is the single entrypoint for timed engine jobs.
        
3.  **Session metrics are computed**
    
    *   jobs/session-metrics/\*:
        
        *   Ingested bars/trades → populate-session-metrics.ts → DB metrics tables.
            
    *   Exposed via routes/session-metrics.ts as SessionMetricsDto.
        
4.  **Strategy engines generate raw signals**
    
    *   jobs/engineRunJob.ts:
        
        *   Read configs + market data.
            
        *   Call services/strategy-engine/index.ts.
            
    *   Strategy implementations:
        
        *   ORR / OSB: strategy/orr/orr-v3.ts, strategy/osb/osb.ts, plus services/strategy-engine/{orr,osb}.ts.
            
        *   VWAP FT: strategy/vwap-ft/vwap-ft.ts, plus services/strategy-engine/vwapft.ts.
            
5.  **Risk Engine V2 guards signals**
    
    *   risk/risk-engine-v2.ts + risk/guards/\*:
        
        *   Use session metrics + risk config to approve/adjust/reject signals.
            
6.  **Ticket pipeline converts safe signals into operator tickets**
    
    *   jobs/ticketizer.ts + services/tickets/\*:
        
        *   Risk-approved engine outputs → DB ticket rows.
            
    *   routes/tickets.ts / /api/worklist:
        
        *   Expose CanonicalTicket / CanonicalApprovedTicketView to:
            
            *   Worklist V2 dashboard.
                
            *   Tickets dashboard surfaces.
                

### 4.8 Deletion / Cleanup Guidance (Section 4 Scope Only)

At this stage, nothing in the **engine/jobs/strategy/risk/ticket** layer is clearly dead. Guidance:

*   **KEEP – non-negotiable:**
    
    *   jobs/scheduler.ts and tests.
        
    *   jobs/session-metrics/\* (including golden-days/\*).
        
    *   risk/risk-engine-v2.ts and all guards.
        
    *   jobs/engineRunJob.ts, services/strategy-engine/\*, strategy/\* for ORR/OSB/VWAP FT.
        
    *   jobs/ticketizer.ts, services/tickets/\*, routes/tickets.ts.
        
    *   dto/strategy-config/\*, services/strategy-config/\*, routes/strategy-config.ts.
        
*   **KEEP but can be relocated (for cleanliness):**
    
    *   apps/api/src/jobs/session-metrics/golden-days/\*→ could be moved under a dedicated tests/fixtures/ namespace.
        
    *   apps/tickets/src/backfill-orr.ts→ can be moved to scripts/ or ops/ if you want the API tree cleaner.
        
    *   Any engine replay tooling (e.g. engineReplayCli.ts, engineReplayRunner.ts if present)→ may be moved to dev-tools/ or scripts/, but are valuable for debugging.
        
*   **OPTIONAL – example config files:**
    
    *   configs/strategies/\*example.json
        
        *   These are templates, not live configs.
            
        *   You can:
            
            *   **Keep** them and document clearly that they are templates; or
                
            *   **Delete** them if you want fewer files, **once** you are confident every live strategy has a real config and onboarding no longer relies on examples.

---

5\. API Surface & Routes (Operator & Engine Endpoints)
----------------------------------------------------

This section documents the **public-facing API surface** of the Prism Apex engine layer and how it maps to the canonical contracts defined in §3 and the pipelines in §4.All endpoints live under /apps/api/src/routes unless explicitly noted.

### 5.1 Routing Architecture Overview

LayerResponsibilityKey Files**Fastify Bootstrap**Creates server, registers all route modules.apps/api/src/index.ts**Route Modules**Define HTTP verbs + paths. 1:1 with business domain (area = jobs output or dashboard surface).apps/api/src/routes/\*.ts**DTO Schemas**Zod schemas + TypeScript types shared with dashboards.apps/api/src/routes/dto/\*.ts**Middleware**Logging, error trapping, auth stubs (if enabled).apps/api/src/middleware/\*

All routes return JSON objects validated by their DTO schemas.**No untyped payloads** are allowed in V2 — every route must return a type imported from @prism-apex/shared or apps/api/src/routes/dto.

### 5.2 Core Engine Routes (used by Dashboards)

#### 5.2.1 GET /api/worklist

**Purpose**Primary operator endpoint for Worklist V2 and Tickets cockpits.Returns a list of tickets with status, risk bucket, score, and session metadata.

**Implementation files**

*   apps/api/src/routes/worklist.ts – route definition.
    
*   apps/api/src/routes/dto/canonicalTicketView.ts – Zod schema and type.
    
*   Fallback mock source: apps/api/src/lib/worklistMock.ts (until engine wired).
    

**Flow**

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   DB / engineTicketsStore          ↓  CanonicalTicket          ↓  canonicalTicketViewSchema          ↓  WorklistV2 dashboard   `

**Contracts**

*   Input: none (query filters TBD for V3).
    
*   Output: CanonicalApprovedTicketView\[\].
    

**Next steps**

*   Replace mock data with engine tickets (see §4.6).
    
*   Add filter parameters (symbol, status, strategy).
    

#### 5.2.2 GET /api/tickets

**Purpose**Provide a full ticket history and execution view for operators.

**Implementation files**

*   apps/api/src/routes/tickets.ts
    
*   Uses engineTicketsStore.ts for persistence and CanonicalTicket for shape.
    

**Output**

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   {    tickets: CanonicalTicket[];    meta: { count: number; lastUpdated: string };  }   `

**Consumers**

*   Dashboard Tickets page.
    
*   System Health panel for ticket counts.
    

**Deletion guidance** – KEEP; this is canonical.

#### 5.2.3 GET /api/session-metrics

**Purpose**Expose session-level PnL and risk statistics to dashboards and analytics.

**Implementation files**

*   apps/api/src/routes/session-metrics.ts
    
*   apps/api/src/jobs/session-metrics/runtime.ts (producer).
    
*   DTO: SessionMetricsDto from packages/shared/src/sessions.ts.
    

**Output**

SessionMetricsDto\[\] for the current and recent sessions.

**Consumers**

*   Analytics A3 dashboard.
    
*   Status page (session health).
    
*   Risk engine internal checks.
    

#### 5.2.4 GET /api/market

**Purpose**Deliver a single-symbol session snapshot (session status, OR/ATR/VWAP context) without fetching the entire batch payload.

**Implementation files**

*   apps/api/src/routes/market.ts.
*   Shares DTOs with session-metrics and symbols routes.

**Consumers**

*   MarketData cockpit quick-looks.
*   Ops tooling that needs a concise context call.

#### 5.2.5 GET /api/strategy-config

**Purpose**Expose current strategy configurations for operator review and future edits.

**Implementation files**

*   apps/api/src/routes/strategy-config.ts
    
*   Uses service apps/api/src/services/strategy-config/index.ts.
    
*   DTOs from apps/api/src/dto/strategy-config/\*.ts.
    

**Output**

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   {    strategies: StrategyConfigDto[];    version: string;  }   `

**Consumers**

*   Strategy Lab V2.
    
*   Engine replay CLI (defaults pull configs from here).
    

#### 5.2.6 GET /api/risk-status (Operator Risk Summary)

**Purpose**Surface real-time risk summary to dashboard headers and alerts.

**Implementation files**

*   apps/api/src/routes/risk.ts (if present).
    
*   DTO: OperatorRiskDto from apps/api/src/routes/dto/operatorRisk.ts.
    
*   Source: risk-engine-v2.ts outputs + session metrics.
    

**Output**

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   {    summary: OperatorRiskDto;    timestamp: string;  }   `

**Consumers**

*   Worklist header risk bar.
    
*   System Status A3 page.
    

**Status**

*   In branch 2025-12 the route exists but stubbed to mock data.
    
*   Next step: connect to live risk engine outputs.
    

### 5.3 Supporting Routes (System / Health / Jobs)

#### 5.3.1 GET /api/status

*   Returns EngineStatusDto and AccountDto aggregated from:
    
    *   apps/api/src/dto/engine-status.ts
        
    *   apps/api/src/dto/account.ts
        
*   Feeds System A3 dashboard and CI health checks.
    

#### 5.3.2 POST /api/jobs/run

*   Manual trigger for engine jobs (useful for testing and ops).
    
*   Dispatches via scheduler.ts.
    
*   Auth stubbed today; future authN required.
    
*   Keep as non-prod until role-based access is in place.
    

#### 5.3.3 GET /api/healthz

*   Kubernetes / Docker healthcheck.
    
*   Lightweight; no DB load.
    
*   Mandatory for deployment.
    
#### 5.3.4 GET /api/ready

*   apps/api/src/routes/ready.ts.
*   Readiness probe for Compose/Kubernetes; ensures backing stores/DB are initialised.

#### 5.3.5 GET /api/system.jobs

*   apps/api/src/routes/system.jobs.ts.
*   Scheduler/job telemetry consumed by Status and Alerts.

#### 5.3.6 GET /api/system.alerts

*   apps/api/src/routes/system.alerts.ts.
*   Canonical alert stream for the Alerts page (severity/state filters).

#### 5.3.7 GET /api/system.telemetry

*   apps/api/src/routes/system.telemetry.ts.
*   Runtime metrics (duration, ingest gaps, errors) for Status/Alerts dashboards.

#### 5.3.8 GET /api/health/yahoo

*   apps/api/src/routes/health.yahoo.ts (mirrors `/health/yahoo` for direct access).
*   Epic 1 made the `/api/*` variant the canonical operator surface so dashboards can fetch ingest lag data through the Nginx proxy.
*   Consumers: Tickets, MarketData, Status, Alerts (ingest lag widgets).

#### 5.3.9 GET /api/market/symbols

*   apps/api/src/routes/market.ts (delegates to the legacy `/market/symbols` handler).
*   Added in Epic 1 so MarketData’s filters work under the `/api` proxy.
*   Returns `{ symbols: string[] }`.

#### 5.3.10 GET /api/market/sessions

*   Same module as above; alias of `/market/sessions`.
*   Returns trading windows (RTH/ETH) for UI chips.

#### 5.3.11 `/api/telemetry/*`

*   apps/api/src/routes/telemetry.ts now serves both `/telemetry/*` and `/api/telemetry/*`.
*   Endpoints:
    *   `/api/telemetry/positions?accountId=...`
    *   `/api/telemetry/account?accountId=...`
    *   `/api/telemetry/fills?accountId=...&date=YYYY-MM-DD`
*   Backed by `apps/api/src/store/telemetry.ts`; consumed by Positions, Status, and ops tooling without leaving the `/api` namespace.

#### 5.3.8 GET /alerts/peek & POST /alerts/ack

*   apps/api/src/routes/alerts.ts.
*   Lightweight incident endpoints used by the STOP block copy button + ops tooling.

#### 5.3.12 GET /api/reports.dashboard

*   apps/api/src/routes/reports.dashboard.ts.
*   Provides dashboard-level telemetry snapshots for export/CI.


### 5.4 Internal Routes (Engine ↔ Jobs integration)

These are registered only in dev/test profiles and allow the engine to pull/push data internally.

RoutePurposeVisibility/api/dev/engine-outputsDump latest raw signals (before risk).Dev-only/api/dev/ticket-replayReplay tickets into engine for debug.Dev-only/api/dev/session-dumpExport session metrics snapshot.Dev-only

All flagged with if (process.env.NODE\_ENV !== 'production').

Deletion guidance: Keep for diagnostics; move to /routes/dev/ namespace for clarity.

### 5.5 Contracts and Type Safety

Every route exports or imports a Zod schema and TypeScript type.

ContractLocationConsumed ByCanonicalTicketpackages/shared/src/tickets.tsAPI + DashboardsCanonicalApprovedTicketViewapps/api/src/routes/dto/canonicalTicketView.tsWorklist V2SessionMetricsDtopackages/shared/src/sessions.tsAnalytics/StatusOperatorRiskDtoapps/api/src/routes/dto/operatorRisk.tsRisk barStrategyConfigDtoapps/api/src/dto/strategy-config/types.tsStrategy LabEngineStatusDto, AccountDtoapps/api/src/dto/\*.tsSystem Health

Rule: **no endpoint may invent fields**; all additions must originate from shared contracts (§3).

### 5.6 Deletion / Cleanup Guidance (Section 5 Scope Only)

**Keep canonical routes**

*   worklist.ts
    
*   tickets.ts
    
*   session-metrics.ts
    
*   market.ts
    
*   strategy-config.ts
    
*   risk.ts (or risk-status equivalent)
    
*   status.ts
    
*   health.ts / ready.ts
    
*   system.jobs.ts / system.alerts.ts / system.telemetry.ts
    
*   alerts.ts (peek/ack)
    
*   reports.dashboard.ts
    

**Optional relocations**

*   Move any dev/test routes to routes/dev/.
    
*   Keep /jobs/run but gate it behind auth in prod.
    

**Safe to delete after V2 hardening**

*   worklistMock routes or inline mock arrays once Worklist V2 is engine-backed.
    
*   Legacy V1 routes (/v1/\*) if still present.
    
*   Any unused DTO files not referenced by routes or dashboards (after grep).
    

### 5.7 Next Steps

1.  Confirm every route returns a Zod-validated payload matching §3 contracts.
    
2.  Wire Worklist and Risk routes to live engine jobs instead of mocks.
    
3.  Add OpenAPI spec generation from Zod schemas for CI validation.
    
4.  Deprecate any V1 endpoints still registered under /api/v1/\*.

---

6\. Dashboard Surfaces & Wiring (A3 Operator UX)
------------------------------------------------

This section describes how the **A3 dashboard surfaces** are wired to the engine, which contracts they consume, and which files are now treated as **canonical** versus **legacy**.

Scope:

*   apps/dashboard – operator-facing SPA.
    
*   A3 pages: **Worklist V2, Tickets, Markets, Analytics, Strategy Lab, System/Status**.
    
*   Shared layout + UI primitives (ExecutionShell, Filters bar, table, detail panels).
    

All paths below are relative to repo root.

### 6.1 Dashboard Architecture Overview

**Entry & layout**

*   apps/dashboard/src/App.tsx
    
    *   Registers React Router routes (e.g. /worklist-v2, /tickets, /markets, /analytics, /strategy-lab, /status).
        
    *   Imports ExecutionShell as the outer chrome for most operator pages.
        
*   apps/dashboard/src/layouts/ExecutionShell.tsx
    
    *   Single A3-style app shell:
        
        *   App header (brand, environment, session selector, risk bar stub).
            
        *   Main content area.
            
        *   Optional right-rail for system status or alerts.
            
    *   **Rule:** All pages must sit inside this shell. No page-specific “mini-shells”.
        

**Shared UI primitives**

*   apps/dashboard/src/ui/Card.tsx – Card / CardBody wrapper.
    
*   apps/dashboard/src/ui/Button.tsx – Primary / secondary, small/medium/large variants.
    
*   apps/dashboard/src/ui/Badge.tsx – Status tags (PENDING, FILLED, RISK, etc.).
    
*   apps/dashboard/src/ui/Kpi.tsx – Headline KPIs (PnL, DD, hit rate, etc.).
    
*   apps/dashboard/src/ui/FiltersBar.tsx – Shared filter strip across pages.
    
*   apps/dashboard/src/ui/DataTable.tsx – Shared A3 table component:
    
    *   Fixed header row.
        
    *   Scrollable body.
        
    *   Responsive column widths (no horizontal clipping in A3 layouts).
        

**Styling**

*   A3 styles live under:
    
    *   apps/dashboard/src/styles/a3-core.css (or equivalent core A3 styles file).
        
    *   apps/dashboard/src/styles/worklist-v2.css
        
    *   apps/dashboard/src/styles/markets-v2.css
        
    *   apps/dashboard/src/styles/analytics-v2.css, etc.
        
*   The **A3 pattern** (gradient background, central cockpit, header + KPI + table + details) is the visual baseline for all operator pages.
    

**Safe deletions (architecture level)**

*   Any **page-specific “shell” components** that duplicate ExecutionShell can be:
    
    *   **Deprecated** and in a later pass **deleted** once usage is removed.
        
*   Any **old “A2” mock HTML pages** under apps/dashboard/src/pages/ or public/ not used by routes should be treated as legacy and removed once SOT is fully adopted.
    

### 6.2 Worklist V2 (Primary Operator Cockpit)

**Purpose**

Core operator cockpit showing **engine tickets**, their **status**, and **actionable details**. This is the **primary surface** for day-to-day operation.

**Key files**

*   apps/dashboard/src/pages/WorklistV2.tsx
    
*   apps/dashboard/src/styles/worklist-v2.css
    
*   Shared:
    
    *   ExecutionShell (../layouts/ExecutionShell)
        
    *   FiltersBar, DataTable, Kpi, Badge, Card
        

**Data sources**

*   GET /api/worklist → CanonicalApprovedTicketView\[\] (see §5.2.1 & §3).
    
*   Optionally:
    
    *   GET /api/session-metrics for session-level KPIs.
        
    *   GET /api/risk-status for risk bar in the header.
        

**Structure**

Typical layout:

*   **Header row:**
    
    *   Title (“Worklist V2 – Engine Tickets”).
        
    *   Environment badge (SIM / PROD).
        
    *   Risk summary (if wired).
        
*   **Filters strip:**
    
    *   Symbol, strategy, status, source, risk bucket.
        
*   **KPI strip:**
    
    *   Session PnL, Drawdown, Open tickets count, Breached risk guardrails.
        
*   **Main content area:**
    
    *   Left: DataTable with tickets (≈ 70–75% width).
        
    *   Right: Ticket **details panel** (≈ 25–30% width) showing:
        
        *   Ticket lifecycle state.
            
        *   Strategy + session metrics.
            
        *   Risk notes / guard reasons.
            
        *   Operator notes (if implemented).
            

**Contracts**

*   **Primary:** CanonicalApprovedTicketView (ticket-level view).
    
*   **Secondary:** CanonicalTicketStatus, CanonicalTicketSource enums from packages/shared/src/tickets.ts (or equivalent).
    

**Mock vs live**

*   Worklist V2 currently supports fallback on a **mock worklist** (engine not wired or API down):
    
    *   The mock lives in apps/dashboard/src/lib/worklistMock.ts (or similar).
        
*   Final V2 state:
    
    *   **Always** prefer live /api/worklist.
        
    *   Mock only used in explicit “demo” or “offline mode” flag.
        

**Safe deletions (Worklist)**

*   Worklist.tsx (non-V2) page, if still present and not routed – **delete** after confirming no nav links.
    
*   Any old “Execution” pages that show outdated ticket tables but are not used in router – **delete**.
    
*   Embedded static ticket arrays used only for early prototyping – **delete** once the mock file path is the single source of demo data.
    

### 6.3 Tickets Page (History / Audit Cockpit)

**Purpose**

Historical and audit-focused view over tickets.Worklist V2 is the **operational now** view; **Tickets** is the **historical / audit** surface.

**Key files**

*   apps/dashboard/src/pages/Tickets.tsx
    
*   Shared:
    
    *   ExecutionShell
        
    *   DataTable, FiltersBar, Card
        

**Data sources**

*   GET /api/tickets → { tickets: CanonicalTicket\[\]; meta: { … } }
    
*   Optional:
    
    *   GET /api/session-metrics for per-session rollups in header.
        

**Structure**

*   Header with filters (symbol, strategy, timeframe).
    
*   Table view:
    
    *   One row per ticket, including:
        
        *   Created / filled timestamps.
            
        *   Strategy / symbol / side / size.
            
        *   PnL outcome (if available).
            
*   Detail panel:
    
    *   Shows full ticket lifecycle and associated risk notes.
        

**Contracts**

*   CanonicalTicket is the core contract.
    
*   Same enums as Worklist V2: status, source, side.
    

**Safe deletions (Tickets)**

*   “Legacy Tickets” pages using bespoke ticket shapes (pre-canonical) can be **deleted** once:
    
    *   Router no longer references them.
        
    *   All tables use CanonicalTicket.
        

### 6.4 Markets A3 (Session Cockpit)

**Purpose**

Session / market cockpit focused on **instruments and sessions**, not tickets.Shows how the **current market state** relates to strategy sessions and risk.

**Key files**

*   apps/dashboard/src/pages/MarketData.tsx (or MarketsV2.tsx, depending on branch naming).
    
*   apps/dashboard/src/styles/markets-v2.css – contains .markets-v2-root, header, table, details styles (CSS similar to the snippet with markets-v2-root, markets-v2-header, etc.).
    
*   Shared:
    
    *   ExecutionShell, FiltersBar, DataTable, Card, Kpi.
        

**Data sources**

*   Typically combines:
    
    *   GET /api/session-metrics for per-symbol/session metrics.
        
    *   Future endpoint (e.g. /api/markets) for live bar/quote snapshots.
        
    *   Strategy state (e.g. which sessions are active) via /api/strategy-config.
        

**Structure**

CSS intention (matching markets-v2-root snippet):

*   Root container with fade-in animation.
    
*   Header with session selector, symbol filter, risk banner.
    
*   Table of instruments / sessions (≈ 75% width).
    
*   Right-hand detail panel with:
    
    *   Current session metrics.
        
    *   Active strategies.
        
    *   Risk guardrail status for that symbol/session.
        

**Contracts**

*   SessionMetricsDto for metrics.
    
*   Future MarketSnapshotDto (to be defined) for live bars/quotes.
    

**Safe deletions (Markets)**

*   Old, flat “MarketData” pages that display raw Yahoo bars without A3 layout – **delete** once the A3 markets page is live.
    
*   Any static HTML/CSS prototypes for markets A2 – **delete** after confirming styles migrated into markets-v2.css.
    

### 6.5 Analytics A3

**Purpose**

Analytics cockpit for **performance analysis** over periods (days, weeks, months) and **multi-strategy** views.

**Key files**

*   apps/dashboard/src/pages/Analytics.tsx
    
*   apps/dashboard/src/styles/analytics-v2.css
    
*   Shared:
    
    *   ExecutionShell
        
    *   Kpi, Card, DataTable
        
    *   Charting component(s) (e.g. AnalyticsChart.tsx if present)
        

**Data sources**

*   GET /api/session-metrics – base PnL / DD / exposure curves.
    
*   Potential future:
    
    *   /api/trades for trade-level analytics.
        
    *   /api/strategy-config for grouping by strategy.
        

**Structure**

*   Header with:
    
    *   Date range selector.
        
    *   Strategy / symbol drop-downs.
        
*   KPI strip:
    
    *   Total PnL, Max DD, Sharpe-lite, win rate.
        
*   Charts:
    
    *   Equity curve.
        
    *   Drawdown curve.
        
    *   Histogram of returns.
        
*   Tables:
    
    *   Per-strategy performance.
        
    *   Per-symbol performance.
        

**Contracts**

*   SessionMetricsDto as primary.
    
*   Future TradeDto and StrategyPerformanceDto (once added) – must be added to §3 & §5 when implemented.
    

**Safe deletions (Analytics)**

*   Legacy analytics or “demo” pages that use bespoke metric structures and don’t map to SessionMetricsDto – **delete** once the A3 Analytics page is wired.
    

### 6.6 Strategy Lab

**Purpose**

Strategy configuration and inspection cockpit.Initially **read-only**, showing current configs and design notes. Later, may support editing.

**Key files**

*   apps/dashboard/src/pages/StrategyLab.tsx
    
*   apps/dashboard/src/styles/strategy-lab.css
    
*   Shared:
    
    *   ExecutionShell, Card, DataTable, Badge.
        

**Data sources**

*   GET /api/strategy-config → StrategyConfigDto\[\].
    
*   Cross-links to docs:
    
    *   docs/PRISM\_APEX\_ORR\_V3\_DESIGN.md
        
    *   docs/PRISM\_APEX\_OSB\_DESIGN.md
        
    *   docs/PRISM\_APEX\_VWAP\_FT\_DESIGN.md
        

**Structure**

*   Strategy list table:
    
    *   Columns: Strategy code, symbol/universe, session, sizing model, risk caps.
        
*   Detail panel:
    
    *   Renders config JSON (or formatted), plus links to design docs.
        
*   Future:
    
    *   “Test run” / replay actions linking to engine replay tools (see §4.4).
        

**Contracts**

*   StrategyConfigDto and specific DTOs for ORR/OSB/VWAP\_FT (see §4).
    

**Safe deletions (Strategy Lab)**

*   Old config-only dashboards that read directly from JSON files in the browser – **delete** once everything goes through /api/strategy-config.
    
*   Any hard-coded “mock strategies” not present in configs/strategies/\*.json – **delete**.
    

### 6.7 System / Status Dashboard

**Purpose**

High-level **system health** and **account status** surface for operators and SRE-style checks.

**Key files**

*   apps/dashboard/src/pages/Status.tsx
    
*   apps/dashboard/src/styles/status-v2.css
    
*   Shared:
    
    *   ExecutionShell, Card, Kpi, Badge.
        

**Data sources**

*   GET /api/status → EngineStatusDto, AccountDto.
    
*   GET /api/healthz – mapped to a simple status widget.
    
*   GET /api/session-metrics (optional summary).
    

**Structure**

*   Environment banner (SIM/PROD, git SHA, build time).
    
*   KPIs:
    
    *   Engine job health (last success, failures).
        
    *   Account equity / margin utilisation.
        
    *   Recent errors or warnings.
        
*   Tables / lists:
    
    *   Recent failed jobs (from §4.1 scheduler DB state).
        
    *   Connected data feeds (Yahoo, broker, etc.).
        

**Contracts**

*   EngineStatusDto, AccountDto, JobStatus (indirectly via status routes).
    

**Safe deletions (Status)**

*   Any separate “Health” or “System” pages that duplicate the above with ad-hoc JSON – **delete** once the Status page is the single health surface.
    

### 6.8 Common A3 Layout Rules & Clean-Up Invariants

**A3 layout rules**

1.  **Single shell:** All pages must use ExecutionShell.
    
    *   No nested shells inside pages.
        
2.  **Table + detail split:**
    
    *   Default: 70–75% width for the table, 25–30% for details.
        
3.  **Fixed headers:**
    
    *   Table header row must always remain visible.
        
4.  **No horizontal scroll for core columns:**
    
    *   Use column width tuning and responsive layouts instead of forcing scroll.
        
5.  **Consistent typography & tokens:**
    
    *   Colours, fonts, paddings, margins must use shared tokens / CSS variables in A3 styles.
        

**Safe deletions (global dashboard clean-up)**

Once the A3 implementation is wired to the engine:

*   Delete:
    
    *   Old non-V2 pages: Worklist.tsx, OldTickets.tsx, AnalyticsV1.tsx, Markets.tsx, etc., if not referenced by router.
        
    *   A2 HTML prototypes in public/ or under apps/dashboard/src/pages that are not imported anywhere.
        
    *   Duplicate shells or layout wrappers that attempt to re-implement ExecutionShell.
        
*   Keep:
    
    *   A single mock data file per major surface (Worklist, Markets, Analytics) for demo/offline mode, clearly marked as such.

---

7\. Tests & Quality Gates (CI, Lint, Type Safety)
-------------------------------------------------

This section defines how Prism Apex enforces correctness and safety across the stack:

*   Unit and integration tests (engine, strategies, data, dashboards).
    
*   End-to-end (E2E) smoke tests (Playwright).
    
*   Static analysis (TypeScript, ESLint).
    
*   CI workflows and repo-level guards.
    

Treat this as the **single source of truth** for how code is validated before it reaches an operator.

> All paths below are from repo root: prism-apex-tool-feat-remove-pnl-beta-banner/….

### 7.1 Test strategy overview

**Test layers:**

1.  **Unit / domain tests**
    
    *   Under \_\_tests\_\_/ or tests/ in each package.
        
    *   Focus on math, signals, strategy decisions, and data pipelines.
        
2.  **API / integration tests**
    
    *   Under apps/api/src/\*\*/\_\_tests\_\_/.
        
    *   Validate routing, job orchestration, and session metrics/tickets plumbing.
        
3.  **Dashboard tests**
    
    *   Under apps/dashboard/src/\*\*/\_\_tests\_\_/.
        
    *   Assert that each A3 surface at least renders and wires to the right feature flags / routes.
        
4.  **E2E smoke tests**
    
    *   Playwright-based, in apps/e2e/tests/.
        
    *   Validate that the deployed dashboard boots and the key nav flows work.
        
5.  **Static analysis**
    
    *   **TypeScript**: tsconfig.base.json + per-app configs.
        
    *   **ESLint**: .eslintrc.cjs and ESLint configs under packages/apps.
        
    *   **Prettier**: .prettierrc and lint:fix / formatting scripts.
        
6.  **CI gates**
    
    *   **CI workflow**: .github/workflows/ci.yml.
        
    *   **Dashboard CI**: .github/workflows/dashboard-ci.yml.
        
    *   **Repo guard**: .github/workflows/repo-guard.yml (size & branch hygiene).
        

Deletion guidance (high level):

*   **KEEP**: All tests and configs described here are part of the safety net.
    
*   Delete only when you know a test is truly obsolete relative to the V2 engine and dashboards, and ideally replace it with a more accurate one.
    

### 7.2 Root smoke & spec tests (cross-cutting invariants)

**Location**

*   \_\_tests\_\_/smoke/smoke.spec.ts
    
*   \_\_tests\_\_/spec (if expanded in future – currently primary is the smoke suite)
    

**Purpose**

*   High-level regression guard for core invariants, e.g.:
    
    *   Basic module graph loads without runtime errors.
        
    *   Key packages can be imported.
        
    *   No accidental breaking changes in exports that other modules depend on.
        

These are the **“last line of defence”** before a branch is considered safe.

**How they’re run**

*   Via root scripts in package.json:
    
    *   test: runs unit and smoke tests with Vitest.
        
    *   test:ci: CI variant with stricter settings (no watch mode, etc.).
        

**Deletion guidance**

*   **KEEP**: smoke/spec tests.
    
*   Only refactor if you **replace** them with equivalent or stronger cross-cutting tests.
    
*   Do not delete without introducing a comparable “top-level smoke” layer.
    

### 7.3 API / engine tests (jobs, session metrics, Yahoo, PnL)

**Key locations**

*   Job scheduler & jobs:
    
    *   apps/api/src/jobs/\_\_tests\_\_/scheduler.test.ts
        
    *   apps/api/src/jobs/session-metrics/\_\_tests\_\_/session-metrics.job.test.ts
        
*   Yahoo / ingest / data pipeline:
    
    *   packages/data-yahoo/\_\_tests\_\_/yahoo.client.test.ts
        
    *   packages/data-yahoo/\_\_tests\_\_/yahoo.pipeline.test.ts
        
*   Metrics, PnL, and aggregations:
    
    *   packages/metrics/\_\_tests\_\_/percentiles.test.ts
        
    *   packages/metrics/\_\_tests\_\_/rolling-window.test.ts
        
    *   packages/reporting/\_\_tests\_\_/equity-curve.test.ts
        
    *   packages/reporting/\_\_tests\_\_/drawdown.test.ts
        
*   Runtime / rules:
    
    *   packages/runtime/\_\_tests\_\_/config-loader.test.ts
        
    *   packages/rules/\_\_tests\_\_/guards.test.ts
        

**Purpose**

*   Validate that:
    
    *   **Job scheduler** correctly discovers and runs jobs (see §4 Engine & Jobs).
        
    *   **Session metrics** pipeline computes expected PnL/drawdown based on golden fixtures (see §4.2).
        
    *   **Yahoo ingest** normalises raw data into internal bar format correctly (see §2 Data Ingest & Storage).
        
    *   **Metrics & reporting** computations (drawdown, equity curves, rolling stats) match known values.
        

**Golden-day fixtures**

*   Located under:
    
    *   apps/api/src/jobs/session-metrics/golden-days/…
        

Used as **canonical regression** for session metrics and PnL calculations.

**Deletion guidance**

*   **KEEP**:
    
    *   All API job tests.
        
    *   All metrics / reporting / Yahoo tests.
        
    *   All golden-day fixtures.
        
*   If you ever reduce fixture volume (for size), **archive** reduced fixtures under a tests/fixtures/ style directory instead of deleting them entirely.
    
*   Nothing in this layer is “safe to delete” without losing confidence in PnL/risk maths.
    

### 7.4 Strategy tests (ORR, OSB, VWAP FT, signals)

This layer asserts the **money logic** of strategies.

**Locations**

*   Strategy logic tests:
    
    *   packages/strategies/tests/osbBreakout.spec.ts
        
    *   packages/strategies/tests/vwapFirstTouch.spec.ts
        
*   Signals & indicators:
    
    *   packages/signals/\_\_tests\_\_/osbSignals.test.ts
        
    *   packages/signals/\_\_tests\_\_/vwapFTSignals.test.ts
        
    *   packages/indicators/\_\_tests\_\_/vwap.spec.ts
        
*   Yahoo VWAP support:
    
    *   packages/data-yahoo/test/vwap.test.ts
        

**Purpose**

*   Lock down the behaviour described in:
    
    *   docs/PRISM\_APEX\_ORR\_V3\_DESIGN.md
        
    *   docs/PRISM\_APEX\_OSB\_DESIGN.md
        
    *   docs/PRISM\_APEX\_VWAP\_FT\_DESIGN.md
        
*   For each strategy family (see §4.2, §4.3):
    
    *   Confirm the indicator maths (VWAP, ranges).
        
    *   Confirm signal generation logic (breakouts, first touch).
        
    *   Confirm config + parameters behave as expected when varied.
        

**Deletion guidance**

*   **KEEP** all strategy tests; they are directly tied to real risk and PnL.
    
*   If you deprecate a strategy (e.g. an older ORR version), only delete the tests **after**:
    
    *   Removing the engine code.
        
    *   Cleaning up configs.
        
    *   Updating documentation to reflect the deprecation.
        

### 7.5 Ticketizer / ticket pipeline tests

**Locations**

*   Ticketization and ticket store tests:
    
    *   packages/ticketizer/\_\_tests\_\_/ticketizer.job.test.ts
        
    *   packages/ticketizer/\_\_tests\_\_/engineTicketsStore.test.ts
        
    *   packages/ticketizer/\_\_tests\_\_/canonicalTicketsMapping.test.ts
        

**Purpose**

*   Ensure that the pipeline defined in §4.5:
    
    *   Maps engine outputs → CanonicalTicket / CanonicalApprovedTicketView correctly.
        
    *   Implements idempotency and deduplication.
        
    *   Preserves critical metadata (strategy ID, session ID, instrument, timestamps).
        
*   Guarantees that any change to the ticket pipeline cannot silently corrupt the operator’s view.
    

**Deletion guidance**

*   **KEEP** all ticketizer tests.
    
*   If you ever restructure the ticket pipeline, **update** these tests to match new contracts rather than removing them.
    

### 7.6 Dashboard tests (A3 surfaces & wiring)

**Locations**

*   Worklist & Tickets:
    
    *   apps/dashboard/src/pages/\_\_tests\_\_/WorklistV2.test.tsx
        
    *   apps/dashboard/src/pages/\_\_tests\_\_/Tickets.test.tsx
        
*   Markets & Analytics:
    
    *   apps/dashboard/src/pages/\_\_tests\_\_/Markets.test.tsx
        
    *   apps/dashboard/src/pages/\_\_tests\_\_/Analytics.test.tsx
        
*   Strategy Lab & System:
    
    *   apps/dashboard/src/pages/\_\_tests\_\_/StrategyLab.test.tsx
        
    *   apps/dashboard/src/pages/\_\_tests\_\_/Status.test.tsx
        
*   Alerts / misc:
    
    *   apps/dashboard/src/pages/\_\_tests\_\_/Alerts.test.tsx
        
    *   apps/dashboard/src/pages/\_\_tests\_\_/Home.test.tsx
        
    *   apps/dashboard/src/layouts/\_\_tests\_\_/ExecutionShell.test.tsx
        

**Purpose**

*   Page-level smoke tests for the A3 dashboard surfaces described in §6:
    
    *   Ensure each page renders without runtime errors.
        
    *   Validate basic wiring: correct shell, correct layout, basic props.
        
    *   Provide a place to add **more specific assertions** as Worklist V2 and other pages are hardened (e.g. columns, filters, route contracts).
        

**Deletion / cleanup guidance**

*   **KEEP** existing page tests.
    
*   You can **expand** them to cover column sets, query params, feature flags.
    
*   Do not delete them; if you change the page structure dramatically, refactor the tests along with the page.
    

### 7.7 E2E (Playwright) smoke tests

**Location**

*   apps/e2e/playwright.config.ts
    
*   apps/e2e/tests/smoke.spec.ts
    

**Purpose**

*   Browser-level smoke test of the deployed dashboard:
    
    *   Verify the app boots and main layout renders.
        
    *   Navigate key nav items (e.g. Worklist, Markets, Analytics).
        
    *   Assert that core UI elements (shell, navigation, main table) are visible.
        

**How they’re run**

*   Root package.json scripts:
    
    *   test:e2e: runs Playwright (apps/e2e) against a running dashboard instance.
        
*   CI: .github/workflows/dashboard-ci.yml can be wired to run E2E against the preview environment (currently minimal wiring – expand as needed).
    

**Deletion guidance**

*   **KEEP** Playwright config + smoke spec.
    
*   You may **add** more specs (e.g. worklist.spec.ts, tickets.spec.ts) as you stabilise the A3 pages.
    
*   Do not delete E2E entirely; it’s your only “real browser” test layer.
    

### 7.8 Static analysis & formatting (TypeScript, ESLint, Prettier)

**TypeScript**

*   Base config:
    
    *   tsconfig.base.json
        
*   Per-app configs:
    
    *   apps/api/tsconfig.json
        
    *   apps/dashboard/tsconfig.json
        
    *   apps/e2e/tsconfig.json
        
    *   packages/\*/tsconfig.json as applicable.
        

**Scripts**

*   Root package.json:
    
    *   typecheck: runs TypeScript checks across workspace.
        
    *   typecheck:api, typecheck:dashboard: app-level checks.
        

**ESLint**

*   Config:
    
    *   .eslintrc.cjs
        
    *   Additional app/package-level overrides where present.
        
*   Scripts:
    
    *   lint: runs ESLint across workspaces.
        
    *   lint:fix: auto-fix.
        

**Prettier**

*   Config:
    
    *   .prettierrc
        
*   Typically invoked via lint:fix or editor integration.
    

**Deletion guidance**

*   **KEEP** TypeScript configs, ESLint, and Prettier:
    
    *   They are not just “style” – they enforce correctness (noImplicitAny, unused variables, etc.).
        
*   If you simplify configs, do it by **refactoring** into a single shared base, not by removing checking.
    

### 7.9 CI workflows & repo guards

**Workflows**

*   .github/workflows/ci.yml
    
    *   Core CI pipeline: installs dependencies, runs lint, typecheck, test.
        
    *   Contains **safety grep** to ensure no outbound “order” APIs are called from the dashboard/API unexpectedly.
        
*   .github/workflows/dashboard-ci.yml
    
    *   Dashboard-specific pipeline (build + tests).
        
*   .github/workflows/repo-guard.yml
    
    *   Prevents large or unsafe files from being committed (e.g. giant blobs, secrets patterns).
        

**Purpose**

*   Enforce that no PR can be merged to the mainline branch unless:
    
    *   TypeScript passes.
        
    *   ESLint passes.
        
    *   Unit tests / smoke tests pass.
        
    *   Repo-level guard conditions are satisfied (branch naming, file size constraints, etc.).
        

**Deletion / cleanup guidance**

*   **KEEP** all workflows.
    
*   The only acceptable changes here are:
    
    *   Adding **new checks** (coverage, bundle size).
        
    *   Tweaking steps to reflect changes in scripts (e.g. if you rename test:ci).
        
*   Do not delete CI workflows; that would materially lower production safety.
    

### 7.10 What you can safely delete (today)

From inspecting the current branch, there is **no test or quality gate that is clearly obsolete** relative to the V2 engine and A3 dashboard work:

*   All major test suites (engine, strategies, metrics, ticketizer, dashboard) align with live code paths.
    
*   The only **candidate for future slimming** is:
    
    *   **Golden-day fixture volume** – but even then, prefer **moving** them under a consolidated tests/fixtures/ namespace rather than deleting.
        
    *   **Legacy test files** if you explicitly remove the corresponding code (e.g. a fully deprecated strategy or job).
        

**Bottom line for this section:**

*   **Do not delete** any tests, configs, or CI workflows yet.
    
*   Treat this layer as **non-negotiable safety infrastructure**.
    
*   Revisit deletion only after you:
    
    *   Decommission a whole feature/strategy.
        
    *   Replace old tests with clearly better equivalents.

---

8\. Dashboard Surfaces (A3 Cockpits & Wiring)
---------------------------------------------

This section defines the **operator-facing dashboards** (A3-style cockpits), how they are wired to the engine, and what is still mock vs canonical.

It is the glue between:

*   **Engine & jobs** (see §4).
    
*   **Contracts & DTOs** (see §3).
    
*   **Tests & quality gates** (see §7).
    

> All paths are relative to repo root; page filenames are based on the current V2 branch (adjust if naming is tweaked in future).

### 8.1 Shared layout & shells

**Purpose**

Provide a single, consistent “A3 cockpit” frame that all operator pages sit inside.

**Key modules**

*   Layout and shell:
    
    *   apps/dashboard/src/layouts/ExecutionShell.tsx
        
    *   apps/dashboard/src/layouts/ApexHeader.tsx (or equivalent top nav)
        
*   Shared UI components:
    
    *   apps/dashboard/src/ui/Card.tsx
        
    *   apps/dashboard/src/ui/Button.tsx
        
    *   apps/dashboard/src/ui/Badge.tsx
        
    *   apps/dashboard/src/ui/Kpi.tsx
        
    *   apps/dashboard/src/ui/FiltersBar.tsx
        
    *   apps/dashboard/src/ui/DataTable.tsx
        
*   Styling:
    
    *   apps/dashboard/src/styles/index.css
        
    *   apps/dashboard/src/styles/worklist-v2.css
        
    *   apps/dashboard/src/styles/markets-v2.css
        
    *   Any \*-v2.css files implementing A3 visuals.
        

**Behaviour**

*   All A3 pages (Worklist V2, Tickets, Markets, Analytics, Strategy Lab, System, Alerts) are rendered inside ExecutionShell.
    
*   Shell responsibilities:
    
    *   Apply the **V2 design system**: typography, colours, gradients, spacing.
        
    *   Provide **global chrome**: nav, title, environment indicator, user/session context.
        
    *   Host any global toasts/alerts.
        

**Deletion / cleanup guidance**

*   **KEEP**:
    
    *   ExecutionShell, core UI primitives (Card, Button, Kpi, FiltersBar, DataTable).
        
    *   All \*-v2.css linked from V2 pages.
        
*   **Can delete once V2 is fully live**:
    
    *   Any **legacy shell layouts** not used by App routing (e.g. older Shell.tsx, legacy layout components) _once_:
        
        *   App.tsx routes exclusively into ExecutionShell.
            
        *   No page imports the old shells.
            
*   **Rule of thumb**: At most **one** shell layout should be “live”. Everything else is either:
    
    *   Explicitly marked **legacy** and kept only for reference; or
        
    *   Deleted.
        

### 8.2 Worklist V2 cockpit

**Purpose**

Primary **operator cockpit** for actionable tickets:

*   Shows **pending / active tickets** from the engine.
    
*   Exposes **filters**, **KPIs**, and **detail panel** against canonical tickets.
    
*   The **single source of truth** for “what the operator should do next”.
    

**Key modules**

*   Page:
    
    *   apps/dashboard/src/pages/WorklistV2.tsx
        
*   Data hooks / services:
    
    *   apps/dashboard/src/hooks/useWorklistTickets.ts (or equivalent)
        
    *   Calls backend route: /api/worklist or /api/tickets underneath.
        
*   UI wiring:
    
    *   Uses ExecutionShell, FiltersBar, DataTable, Kpi, detail panel components.
        

**Data model**

*   Inputs:
    
    *   CanonicalTicket\[\] / CanonicalApprovedTicketView\[\] via /api/worklist (engine-backed).
        
    *   Filter state (status, strategy, symbol, direction, source).
        
*   Outputs:
    
    *   Rendered **table** of tickets (A3 width; all headers visible).
        
    *   KPI strip across top (ticket count, PnL-at-risk, exposure, etc.).
        
    *   Detail panel for the selected ticket (strategy, rationale, risk notes, session metrics slice).
        

**Mock vs production**

*   **Target**:
    
    *   Primary data from engine-backed /api/worklist → CanonicalTicket.
        
*   **Fallback**:
    
    *   In-memory mock tickets with the same shape, used only for:
        
        *   Local development without a running API.
            
        *   Storybook / visual tests.
            

**Deletion / cleanup guidance**

*   **KEEP**:
    
    *   WorklistV2.tsx – this is the canonical A3 worklist.
        
    *   useWorklistTickets and any worklist-v2 styles.
        
*   **Can delete once V2 is fully wired**:
    
    *   Any **legacy worklist page(s)** (Worklist.tsx, ExecutionWorklist.tsx, etc.) that:
        
        *   Are not referenced by App.tsx routes.
            
        *   Are not used by tests.
            
*   **Actionable rule**:
    
    *   Once App.tsx routes /worklist → WorklistV2, and tests only reference V2:
        
        *   Remove old Worklist components and their CSS.
            
        *   Remove any V1-only mock ticket types; keep only the canonical V2 mocks.
            

### 8.3 Tickets cockpit

**Purpose**

Historical and lifecycle view of tickets:

*   Broader than Worklist (which focuses on **what’s actionable now**).
    
*   Supports **audit**, **post-trade review**, and **compliance evidence**.
    

**Key modules**

*   Page:
    
    *   apps/dashboard/src/pages/Tickets.tsx
        
*   Data hooks:
    
    *   useTickets / useTicketsQuery (naming may vary; cross-check in the repo).
        
*   Backend:
    
    *   /api/tickets → apps/api/src/routes/tickets.ts
        
    *   Returns CanonicalTicket\[\] or CanonicalApprovedTicketView\[\].
        

**Data model**

*   Inputs:
    
    *   Ticket table from DB (see §4.5).
        
    *   Filters: date range, status, strategy, symbol, source.
        
*   Outputs:
    
    *   Paginated ticket table (A3 visual, but more archival than Worklist).
        
    *   Optional linkages to:
        
        *   Session metrics (PnL at fill/close).
            
        *   Engine/risk rationale when available.
            

**Deletion / cleanup guidance**

*   **KEEP**:
    
    *   Tickets.tsx and its query hook(s).
        
*   **Can delete once V2 is authoritative**:
    
    *   Older ticket list pages (e.g. TicketQueue.tsx, TicketsLegacy.tsx) once:
        
        *   All operator flows have moved to Tickets.tsx.
            
        *   No tests import the legacy pages.
            
*   **Avoid**:
    
    *   Having two separate “tickets” pages that both appear in navigation; consolidate on the V2 cockpit.
        

### 8.4 Markets cockpit

**Purpose**

Markets A3 surface:

*   Session-focused **market view** aligned to strategies.
    
*   Shows **session metrics**, **key price levels**, and **per-symbol context** that drives tickets.
    

**Key modules**

*   Page:
    
    *   apps/dashboard/src/pages/MarketData.tsx (or Markets.tsx, depending on branch state).
        
*   Styling:
    
    *   apps/dashboard/src/styles/markets-v2.css (contains .markets-v2-root, header, layout, etc.).
        
*   Data:
    
    *   Market data hook: useMarketSessions / useMarketData (naming to confirm in repo).
        
    *   Backend routes:
        
        *   /api/market-data or /api/sessions depending on design.
            

**Data model**

*   Inputs:
    
    *   Aggregated bar data / session slices (see §2).
        
    *   Session metrics (PnL, drawdown, exposures) for each instrument/strategy.
        
*   Outputs:
    
    *   A3 layout:
        
        *   Table of sessions or symbols (75% width).
            
        *   Detail panel (25%) with price ladder / session chart / key levels.
            
    *   Filters for:
        
        *   Session date.
            
        *   Strategy.
            
        *   Symbol / market.
            

**Deletion / cleanup guidance**

*   **KEEP**:
    
    *   Markets V2 page and markets-v2.css.
        
*   **Can delete or archive**:
    
    *   Any **legacy Markets** view (e.g. MarketOverview.tsx, non--v2 CSS) once:
        
        *   V2 page is used exclusively in nav.
            
        *   Tests are updated to expect V2 layout.
            
*   **Note**:
    
    *   If there are two market pages both using different shells, converge them onto the V2 shell and delete the older one.
        

### 8.5 Analytics cockpit

**Purpose**

Analytics A3 surface:

*   Provides a **performance and risk analytics** view:
    
    *   Equity curves.
        
    *   Drawdown charts.
        
    *   Strategy/session performance breakdowns.
        

**Key modules**

*   Page:
    
    *   apps/dashboard/src/pages/Analytics.tsx
        
*   Data hooks:
    
    *   useAnalyticsOverview, useEquityCurve, etc. (check actual hook names).
        
*   Backend:
    
    *   /api/analytics/\* routes under:
        
        *   apps/api/src/routes/analytics\*.ts
            

**Data model**

*   Inputs:
    
    *   Aggregated metrics from §4.2 (session metrics) and reporting packages.
        
*   Outputs:
    
    *   A3 cards:
        
        *   Equity curve charts.
            
        *   Drawdown band charts.
            
        *   Strategy performance tables.
            
    *   Filters:
        
        *   Date range.
            
        *   Strategy.
            
        *   Account / profile.
            

**Deletion / cleanup guidance**

*   **KEEP**:
    
    *   Analytics.tsx and chart/metrics components.
        
*   **Can delete**:
    
    *   Any old analytics/dashboard pages that:
        
        *   Are not using canonical session metrics DTOs.
            
        *   Are purely experimental and not linked from App.tsx.
            
*   **Strategy**:
    
    *   Once the A3 Analytics page is wired to real metrics from /api/session-metrics or /api/analytics, remove any mock-only analytics pages.
        

### 8.6 Strategy Lab cockpit

**Purpose**

Strategy Lab A3 surface:

*   Configuration and **“lab” view** for strategies (ORR, OSB, VWAP FT, etc.).
    
*   Goal is to make strategy config and backtests **operator-visible**, not buried in JSON alone.
    

**Key modules**

*   Page:
    
    *   apps/dashboard/src/pages/StrategyLab.tsx
        
*   Data hooks:
    
    *   useStrategyConfigs → /api/strategy-config
        
*   Backend:
    
    *   apps/api/src/routes/strategy-config.ts
        
    *   DTOs defined in apps/api/src/dto/strategy-config/\* (see §4).
        

**Data model**

*   Inputs:
    
    *   Strategy config DTOs:
        
        *   OSBConfigDto
            
        *   ORRConfigDto
            
        *   VWAPFTConfigDto
            
    *   Optional backtest results (where implemented).
        
*   Outputs:
    
    *   Tables/forms showing:
        
        *   Symbols, sessions, parameters, risk caps.
            
    *   Future:
        
        *   Controls for testing param changes with backtest outputs.
            

**Deletion / cleanup guidance**

*   **KEEP**:
    
    *   A3 Strategy Lab page and all DTO-based config views.
        
*   **Can delete**:
    
    *   Any hard-coded strategy playground pages that:
        
        *   Do not read from /api/strategy-config.
            
        *   Were used for early prototyping only.
            
*   **Rule**:
    
    *   Strategy config UX must be built on top of the **canonical config DTOs** – once that’s true, delete any older UI that introspects JSON directly.
        

### 8.7 System / Status cockpit

**Purpose**

System health A3 surface:

*   Shows **engine, job, and ingest health**.
    
*   Provides an operator a view of whether the system is “good to trade”.
    

**Key modules**

*   Page:
    
    *   apps/dashboard/src/pages/Status.tsx
        
*   Data hooks:
    
    *   useSystemStatus / useJobStatus (naming to confirm).
        
*   Backend:
    
    *   /api/status, /api/jobs/status, etc.
        
    *   Job scheduler metadata (see §4.1).
        

**Data model**

*   Inputs:
    
    *   Job heartbeat data.
        
    *   Ingest status (last bar time).
        
    *   Engine/ticketizer last-run timestamps and error flags.
        
*   Outputs:
    
    *   A3 cards for:
        
        *   Ingest feed health.
            
        *   Job pipeline health.
            
        *   Error / warning banners.
            

**Deletion / cleanup guidance**

*   **KEEP**:
    
    *   A3 System/Status page and any status DTOs.
        
*   **Can delete**:
    
    *   Old ad-hoc “/status” debug pages or JSON dumps once:
        
        *   The A3 Status cockpit exposes everything operators need.
            
        *   Engineers can still access raw health via API routes or logs.
            

### 8.8 Alerts cockpit

**Purpose**

Alerts A3 surface:

*   Centralises **risk and operational alerts**:
    
    *   Risk breaches.
        
    *   Engine anomalies.
        
    *   Ingest issues.
        

**Key modules**

*   Page:
    
    *   apps/dashboard/src/pages/Alerts.tsx (or AlertsV2.tsx).
        
*   Data hooks:
    
    *   useAlerts → /api/alerts.
        
*   Backend:
    
    *   /api/alerts route.
        
    *   Alert model linking back to:
        
        *   Risk engine (breach events).
            
        *   Jobs (failures).
            
        *   System health (status → alerts).
            

**Data model**

*   Inputs:
    
    *   Alert rows with:
        
        *   Severity.
            
        *   Source (risk, engine, ingest, system).
            
        *   Timestamp.
            
        *   Linked entity (session, ticket, job).
            
*   Outputs:
    
    *   A3 alerts table with:
        
        *   Filters for severity and source.
            
        *   Deep linking into:
            
            *   Worklist (for ticket-level alerts).
                
            *   System/Status (for infra alerts).
                

**Deletion / cleanup guidance**

*   **KEEP**:
    
    *   Alerts A3 page and its backing route.
        
*   **Can delete**:
    
    *   Old scattered alert banners inside individual pages **once**:
        
        *   The Alerts page + a global banner mechanism cover those use cases.
            
*   **Goal**:
    
    *   One canonical alert model and one central cockpit, rather than ad-hoc per-page alert lists.
        

### 8.9 Navigation & routing (App.tsx)

All of the above surfaces are composed via the main dashboard router.

**Key modules**

*   apps/dashboard/src/App.tsx
    
*   Any routing helpers (routes.tsx, Navigation.tsx, etc.).
    

**Expectations**

*   For the V2 branch, **App routing should point to:**
    
    *   /worklist → WorklistV2
        
    *   /tickets → Tickets
        
    *   /markets → Markets / MarketData
        
    *   /analytics → Analytics
        
    *   /strategy-lab → StrategyLab
        
    *   /system or /status → Status
        
    *   /alerts → Alerts
        
*   Any old routes pointing to V1 pages should be removed once V2 is functionally complete.
    

**Deletion / cleanup guidance**

*   **KEEP**:
    
    *   App.tsx as the single routing hub.
        
*   **Delete**:
    
    *   Dead routes and menu entries pointing to pages flagged above as deletable.
        
    *   Legacy nav items that reference V1 dashboards.
        

### 8.10 What you can safely delete (dashboard layer)

**Today, do NOT delete:**

*   Any \*V2.tsx A3 pages.
    
*   Any shared A3 UI components.
    
*   Any dashboard tests.
    

**You CAN delete (when conditions are met):**

1.  **Legacy shells & layouts**
    
    *   Once ExecutionShell is the only shell used in App.tsx, remove unused shells.
        
2.  **Legacy V1 pages**
    
    *   Worklist, Tickets, Markets, Analytics, Strategy, Status, Alerts V1 variants:
        
        *   Only after App.tsx and tests are fully moved to V2.
            
        *   Ensure no other code imports them.
            
3.  **Legacy CSS**
    
    *   Old non--v2 CSS files that:
        
        *   Are not imported by any V2 page.
            
        *   Represent old look-and-feel you no longer want.
            
4.  **Ad-hoc debug pages**
    
    *   Any dev-only dashboards not wired to canonical DTOs and not needed in day-to-day ops.
        

The operational principle:

> **Exactly one A3 cockpit per domain (Worklist, Tickets, Markets, Analytics, Strategy Lab, System, Alerts). Everything else is either clearly legacy (and removable) or explicitly dev tooling.**

---

9\. Deployment & Runtime Environments
-------------------------------------

This section defines **how Prism Apex runs in practice**: environments, Docker images, orchestration, and ops wiring. It is the canonical map for:

*   Local dev (bare Node + DB).
    
*   Local Docker (single-host, docker-compose).
    
*   “Real” server deployment (systemd + Nginx, or equivalent).
    

All paths are from repo root:/mnt/data/prism-apex-tool/prism-apex-tool-feat-remove-pnl-beta-banner.

### 9.1 Environment model & config sources

**Intent:** a single, typed source of truth for runtime configuration, with environment-specific overlays.

#### 9.1.1 Typed env config (API)

Canonical config lives in:

*   apps/api/src/config/env.ts
    

This file is the **authoritative schema** for API runtime settings:

*   DB connection details.
    
*   HTTP ports / hostnames.
    
*   Feature flags.
    
*   Risk / engine toggles.
    
*   Any 3rd-party integration endpoints.
    

Anything you want to “configure” for the API **must map into** this module. If it’s not modelled there, treat it as technical debt.

**Do not delete**: apps/api/src/config/env.ts – this is the backbone of environment handling.

#### 9.1.2 Env files & examples

Repo-tracked env templates and examples:

*   .env.ci – CI pipeline env scaffold.
    
*   infra/systemd/prism-apex.env.example – example unit env for systemd deployment.
    

These are **documentation + scaffolding** for how to populate actual secret/env values.

**Safe deletion guidance**

*   KEEP: .env.ci, infra/systemd/prism-apex.env.example. They’re small, and serve as canonical examples for future automation.
    
*   DELETE ONLY IF YOU KNOW WHAT YOU’RE DOING:
    
    *   Any **personal** .env.local or host-specific env files you may have created **outside this repo** are safe to delete from your machine, but they don’t belong in this SOT doc because they’re not committed.
        
    *   If future branches introduce multiple overlapping \*.env.example variants, we should rationalise to a single example per environment (dev, ci, prod) and remove duplicates.
        

### 9.2 Docker images & container topology

Prism Apex is containerised with a **three-tier topology**:

*   **Database** (Postgres).
    
*   **API** (Node/TypeScript).
    
*   **Dashboard** (React SPA).
    

#### 9.2.1 Build artefacts

Canonical Docker build files:

*   Root:
    
    *   Dockerfile – umbrella build (entrypoint for CI and/or monolithic image).
        
*   Service-specific:
    
    *   apps/api/Dockerfile – API image build.
        
    *   apps/dashboard/Dockerfile – dashboard image build.
        
*   CI images:
    
    *   infra/ci/api.Dockerfile – API CI image (tests, lint, etc.).
        
    *   infra/ci/dashboard.Dockerfile – dashboard CI image.
        

**Behaviour (conceptual)**

*   Each Dockerfile:
    
    *   Uses Node base images.
        
    *   Installs dependencies (likely via workspace/monorepo tooling).
        
    *   Builds the TypeScript / React artefacts.
        
    *   Exposes a port (API or dashboard).
        
*   CI Dockerfiles are optimised for pipeline use (cache layers for node\_modules, etc.).
    

**Safe deletion guidance**

*   KEEP:
    
    *   Dockerfile
        
    *   apps/api/Dockerfile
        
    *   apps/dashboard/Dockerfile
        
    *   infra/ci/api.Dockerfile
        
    *   infra/ci/dashboard.Dockerfile
        
*   DO NOT DELETE any of these unless:
    
    *   You are deliberately de-Dockerising the project (not the case here), or
        
    *   You are consolidating CI images and have an explicit replacement in place.
        

Right now, there is **no safe deletion** in the Dockerfile set.

### 9.3 Local orchestration – docker-compose

### Local dev: jobs always-on + DB migrations automatic

**Single entrypoint:** the only supported browser URL is **http://localhost:5180** (ingress).  
**Canonical compose:** `docker-compose.v2.local.yml` only.

What runs on every local deploy:

- Core: `db` → `migrate` → `api` + `dashboard-full` + `ingress`
- Jobs (always-on): `tickets-cron`, `gapfill-cron`, `ingress-yahoo`, `jobs-seed`

Hard guarantees:

- **Only** ingress publishes a host port (**5180:80**). API, DB, dashboard, and jobs remain internal.
- `migrate` applies `deploy/sql/*.sql` in order on startup.
- API and job services are gated on **db healthy** + **migrate completed successfully**.

Operational commands:

```bash
# Canonical start/rebuild (includes jobs + migrate)
docker compose -f docker-compose.v2.local.yml up -d --build --force-recreate --remove-orphans

# Guard contract (must stay green)
bash tools/codex/guard_ports_local.sh

# Health proofs (through ingress only)
curl -fsS http://127.0.0.1:5180/ui-meta
curl -fsS http://127.0.0.1:5180/health
```

Notes:

gapfill-once is manual-only (run explicitly) unless we decide otherwise, because it can reprocess historical data.

Local multi-container topology is defined by:

*   docker-compose.yml (dev/prod profile aware)
*   docker-compose.v2.local.yml (prod-like local stack: Postgres + API + dashboard)
*   docker-compose.v2.server.yml (server-ready manifest; set PUBLIC_API_BASE/POSTGRES_PASSWORD)
    

From inspection, it defines at least:

*   db – Postgres container (canonical local DB).
    
*   api – Prism Apex API container.
    
*   dashboard-full – Dashboard front-end container.
    

Key properties:

*   Shared network between containers.
    
*   api depends\_on db.
    
*   dashboard-full depends\_on api.
    
*   Environment variables wired from:
    
    *   .env / .env.ci / system environment.
        
    *   Compose-level environment: blocks.
        

This file is the **single source of truth** for how containers talk to each other in local/docker environments.

**Usage model (conceptual)**

*   Start full stack:
    
    *   docker-compose up (or docker compose up) brings up DB + API + dashboard.
        
*   API container uses apps/api/Dockerfile.
    
*   Dashboard container uses apps/dashboard/Dockerfile.
    

**Safe deletion guidance**

*   KEEP: docker-compose.yml and the v2 variants – all three are actively referenced by docs/runbooks.
    
*   Older override files may be retired only once the team agrees on a single manifest; the v2 files are now canonical examples and must remain.
        

### 9.4 Server deployment – systemd + Nginx

Production(-style) host deployment is modelled with:

#### 9.4.1 Systemd unit

*   infra/systemd/prism-apex.service
    
*   infra/systemd/prism-apex.service.example
    

These define how to run the API (and potentially the dashboard) as a **systemd service**:

*   ExecStart pointing to the Node/PM2 process or Docker wrapper.
    
*   User/group, working directory.
    
*   Restart policy.
    

prism-apex.service.example is clearly a **template**; the concrete prism-apex.service should be tailored per host.

*   infra/systemd/prism-apex.env.example – environment file that pairs with the systemd unit.
    

**Safe deletion guidance**

*   KEEP:
    
    *   infra/systemd/prism-apex.service
        
    *   infra/systemd/prism-apex.service.example
        
    *   infra/systemd/prism-apex.env.example
        
*   ONLY DELETE:
    
    *   If you fully standardise on container orchestration (e.g. Kubernetes) and decide to **retire systemd deployment entirely** – at which point the strategy should be documented in this SOT and the systemd files can be archived/removed together.
        
*   In the current branch, treat them as the **canonical starting point** for “single host, non-Dockerised” deployments.
    

#### 9.4.2 Nginx reverse proxy

*   infra/nginx/prism-apex.conf.example
    

This is the **canonical template** for:

*   Terminating TLS (where applied).
    
*   Routing:
    
    *   /api/ → API service (container or host port).
        
    *   / → dashboard SPA.
        
*   Basic headers, gzip, caching.
    

**Safe deletion guidance**

*   KEEP: infra/nginx/prism-apex.conf.example.
    
*   In production, you will have a concrete prism-apex.conf (or equivalent) on the server – that file is **not** in this repo, so irrelevant to deletion.
    
#### 9.4.3 Deploy templates & helper configs

*   `deploy/nginx.conf` – portable reverse-proxy config used by Docker/edge deployments (aligns with PUBLIC_API_BASE expectations surfaced in compose files).
*   `deploy/db/*.sql` – scheduled maintenance scripts referenced by the compose stacks.

Treat these as canonical examples; keep them synced with docker-compose.v2.\* manifests and infra docs.


### 9.5 CI / pipeline wiring

CI-specific deployment/build wiring is contained in:

*   infra/ci/api.Dockerfile
    
*   infra/ci/dashboard.Dockerfile
    
*   Any accompanying CI config (not visible in this branch, e.g. .github/workflows/\* or similar – if present, they sit alongside these Dockerfiles).
    

These Dockerfiles define **how the pipeline builds and tests the project**, including:

*   Node versions.
    
*   Caching strategy (layers for node\_modules).
    
*   Command entrypoints (test, lint, build).
    

**Safe deletion guidance**

*   KEEP: CI Dockerfiles until you have a fully migrated pipeline configuration referencing new images.
    
*   Only delete when:
    
    *   You have centralised on root Dockerfile or a new infra/docker pattern, **and**
        
    *   CI configuration has been updated and validated.
        

### 9.6 Invariants & what this section canonically asserts

For the SOT:

1.  **Environment config**
    
    *   apps/api/src/config/env.ts is the canonical env schema.
        
    *   System envs + .env.\* must flow through this module.
        
2.  **Docker**
    
    *   Dockerfile, apps/api/Dockerfile, apps/dashboard/Dockerfile are the canonical build artefacts.
        
    *   docker-compose.yml is the canonical local stack topology (db + api + dashboard).
        
3.  **Server deployment**
    
    *   infra/systemd/prism-apex.service\* + infra/systemd/prism-apex.env.example define a first-class systemd deployment path.
        
    *   infra/nginx/prism-apex.conf.example is the canonical reverse-proxy template.
        
4.  **Nothing in this layer is “safe to delete” yet**
    
    *   There is **no obvious legacy deployment stack** in this branch (no v1 Dockerfiles or obsolete compose files).
        
    *   Cleanup work here is about **standardising** (e.g. collapsing multiple examples) rather than deleting core assets.

---

10. Legacy, Mocks & Deletion Policy

This section defines what is canonical vs what is legacy, with explicit guidance on what can be safely deleted or archived without breaking the V2 engine + dashboards.

The goal is:

Make it obvious which files must exist for the current production path.

Identify A1/A2-era pages, mock UIs and bridging glue that we can remove.

Keep test/fixture assets that are still valuable for regression and risk.

All paths are from the repo root.

10.1 Principles

Canonical runtime surfaces only

API runtime: apps/api/src/** (routes, jobs, risk, strategy engines).

Dashboard runtime: apps/dashboard/src/App.tsx and the pages/layouts/components it imports.

Engine & strategy libraries: packages/** used by API and jobs.

Docker/runtime scripts: Dockerfile*, docker-compose*, apps/*/package.json, scripts/*.sh that are called from docs or CI.

Legacy / mock surfaces

Are not imported by App.tsx, jobs, or routes.

Are only referenced by tests, docs, or one-off scripts.

Can be archived or deleted once you accept losing those specific tests or mocks.

Tests and fixtures

Everything under __tests__, __mocks__, and *fixture* is treated as valuable by default.

Only delete test assets when you consciously retire a legacy code path.

10.2 Legacy Worklist Surfaces (A1/A2)

These are the old Worklist implementations that pre-date V2 and are not mounted in the live SPA routing.

10.2.1 apps/dashboard/src/pages/Worklist.tsx (A1/A2 Worklist)

Current role

Old Worklist page used in earlier versions.

Not mounted in apps/dashboard/src/App.tsx (routing now uses WorklistV2).

Only referenced from:

apps/dashboard/src/__tests__/WorklistPnLCell.test.tsx (PnL cell tests referencing PnLDataCell, PnLRRCell).

Canonical replacement

apps/dashboard/src/pages/WorklistV2.tsx (see §5: Worklist V2 Surface).

All operator-facing Worklist UX should use V2 only.

Action

If you want to keep legacy PnL cell tests:

KEEP Worklist.tsx and __tests__/WorklistPnLCell.test.tsx for now.

If you are comfortable dropping A1/A2 Worklist entirely:

Delete both:

apps/dashboard/src/pages/Worklist.tsx

apps/dashboard/src/__tests__/WorklistPnLCell.test.tsx

This is safe for the V2 runtime because App.tsx doesn’t route to this page.

10.2.2 apps/dashboard/src/pages/WorklistV2.legacy.tsx and pages/WorklistV2.legacy.tsx

Current role

Bridge/wrapper versions of Worklist V2 for the older “legacy” shell.

Not imported by the SPA App.tsx or the A3 ExecutionShell.

Only referenced in legacy sync tooling (see §10.3).

Canonical replacement

apps/dashboard/src/pages/WorklistV2.tsx under the new A3 layout.

Action

Safe to archive/delete once you fully commit to the new SPA-only dashboard.

Recommended:

Move to archive/dashboard/legacy/ for a couple of releases.

After confirming no one is using the legacy deployment path, you can delete them.

10.3 Legacy “Sync to Legacy” Glue

These files exist purely to sync Worklist V2 into a legacy deployment path; they are not part of the main engine or dashboard runtime.

10.3.1 scripts/sync_worklist_v2_to_legacy.sh

Role

Shell script used to push WorklistV2 into the legacy app structure.

Not called from build scripts or CI in this branch.

Action

If you no longer maintain the legacy app:

Safe to delete.

If you want a historical record:

Move to archive/scripts/.

10.3.2 packages/rules-apex/src/legacy.ts

Role

Legacy rules/logic from earlier iterations.

Only referenced by the sync script above; not used by live API or jobs.

Action

If you delete or archive sync_worklist_v2_to_legacy.sh, you can also:

Delete or archive packages/rules-apex/src/legacy.ts.

Confirm there are no imports in apps/api/src/** or apps/dashboard/src/** before deleting (current branch: none).

10.4 Dashboard Sandboxes and Non-Canonical Pages

These are pages under apps/dashboard/src/pages/ that are not mounted in App.tsx and are only used by tests or as experimental playgrounds.

For each, the pattern is the same:

Not routed in App.tsx.

Referenced only from apps/dashboard/src/test/** (page-specific tests).

10.4.1 DemoPnL, Downloads, Placeholder, Reports, StrategyConfig

Files

apps/dashboard/src/pages/DemoPnL.tsx

apps/dashboard/src/pages/Downloads.tsx

apps/dashboard/src/pages/Placeholder.tsx

apps/dashboard/src/pages/Reports.tsx

apps/dashboard/src/pages/StrategyConfig.tsx

Tests

Corresponding tests under apps/dashboard/src/test/**, for example:

apps/dashboard/src/test/DemoPnL.test.tsx

apps/dashboard/src/test/Downloads.test.tsx

apps/dashboard/src/test/Placeholder.test.tsx

apps/dashboard/src/test/Reports.test.tsx

apps/dashboard/src/test/StrategyConfig.test.tsx (names may vary slightly but they mirror the page names)

Canonical replacements

PnL, reports, downloads, and strategy config are now handled via:

Worklist V2, Analytics, Strategy Lab, and the canonical API surfaces documented in §§4–7.

Action

These are essentially sandbox/experimental surfaces.

Safe to remove, provided you:

Remove both the page and its corresponding test file(s), or

Move them together into archive/dashboard/sandboxes/.

They are not part of the live UX and do not affect engine or production dashboards.

10.5 Worklist Static Prototype (worklist-mock/)
10.5.1 worklist-mock/ root directory

Role

Contains the old static/HTML mock for Worklist (A2-style prototypes).

Referenced only by:

generate_worklist_mock.sh

docs/REPO_INDEX_V2.md

docs/ui/PRISM_APEX_UI_DESIGN_SYSTEM.md (as historical UI reference)

Runtime impact

Not built into the SPA.

Not imported by App.tsx, API, or jobs.

Action

From a runtime perspective, safe to delete.

If you still want the mock as a design artefact:

Move worklist-mock/ under docs/ui/legacy/ or archive/ui/.

Update REPO_INDEX_V2.md and PRISM_APEX_SOT.md to note the new location.

generate_worklist_mock.sh can follow the same rule:

Delete it if you no longer regenerate that mock.

Or move to archive/scripts/ alongside the legacy mock.

10.6 Tests, Mocks, Fixtures – What Not to Delete

There is a large surface area of items with mock, fixture, or golden-days in the name:

Session metrics fixtures

apps/api/src/jobs/session-metrics/golden-days/**

Used to verify PnL, drawdown and risk metric correctness.

Signal/strategy fixtures

Various packages/signals/**, packages/strategies/**, packages/data-yahoo/** test fixtures.

These underpin ORR, OSB, VWAP FT correctness (see §4).

Jest mocks

__mocks__ directories under apps/** and packages/** where present.

Policy:

KEEP:

All fixtures and mocks that are directly referenced by current tests.

All golden-days data – this is your regression guardrail for risk/PnL.

Only consider deletion when:

You retire the associated pipeline (e.g., if you ever replace the entire session metrics job), and

You update tests accordingly.

10.7 Hard-Deletion Checklist

Before deleting or archiving anything flagged as “safe” above, follow this minimal process:

Search for references

Run a repo-wide search for the filename (without path).

Confirm it is only referenced in:

Its own test(s), or

Docs / scripts you are also archiving.

Update tests

If the file is used by tests:

Delete or update the tests in the same commit.

The goal is: npm test / pnpm test should still pass (or only fail for the exact legacy suites you’ve decided to retire).

Update docs

For anything referenced in:

docs/REPO_INDEX_V2.md

PRISM_APEX_SOT.md (this document)

Update or remove references to deleted/archived files.

Archive window (optional but sensible)

Instead of immediate hard delete:

Move files into an archive/ subtree for one or two release cycles.

Once the team is confident they are not needed, permanently remove the archive subtree.

10.8 Net “Safe to Remove” Set (If You Commit Fully to V2)

If you are comfortable dropping A1/A2 Worklist and all sandbox pages, and legacy sync tooling, the following groups can be removed (preferably via an archive step):

Legacy Worklist & sync glue

apps/dashboard/src/pages/Worklist.tsx

apps/dashboard/src/__tests__/WorklistPnLCell.test.tsx

apps/dashboard/src/pages/WorklistV2.legacy.tsx

pages/WorklistV2.legacy.tsx

packages/rules-apex/src/legacy.ts

scripts/sync_worklist_v2_to_legacy.sh

Dashboard sandbox pages + tests

apps/dashboard/src/pages/DemoPnL.tsx + apps/dashboard/src/test/DemoPnL.test.tsx

apps/dashboard/src/pages/Downloads.tsx + apps/dashboard/src/test/Downloads.test.tsx

apps/dashboard/src/pages/Placeholder.tsx + apps/dashboard/src/test/Placeholder.test.tsx

apps/dashboard/src/pages/Reports.tsx + apps/dashboard/src/test/Reports.test.tsx

apps/dashboard/src/pages/StrategyConfig.tsx + apps/dashboard/src/test/StrategyConfig.test.tsx

Static Worklist mock

worklist-mock/**

generate_worklist_mock.sh (if you no longer regenerate the mock)

Everything else in the engine/risk/session-metrics/ticket pipelines and in the V2 dashboard surfaces must be preserved as canonical runtime.

## P1 System Records: ORR Gate Results (engineering-only)

**Status:** Engineering-only and externally read-only (GET endpoints only). This enables operator tooling later without schema churn.

### Strategy identity guardrails

Canonical engine keys:
- `orr` (engine id `ORR_V3`, operator strategy id `APX-DDB-01`, operator label “DDB”)
- `vwapft` (operator label “VWAP-FT”, DB key `vwap_ft`)
- `osb`

Operator labels still appear in tickets/worklists, but persistence must always map back to canonical keys before writing system records.

### Append-only storage

- Migration `deploy/sql/031_orr_gate_results.sql` introduces `orr_gate_results` (append-only; stored forever for now) with one row per `(run_id, session_date, symbol)`.
- Fields include the gate outcome (`actionable`, `reason`), `metrics` (gate ATR/OR width snapshot), `details` (session flags summary, session-metrics summary, gate config/result, planner rollup, preview error details), and provenance stamps from `lib/systemRecordStamps.ts`.
- Migration `deploy/sql/032_orr_gate_results_cleanup.sql` purges the initial planner-labelled rows so only gate-specific semantics remain (`canonical_strategy_key='orr_gate'`, `engine_strategy_id='ORR_GATE'`). Future migrations may add retention windows, but P1-2 intentionally keeps everything for audit purposes.

### Writer (best-effort)

`apps/api/src/jobs/engineRunJob.ts` now stamps **one ORR gate record per engine run invocation** (per `(run_id, session_date, symbol)`), regardless of which planner (`orr`/DDB, `osb`, `vwapft`) was asked to run:

- Gate computation uses `apps/api/src/lib/orrGate.ts` (ATR ticks + OR width ticks) via a shared PG client (`withOrrGateResultsClient`), so all strategies reference the same gate truth.
- Session context snapshots:
  - Flags via `createSessionFlagsService()` (news/FOMC gating).
  - Session metrics summary via `fetchSessionMetricsBatch(..., { service: createSessionMetricsService() })`.
- Planner rollup: the job runs each planner in isolation (best-effort) and stores a compact summary in `details.planner_rollup` so future tooling can compare planner outputs for the same session.
- Provenance stamps via `makeSystemRecordStamps(...)` capture engine version + deterministic fingerprint of the gate config + invocation metadata.
- Gate identity is explicit: `canonical_strategy_key='orr_gate'`, `engine_strategy_id='ORR_GATE'`, `ticket_strategy_id` reflects the requested planner (e.g., `APX-DDB-01`, `OSB`, `VWAP_FT`).
- Persistence is best-effort: failures are logged (stack truncated to 32 KB) but never block the engine run.

### Reader (GET-only)

`apps/api/src/routes/system-records.orr.ts` exposes read-only endpoints registered in `apps/api/src/server.ts`:
- `GET /api/system-records/orr-gate` – filterable list (symbol, sessionDate, pagination)
- `GET /api/system-records/orr-gate/latest` – latest per symbol for a given session date

These routes inherit the existing auth/rate-limit plugins. No POST/PUT/DELETE surface exists; writes are engine-only.

<!-- P1-A1 planner reject counts -->
## P1 System Records: Planner Reject Counts (engineering-only)

Purpose: aggregated analytics answering “why did we NOT get an actionable ticket?” by counting drops per
(session_date, symbol, requested_planner, rejecting_planner, reject_stage, reason_code).

Key concepts:
- `requested_planner`: what the run invocation requested (VWAP-FT / OSB / DDB normalized).
- `rejecting_planner`: the planner whose candidate was rejected (same normalized key).
- `reject_stage`: PLANNER | SAFETY | RISK | PERSISTENCE | TICKETIZER (A1 wires PLANNER/SAFETY/TICKETIZER first).
- `reason_code`: constrained vocabulary via `plannerRejectVocab.ts` to prevent free-text reason soup.

Write policy:
- Best-effort only. Counting must never break ticket generation.
- Runtime uses `plannerRejectRecorder.ts` which swallows errors and logs minimal warnings.

Read policy:
- Engineering-only initially. Can be exposed operator-facing later via dedicated dashboards once stable.

### P1 System Records: Planner Reject Counts\nEngineering-only aggregated counters keyed by (session_date, symbol, requested_planner, rejecting_planner, reject_stage, reason_code).



## Canonical local 5180 ingress

Local development uses one entrypoint: http://localhost:5180. UI, API, and metadata all run through that same host port (dashboard-full + ingress) and guard_ports_local.sh enforces it. Avoid any guidance that points people to 3000/8080/8090/55433 or manual reverse proxies.
