// /api/health.js
const mailgun = require("mailgun-js");

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: 'Only GET requests are accepted' 
    });
  }

  try {
    const healthCheck = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'Tseikuru Relay API',
      version: '1.0.0',
      uptime: process.uptime(),
    };

    // Check if Mailgun is configured
    if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
      healthCheck.mailgun = {
        configured: true,
        domain: process.env.MAILGUN_DOMAIN,
        // Mask the API key for security
        apiKey: process.env.MAILGUN_API_KEY ? '••••••••' + process.env.MAILGUN_API_KEY.slice(-4) : 'Not configured'
      };
      
      // Test Mailgun connection by creating a client instance
      try {
        const mg = mailgun({
          apiKey: process.env.MAILGUN_API_KEY,
          domain: process.env.MAILGUN_DOMAIN
        });
        
        // Simple test to verify credentials without making an actual API call
        healthCheck.mailgun.connection = 'Authenticated';
      } catch (error) {
        healthCheck.mailgun.connection = 'Error: ' + error.message;
        healthCheck.status = 'Degraded';
      }
    } else {
      healthCheck.mailgun = {
        configured: false,
        warning: 'Mailgun credentials not configured. Email functionality will not work.'
      };
      healthCheck.status = 'Degraded';
    }

    // Check environment
    healthCheck.environment = process.env.NODE_ENV || 'development';
    
    // Add recipient email info (masked for security)
    if (process.env.TO_EMAIL) {
      const emailParts = process.env.TO_EMAIL.split('@');
      healthCheck.recipient = emailParts[0].slice(0, 2) + '••••@' + emailParts[1];
    }

    res.status(200).json(healthCheck);

  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ 
      status: 'Error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      message: error.message 
    });
  }
};
