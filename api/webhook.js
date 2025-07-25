const express = require('express');
const axios = require('axios');
const router = express.Router();
const Retell = require('retell-sdk').default;

const RETELL_API_KEY = process.env.RETELL_API_KEY;
const RETELL_AGENT_ID = process.env.RETELL_AGENT_ID;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

const retellClient = new Retell({
  apiKey: RETELL_API_KEY,
});

router.post('/webhook', async (req, res) => {
  console.log('DEBUG ENV RETELL_API_KEY:', RETELL_API_KEY ? 'SET' : 'NOT SET');
  console.log('DEBUG ENV RETELL_AGENT_ID:', RETELL_AGENT_ID ? 'SET' : 'NOT SET');
  console.log('DEBUG ENV TELEGRAM_BOT_TOKEN:', TELEGRAM_BOT_TOKEN ? 'SET' : 'NOT SET');
  console.log('Webhook payload:', JSON.stringify(req.body));

  try {
    const msg = req.body.message;
    if (!msg || !msg.text || !msg.chat || !msg.chat.id) {
      console.log('Mensaje inválido o incompleto recibido');
      return res.sendStatus(200);
    }

    const user_id = msg.chat.id.toString();
    const text = msg.text;
    const retell_chat_id = `telegram-${user_id}`;

    let retellResponse;
    try {
      retellResponse = await retellClient.chat.createChatCompletion({
        chat_id: retell_chat_id,
        content: text,
        agent_id: RETELL_AGENT_ID,
      });
      console.log('Retell response:', JSON.stringify(retellResponse));
    } catch (e) {
      console.error('Error en Retell SDK:', e);
      return res.sendStatus(500);
    }

    const responseMessages = retellResponse.messages;
    let reply = "Disculpa, no pude obtener una respuesta clara de Retell AI.";
    if (responseMessages && responseMessages.length > 0) {
      const agentMessage = responseMessages.find(m => m.role === 'agent' && m.content);
      if (agentMessage) reply = agentMessage.content;
    }

    try {
      await axios.post(TELEGRAM_API_URL, {
        chat_id: user_id,
        text: reply,
      });
      console.log('Respuesta enviada a Telegram:', reply);
    } catch (e) {
      console.error('Error enviando mensaje a Telegram:', e);
      return res.sendStatus(500);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Error general en webhook:', error);
    res.sendStatus(500);
  }
});

module.exports = router;


