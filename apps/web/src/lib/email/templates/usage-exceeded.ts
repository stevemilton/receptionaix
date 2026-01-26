export function usageExceededEmail({
  businessName,
  callsUsed,
  callsLimit,
  billingUrl,
}: {
  businessName: string;
  callsUsed: number;
  callsLimit: number;
  billingUrl: string;
}): { subject: string; html: string } {
  return {
    subject: 'Your monthly call limit has been reached',
    html: `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1e293b;">Call limit reached</h2>
  <p>Hi ${businessName},</p>
  <p>You've used <strong>${callsUsed} of ${callsLimit} calls</strong> this billing period and reached your monthly limit.</p>
  <p>Incoming calls will now be forwarded to your personal phone number. Any further AI-handled calls will be billed as overage at &pound;0.50 per call.</p>
  <p>Upgrade your plan for more calls and uninterrupted AI coverage.</p>
  <a href="${billingUrl}" style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0;">Upgrade Plan</a>
  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
  <p style="color: #94a3b8; font-size: 12px;">ReceptionAI &middot; AI Receptionist for UK Businesses</p>
</body>
</html>`,
  };
}
