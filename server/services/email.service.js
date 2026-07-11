const fetch = require("node-fetch");

const sendEmail = async ({ to, subject, html }) => {
  const res = await fetch("http://localhost:5000/api/send-email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.EMAIL_BACKEND_KEY,
    },
    body: JSON.stringify({ to, subject, text: html }),
  });

  const data = await res.json();
  return data;
};

module.exports = { sendEmail };