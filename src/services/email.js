const nodemailer = require('nodemailer');

const host = process.env.SMTP_HOST;
const port = parseInt(process.env.SMTP_PORT || '587', 10);
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;

let transporter = null;

if (host && user && pass) {
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
}

async function sendEmail({ to, subject, text, html }) {
  console.log(`\n==================================================`);
  console.log(`[EMAIL SENDING DETECTED]`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Content:\n${text || html}`);
  console.log(`==================================================\n`);

  if (!transporter) {
    console.log(`[SMTP WARNING] SMTP configuration not found in environment. Email logged to console instead.`);
    return { mock: true, messageId: 'mock-id-' + Date.now() };
  }

  try {
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'Hệ thống Quản lý Ảnh'}" <${user}>`,
      to,
      subject,
      text,
      html,
    });
    console.log(`[EMAIL SUCCESS] Message sent: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[EMAIL ERROR] Failed to send email:`, error.message);
    throw error;
  }
}

module.exports = {
  sendEmail,
};
