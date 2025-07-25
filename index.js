const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

try {
  const webhookHandler = require('./api/webhook');
  app.use('/api', webhookHandler);
  console.log('Webhook handler cargado');
} catch (e) {
  console.error('Error cargando webhook handler:', e.message);
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});

