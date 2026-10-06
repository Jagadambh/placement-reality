const nodemailer = require('nodemailer');

let transporter = null;

/**
 * Initializes and retrieves the Nodemailer transporter.
 * Supports standard SMTP (Gmail App Password, Brevo, SendGrid, Amazon SES, etc.)
 * Gracefully falls back to console logging in development if credentials are absent.
 */
function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (user && pass) {
    transporter = nodemailer.createTransport({
      host: host || 'smtp.gmail.com',
      port,
      secure,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
    });
    console.log(`[Email Service] Configured live SMTP transport with host: ${host || 'smtp.gmail.com'}:${port}`);
  } else {
    // Development / Dry-run transporter
    transporter = {
      sendMail: async (mailOptions) => {
        console.log('\n================== [TRANSACTIONAL EMAIL DISPATCHED] ==================');
        console.log(`To:      ${mailOptions.to}`);
        console.log(`Subject: ${mailOptions.subject}`);
        console.log(`From:    ${mailOptions.from || '"Placement Reality" <noreply@placementreality.org>'}`);
        if (mailOptions.text) {
          console.log(`Content:\n${mailOptions.text}`);
        }
        console.log('======================================================================\n');
        return {
          messageId: `mock-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          accepted: [mailOptions.to],
          isMock: true,
        };
      },
      verify: async () => true,
    };
    console.log('[Email Service] Running in development mode (SMTP credentials not configured; emails logged to console).');
  }

  return transporter;
}

/**
 * Standard branded HTML email layout wrapper
 */
function wrapHtmlEmail({ title, preheader, bodyContent }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; margin: 0; padding: 24px 12px; color: #1e293b; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); padding: 32px 28px; text-align: center; color: #ffffff; }
    .logo-badge { display: inline-block; background: #3b82f6; color: #ffffff; padding: 6px 14px; border-radius: 9999px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 12px; }
    .title { font-size: 22px; font-weight: 800; margin: 0; color: #ffffff; letter-spacing: -0.5px; }
    .subtitle { font-size: 13px; color: #94a3b8; margin-top: 6px; }
    .body-content { padding: 32px 28px; font-size: 14px; line-height: 1.6; color: #334155; }
    .btn { display: inline-block; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 28px; border-radius: 10px; margin: 20px 0; text-align: center; box-shadow: 0 4px 12px rgba(37,99,235,0.3); }
    .btn:hover { background: #1e40af; }
    .token-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; font-family: monospace; font-size: 12px; word-break: break-all; color: #0f172a; margin: 16px 0; }
    .security-notice { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px; margin-top: 24px; font-size: 12px; color: #166534; }
    .footer { background: #f8fafc; padding: 20px 28px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div style="display:none;font-size:1px;color:#333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${preheader || title}
  </div>
  <div class="container">
    <div class="header">
      <div class="logo-badge">Placement Reality Platform</div>
      <h1 class="title">${title}</h1>
      <p class="subtitle">3-Way Truth Triangulation • Student Transparency</p>
    </div>
    <div class="body-content">
      ${bodyContent}
    </div>
    <div class="footer">
      <p><strong>Placement Reality</strong> — Retaliation-Proof Transparency Engine</p>
      <p>This email was dispatched automatically. If you have questions, contact <a href="mailto:placement.reality1@gmail.com" style="color:#2563eb;">placement.reality1@gmail.com</a>.</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Send password reset email with clickable link & secure token
 */
async function sendPasswordResetEmail({ to, name = 'Student', resetUrl, resetToken, expiresMinutes = 60 }) {
  const mailer = getTransporter();
  const from = process.env.SMTP_FROM || `"Placement Reality" <${process.env.SMTP_USER || 'placement.reality1@gmail.com'}>`;

  const bodyContent = `
    <p>Hello <strong>${name}</strong>,</p>
    <p>We received a request to reset your password for your <strong>Placement Reality</strong> account associated with <strong>${to}</strong>.</p>
    <p>Click the button below to choose a new secure password:</p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${resetUrl}" class="btn" target="_blank">Reset Your Password</a>
    </div>
    <p style="font-size: 12px; color: #64748b;">Or copy and paste this link into your browser:</p>
    <div class="token-box">${resetUrl}</div>
    <p style="font-size: 12px; color: #64748b;">Manual Reset Token:</p>
    <div class="token-box">${resetToken}</div>
    <div class="security-notice">
      <strong>Security Notice:</strong>
      <ul style="margin: 6px 0 0; padding-left: 18px;">
        <li>This reset link is valid for <strong>${expiresMinutes} minutes</strong>.</li>
        <li>If you did not request this password reset, please ignore this email. Your password will remain unchanged.</li>
        <li>Never share your reset token or password with anyone.</li>
      </ul>
    </div>
  `;

  const html = wrapHtmlEmail({
    title: 'Reset Your Password',
    preheader: 'Use this secure link to reset your Placement Reality account password.',
    bodyContent,
  });

  const text = `Hello ${name},

We received a request to reset your Placement Reality password.

Click or copy this link to set a new password:
${resetUrl}

Your reset token is: ${resetToken}
This link expires in ${expiresMinutes} minutes.

If you did not request this, you can safely ignore this email.

— Placement Reality Team`;

  return await mailer.sendMail({
    from,
    to,
    subject: '🔐 Reset Your Password — Placement Reality',
    text,
    html,
  });
}

/**
 * Send password change confirmation notification
 */
async function sendPasswordResetSuccessEmail({ to, name = 'Student' }) {
  const mailer = getTransporter();
  const from = process.env.SMTP_FROM || `"Placement Reality" <${process.env.SMTP_USER || 'placement.reality1@gmail.com'}>`;

  const bodyContent = `
    <p>Hello <strong>${name}</strong>,</p>
    <p>Your password for your <strong>Placement Reality</strong> account (<strong>${to}</strong>) has been successfully changed.</p>
    <p>You can now sign in with your new password anytime.</p>
    <div class="security-notice">
      <strong>Didn't make this change?</strong>
      <p style="margin: 4px 0 0;">If you did not authorize this change, please immediately reset your password and contact us at <a href="mailto:placement.reality1@gmail.com" style="color:#166534; font-weight:600;">placement.reality1@gmail.com</a>.</p>
    </div>
  `;

  const html = wrapHtmlEmail({
    title: 'Password Successfully Updated',
    preheader: 'Your Placement Reality account password has been updated.',
    bodyContent,
  });

  return await mailer.sendMail({
    from,
    to,
    subject: '✅ Password Updated Successfully — Placement Reality',
    text: `Hello ${name},\n\nYour Placement Reality account password has been successfully updated.\n\n— Placement Reality Team`,
    html,
  });
}

/**
 * Send email verification link
 */
async function sendEmailVerificationEmail({ to, name = 'Student', verifyUrl, verificationToken }) {
  const mailer = getTransporter();
  const from = process.env.SMTP_FROM || `"Placement Reality" <${process.env.SMTP_USER || 'placement.reality1@gmail.com'}>`;

  const bodyContent = `
    <p>Hello <strong>${name}</strong>,</p>
    <p>Thank you for registering on <strong>Placement Reality</strong> with your official institutional email (<strong>${to}</strong>).</p>
    <p>Please click the button below to confirm your college email:</p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${verifyUrl}" class="btn" target="_blank">Verify College Email</a>
    </div>
    <div class="token-box">${verifyUrl}</div>
  `;

  const html = wrapHtmlEmail({
    title: 'Verify Your College Email',
    preheader: 'Confirm your official college email address on Placement Reality.',
    bodyContent,
  });

  return await mailer.sendMail({
    from,
    to,
    subject: '🎓 Confirm Your College Email — Placement Reality',
    text: `Hello ${name},\n\nPlease verify your email by visiting: ${verifyUrl}\n\n— Placement Reality Team`,
    html,
  });
}

module.exports = {
  getTransporter,
  isSmtpConfigured: () => Boolean(process.env.SMTP_USER && process.env.SMTP_PASS),
  sendPasswordResetEmail,
  sendPasswordResetSuccessEmail,
  sendEmailVerificationEmail,
};

