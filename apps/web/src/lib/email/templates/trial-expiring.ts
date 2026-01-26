export function trialExpiringEmail({
  businessName,
  daysRemaining,
  billingUrl,
}: {
  businessName: string;
  daysRemaining: number;
  billingUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `Your ReceptionAI trial ends in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`,
    html: `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1e293b;">Your trial is ending soon</h2>
  <p>Hi ${businessName},</p>
  <p>Your ReceptionAI free trial ends in <strong>${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}</strong>.</p>
  <p>To keep your AI receptionist answering calls, select a plan before your trial expires. If your trial expires, incoming calls will be forwarded to your personal phone number.</p>
  <a href="${billingUrl}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0;">Choose a Plan</a>
  <p style="color: #64748b; font-size: 14px;">If you have any questions, reply to this email and we'll help you out.</p>
  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
  <p style="color: #94a3b8; font-size: 12px;">ReceptionAI &middot; AI Receptionist for UK Businesses</p>
</body>
</html>`,
  };
}
