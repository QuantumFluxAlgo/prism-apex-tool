import React from 'react';
import FiltersBar from '../ui/FiltersBar';
import Kpi from '../ui/Kpi';
import { Card, CardBody } from '../ui/Card';
import DataTable from '../ui/DataTable';

export default function PositionsPage() {
  return (
    <div className="space-y-4">
      <FiltersBar />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Active positions" value="—" />
        <Kpi label="Net exposure" value="—" />
        <Kpi label="Unrealized PnL" value="—" />
        <Kpi label="Symbols active" value="—" />
      </div>
      <Card>
        <CardBody>
          <DataTable
            headers={
              <tr>
                <th className="px-3 py-2">Symbol</th>
                <th className="px-3 py-2">Dir</th>
                <th className="px-3 py-2">Entry</th>
                <th className="px-3 py-2">Last</th>
                <th className="px-3 py-2">Unrealized</th>
                <th className="px-3 py-2">Opened</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            }
          >
            <tr>
              <td className="px-3 py-2" colSpan={7}>
                Loading…
              </td>
            </tr>
          </DataTable>
        </CardBody>
      </Card>
    </div>
  );
}
