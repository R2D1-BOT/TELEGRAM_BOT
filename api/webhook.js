const express = require('express');
const axios = require('axios');
const router = express.Router();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const RETELL_API_KEY = process.env.RETELL_API_KEY;
const RETELL_AGENT_ID = process.env.RETELL_AGENT_ID;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
const RETELL_BASE_URL = "https://api.retellai.com"; // ✅ CORREGIDO: Sin /v3

const sessions = {}; // user_id → chat_id

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
      return res.sendStatus(200);
    }

    const user_id = msg.chat.id.toString();
    const text = msg.text;
    
    console.log(`Usuario ${user_id}: ${text}`);

    let chat_id = sessions[user_id];
    
    // Crear nueva sesión si no existe
    if (!chat_id) {
      console.log('Creando nueva sesión con Retell...');
      try {
        const createChat = await axios.post(
          `${RETELL_BASE_URL}/create-chat`, // ✅ CORREGIDO: /create-chat directo
          { agent_id: RETELL_AGENT_ID },
          { 
            headers: { 
              'Authorization': `Bearer ${RETELL_API_KEY}`,
              'Content-Type': 'application/json'
            } 
          }
        );
        chat_id = createChat.data.chat_id;
        sessions[user_id] = chat_id;
        console.log(`Sesión creada: ${chat_id}`);
      } catch (createError) {
        console.error('Error creando chat:', createError?.response?.data || createError.message);
        throw createError;
      }
    }

    // Enviar mensaje a Retell AI
    console.log(`Enviando mensaje a Retell (chat_id: ${chat_id})`);
    const completion = await axios.post(
      `${RETELL_BASE_URL}/create-chat-completion`, // ✅ CORREGIDO: Sin /v3
      { chat_id, content: text },
      { 
        headers: { 
          'Authorization': `Bearer ${RETELL_API_KEY}`,
          'Content-Type': 'application/json'
        } 
      }
    );

    const responseMessages = completion.data.messages;
    if (responseMessages && responseMessages.length > 0) {
      const reply = responseMessages.map(m => m.content).join('\n\n');
      console.log(`Respuesta de Retell: ${reply}`);
      
      await axios.post(TELEGRAM_API_URL, {
        chat_id: user_id,
        text: reply
      });
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Error en webhook:', err?.response?.data || err.message);
    res.sendStatus(500);
  }
});

module.exports = router;

