# accounts.json — Fields

- **name**: label for the account (e.g., "PA-1")
- **accountId**: Tradovate numeric account ID
- **accountSpec**: Tradovate account spec (e.g., "PA123456")
- **mode**: "eval" or "funded"
- **planMaxContracts**: hard cap from the plan
- **baseSize**: our default ticket size before guards (≥1)
- **multiplier**: per-account multiplier (e.g., 1.2 to scale up)
- **minQty**: clamp low (≥0)

Start from `configs/accounts.example.json` and run:


pnpm config:check
