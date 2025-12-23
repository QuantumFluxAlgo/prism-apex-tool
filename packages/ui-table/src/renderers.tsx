import React from "react"

export const rrCell = (rr?: number) => {
  if (rr == null) return "—"
  return (
    <span style={{ color: rr >= 1 ? "#22c55e" : "#ef4444" }}>
      {rr >= 1 ? "↑" : "↓"} {rr.toFixed(2)}
    </span>
  )
}

export const pnlTicksCell = (pnl?: number) => {
  if (pnl == null) return "—"
  return (
    <span style={{ color: pnl > 0 ? "#22c55e" : pnl < 0 ? "#ef4444" : "#94a3b8" }}>
      {pnl}
    </span>
  )
}

export const riskCell = (risk?: number) => {
  if (risk == null) return "—"
  return (
    <span style={{ color: risk <= 1 ? "#22c55e" : risk <= 2 ? "#f59e0b" : "#ef4444" }}>
      {risk.toFixed(2)}
    </span>
  )
}

export const scoreCell = (score?: number) => {
  if (score == null) return "—"
  return <span>{score}</span>
}
