// api/send-email.js
import nodemailer from 'nodemailer';
import { google } from 'googleapis';

const OAuth2 = google.auth.OAuth2;

const {
  GMAIL_USER,           // the Gmail address that will send messages (e.g. youraccount@gmail.com)
  RECIPIENT_EMAIL,      // where messages should be delivered (e.g. your gmail)
  USE_APP_PASSWORD,     // 'true' to use app password instead of OAuth2
  GMAIL_APP_PASSWORD,   // app password (if using app password)
  GMAIL_CLIENT_ID,      // OAuth client id (if using OAuth)
  GMAIL_CLIENT_SECRET,  // OAuth client secret
  GMAIL_REFRESH_TOKEN,  // OAuth refresh token
  FORM_SERVER_SECRET,   // optional: simple shared secret required in x-form-secret header
} = process.env;

const json = (res, status, body) => res.status(status).json(body);

/**
 * Create nodemailer transporter using app password or OAuth2.
 */
async function createTransporter() {
  if (USE_APP_PASSWORD === 'true') {
    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) throw new Error('Missing app password env vars');
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    });
  }

  // OAuth2 mode
  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN || !GMAIL_USER) {
    throw new Error('Missing OAuth2 environment variables.');
  }

  const oauth2Client = new OAuth2(
    GMAIL_CLIENT_ID,
    GMAIL_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground' // redirect - not used here
  );

  oauth2Client.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN });

  const accessToken = await new Promise((resolve, reject) => {
    oauth2Client.getAccessToken((err, token) => {
      if (err) return reject(err);
      resolve(token);
    });
  });

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: GMAIL_USER,
      clientId: GMAIL_CLIENT_ID,
      clientSecret: GMAIL_CLIENT_SECRET,
      refreshToken: GMAIL_REFRESH_TOKEN,
      accessToken,
    },
  });
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

    // Optional: require shared secret header to reduce casual abuse
    if (FORM_SERVER_SECRET) {
      const header = req.headers['x-form-secret'];
      if (!header || header !== FORM_SERVER_SECRET) {
        return json(res, 401, { error: 'Unauthorized' });
      }
    }

    const { name, email, message, subject } = req.body || {};

    if (!name || !email || !message) {
      return json(res, 400, { error: 'Missing required fields: name, email, message' });
    }

    const trimmedName = String(name).trim();
    const trimmedEmail = String(email).trim().toLowerCase();
    const trimmedMessage = String(message).trim();
    const mailSubject = (subject && String(subject).trim()) || `Contact from ${trimmedName}`;

    // basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return json(res, 400, { error: 'Invalid email' });
    }

    const transporter = await createTransporter();

    const html = `
      <p><strong>From:</strong> ${trimmedName} &lt;${trimmedEmail}&gt;</p>
      <p><strong>Subject:</strong> ${mailSubject}</p>
      <p><strong>Message:</strong></p>
      <div style="white-space:pre-wrap;border-left:4px solid #ddd;padding-left:10px;">${trimmedMessage}</div>
      <hr/>
      <p>Sent from Tseikuru Times contact form</p>
    `;

    const info = await transporter.sendMail({
      from: `"${trimmedName}" <${GMAIL_USER}>`,
      to: RECIPIENT_EMAIL || GMAIL_USER,
      subject: mailSubject,
      text: `${trimmedMessage}\n\nFrom: ${trimmedName} <${trimmedEmail}>`,
      html,
      replyTo: trimmedEmail,
    });

    // nodemailer returns info; success
    return json(res, 200, { ok: true, messageId: info?.messageId || null });
  } catch (err) {
    console.error('send-email error:', err?.message || err);
    return json(res, 500, { error: 'Server error sending email' });
  }
}
