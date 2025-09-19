-- Minimal schema/table for raw tickets
create schema if not exists prism;

create table if not exists prism.tickets_raw (
  date text not null,
  strategy text not null,
  payload jsonb not null,
  ingested_at timestamptz not null default now()
);

create index if not exists idx_tickets_raw_date on prism.tickets_raw (date);
create index if not exists idx_tickets_raw_strategy on prism.tickets_raw (strategy);
