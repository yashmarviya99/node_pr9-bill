const nodemailer = require("nodemailer");

/**
 * Creates a nodemailer transporter from environment variables.
 * Supports Gmail, SMTP, or Mailtrap for dev.
 */
const createTransporter = () => {
  if (process.env.MAIL_HOST) {
    // Generic SMTP (Mailtrap, Outlook, etc.)
    return nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT || 587),
      secure: process.env.MAIL_SECURE === "true",
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
  }

  // Gmail with app password
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });
};

/**
 * Send a password-reset OTP email.
 * @param {string} toEmail - recipient email
 * @param {string} otp     - 6-digit OTP
 * @param {string} name    - user's name (optional)
 */
const sendOtpEmail = async (toEmail, otp, name = "") => {
  const transporter = createTransporter();

  const displayName = name || toEmail;
  const fromAddress =
    process.env.MAIL_FROM ||
    process.env.GMAIL_USER ||
    "noreply@businessbill.in";

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
      <div style="text-align:center;margin-bottom:24px;">
        <h2 style="color:#37AD47;margin:0;">BUSINESS BILL</h2>
        <p style="color:#6b7280;font-size:13px;margin:4px 0 0;">Password Reset OTP</p>
      </div>

      <p style="color:#374151;font-size:15px;">Hello <strong>${displayName}</strong>,</p>
      <p style="color:#6b7280;font-size:14px;line-height:1.6;">
        You requested a password reset. Use the OTP below to reset your password.
        This OTP is valid for <strong>10 minutes</strong>.
      </p>

      <div style="text-align:center;margin:28px 0;">
        <span style="display:inline-block;background:#E9EFFF;color:#4A4A4A;font-size:32px;font-weight:700;letter-spacing:10px;padding:16px 32px;border-radius:8px;border:2px dashed #8972A8;">
          ${otp}
        </span>
      </div>

      <p style="color:#9ca3af;font-size:13px;text-align:center;">
        If you did not request this, please ignore this email. Do not share this OTP with anyone.
      </p>

      <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0;" />
      <p style="color:#d1d5db;font-size:12px;text-align:center;">© BUSINESS BILL — Secure Financial Management</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"BUSINESS BILL" <${fromAddress}>`,
    to: toEmail,
    subject: "Your Password Reset OTP — BUSINESS BILL",
    html,
  });
};

module.exports = { sendOtpEmail };
