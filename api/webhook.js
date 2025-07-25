// api/webhook.js
const express = require('express'); // Importa Express para crear un router
const axios = require('axios'); // Importa Axios para hacer peticiones HTTP (a la API de Telegram)
const router = express.Router(); // Crea una instancia de Express Router
const Retell = require('retell-sdk').default; // Importa el SDK de Retell (con .default para compatibilidad)

// --- Declaración de variables de entorno ---
// Estas variables se obtienen de process.env, que es donde Node.js expone las variables de entorno
// configuradas en Railway.
const RETELL_API_KEY = process.env.RETELL_API_KEY;
const RETELL_AGENT_ID = process.env.RETELL_AGENT_ID;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// --- REGISTROS DE DEPURACIÓN CRUCIALES PARA LAS VARIABLES DE ENTORNO ---
// Estos logs te mostrarán si las variables de entorno están siendo cargadas correctamente
// desde Railway al inicio de tu aplicación. ¡Revisa esto en los logs de Railway!
console.log('--- Depuración de Variables de Entorno ---');
console.log('RETELL_API_KEY (desde process.env):', RETELL_API_KEY ? '***** (Cargada)' : 'UNDEFINED/VACÍA');
console.log('RETELL_AGENT_ID (desde process.env):', RETELL_AGENT_ID || 'UNDEFINED/VACÍA'); // El Agent ID es menos sensible, se puede mostrar
console.log('TELEGRAM_BOT_TOKEN (desde process.env):', TELEGRAM_BOT_TOKEN ? '***** (Cargada)' : 'UNDEFINED/VACÍA');

// Construye la URL de la API de Telegram usando el token del bot
// Si el token no se carga, esta URL será incorrecta.
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
console.log('URL de la API de Telegram construida:', `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN ? '*****' : 'UNDEFINED'}/sendMessage`);
console.log('--- Fin de la Depuración de Variables de Entorno ---');

// Inicializa el cliente de Retell SDK
// Si RETELL_API_KEY es undefined o vacía, la inicialización fallará o el cliente no funcionará.
const retellClient = new Retell({
  apiKey: RETELL_API_KEY,
});

// Verificación adicional: Si la clave API de Retell no está presente, lanza un error crítico
// Esto te alertará en los logs si el cliente no se puede inicializar correctamente.
if (!RETELL_API_KEY) {
  console.error('ERROR CRÍTICO: RETELL_API_KEY no está definida. El cliente de Retell probablemente fallará.');
}

// Define la ruta POST para el webhook de Telegram
// Telegram enviará las actualizaciones a esta ruta (ej. tu-app-de-railway.railway.app/api/webhook)
router.post('/webhook', async (req, res) => {
  // Registra el payload completo del webhook para depuración
  console.log('Payload del Webhook recibido:', JSON.stringify(req.body, null, 2));

  const msg = req.body.message; // Extrae el objeto de mensaje del payload

  // Verifica si el mensaje es válido (contiene texto y un ID de chat)
  if (!msg || !msg.text || !msg.chat || !msg.chat.id) {
    console.log('Mensaje no válido o sin texto, ignorando y enviando 200 OK.');
    return res.sendStatus(200); // Responde 200 OK para evitar reintentos de Telegram para mensajes no válidos
  }

  const user_id = msg.chat.id.toString(); // Obtiene el ID del chat del usuario
  const text = msg.text; // Obtiene el texto del mensaje
  const retell_chat_id = `telegram-${user_id}`; // Crea un ID de chat único para Retell

  try {
    console.log(`Llamando a Retell para chat_id: ${retell_chat_id}, contenido: "${text}", agent_id: ${RETELL_AGENT_ID}`);

    // Llama a la API de Retell para obtener una respuesta
    const retellResponse = await retellClient.chat.createChatCompletion({
      chat_id: retell_chat_id,
      content: text,
      agent_id: RETELL_AGENT_ID,
    });

    const responseMessages = retellResponse.messages; // Extrae los mensajes de la respuesta de Retell
    let reply = "No tengo respuesta para ti."; // Mensaje de respuesta por defecto

    // Busca el mensaje del agente en la respuesta de Retell
    if (responseMessages && responseMessages.length > 0) {
      const agentMessage = responseMessages.find(m => m.role === 'agent' && m.content);
      if (agentMessage) {
        reply = agentMessage.content; // Si se encuentra, usa el contenido del mensaje del agente
      } else {
        console.log('No se encontró un mensaje de rol "agent" con contenido en la respuesta de Retell.');
      }
    } else {
      console.log('La respuesta de Retell no contiene un array de mensajes o está vacío.');
    }

    console.log(`Enviando respuesta a Telegram (chat_id: ${user_id}): "${reply}"`);

    // Envía la respuesta de vuelta a Telegram
    await axios.post(TELEGRAM_API_URL, {
      chat_id: user_id,
      text: reply,
    });

    console.log(`Respuesta enviada a Telegram con éxito: "${reply}"`);
    res.sendStatus(200); // Responde 200 OK a Telegram para indicar que el mensaje fue procesado
  } catch (error) {
    // Manejo de errores: registra el error y envía un 500 a Telegram
    console.error('Error en el manejador del webhook (llamada a Retell SDK o Telegram API):', error.message);

    // Registra detalles adicionales del error si están disponibles (útil para errores de Axios)
    if (error.response) {
      // El servidor respondió con un código de estado fuera del rango 2xx
      console.error('Detalles del error (respuesta del servidor):', {
        data: error.response.data,
        status: error.response.status,
        headers: error.response.headers,
      });
    } else if (error.request) {
      // La petición fue hecha pero no se recibió respuesta (ej. problema de red)
      console.error('Detalles del error (sin respuesta del servidor):', error.request);
    } else {
      // Algo más causó el error (ej. error de configuración antes de la petición)
      console.error('Detalles del error (otra causa):', error.message);
    }
    res.sendStatus(500); // Envía un 500 Internal Server Error a Telegram
  }
});

module.exports = router; // Exporta el router para que pueda ser usado por index.js



