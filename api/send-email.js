// api/send-email.js
const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { name, email, message, subject } = req.body || {};

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Missing name, email or message' });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(email).trim().toLowerCase())) {
      return res.status(400).json({ error: 'Invalid email' });
    }

    const GMAIL_USER = process.env.GMAIL_USER;
    const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
    const RECIPIENT_EMAIL = process.env.RECIPIENT_EMAIL || GMAIL_USER;

    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      console.error('Missing GMAIL_USER or GMAIL_APP_PASSWORD');
      return res.status(500).json({ error: 'Server not configured' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD
      }
    });

    const mailSubject = subject || `Contact from ${name}`;
    const html = `
      <p><strong>From:</strong> ${name} &lt;${email}&gt;</p>
      <p><strong>Subject:</strong> ${mailSubject}</p>
      <p><strong>Message:</strong></p>
      <div style="white-space:pre-wrap;border-left:4px solid #ddd;padding-left:10px;">${message}</div>
    `;

    await transporter.sendMail({
      from: `"${name}" <${GMAIL_USER}>`,
      to: RECIPIENT_EMAIL,
      subject: mailSubject,
      text: `${message}\n\nFrom: ${name} <${email}>`,
      html,
      replyTo: email
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('send-email error', err);
    return res.status(500).json({ error: 'Server error sending email' });
  }
};
