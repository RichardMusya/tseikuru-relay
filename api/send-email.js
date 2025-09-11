// /api/send-email.js
const mailgun = require("mailgun-js");

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: 'Only POST requests are accepted' 
    });
  }

  try {
    const { name, email, message, subject } = req.body;

    // Validate input
    if (!name || !email || !message) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'Name, email, and message are required' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Invalid email format',
        message: 'Please provide a valid email address' 
      });
    }

    // Check if Mailgun credentials are configured
    if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
      console.error('Mailgun credentials not configured');
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'Email service is not properly configured. Please try again later.' 
      });
    }

    // Initialize Mailgun
    const mg = mailgun({
      apiKey: process.env.MAILGUN_API_KEY,
      domain: process.env.MAILGUN_DOMAIN
    });

    // Determine recipient email
    const toEmail = process.env.TO_EMAIL || 'richardmusya9@gmail.com';

    // Email data
    const emailData = {
      from: `${name} <${email}>`,
      to: toEmail,
      subject: subject || `New Contact Form Message from ${name}`,
      text: `
Name: ${name}
Email: ${email}
Message: ${message}

Sent from Tseikuru Times Contact Form
      `,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #e60026;">New Contact Form Submission - Tseikuru Times</h2>
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px;">
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
            <p><strong>Message:</strong></p>
            <div style="background-color: white; padding: 15px; border-left: 4px solid #e60026; margin: 10px 0;">
              ${message.replace(/\n/g, '<br>')}
            </div>
          </div>
          <p style="color: #666; font-size: 14px; margin-top: 20px;">
            Sent from Tseikuru Times Contact Form on ${new Date().toLocaleString()}
          </p>
        </div>
      `
    };

    // Send email using Promise-based approach
    const result = await new Promise((resolve, reject) => {
      mg.messages().send(emailData, (error, body) => {
        if (error) {
          reject(error);
        } else {
          resolve(body);
        }
      });
    });

    console.log('Email sent successfully:', result);
    
    res.status(200).json({ 
      success: true, 
      message: 'Email sent successfully',
      id: result.id 
    });

  } catch (error) {
    console.error('Mailgun error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to send email. Please try again later.';
    
    if (error.message.includes('Forbidden')) {
      errorMessage = 'Email service authentication failed.';
    } else if (error.message.includes('Domain not found')) {
      errorMessage = 'Email service configuration error.';
    } else if (error.message.includes('Network')) {
      errorMessage = 'Network error. Please check your connection.';
    }
    
    res.status(500).json({ 
      error: 'Email sending failed',
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
