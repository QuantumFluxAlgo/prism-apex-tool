create schema if not exists prism;

create table if not exists prism.tickets_raw (
  date text not null,
  strategy text not null,
  payload jsonb not null,
  ingested_at timestamptz not null default now()
);

alter table prism.tickets_raw
  add column if not exists payload_hash text
  generated always as (md5(payload::text)) stored;

create unique index if not exists uq_tickets_raw_date_strategy_hash
  on prism.tickets_raw (date, strategy, payload_hash);

create table if not exists prism.tickets_raw_stage (
  date text not null,
  strategy text not null,
  payload jsonb not null
);
