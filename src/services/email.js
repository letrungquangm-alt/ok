const nodemailer = require('nodemailer');
const { query } = require('../config/db');

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

async function sendEmail({ to, subject, text, html, attachments }) {
  console.log(`\n==================================================`);
  console.log(`[EMAIL SENDING DETECTED]`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Content:\n${text || html}`);
  if (attachments && attachments.length > 0) {
    console.log(`Attachments: ${attachments.map(a => a.filename || a.cid).join(', ')}`);
  }
  console.log(`==================================================\n`);

  if (!transporter) {
    console.log(`[SMTP WARNING] SMTP configuration not found in environment. Email logged to console instead.`);
    await query(
      'INSERT INTO sent_emails (to_email, subject, body, html_body) VALUES ($1, $2, $3, $4)',
      [to, subject, text || '', html || '']
    ).catch(err => console.error('Lỗi lưu email giả lập vào database:', err.message));
    return { mock: true, messageId: 'mock-id-' + Date.now() };
  }

  let fromName = process.env.SMTP_FROM_NAME || 'HoangKiet';
  try {
    const fromNameRes = await query("SELECT value FROM web_settings WHERE key = 'email_from_name'");
    if (fromNameRes.rows.length > 0 && fromNameRes.rows[0].value && fromNameRes.rows[0].value.trim()) {
      fromName = fromNameRes.rows[0].value.trim();
    }
  } catch (e) {
    console.error('Lỗi khi lấy cấu hình tên người gửi email:', e.message);
  }

  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${user}>`,
      to,
      subject,
      text,
      html,
      attachments,
    });
    console.log(`[EMAIL SUCCESS] Message sent: ${info.messageId}`);
    await query(
      'INSERT INTO sent_emails (to_email, subject, body, html_body) VALUES ($1, $2, $3, $4)',
      [to, subject, text || '', html || '']
    ).catch(err => console.error('Lỗi lưu email gửi thành công vào database:', err.message));
    return info;
  } catch (error) {
    console.error(`[EMAIL ERROR] Failed to send email:`, error.message);
    throw error;
  }
}

module.exports = {
  sendEmail,
};
