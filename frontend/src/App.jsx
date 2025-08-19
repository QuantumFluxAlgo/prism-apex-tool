import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from "recharts";

function App() {
  const [performance, setPerformance] = useState({});
  const [guardrails, setGuardrails] = useState({});
  const [payouts, setPayouts] = useState({});
  const [calibration, setCalibration] = useState({});

  useEffect(() => {
    fetch("/api/performance").then(r => r.json()).then(setPerformance);
    fetch("/api/guardrails").then(r => r.json()).then(setGuardrails);
    fetch("/api/payouts").then(r => r.json()).then(setPayouts);
    fetch("/api/calibration").then(r => r.json()).then(setCalibration);
  }, []);

  return (
    <div className="p-6 grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        {performance.strategies &&
          Object.entries(performance.strategies).map(([name, stats]) => (
            <Card key={name}>
              <CardContent>
                <h2 className="text-xl font-bold">{name} Performance</h2>
                <p>Win Rate: {stats.win_rate}%</p>
                <p>Expectancy: ${stats.expectancy}</p>
                <p>Max Drawdown: ${stats.max_dd}</p>
              </CardContent>
            </Card>
          ))}
      </div>

      <Card>
        <CardContent>
          <h2 className="text-xl font-bold">Guardrails</h2>
          {guardrails.pass ? <p>✅ All Good</p> : <p>❌ Breaches Found</p>}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h2 className="text-xl font-bold">Payouts</h2>
          <p>Eligible: {payouts.eligible ? "Yes" : "No"}</p>
          <p>Next Date: {payouts.next_payout_date}</p>
          <p>Amount: ${payouts.payout_amount}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h2 className="text-xl font-bold">Calibration</h2>
          <table>
            <tbody>
              <tr>
                <td>ORB runs</td>
                <td>{calibration.orb_runs}</td>
              </tr>
              <tr>
                <td>VWAP runs</td>
                <td>{calibration.vwap_runs}</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h2 className="text-xl font-bold">Performance Trends</h2>
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performance.trend || []}>
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="win_rate" stroke="#8884d8" name="Win Rate" />
                <Line yAxisId="right" type="monotone" dataKey="pl" stroke="#82ca9d" name="P/L" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default App;
