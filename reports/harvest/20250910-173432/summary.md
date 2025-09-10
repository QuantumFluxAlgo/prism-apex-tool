# Harvest r2 — 20250910-173432

- Typecheck exit status: 2
- Approx TS error hits (grep): 172

## Top TS files (current)
     14 packages/indicators/__tests__/swings.spec.ts
     14 packages/indicators/__tests__/atr.spec.ts
     13 apps/api/test/rules/engine.test.ts
     12 packages/strategies/src/vwapFirstTouch.ts
     11 packages/sdk/src/index.ts
     10 packages/indicators/__tests__/vwap.spec.ts
      8 apps/api/src/jobs/strategies.ts
      7 packages/clients-tradovate/__tests__/telemetry.spec.ts
      6 packages/rules-apex/src/applyGuards.ts
      6 packages/indicators/src/swings.ts
      6 apps/api/src/jobs/ticketizer.ts
      5 packages/strategies/tests/osbBreakout.spec.ts
      5 packages/runtime/__tests__/ws.resilience.spec.ts
      4 packages/strategies/tests/vwapFirstTouch.spec.ts
      4 packages/strategies/src/osbBreakout.ts

## Top TS codes (current)
     56 error TS18048
     54 error TS2532
     13 error TS2305
     12 error TS2345
      8 error TS2339
      5 error TS2561
      5 error TS2322
      4 error TS2307
      3 error TS2769
      3 error TS2554
      3 error TS1343
      2 error TS2540
      1 error TS4104
      1 error TS2614
      1 error TS2578

## Tail: lint_l4_tail.txt
```
No matching log found for pattern: reports/lint/l4/*/lint.out
```

## Tail: lint_r3_tail.txt
```
No matching log found for pattern: reports/lint/round3/*/lint.out
```

## Tail: lint_r2_1_tail.txt
```
No matching log found for pattern: reports/lint/round2_1/*/lint.out
```

## Tail: unit_t7_tail.txt
```
No matching log found for pattern: reports/tests/t7/*/unit.out
```

