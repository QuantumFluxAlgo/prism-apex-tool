import { Client } from 'pg';

export type OperatorActionKind =
  | 'ACTIONED'
  | 'ACK'
  | 'DISMISSED'
  | 'SKIPPED'
  | 'MONITORING'
  | 'MONITORED';

export interface RecordOperatorActionInput {
  ticketId: string;
  action: OperatorActionKind;
  note?: string | null;
}

export class TicketNotFoundError extends Error {
  constructor(ticketId: string) {
    super(`Ticket ${ticketId} not found`);
    this.name = 'TicketNotFoundError';
  }
}

export async function recordOperatorAction({
  ticketId,
  action,
  note,
}: RecordOperatorActionInput): Promise<void> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const result = await client.query(
      `
        UPDATE tickets
           SET meta = COALESCE(meta, '{}'::jsonb) || jsonb_build_object(
             'operatorAction',
             jsonb_build_object(
               'action', $2::text,
               'note', $3::text,
               'recorded_at_utc', NOW()
             )
           )
         WHERE id = $1
         RETURNING id;
      `,
      [ticketId, action, note ?? null],
    );

    if (result.rowCount === 0) {
      throw new TicketNotFoundError(ticketId);
    }
  } finally {
    await client.end();
  }
}
