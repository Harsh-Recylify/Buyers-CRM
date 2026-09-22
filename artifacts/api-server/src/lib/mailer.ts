import nodemailer, { type Transporter } from "nodemailer";
import { logger } from "./logger";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;

export const APP_URL = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");

let transporter: Transporter | null | undefined;

function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    transporter = null;
    return transporter;
  }
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Sends an email if SMTP is configured; otherwise logs a warning and
 * returns false so callers can still succeed (e.g. forgot-password always
 * responds the same way regardless of whether the account exists or mail
 * is configured, to avoid leaking account existence).
 */
export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const client = getTransporter();
  if (!client) {
    logger.warn(
      { to: options.to, subject: options.subject },
      "SMTP is not configured (set SMTP_HOST, SMTP_USER, SMTP_PASS) — email was not sent",
    );
    return false;
  }
  try {
    await client.sendMail({
      from: SMTP_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    return true;
  } catch (err) {
    logger.error({ err, to: options.to }, "Failed to send email");
    return false;
  }
}

export function passwordResetEmail(name: string, resetUrl: string): Pick<SendEmailOptions, "subject" | "html" | "text"> {
  return {
    subject: "Reset your Recyclify password",
    text: `Hi ${name},\n\nWe received a request to reset your Recyclify password. Open this link to choose a new one (it expires in 1 hour):\n\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
    html: `
      <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
        <h2 style="margin: 0 0 16px; color: #118847;">Reset your password</h2>
        <p>Hi ${name},</p>
        <p>We received a request to reset your Recyclify password. Click the button below to choose a new one — this link expires in 1 hour.</p>
        <p style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" style="background: #118847; color: #fff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">Reset Password</a>
        </p>
        <p style="color: #666; font-size: 13px;">If you didn't request this, you can safely ignore this email — your password won't change.</p>
        <p style="color: #999; font-size: 12px; word-break: break-all;">Or copy this link: ${resetUrl}</p>
      </div>
    `,
  };
}

export function invitationEmail(role: string, inviteUrl: string, invitedByName: string | null): Pick<SendEmailOptions, "subject" | "html" | "text"> {
  const inviter = invitedByName ? `${invitedByName} has invited` : "You've been invited";
  return {
    subject: "You're invited to join Recyclify",
    text: `${inviter} you to join Recyclify as a ${role}.\n\nAccept your invitation here (it expires in 7 days):\n\n${inviteUrl}`,
    html: `
      <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
        <h2 style="margin: 0 0 16px; color: #118847;">You're invited to Recyclify</h2>
        <p>${inviter} you to join Recyclify as a <strong>${role.replace("_", " ")}</strong>.</p>
        <p style="text-align: center; margin: 32px 0;">
          <a href="${inviteUrl}" style="background: #118847; color: #fff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">Accept Invitation</a>
        </p>
        <p style="color: #666; font-size: 13px;">This invitation expires in 7 days.</p>
        <p style="color: #999; font-size: 12px; word-break: break-all;">Or copy this link: ${inviteUrl}</p>
      </div>
    `,
  };
}
