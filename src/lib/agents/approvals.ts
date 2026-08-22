import { store } from "@/lib/store";
import { sendEmail, textToHtml, getFromEmail } from "@/lib/mail";

export async function approveAndSend(approvalId: string) {
  const approval = await store.getApproval(approvalId);
  if (!approval) throw new Error("Approval no encontrado");
  if (approval.status !== "pending") {
    throw new Error(`Approval en estado ${approval.status}`);
  }

  const lead = await store.getLead(approval.lead_id);
  const result = await sendEmail({
    to: approval.to_email,
    subject: approval.subject,
    html: textToHtml(approval.body, lead?.locale),
    text: approval.body,
  });

  if (!result.ok && !result.simulated) {
    throw new Error(result.error || "Error enviando email");
  }

  const message = await store.createMessage({
    lead_id: approval.lead_id,
    direction: "outbound",
    channel: "email",
    subject: approval.subject,
    body: approval.body,
    agent: approval.agent,
    meta: {
      resendId: result.id,
      simulated: result.simulated,
    },
  });

  await store.updateApproval(approvalId, {
    status: result.simulated ? "approved" : "sent",
    message_id: message.id,
    resolved_at: new Date().toISOString(),
    from_email: approval.from_email ?? getFromEmail(),
  });

  if (lead && (lead.status === "new" || lead.status === "qualified")) {
    await store.updateLead(lead.id, {
      status: lead.status === "qualified" ? "qualified" : "contacted",
    });
  }

  await store.createEvent({
    agent: approval.agent,
    event_type: result.simulated ? "email_simulated" : "email_sent",
    lead_id: approval.lead_id,
    payload: { approvalId, resendId: result.id },
  });

  return { approval: await store.getApproval(approvalId), message, result };
}

export async function rejectApproval(approvalId: string, reason?: string) {
  const approval = await store.getApproval(approvalId);
  if (!approval) throw new Error("Approval no encontrado");
  if (approval.status !== "pending") {
    throw new Error(`Approval en estado ${approval.status}`);
  }

  await store.updateApproval(approvalId, {
    status: "rejected",
    resolved_at: new Date().toISOString(),
  });

  await store.createEvent({
    agent: approval.agent,
    event_type: "email_rejected",
    lead_id: approval.lead_id,
    payload: { approvalId, reason: reason ?? null },
  });

  return store.getApproval(approvalId);
}
