const express = require('express');
const axios = require('axios');
const router = express.Router();
const Retell = require('retell-sdk').default;

// IMPORTANTE: Usa la clave hardcodeada solo para test:
const retellClient = new Retell({
  apiKey: 'key_7e77c634b8d3c2c74783639a1cd0',
});

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const RETELL_AGENT_ID = process.env.RETELL_AGENT_ID;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

router.post('/webhook', async (req, res) => {
  try {
    console.log('Webhook received:', JSON.stringify(req.body, null, 2));

    const msg = req.body.message;
    if (!msg || !msg.text || !msg.chat || !msg.chat.id) {
      console.log('Mensaje inválido o incompleto');
      return res.sendStatus(200); // Ignorar sin error
    }

    const user_id = msg.chat.id.toString();
    const text = msg.text;
    const retell_chat_id = `telegram-${user_id}`;

    const retellResponse = await retellClient.chat.createChatCompletion({
      chat_id: retell_chat_id,
      content: text,
      agent_id: RETELL_AGENT_ID,
    });

    const responseMessages = retellResponse.messages;
    let reply = "Disculpa, no pude obtener una respuesta clara de Retell AI.";
    if (responseMessages && responseMessages.length > 0) {
      const agentMessage = responseMessages.find(m => m.role === 'agent' && m.content);
      if (agentMessage) reply = agentMessage.content;
    }

    await axios.post(TELEGRAM_API_URL, {
      chat_id: user_id,
      text: reply,
    });

    console.log(`Respuesta enviada a Telegram: ${reply}`);

    res.sendStatus(200);
  } catch (error) {
    console.error('Error en webhook:', error);
    res.sendStatus(500);
  }
});

module.exports = router;
