export function usageWarningEmail({
  businessName,
  callsUsed,
  callsLimit,
  percentUsed,
  usageUrl,
}: {
  businessName: string;
  callsUsed: number;
  callsLimit: number;
  percentUsed: number;
  usageUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `You've used ${percentUsed}% of your monthly calls`,
    html: `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1e293b;">Usage alert</h2>
  <p>Hi ${businessName},</p>
  <p>You've used <strong>${callsUsed} of ${callsLimit} calls</strong> (${percentUsed}%) this billing period.</p>
  <p>When you reach your limit, additional calls will be forwarded to your personal phone. Any AI-handled calls beyond your limit will be charged at &pound;0.50 per call.</p>
  <p>Consider upgrading your plan if you expect more calls this month.</p>
  <a href="${usageUrl}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0;">View Usage</a>
  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
  <p style="color: #94a3b8; font-size: 12px;">ReceptionAI &middot; AI Receptionist for UK Businesses</p>
</body>
</html>`,
  };
}
