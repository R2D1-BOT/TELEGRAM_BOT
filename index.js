const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

console.log('🚀 Iniciando servidor...');
console.log('📁 Directorio actual:', __dirname);
console.log('🔧 Puerto configurado:', PORT);

// Middleware para parsing JSON
app.use(express.json());

// Ruta de salud para verificar que el servidor funciona
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Telegram-Retell Bot Server Running',
    timestamp: new Date().toISOString(),
    directory: __dirname
  });
});

// Importar y usar las rutas del webhook (verificar que existe)
try {
  const webhookHandler = require('./api/webhook');
  app.use('/api', webhookHandler);
  console.log('✅ Webhook handler cargado correctamente');
} catch (error) {
  console.error('❌ Error cargando webhook handler:', error.message);
  // Continúa sin el webhook para debug
}

// Ruta específica para el webhook de Telegram
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'telegram-retell-bot' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Webhook endpoint: /api/webhook`);
  console.log(`🌐 Health check: /health`);
});
