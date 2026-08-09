const nodemailer = require("nodemailer");

const createTransporter = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

const sendPasswordReset = async (to, token) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("[Email] SMTP_USER/SMTP_PASS not set - skipping.");
    return;
  }
  const appName = process.env.APP_NAME || "Agro Rental Platform";
  const resetUrl = (process.env.CLIENT_URL || "http://localhost:5173") + "/reset-password?token=" + token;
  const html = "<h2 style=font-family:Arial>Password Reset</h2><p>Click the link below to reset your password (expires in 1 hour):</p><p><a href="+resetUrl+">" + resetUrl + "</a></p><p style=color:#999>If you did not request this, ignore this email.</p>";
  await createTransporter().sendMail({
    from: appName + " <" + process.env.SMTP_USER + ">",
    to,
    subject: "Password Reset Request",
    html,
  });
  console.log("[Email] Reset email sent to", to);
};

module.exports = { sendPasswordReset };