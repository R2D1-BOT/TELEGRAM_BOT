// api/webhook.js
const express = require('express');
const axios = require('axios');
const router = express.Router();
const Retell = require('retell-sdk').default;

const RETELL_API_KEY = process.env.RETELL_API_KEY;
const RETELL_AGENT_ID = process.env.RETELL_AGENT_ID;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// --- REGISTROS DE DEPURACIÓN DE VARIABLES DE ENTORNO (ya confirmados, pero los mantenemos) ---
console.log('--- Depuración de Variables de Entorno ---');
console.log('RETELL_API_KEY (desde process.env):', RETELL_API_KEY ? '***** (Cargada)' : 'UNDEFINED/VACÍA');
console.log('RETELL_AGENT_ID (desde process.env):', RETELL_AGENT_ID || 'UNDEFINED/VACÍA');
console.log('TELEGRAM_BOT_TOKEN (desde process.env):', TELEGRAM_BOT_TOKEN ? '***** (Cargada)' : 'UNDEFINED/VACÍA');
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
console.log('URL de la API de Telegram construida:', `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN ? '*****' : 'UNDEFINED'}/sendMessage`);
console.log('--- Fin de la Depuración de Variables de Entorno ---');

const retellClient = new Retell({
  apiKey: RETELL_API_KEY,
});

if (!RETELL_API_KEY) {
  console.error('ERROR CRÍTICO: RETELL_API_KEY no está definida. El cliente de Retell probablemente fallará.');
}

router.post('/webhook', async (req, res) => {
  // --- NUEVOS LOGS DE DEPURACIÓN DEL PAYLOAD ---
  console.log('--- Depuración de Payload de Webhook ---');
  console.log('Payload COMPLETO del Webhook recibido:', JSON.stringify(req.body, null, 2)); // Log completo
  
  const msg = req.body.message; // Extrae el objeto de mensaje
  console.log('Objeto "message" (msg):', msg ? JSON.stringify(msg, null, 2) : 'UNDEFINED/VACÍO');
  console.log('msg.text:', msg && msg.text ? msg.text : 'UNDEFINED/VACÍO');
  console.log('msg.chat.id:', msg && msg.chat && msg.chat.id ? msg.chat.id : 'UNDEFINED/VACÍO');
  console.log('--- Fin de la Depuración de Payload de Webhook ---');

  // La condición de verificación se mantiene, pero ahora tendremos más logs antes de que se active.
  if (!msg || !msg.text || !msg.chat || !msg.chat.id) {
    console.log('Payload no contiene un mensaje de texto válido (msg, msg.text, msg.chat, o msg.chat.id es nulo/vacío). Enviando 200 OK.');
    return res.sendStatus(200);
  }

  const user_id = msg.chat.id.toString();
  const text = msg.text;
  const retell_chat_id = `telegram-${user_id}`;

  try {
    console.log(`Llamando a Retell para chat_id: ${retell_chat_id}, contenido: "${text}", agent_id: ${RETELL_AGENT_ID}`);

    const retellResponse = await retellClient.chat.createChatCompletion({
      chat_id: retell_chat_id,
      content: text,
      agent_id: RETELL_AGENT_ID,
    });

    const responseMessages = retellResponse.messages;
    let reply = "No tengo respuesta para ti.";

    if (responseMessages && responseMessages.length > 0) {
      const agentMessage = responseMessages.find(m => m.role === 'agent' && m.content);
      if (agentMessage) {
        reply = agentMessage.content;
      } else {
        console.log('No se encontró un mensaje de rol "agent" con contenido en la respuesta de Retell.');
      }
    } else {
      console.log('La respuesta de Retell no contiene un array de mensajes o está vacío.');
    }

    console.log(`Enviando respuesta a Telegram (chat_id: ${user_id}): "${reply}"`);

    await axios.post(TELEGRAM_API_URL, {
      chat_id: user_id,
      text: reply,
    });

    console.log(`Respuesta enviada a Telegram con éxito: "${reply}"`);
    res.sendStatus(200);
  } catch (error) {
    console.error('Error en el manejador del webhook (llamada a Retell SDK o Telegram API):', error.message);

    if (error.response) {
      console.error('Detalles del error (respuesta del servidor):', {
        data: error.response.data,
        status: error.response.status,
        headers: error.response.headers,
      });
    } else if (error.request) {
      console.error('Detalles del error (sin respuesta del servidor):', error.request);
    } else {
      console.error('Detalles del error (otra causa):', error.message);
    }
    res.sendStatus(500);
  }
});

module.exports = router;



