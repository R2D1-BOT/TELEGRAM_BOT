const express = require('express');
const axios = require('axios');
const router = express.Router();

const Retell = require('retell-sdk').default;

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const RETELL_API_KEY = process.env.RETELL_API_KEY;
const RETELL_AGENT_ID = process.env.RETELL_AGENT_ID;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

// DEBUG explícito para ver si la API Key llega a producción
console.log('DEBUG ENV Retell API Key:', RETELL_API_KEY ? 'DETECTADA' : 'VACÍA');

const retellClient = new Retell({
  apiKey: RETELL_API_KEY,
});

const sessions = {}; // user_id → chat_id de Retell AI

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

    console.log(`Usuario ${user_id}: ${text}`);
    const retell_chat_id = `telegram-${user_id}`;

    console.log(`Enviando mensaje a Retell (chat_id: ${retell_chat_id})`);
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
      console.log(`Respuesta de Retell: ${reply}`);

      await axios.post(TELEGRAM_API_URL, {
        chat_id: user_id,
        text: reply
      });
      console.log("Respuesta enviada a Telegram.");

    } catch (retellError) {
      console.error('ERROR del SDK de Retell AI:', retellError?.response?.data || retellError.message);
      const errorText = retellError.message || 'Error desconocido del SDK de Retell AI.';
      try {
        await axios.post(TELEGRAM_API_URL, {
          chat_id: user_id,
          text: `Lo siento, el motor de IA de Retell tuvo un error: ${errorText.substring(0, 150)}...`,
        });
      } catch (e) {
        console.error("Error al enviar mensaje de error a Telegram:", e);
      }
      return res.status(500).json({ error: `Retell AI SDK error: ${errorText}` });
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Error general en webhook:', err?.response?.data || err.message);
    res.sendStatus(500);
  }
});

module.exports = router;

});

module.exports = router;


