/**
 * Placeholder syncTickets script for local Docker bring-up.
 * Replace with real sync logic when ready.
 */
async function main() {
  console.info('[tickets-sync] Placeholder: no-op idle loop. Replace with real implementation.');
  setInterval(() => {
    // keep process alive; could log heartbeat if desired
  }, 60_000);
}

main().catch((err) => {
  console.error('[tickets-sync] Error:', err);
  process.exit(1);
});
