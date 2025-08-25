# Accounts Registry API

The accounts registry stores account metadata on disk under `DATA_DIR/accounts`. Each account is saved as a JSON file and has the shape:

```json
{
  "id": "PA-150K-123456",
  "maxContracts": 17,
  "bufferCleared": false,
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "notes": "plan:150k"
}
```

These REST endpoints mirror the CLI helpers (e.g. `prism-accounts set --id ...`). They are secured and require a bearer token.

## Examples

List accounts:

```bash
curl -H "authorization: Bearer $TOKEN" http://localhost:8000/accounts
```

Upsert an account:

```bash
curl -X PUT -H "authorization: Bearer $TOKEN" \
     -H "content-type: application/json" \
     -d '{"maxContracts":17,"bufferCleared":false,"notes":"plan:150k, platform:Tradovate"}' \
     http://localhost:8000/accounts/PA-150K-123456
```

Authentication: set `BEARER_TOKEN` in the environment and supply `Authorization: Bearer $TOKEN` on requests.
