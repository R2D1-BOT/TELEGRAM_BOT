const axios = require("axios");

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const RETELL_API_KEY = process.env.RETELL_API_KEY;
const RETELL_AGENT_ID = process.env.RETELL_AGENT_ID;

const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
const RETELL_BASE_URL = "https://api.retellai.com/v3";

const sessions = {}; // user_id → chat_id

module.exports = async (req, res) => {
  try {
    const msg = req.body.message;
    if (!msg || !msg.text || !msg.chat || !msg.chat.id) {
      return res.sendStatus(200);
    }

    const user_id = msg.chat.id.toString();
    const text = msg.text;
    let chat_id = sessions[user_id];

    if (!chat_id) {
      const createChat = await axios.post(
        `${RETELL_BASE_URL}/create-chat`,
        { agent_id: RETELL_AGENT_ID },
        { headers: { Authorization: `Bearer ${RETELL_API_KEY}` } }
      );

      chat_id = createChat.data.chat_id;
      sessions[user_id] = chat_id;
    }

    const completion = await axios.post(
      `${RETELL_BASE_URL}/create-chat-completion`,
      { chat_id, content: text },
      { headers: { Authorization: `Bearer ${RETELL_API_KEY}` } }
    );

    const responseMessages = completion.data.messages;
    if (responseMessages && responseMessages.length > 0) {
      const reply = responseMessages.map(m => m.content).join("\n\n");
      await axios.post(TELEGRAM_API_URL, {
        chat_id: user_id,
        text: reply
      });
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Error en webhook:", err?.response?.data || err.message);
    res.sendStatus(500);
  }
};

