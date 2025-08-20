import axios from "axios";

export async function markTicketEntered(ticketId) {
  await axios.post("/api/audit", {
    type: "OPERATOR_ACTION",
    message: `Ticket ${ticketId} entered`
  });
}