## Tail: types_r5_tail.txt
```
packages/indicators/__tests__/atr.spec.ts(63,16): error TS2532: Object is possibly 'undefined'.
packages/indicators/__tests__/atr.spec.ts(63,31): error TS2532: Object is possibly 'undefined'.
packages/indicators/__tests__/atr.spec.ts(64,16): error TS2532: Object is possibly 'undefined'.
packages/indicators/__tests__/atr.spec.ts(64,30): error TS2532: Object is possibly 'undefined'.
packages/indicators/__tests__/swings.spec.ts(1,31): error TS2307: Cannot find module '../../__tests__/helpers/assert' or its corresponding type declarations.
packages/indicators/__tests__/swings.spec.ts(22,76): error TS2345: Argument of type 'number | undefined' is not assignable to parameter of type 'number'.
  Type 'undefined' is not assignable to type 'number'.
packages/indicators/__tests__/swings.spec.ts(25,23): error TS2532: Object is possibly 'undefined'.
packages/indicators/__tests__/swings.spec.ts(25,42): error TS2532: Object is possibly 'undefined'.
packages/indicators/__tests__/swings.spec.ts(26,23): error TS2532: Object is possibly 'undefined'.
packages/indicators/__tests__/swings.spec.ts(26,42): error TS2532: Object is possibly 'undefined'.
packages/indicators/__tests__/swings.spec.ts(27,23): error TS2532: Object is possibly 'undefined'.
packages/indicators/__tests__/swings.spec.ts(27,42): error TS2532: Object is possibly 'undefined'.
packages/indicators/__tests__/swings.spec.ts(28,23): error TS2532: Object is possibly 'undefined'.
packages/indicators/__tests__/swings.spec.ts(28,42): error TS2532: Object is possibly 'undefined'.
packages/indicators/__tests__/swings.spec.ts(29,23): error TS2532: Object is possibly 'undefined'.
packages/indicators/__tests__/swings.spec.ts(29,42): error TS2532: Object is possibly 'undefined'.
packages/indicators/__tests__/swings.spec.ts(38,76): error TS2345: Argument of type 'number | undefined' is not assignable to parameter of type 'number'.
  Type 'undefined' is not assignable to type 'number'.
packages/indicators/__tests__/swings.spec.ts(40,42): error TS2532: Object is possibly 'undefined'.
packages/indicators/__tests__/swings.spec.ts(40,61): error TS2532: Object is possibly 'undefined'.
packages/indicators/__tests__/vwap.spec.ts(1,31): error TS2307: Cannot find module '../../__tests__/helpers/assert' or its corresponding type declarations.
packages/indicators/__tests__/vwap.spec.ts(13,3): error TS2322: Type '{ ts: string | undefined; open: number; high: number; low: number; close: number; volume: number; }[]' is not assignable to type 'Bar1m[]'.
  Type '{ ts: string | undefined; open: number; high: number; low: number; close: number; volume: number; }' is not assignable to type 'Bar1m'.
    Types of property 'ts' are incompatible.
      Type 'string | undefined' is not assignable to type 'string'.
        Type 'undefined' is not assignable to type 'string'.
packages/indicators/__tests__/vwap.spec.ts(15,25): error TS18048: 'open' is possibly 'undefined'.
packages/indicators/__tests__/vwap.spec.ts(15,38): error TS18048: 'high' is possibly 'undefined'.
packages/indicators/__tests__/vwap.spec.ts(15,50): error TS18048: 'low' is possibly 'undefined'.
packages/indicators/__tests__/vwap.spec.ts(15,63): error TS18048: 'close' is possibly 'undefined'.
packages/indicators/__tests__/vwap.spec.ts(15,79): error TS18048: 'volume' is possibly 'undefined'.
packages/indicators/__tests__/vwap.spec.ts(28,17): error TS2532: Object is possibly 'undefined'.
packages/indicators/__tests__/vwap.spec.ts(28,33): error TS2532: Object is possibly 'undefined'.
packages/indicators/__tests__/vwap.spec.ts(28,48): error TS2532: Object is possibly 'undefined'.
packages/indicators/__tests__/vwap.spec.ts(43,37): error TS2345: Argument of type 'number | undefined' is not assignable to parameter of type 'number'.
  Type 'undefined' is not assignable to type 'number'.
packages/indicators/src/swings.ts(19,9): error TS2532: Object is possibly 'undefined'.
packages/indicators/src/swings.ts(20,32): error TS2532: Object is possibly 'undefined'.
packages/indicators/src/swings.ts(20,51): error TS2532: Object is possibly 'undefined'.
packages/indicators/src/swings.ts(22,9): error TS2532: Object is possibly 'undefined'.
packages/indicators/src/swings.ts(23,32): error TS2532: Object is possibly 'undefined'.
packages/indicators/src/swings.ts(23,51): error TS2532: Object is possibly 'undefined'.
packages/rules-apex/src/applyGuards.ts(31,14): error TS2339: Property 'push' does not exist on type 'readonly ["phase:eval" | "phase:funded"]'.
packages/rules-apex/src/applyGuards.ts(32,14): error TS2339: Property 'push' does not exist on type 'readonly ["phase:eval" | "phase:funded"]'.
packages/rules-apex/src/applyGuards.ts(33,46): error TS2339: Property 'push' does not exist on type 'readonly ["phase:eval" | "phase:funded"]'.
packages/rules-apex/src/applyGuards.ts(34,39): error TS2339: Property 'push' does not exist on type 'readonly ["phase:eval" | "phase:funded"]'.
packages/rules-apex/src/applyGuards.ts(60,14): error TS2339: Property 'push' does not exist on type 'readonly ["phase:eval" | "phase:funded"]'.
packages/rules-apex/src/applyGuards.ts(73,7): error TS4104: The type 'readonly ["phase:eval" | "phase:funded"]' is 'readonly' and cannot be assigned to the mutable type 'string[]'.
packages/rules-apex/test/stop.spec.ts(5,17): error TS2554: Expected 3 arguments, but got 2.
packages/rules-apex/test/stop.spec.ts(13,17): error TS2554: Expected 3 arguments, but got 2.
packages/rules-apex/test/stop.spec.ts(21,17): error TS2554: Expected 3 arguments, but got 2.
packages/rules/src/apex.ts(38,21): error TS18048: 'h' is possibly 'undefined'.
packages/rules/src/apex.ts(38,32): error TS18048: 'm' is possibly 'undefined'.
packages/rules/src/apex.ts(38,41): error TS18048: 's' is possibly 'undefined'.
packages/rules/src/config.ts(11,59): error TS1343: The 'import.meta' meta-property is only allowed when the '--module' option is 'es2020', 'es2022', 'esnext', 'system', 'node16', 'node18', 'node20', or 'nodenext'.
packages/runtime/__tests__/ws.resilience.spec.ts(31,5): error TS18048: 'first' is possibly 'undefined'.
packages/runtime/__tests__/ws.resilience.spec.ts(37,5): error TS18048: 'second' is possibly 'undefined'.
packages/runtime/__tests__/ws.resilience.spec.ts(46,11): error TS2558: Expected 0-1 type arguments, but got 2.
packages/runtime/__tests__/ws.resilience.spec.ts(49,49): error TS2345: Argument of type '[string | undefined]' is not assignable to parameter of type 'never'.
packages/runtime/__tests__/ws.resilience.spec.ts(54,12): error TS2532: Object is possibly 'undefined'.
packages/sdk/src/index.ts(2,3): error TS2305: Module '"./types.js"' has no exported member 'OSBInput'.
packages/sdk/src/index.ts(3,3): error TS2305: Module '"./types.js"' has no exported member 'VWAPInput'.
packages/sdk/src/index.ts(4,3): error TS2305: Module '"./types.js"' has no exported member 'SuggestionResult'.
packages/sdk/src/index.ts(5,3): error TS2305: Module '"./types.js"' has no exported member 'SymbolsResponse'.
packages/sdk/src/index.ts(6,3): error TS2305: Module '"./types.js"' has no exported member 'SessionsResponse'.
packages/sdk/src/index.ts(49,3): error TS2305: Module '"./types.js"' has no exported member 'Bar'.
packages/sdk/src/index.ts(50,3): error TS2305: Module '"./types.js"' has no exported member 'OSBInput'.
packages/sdk/src/index.ts(51,3): error TS2305: Module '"./types.js"' has no exported member 'VWAPInput'.
packages/sdk/src/index.ts(52,3): error TS2305: Module '"./types.js"' has no exported member 'SuggestionResult'.
packages/sdk/src/index.ts(53,3): error TS2305: Module '"./types.js"' has no exported member 'SymbolsResponse'.
packages/sdk/src/index.ts(54,3): error TS2305: Module '"./types.js"' has no exported member 'SessionsResponse'.
packages/signals/src/__tests__/core.spec.ts(25,12): error TS18048: 's' is possibly 'undefined'.
packages/signals/src/__tests__/core.spec.ts(26,12): error TS18048: 's' is possibly 'undefined'.
packages/signals/src/__tests__/core.spec.ts(36,12): error TS2532: Object is possibly 'undefined'.
packages/strategies/src/config/strategy-config.ts(35,41): error TS1343: The 'import.meta' meta-property is only allowed when the '--module' option is 'es2020', 'es2022', 'esnext', 'system', 'node16', 'node18', 'node20', or 'nodenext'.
packages/strategies/src/osbBreakout.ts(57,19): error TS18048: 'lastBar' is possibly 'undefined'.
packages/strategies/src/osbBreakout.ts(57,70): error TS18048: 'lastBar' is possibly 'undefined'.
packages/strategies/src/osbBreakout.ts(58,21): error TS18048: 'lastBar' is possibly 'undefined'.
packages/strategies/src/osbBreakout.ts(58,71): error TS18048: 'lastBar' is possibly 'undefined'.
packages/strategies/src/vwapFirstTouch.ts(47,18): error TS2532: Object is possibly 'undefined'.
packages/strategies/src/vwapFirstTouch.ts(47,41): error TS2532: Object is possibly 'undefined'.
packages/strategies/src/vwapFirstTouch.ts(52,41): error TS2532: Object is possibly 'undefined'.
packages/strategies/src/vwapFirstTouch.ts(56,21): error TS2532: Object is possibly 'undefined'.
packages/strategies/src/vwapFirstTouch.ts(58,18): error TS18048: 'vnow' is possibly 'undefined'.
packages/strategies/src/vwapFirstTouch.ts(58,60): error TS18048: 'vnow' is possibly 'undefined'.
packages/strategies/src/vwapFirstTouch.ts(63,30): error TS18048: 'touchBar' is possibly 'undefined'.
packages/strategies/src/vwapFirstTouch.ts(63,47): error TS18048: 'vnow' is possibly 'undefined'.
packages/strategies/src/vwapFirstTouch.ts(69,24): error TS2345: Argument of type 'number | undefined' is not assignable to parameter of type 'number'.
  Type 'undefined' is not assignable to type 'number'.
packages/strategies/src/vwapFirstTouch.ts(70,24): error TS2345: Argument of type 'number | undefined' is not assignable to parameter of type 'number'.
  Type 'undefined' is not assignable to type 'number'.
packages/strategies/src/vwapFirstTouch.ts(74,24): error TS2345: Argument of type 'number | undefined' is not assignable to parameter of type 'number'.
  Type 'undefined' is not assignable to type 'number'.
packages/strategies/src/vwapFirstTouch.ts(75,24): error TS2345: Argument of type 'number | undefined' is not assignable to parameter of type 'number'.
  Type 'undefined' is not assignable to type 'number'.
packages/strategies/tests/osbBreakout.spec.ts(38,12): error TS18048: 's' is possibly 'undefined'.
packages/strategies/tests/osbBreakout.spec.ts(39,12): error TS18048: 's' is possibly 'undefined'.
packages/strategies/tests/osbBreakout.spec.ts(40,12): error TS18048: 's' is possibly 'undefined'.
packages/strategies/tests/osbBreakout.spec.ts(112,25): error TS18048: 's' is possibly 'undefined'.
packages/strategies/tests/osbBreakout.spec.ts(112,34): error TS18048: 's' is possibly 'undefined'.
packages/strategies/tests/vwapFirstTouch.spec.ts(36,12): error TS18048: 's' is possibly 'undefined'.
packages/strategies/tests/vwapFirstTouch.spec.ts(37,12): error TS18048: 's' is possibly 'undefined'.
packages/strategies/tests/vwapFirstTouch.spec.ts(38,25): error TS18048: 's' is possibly 'undefined'.
packages/strategies/tests/vwapFirstTouch.spec.ts(38,34): error TS18048: 's' is possibly 'undefined'.
packages/ticketizer/src/fanout.ts(48,12): error TS2339: Property 'maxContractsAllowed' does not exist on type '{}'.
packages/ticketizer/src/fanout.ts(93,35): error TS2339: Property 'maxContractsAllowed' does not exist on type '{}'.
tests/setup/vitest.setup.ts(16,15): error TS2540: Cannot assign to 'NODE_ENV' because it is a read-only property.
tests/setup/vitest.setup.ts(17,15): error TS2540: Cannot assign to 'LOG_LEVEL' because it is a read-only property.
tests/setup/vitest.setup.ts(23,5): error TS2578: Unused '@ts-expect-error' directive.
vitest.local.config.ts(5,3): error TS2769: No overload matches this call.
  The last overload gave the following error.
    Object literal may only specify known properties, and 'projects' does not exist in type 'UserConfigExport'.
vitest.local.config.ts(23,9): error TS2769: No overload matches this call.
  The last overload gave the following error.
    Object literal may only specify known properties, and 'maxThreads' does not exist in type 'ProjectConfig'.
vitest.local.config.ts(48,9): error TS2769: No overload matches this call.
  The last overload gave the following error.
    Object literal may only specify known properties, and 'maxThreads' does not exist in type 'ProjectConfig'.
 ELIFECYCLE  Command failed with exit code 2.
```

