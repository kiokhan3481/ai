module.exports = (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "telegram-groq-bot",
    hint: "Set the Telegram webhook to /api/webhook",
  });
};
