import nodemailer from "nodemailer";

export interface EmailOptions {
    to: string;
    subject: string;
    html?: string;
    text?: string;
    from?: string;
}

const isConfigured = !!process.env.SMTP_HOST;

/**
 * SMTP transporter via Nodemailer.
 *
 * Set SMTP_HOST to enable. If not configured, emails are logged to console.
 *
 * Env vars: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE, EMAIL_FROM
 */
const transporter = isConfigured
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth:
            process.env.SMTP_USER && process.env.SMTP_PASS
                ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
                : undefined,
    })
    : null;

const DEFAULT_FROM =
    process.env.EMAIL_FROM || "Auth UI <noreply@localhost>";

function maskEmail(email: string): string {
    const [local, domain] = email.split("@");
    if (!domain) return "***";
    const masked = local.length <= 2 ? "*".repeat(local.length) : local[0] + "*".repeat(local.length - 2) + local[local.length - 1];
    return `${masked}@${domain}`;
}

export async function sendEmail(opts: EmailOptions): Promise<void> {
    if (!transporter) {
        console.log(
            `\n⚠️  Email not configured (set SMTP_HOST to enable)\n` +
            `   To: ${maskEmail(opts.to)}\n` +
            `   Subject: [REDACTED]\n` +
            `   Body: [REDACTED]\n`
        );
        return;
    }

    try {
        const info = await transporter.sendMail({
            from: opts.from ?? DEFAULT_FROM,
            to: opts.to,
            subject: opts.subject,
            html: opts.html,
            text: opts.text,
        });

        console.log(`📧 Email sent → ${maskEmail(opts.to)} (messageId: ${info.messageId})`);
    } catch (error) {
        console.error(`❌ Failed to send email to ${maskEmail(opts.to)}:`, error);
        throw error;
    }
}
