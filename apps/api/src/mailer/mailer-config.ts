// Mailer configuration (signature step-up codes), via Microsoft Graph's
// application-permission sendMail. Reuses the SAME Entra ID app registration
// already used for SSO (AUTH_TENANT_ID/AUTH_CLIENT_ID/AUTH_CLIENT_SECRET,
// see apps/api/src/auth/auth-config.ts) rather than a second app
// registration — that app just needs an added Mail.Send APPLICATION
// permission (admin-consented once in Entra, outside code; a DIFFERENT
// grant from the delegated User.Read used for sign-in), plus a real,
// licensed M365 mailbox to send from (MAIL_SENDER).
//
// Optional and off by default: when any value below is unset (e.g. in dev,
// or before the Mail.Send grant lands), codes are only logged to the API
// console — never delivered — mirroring how AUTH_DEV_MODE/AUTH_AUTO_ADMIN_ROLE
// are env-gated with a safe fallback in auth-config.ts.
export interface MailerConfig {
  enabled: boolean;
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
  senderMailbox?: string;
}

export function loadMailerConfig(): MailerConfig {
  const tenantId = process.env.AUTH_TENANT_ID;
  const clientId = process.env.AUTH_CLIENT_ID;
  const clientSecret = process.env.AUTH_CLIENT_SECRET;
  const senderMailbox = process.env.MAIL_SENDER;
  return {
    enabled: Boolean(tenantId && clientId && clientSecret && senderMailbox),
    tenantId,
    clientId,
    clientSecret,
    senderMailbox,
  };
}
