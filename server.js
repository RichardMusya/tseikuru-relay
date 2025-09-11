// server.js
const express = require('express');
const cors = require('cors');
const mailgun = require('mailgun-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Mailgun configuration
const mg = mailgun({
  apiKey: process.env.MAILGUN_API_KEY,
  domain: process.env.MAILGUN_DOMAIN
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Email endpoint
app.post('/api/send-email', async (req, res) => {
  try {
    const { name, email, message, subject } = req.body;

    // Validate input
    if (!name || !email || !message) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, email, and message are required' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Prepare email data
    const emailData = {
      from: `${name} <${email}>`,
      to: process.env.TO_EMAIL || 'richardmusya9@gmail.com',
      subject: subject || `New Contact Form Message from ${name}`,
      text: `
Name: ${name}
Email: ${email}
Message: ${message}

Sent from Tseikuru Times Contact Form
      `,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #e60026;">New Contact Form Submission</h2>
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

    // Send email
    mg.messages().send(emailData, (error, body) => {
      if (error) {
        console.error('Mailgun error:', error);
        return res.status(500).json({ 
          error: 'Failed to send email', 
          details: error.message 
        });
      }
      
      console.log('Email sent successfully:', body);
      res.status(200).json({ 
        success: true, 
        message: 'Email sent successfully',
        id: body.id 
      });
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
});

// Handle undefined routes
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check available at: http://localhost:${PORT}/api/health`);
});

module.exports = app;
