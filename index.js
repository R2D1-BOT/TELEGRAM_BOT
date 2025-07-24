import express from 'express';
import bodyParser from 'body-parser';
import webhookHandler from './api/webhook.js';

const app = express();
app.use(bodyParser.json());

app.post('/webhook', webhookHandler);
app.get('/', (_, res) => res.send('🟢 Bot funcionando'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
