const express = require('express');
const axios = require('axios'); // Todavía necesario para Telegram
const router = express.Router();
const Retell = require('retell-sdk').default;; // Importar el SDK de Retell AI

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const RETELL_API_KEY = process.env.RETELL_API_KEY;
const RETELL_AGENT_ID = process.env.RETELL_AGENT_ID; // Asegúrate de que este ID sea correcto
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

// Inicializar el cliente de Retell AI con tu API Key
const retellClient = new Retell({
  apiKey: RETELL_API_KEY,
} );

const sessions = {}; // user_id → chat_id de Retell AI

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Webhook endpoint working',
    timestamp: new Date().toISOString()
  });
});

// Webhook endpoint para Telegram
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

    // El chat_id para Retell AI debe ser persistente por usuario de Telegram
    // No necesitas llamar a un endpoint /create-chat. Simplemente usa un ID único.
    const retell_chat_id = `telegram-${user_id}`;

    // Enviar mensaje a Retell AI usando el SDK
    console.log(`Enviando mensaje a Retell (chat_id: ${retell_chat_id})`);
    try {
      const retellResponse = await retellClient.chat.createChatCompletion({
        chat_id: retell_chat_id,
        content: text,
        agent_id: RETELL_AGENT_ID, // Asegúrate de que este agent_id sea correcto y exista en Retell AI
      });

      const responseMessages = retellResponse.messages;
      let reply = "Disculpa, no pude obtener una respuesta clara de Retell AI.";
      if (responseMessages && responseMessages.length > 0) {
        // Buscar el mensaje del agente
        const agentMessage = responseMessages.find(m => m.role === 'agent' && m.content);
        if (agentMessage) {
          reply = agentMessage.content;
        }
      }
      console.log(`Respuesta de Retell: ${reply}`);
      
      // Enviar respuesta a Telegram
      await axios.post(TELEGRAM_API_URL, {
        chat_id: user_id,
        text: reply
      });
      console.log("Respuesta enviada a Telegram.");

    } catch (retellError) {
      console.error('ERROR del SDK de Retell AI:', retellError?.response?.data || retellError.message);
      const errorText = retellError.message || 'Error desconocido del SDK de Retell AI.';
      // Intentar enviar un mensaje de error a Telegram
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


