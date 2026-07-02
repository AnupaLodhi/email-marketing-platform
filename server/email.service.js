const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendWelcomeEmail(email, name) {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Welcome 🚀",
      html: `
        <h2>Hello ${name}</h2>
        <p>Welcome to our system 🎉</p>
      `,
    });

    console.log("Email sent to:", email);
  } catch (err) {
    console.log("Email error:", err.message);
  }
}

module.exports = { sendWelcomeEmail };