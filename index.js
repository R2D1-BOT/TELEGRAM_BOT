// index.js
const express = require('express'); // Importa la librería Express para crear el servidor web
const app = express(); // Crea una instancia de la aplicación Express
const PORT = process.env.PORT || 3000; // Define el puerto, usa el de Railway o 3000 por defecto

// Middleware para parsear el cuerpo de las peticiones en formato JSON
// Esto es esencial para que tu servidor pueda leer los datos JSON enviados por Telegram
app.use(express.json());

// Intenta cargar y usar el manejador del webhook
// Usamos un bloque try-catch para manejar errores si el archivo 'api/webhook' no se encuentra o tiene errores
try {
  const webhookHandler = require('./api/webhook'); // Importa el router definido en api/webhook.js
  app.use('/api', webhookHandler); // Monta el router en la ruta '/api'.
                                  // Esto significa que tu webhook de Telegram debe apuntar a /api/webhook
  console.log('Webhook handler cargado correctamente en /api');
} catch (e) {
  console.error('Error al cargar el manejador del webhook:', e.message);
  console.error('Asegúrate de que el archivo ./api/webhook.js existe y no tiene errores de sintaxis.');
}

// Ruta de prueba simple para verificar que el servidor está funcionando
// Puedes acceder a esta ruta en tu navegador (ej. tu-app-de-railway.railway.app/)
app.get('/', (req, res) => {
  res.send('¡Servidor del bot de Telegram OK!');
});

// Inicia el servidor Express
// Escucha en el puerto definido y en '0.0.0.0' para que sea accesible en entornos de contenedores como Railway
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
  console.log(`Accede a http://localhost:${PORT} en desarrollo o a la URL de tu despliegue en Railway.`);
});
