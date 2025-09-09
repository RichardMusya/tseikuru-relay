// api/send-email.js

export default async function handler(req, res) {
  // --- CORS headers for Android & Web ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end(); // Handle preflight
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Forward to EmailJS REST API
    const r = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: "service_fy1i4wq",      // your EmailJS service ID
        template_id: "template_jx584qa",    // your EmailJS template ID
        user_id: "BnbO2ytVOy7ObTH8P",       // your EmailJS public key
        template_params: {
          from_name: name,
          from_email: email,
          message,
        },
      }),
    });

    if (!r.ok) {
      const errText = await r.text();
      return res.status(500).json({ error: "EmailJS error: " + errText });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Server error: " + err.message });
  }
}
