// Mailer configuration (signature step-up codes), via Microsoft Graph's
// application-permission sendMail. Uses the Entra ID app registration in
// AUTH_TENANT_ID/AUTH_CLIENT_ID/AUTH_CLIENT_SECRET — formerly MBc360's own
// Microsoft sign-in too; since 2026-11-17 sign-in goes through AppHub and
// only this mailer reads those variables. That app needs a Mail.Send
// APPLICATION permission (admin-consented once in Entra, outside code), plus
// a real, licensed M365 mailbox to send from (MAIL_SENDER).
//
// Optional and off by default: when any value below is unset (e.g. in dev,
// or before the Mail.Send grant lands), codes are only logged to the API
// console — never delivered — mirroring how AUTH_DEV_MODE is env-gated with a
// safe fallback in auth-config.ts.
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
