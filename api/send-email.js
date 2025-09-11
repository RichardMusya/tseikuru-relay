// api/send-email.js
import nodemailer from 'nodemailer';
import { google } from 'googleapis';

const OAuth2 = google.auth.OAuth2;

const ONE_MINUTE = 60 * 1000;

// read env
const {
  GMAIL_USER,             // email address that will send (e.g. youraccount@gmail.com)
  RECIPIENT_EMAIL,        // where messages are delivered (your Gmail)
  USE_APP_PASSWORD,       // set 'true' to use APP password mode instead of OAuth2
  GMAIL_APP_PASSWORD,     // app password (if using app password mode)
  GMAIL_CLIENT_ID,
  GMAIL_CLIENT_SECRET,
  GMAIL_REFRESH_TOKEN,
  FORM_SERVER_SECRET,     // optional secret header expected from client
} = process.env;

const jsonResponse = (res, status, payload) => {
  res.status(status).json(payload);
};

const createTransporter = async () => {
  if (USE_APP_PASSWORD === 'true') {
    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      throw new Error('Missing GMAIL_USER or GMAIL_APP_PASSWORD for app-password mode.');
    }
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD,
      },
    });
  }

  // OAuth2 mode
  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN || !GMAIL_USER) {
    throw new Error('Missing OAuth2 environment variables.');
  }

  const oAuth2Client = new OAuth2(
    GMAIL_CLIENT_ID,
    GMAIL_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground' // redirect (not used here)
  );

  oAuth2Client.setCredentials({
    refresh_token: GMAIL_REFRESH_TOKEN,
  });

  // Get access token (nodemailer can accept the getAccessToken function)
  const accessToken = await new Promise((resolve, reject) => {
    oAuth2Client.getAccessToken((err, token) => {
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
};

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return jsonResponse(res, 405, { error: 'Method not allowed' });
    }

    // Optional: check simple shared secret header to reduce abuse
    if (FORM_SERVER_SECRET) {
      const headerSecret = req.headers['x-form-secret'];
      if (!headerSecret || headerSecret !== FORM_SERVER_SECRET) {
        return jsonResponse(res, 401, { error: 'Unauthorized' });
      }
    }

    const { name, email, message, subject } = req.body || {};

    // Basic validation
    if (
      !name ||
      !email ||
      !message ||
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      typeof message !== 'string'
    ) {
      return jsonResponse(res, 400, { error: 'Missing required fields: name, email, message' });
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedMessage = message.trim();
    const mailSubject = (subject && String(subject).trim()) || `Contact from ${trimmedName}`;

    // simple email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return jsonResponse(res, 400, { error: 'Invalid email' });
    }

    const transporter = await createTransporter();

    const htmlBody = `
      <p><strong>From:</strong> ${trimmedName} &lt;${trimmedEmail}&gt;</p>
      <p><strong>Subject:</strong> ${mailSubject}</p>
      <p><strong>Message:</strong></p>
      <div style="white-space:pre-wrap;border-left:4px solid #ddd;padding-left:10px;">${trimmedMessage}</div>
      <hr/>
      <p>Sent via Tseikuru Times contact form.</p>
    `;

    const mailOptions = {
      from: `"${trimmedName}" <${GMAIL_USER}>`, // from the server's gmail user, display sender name
      to: RECIPIENT_EMAIL || GMAIL_USER, // deliver to configured recipient
      subject: mailSubject,
      text: `${trimmedMessage}\n\nFrom: ${trimmedName} <${trimmedEmail}>`,
      html: htmlBody,
      replyTo: trimmedEmail, // convenient to reply directly to user's email
    };

    // send mail
    await transporter.sendMail(mailOptions);

    return jsonResponse(res, 200, { ok: true });
  } catch (err) {
    console.error('send-email error:', err);
    return jsonResponse(res, 500, { error: 'Server error sending email' });
  }
}
