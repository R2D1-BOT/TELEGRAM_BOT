const express = require('express');
const axios = require('axios');
const router = express.Router();
const Retell = require('retell-sdk').default;

const RETELL_API_KEY = process.env.RETELL_API_KEY;
const RETELL_AGENT_ID = process.env.RETELL_AGENT_ID;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

console.log('Variables cargadas:');
console.log('RETELL_API_KEY:', RETELL_API_KEY ? 'DEFINIDA' : 'VACÍA');
console.log('RETELL_AGENT_ID:', RETELL_AGENT_ID ? 'DEFINIDA' : 'VACÍA');
console.log('TELEGRAM_BOT_TOKEN:', TELEGRAM_BOT_TOKEN ? 'DEFINIDA' : 'VACÍA');

const retellClient = new Retell({ apiKey: RETELL_API_KEY });

// Almacenar chat_ids por usuario y timeouts
const userChats = {};
const userTimeouts = {};

router.post('/webhook', async (req, res) => {
  console.log('Webhook payload:', JSON.stringify(req.body));

  const msg = req.body.message;
  if (!msg || !msg.text || !msg.chat || !msg.chat.id) {
    return res.sendStatus(200);
  }

  const user_id = msg.chat.id.toString();
  const text = msg.text;

  try {
    let chat_id;

    // Cancelar timeout anterior si existe
    if (userTimeouts[user_id]) {
      clearTimeout(userTimeouts[user_id]);
      delete userTimeouts[user_id];
    }

    // Si ya tiene un chat creado, usar ese
    if (userChats[user_id]) {
      chat_id = userChats[user_id];
      console.log(`Usando chat existente para usuario ${user_id}: ${chat_id}`);
    } else {
      // Crear nuevo chat para este usuario
      console.log(`Creando nuevo chat para usuario ${user_id} con agent_id: ${RETELL_AGENT_ID}`);
      
      const chatResponse = await retellClient.chat.create({
        agent_id: RETELL_AGENT_ID
      });
      
      chat_id = chatResponse.chat_id;
      userChats[user_id] = chat_id;
      console.log(`Chat creado exitosamente: ${chat_id}`);
    }

    // Enviar mensaje al chat
    console.log(`Enviando mensaje al chat ${chat_id}: "${text}"`);
    
    const retellResponse = await retellClient.chat.createChatCompletion({
      chat_id: chat_id,
      content: text
    });

    console.log('Respuesta de Retell:', JSON.stringify(retellResponse));

    // Extraer respuesta del agente
    const responseMessages = retellResponse.messages;
    let reply = "No tengo respuesta para ti.";
    
    if (responseMessages && responseMessages.length > 0) {
      const agentMessage = responseMessages.find(m => m.role === 'agent' && m.content);
      if (agentMessage) {
        reply = agentMessage.content;
      }
    }

    // Enviar respuesta a Telegram
    await axios.post(TELEGRAM_API_URL, {
      chat_id: user_id,
      text: reply,
    });

    console.log(`Respuesta enviada a Telegram usuario ${user_id}: ${reply}`);

    // Programar cierre del chat por inactividad (10 minutos)
    userTimeouts[user_id] = setTimeout(async () => {
      try {
        console.log(`Cerrando chat por inactividad para usuario ${user_id}`);
        
        // Enviar mensaje de cierre
        await axios.post(TELEGRAM_API_URL, {
          chat_id: user_id,
          text: "Chat cerrado por inactividad. Escribe cualquier mensaje para iniciar una nueva conversación.",
        });

        // Cerrar chat en Retell si existe el método
        if (userChats[user_id]) {
          try {
            await retellClient.chat.end({ chat_id: userChats[user_id] });
            console.log(`Chat ${userChats[user_id]} cerrado en Retell`);
          } catch (endError) {
            console.log('No se pudo cerrar el chat en Retell (método no disponible)');
          }
        }

        // Limpiar datos del usuario
        delete userChats[user_id];
        delete userTimeouts[user_id];
        
      } catch (timeoutError) {
        console.error('Error en timeout de inactividad:', timeoutError);
      }
    }, 10 * 60 * 1000); // 10 minutos

    res.sendStatus(200);

  } catch (error) {
    console.error('ERROR COMPLETO:', {
      message: error.message,
      status: error.status,
      response: error.response?.data,
      stack: error.stack
    });

    // Enviar mensaje de error al usuario
    try {
      await axios.post(TELEGRAM_API_URL, {
        chat_id: user_id,
        text: "Lo siento, hay un problema técnico. Inténtalo de nuevo.",
      });
    } catch (telegramError) {
      console.error('Error enviando mensaje de error a Telegram:', telegramError.message);
    }

    res.sendStatus(500);
  }
});

// Endpoint de prueba
router.get('/test', (req, res) => {
  res.json({
    status: 'OK',
    variables: {
      RETELL_API_KEY: RETELL_API_KEY ? 'DEFINIDA' : 'VACÍA',
      RETELL_AGENT_ID: RETELL_AGENT_ID ? 'DEFINIDA' : 'VACÍA',
      TELEGRAM_BOT_TOKEN: TELEGRAM_BOT_TOKEN ? 'DEFINIDA' : 'VACÍA'
    }
  });
});

// Endpoint para probar Retell directamente
router.get('/test-retell', async (req, res) => {
  try {
    console.log('Probando conexión con Retell...');
    
    // Intentar obtener info del agente
    const agent = await retellClient.agent.retrieve(RETELL_AGENT_ID);
    
    res.json({
      success: true,
      agent: {
        agent_id: agent.agent_id,
        voice_id: agent.voice_id,
        response_engine: agent.response_engine
      }
    });
  } catch (error) {
    console.error('Error probando Retell:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      status: error.status,
      response: error.response?.data
    });
  }
});

module.exports = router;


