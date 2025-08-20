"""
Prism Apex Tool — Audit API
Endpoint for logging operator actions and system events.
"""

from fastapi import FastAPI, Request
from audit.logger import log_event

app = FastAPI()


@app.post("/api/audit")
async def audit(request: Request):
    data = await request.json()
    log_event(data["type"], data["message"], data.get("details", {}))
    return {"status": "ok"}
