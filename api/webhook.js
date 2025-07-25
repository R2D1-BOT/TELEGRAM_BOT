const express = require('express');
const axios = require('axios');
const router = express.Router();

const Retell = require('retell-sdk').default;

// PON LA CLAVE A MANO DIRECTA, NO uses process.env para apiKey
const retellClient = new Retell({
  apiKey: 'key_7e77c634b8d3c2c74783639a1cd0'
});

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const RETELL_AGENT_ID = process.env.RETELL_AGENT_ID;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

router.get('/test', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Webhook endpoint working',
    timestamp: new Date().toISOString()
  });
});

router.post('/webhook', async (req, res) => {
  try {
    console.log('Mensaje recibido:', JSON.stringify(req.body, null, 2));

    const msg = req.body.message;
    if (!msg || !msg.text || !msg.chat || !msg.chat.id) {
      return res.sendStatus(200); // Ignorar mensajes no válidos
    }

    const user_id = msg.chat.id.toString();
    const text = msg.text;

    const retell_chat_id = `telegram-${user_id}`;

    try {
      const retellResponse = await retellClient.chat.createChatCompletion({
        chat_id: retell_chat_id,
        content: text,
        agent_id: RETELL_AGENT_ID,
      });

      const responseMessages = retellResponse.messages;
      let reply = "Disculpa, no pude obtener una respuesta clara de Retell AI.";
      if (responseMessages && responseMessages.length > 0) {
        const agentMessage = responseMessages.find(m => m.role === 'agent' && m.content);
        if (agentMessage) {
          reply = agentMessage.content;
        }
      }

      await axios.post(TELEGRAM_API_URL, {
        chat_id: user_id,
        text: reply
      });

    } catch (retellError) {
      const errorText = retellError.message || 'Error desconocido del SDK de Retell AI.';
      try {
        await axios.post(TELEGRAM_API_URL, {
          chat_id: user_id,
          text: `Lo siento, el motor de IA de Retell tuvo un error: ${errorText.substring(0, 150)}...`,
        });
      } catch (e) {}
      return res.status(500).json({ error: `Retell AI SDK error: ${errorText}` });
    }

    res.sendStatus(200);
  } catch (err) {
    res.sendStatus(500);
  }
});

module.exports = router;


