// api/send-email.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, email, message } = req.body;

  try {
    const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.EMAILJS_PRIVATE_KEY}`, // 🔐 keep private
      },
      body: JSON.stringify({
        service_id: "service_fy1i4wq",
        template_id: "template_jx584qa",
        user_id: "BnbO2ytVOy7ObTH8P", // public key
        template_params: {
          from_name: name,
          reply_to: email,
          message: message,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(400).json({ error: errorText });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Relay Error:", err);
    res.status(500).json({ error: "Failed to send email" });
  }
}