## Tail: types_r3_tail.txt
```
packages/clients-tradovate/__tests__/telemetry.spec.ts(98,18): error TS2339: Property 'bufferCleared' does not exist on type 'never'.
packages/clients-tradovate/src/__tests__/ws.spec.ts(30,12): error TS18048: 'inst' is possibly 'undefined'.
packages/clients-tradovate/src/__tests__/ws.spec.ts(31,12): error TS18048: 'inst' is possibly 'undefined'.
packages/clients-tradovate/src/__tests__/ws.spec.ts(41,5): error TS18048: 'first' is possibly 'undefined'.
packages/indicators/__tests__/atr.spec.ts(12,3): error TS2322: Type '{ ts: string | undefined; open: number; high: number; low: number; close: number; volume: number; }[]' is not assignable to type 'Bar1m[]'.
  Type '{ ts: string | undefined; open: number; high: number; low: number; close: number; volume: number; }' is not assignable to type 'Bar1m'.
    Types of property 'ts' are incompatible.
      Type 'string | undefined' is not assignable to type 'string'.
        Type 'undefined' is not assignable to type 'string'.
packages/indicators/__tests__/atr.spec.ts(14,25): error TS18048: 'open' is possibly 'undefined'.
packages/indicators/__tests__/atr.spec.ts(14,38): error TS18048: 'high' is possibly 'undefined'.
packages/indicators/__tests__/atr.spec.ts(14,50): error TS18048: 'low' is possibly 'undefined'.
packages/indicators/__tests__/atr.spec.ts(14,63): error TS18048: 'close' is possibly 'undefined'.
packages/indicators/__tests__/atr.spec.ts(14,79): error TS18048: 'volume' is possibly 'undefined'.
packages/indicators/__tests__/atr.spec.ts(59,26): error TS2345: Argument of type 'Bar1m | undefined' is not assignable to parameter of type 'Bar1m'.
  Type 'undefined' is not assignable to type 'Bar1m'.
packages/indicators/__tests__/atr.spec.ts(59,35): error TS2532: Object is possibly 'undefined'.
packages/indicators/__tests__/atr.spec.ts(61,7): error TS2532: Object is possibly 'undefined'.
packages/indicators/__tests__/atr.spec.ts(61,22): error TS2532: Object is possibly 'undefined'.
packages/indicators/__tests__/atr.spec.ts(62,16): error TS2532: Object is possibly 'undefined'.
packages/indicators/__tests__/atr.spec.ts(62,31): error TS2532: Object is possibly 'undefined'.
packages/indicators/__tests__/atr.spec.ts(63,16): error TS2532: Object is possibly 'undefined'.
packages/indicators/__tests__/atr.spec.ts(63,30): error TS2532: Object is possibly 'undefined'.
packages/indicators/__tests__/swings.spec.ts(21,76): error TS2345: Argument of type 'number | undefined' is not assignable to parameter of type 'number'.
  Type 'undefined' is not assignable to type 'number'.
packages/indicators/__tests__/swings.spec.ts(24,23): error TS2532: Object is possibly 'undefined'.
packages/indicators/__tests__/swings.spec.ts(24,42): error TS2532: Object is possibly 'undefined'.
packages/indicators/__tests__/swings.spec.ts(25,23): error TS2532: Object is possibly 'undefined'.
packages/indicators/__tests__/swings.spec.ts(25,42): error TS2532: Object is possibly 'undefined'.
packages/indicators/__tests__/swings.spec.ts(26,23): error TS2532: Object is possibly 'undefined'.
packages/indicators/__tests__/swings.spec.ts(26,42): error TS2532: Object is possibly 'undefined'.
packages/indicators/__tests__/swings.spec.ts(27,23): error TS2532: Object is possibly 'undefined'.
packages/indicators/__tests__/swings.spec.ts(27,42): error TS2532: Object is possibly 'undefined'.
packages/indicators/__tests__/swings.spec.ts(28,23): error TS2532: Object is possibly 'undefined'.
packages/indicators/__tests__/swings.spec.ts(28,42): error TS2532: Object is possibly 'undefined'.
packages/indicators/__tests__/swings.spec.ts(37,76): error TS2345: Argument of type 'number | undefined' is not assignable to parameter of type 'number'.
  Type 'undefined' is not assignable to type 'number'.
packages/indicators/__tests__/swings.spec.ts(39,42): error TS2532: Object is possibly 'undefined'.
packages/indicators/__tests__/swings.spec.ts(39,61): error TS2532: Object is possibly 'undefined'.
packages/indicators/__tests__/vwap.spec.ts(12,3): error TS2322: Type '{ ts: string | undefined; open: number; high: number; low: number; close: number; volume: number; }[]' is not assignable to type 'Bar1m[]'.
  Type '{ ts: string | undefined; open: number; high: number; low: number; close: number; volume: number; }' is not assignable to type 'Bar1m'.
    Types of property 'ts' are incompatible.
      Type 'string | undefined' is not assignable to type 'string'.
        Type 'undefined' is not assignable to type 'string'.
packages/indicators/__tests__/vwap.spec.ts(14,25): error TS18048: 'open' is possibly 'undefined'.
packages/indicators/__tests__/vwap.spec.ts(14,38): error TS18048: 'high' is possibly 'undefined'.
packages/indicators/__tests__/vwap.spec.ts(14,50): error TS18048: 'low' is possibly 'undefined'.
packages/indicators/__tests__/vwap.spec.ts(14,63): error TS18048: 'close' is possibly 'undefined'.
packages/indicators/__tests__/vwap.spec.ts(14,79): error TS18048: 'volume' is possibly 'undefined'.
packages/indicators/__tests__/vwap.spec.ts(27,17): error TS2532: Object is possibly 'undefined'.
packages/indicators/__tests__/vwap.spec.ts(27,33): error TS2532: Object is possibly 'undefined'.
packages/indicators/__tests__/vwap.spec.ts(27,48): error TS2532: Object is possibly 'undefined'.
packages/indicators/__tests__/vwap.spec.ts(42,37): error TS2345: Argument of type 'number | undefined' is not assignable to parameter of type 'number'.
  Type 'undefined' is not assignable to type 'number'.
packages/indicators/src/swings.ts(19,9): error TS2532: Object is possibly 'undefined'.
packages/indicators/src/swings.ts(20,32): error TS2532: Object is possibly 'undefined'.
packages/indicators/src/swings.ts(20,51): error TS2532: Object is possibly 'undefined'.
packages/indicators/src/swings.ts(22,9): error TS2532: Object is possibly 'undefined'.
packages/indicators/src/swings.ts(23,32): error TS2532: Object is possibly 'undefined'.
packages/indicators/src/swings.ts(23,51): error TS2532: Object is possibly 'undefined'.
packages/rules-apex/test/stop.spec.ts(5,17): error TS2554: Expected 3 arguments, but got 2.
packages/rules-apex/test/stop.spec.ts(13,17): error TS2554: Expected 3 arguments, but got 2.
packages/rules-apex/test/stop.spec.ts(21,17): error TS2554: Expected 3 arguments, but got 2.
packages/rules/src/apex.ts(38,21): error TS18048: 'h' is possibly 'undefined'.
packages/rules/src/apex.ts(38,32): error TS18048: 'm' is possibly 'undefined'.
packages/rules/src/apex.ts(38,41): error TS18048: 's' is possibly 'undefined'.
packages/rules/src/config.ts(11,59): error TS1343: The 'import.meta' meta-property is only allowed when the '--module' option is 'es2020', 'es2022', 'esnext', 'system', 'node16', 'node18', 'node20', or 'nodenext'.
packages/runtime/__tests__/ws.resilience.spec.ts(31,5): error TS18048: 'first' is possibly 'undefined'.
packages/runtime/__tests__/ws.resilience.spec.ts(37,5): error TS18048: 'second' is possibly 'undefined'.
packages/runtime/__tests__/ws.resilience.spec.ts(46,11): error TS2558: Expected 0-1 type arguments, but got 2.
packages/runtime/__tests__/ws.resilience.spec.ts(49,49): error TS2345: Argument of type '[string | undefined]' is not assignable to parameter of type 'never'.
packages/runtime/__tests__/ws.resilience.spec.ts(54,12): error TS2532: Object is possibly 'undefined'.
packages/signals/src/__tests__/core.spec.ts(25,12): error TS18048: 's' is possibly 'undefined'.
packages/signals/src/__tests__/core.spec.ts(26,12): error TS18048: 's' is possibly 'undefined'.
packages/signals/src/__tests__/core.spec.ts(36,12): error TS2532: Object is possibly 'undefined'.
packages/strategies/src/config/strategy-config.ts(35,41): error TS1343: The 'import.meta' meta-property is only allowed when the '--module' option is 'es2020', 'es2022', 'esnext', 'system', 'node16', 'node18', 'node20', or 'nodenext'.
packages/strategies/src/osbBreakout.ts(39,19): error TS18048: 'lastBar' is possibly 'undefined'.
packages/strategies/src/osbBreakout.ts(39,70): error TS18048: 'lastBar' is possibly 'undefined'.
packages/strategies/src/osbBreakout.ts(40,21): error TS18048: 'lastBar' is possibly 'undefined'.
packages/strategies/src/osbBreakout.ts(40,71): error TS18048: 'lastBar' is possibly 'undefined'.
packages/strategies/src/vwapFirstTouch.ts(29,18): error TS2532: Object is possibly 'undefined'.
packages/strategies/src/vwapFirstTouch.ts(29,41): error TS2532: Object is possibly 'undefined'.
packages/strategies/src/vwapFirstTouch.ts(34,41): error TS2532: Object is possibly 'undefined'.
packages/strategies/src/vwapFirstTouch.ts(38,21): error TS2532: Object is possibly 'undefined'.
packages/strategies/src/vwapFirstTouch.ts(40,18): error TS18048: 'vnow' is possibly 'undefined'.
packages/strategies/src/vwapFirstTouch.ts(40,60): error TS18048: 'vnow' is possibly 'undefined'.
packages/strategies/src/vwapFirstTouch.ts(45,30): error TS18048: 'touchBar' is possibly 'undefined'.
packages/strategies/src/vwapFirstTouch.ts(45,47): error TS18048: 'vnow' is possibly 'undefined'.
packages/strategies/src/vwapFirstTouch.ts(51,24): error TS2345: Argument of type 'number | undefined' is not assignable to parameter of type 'number'.
  Type 'undefined' is not assignable to type 'number'.
packages/strategies/src/vwapFirstTouch.ts(52,24): error TS2345: Argument of type 'number | undefined' is not assignable to parameter of type 'number'.
  Type 'undefined' is not assignable to type 'number'.
packages/strategies/src/vwapFirstTouch.ts(56,24): error TS2345: Argument of type 'number | undefined' is not assignable to parameter of type 'number'.
  Type 'undefined' is not assignable to type 'number'.
packages/strategies/src/vwapFirstTouch.ts(57,24): error TS2345: Argument of type 'number | undefined' is not assignable to parameter of type 'number'.
  Type 'undefined' is not assignable to type 'number'.
packages/strategies/tests/osbBreakout.spec.ts(38,12): error TS18048: 's' is possibly 'undefined'.
packages/strategies/tests/osbBreakout.spec.ts(39,12): error TS18048: 's' is possibly 'undefined'.
packages/strategies/tests/osbBreakout.spec.ts(40,12): error TS18048: 's' is possibly 'undefined'.
packages/strategies/tests/osbBreakout.spec.ts(112,25): error TS18048: 's' is possibly 'undefined'.
packages/strategies/tests/osbBreakout.spec.ts(112,34): error TS18048: 's' is possibly 'undefined'.
packages/strategies/tests/vwapFirstTouch.spec.ts(36,12): error TS18048: 's' is possibly 'undefined'.
packages/strategies/tests/vwapFirstTouch.spec.ts(37,12): error TS18048: 's' is possibly 'undefined'.
packages/strategies/tests/vwapFirstTouch.spec.ts(38,25): error TS18048: 's' is possibly 'undefined'.
packages/strategies/tests/vwapFirstTouch.spec.ts(38,34): error TS18048: 's' is possibly 'undefined'.
packages/ticketizer/src/fanout.ts(48,12): error TS2339: Property 'maxContractsAllowed' does not exist on type '{}'.
packages/ticketizer/src/fanout.ts(93,35): error TS2339: Property 'maxContractsAllowed' does not exist on type '{}'.
tests/setup/vitest.setup.ts(16,15): error TS2540: Cannot assign to 'NODE_ENV' because it is a read-only property.
tests/setup/vitest.setup.ts(17,15): error TS2540: Cannot assign to 'LOG_LEVEL' because it is a read-only property.
tests/setup/vitest.setup.ts(23,5): error TS2578: Unused '@ts-expect-error' directive.
vitest.local.config.ts(5,3): error TS2769: No overload matches this call.
  The last overload gave the following error.
    Object literal may only specify known properties, and 'projects' does not exist in type 'UserConfigExport'.
vitest.local.config.ts(23,9): error TS2769: No overload matches this call.
  The last overload gave the following error.
    Object literal may only specify known properties, and 'maxThreads' does not exist in type 'ProjectConfig'.
vitest.local.config.ts(48,9): error TS2769: No overload matches this call.
  The last overload gave the following error.
    Object literal may only specify known properties, and 'maxThreads' does not exist in type 'ProjectConfig'.
 ELIFECYCLE  Command failed with exit code 2.
```
