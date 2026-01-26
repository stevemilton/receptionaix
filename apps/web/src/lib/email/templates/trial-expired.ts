export function trialExpiredEmail({
  businessName,
  billingUrl,
}: {
  businessName: string;
  billingUrl: string;
}): { subject: string; html: string } {
  return {
    subject: 'Your ReceptionAI trial has expired',
    html: `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1e293b;">Your trial has expired</h2>
  <p>Hi ${businessName},</p>
  <p>Your ReceptionAI free trial has ended. Incoming calls are now being forwarded to your personal phone number.</p>
  <p>Subscribe to a plan to re-activate your AI receptionist and never miss a call again.</p>
  <a href="${billingUrl}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0;">Choose a Plan</a>
  <p style="color: #64748b; font-size: 14px;">Your settings and knowledge base have been saved &mdash; you can pick up right where you left off.</p>
  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
  <p style="color: #94a3b8; font-size: 12px;">ReceptionAI &middot; AI Receptionist for UK Businesses</p>
</body>
</html>`,
  };
}
