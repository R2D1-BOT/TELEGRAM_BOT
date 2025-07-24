import fetch from 'node-fetch';

const chatSessions = {}; // TelegramID → chat_id de Retell

export default async function handler(req, res) {
  const msg = req.body.message;
  if (!msg || !msg.text || msg.from.is_bot) return res.sendStatus(200);

  const telegramId = msg.chat.id;
  const userText = msg.text;

  try {
    if (!chatSessions[telegramId]) {
      const chatResp = await fetch('https://api.retellai.com/create-chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RETELL_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ agent_id: process.env.RETELL_AGENT_ID })
      });
      const chatData = await chatResp.json();
      chatSessions[telegramId] = chatData.chat_id;
    }

    const completionResp = await fetch('https://api.retellai.com/create-chat-completion', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RETELL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: chatSessions[telegramId],
        content: userText
      })
    });

    const completionData = await completionResp.json();
    const agentMsg = completionData.messages?.[0]?.content || 'Sin respuesta del agente.';

    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: telegramId, text: agentMsg })
    });

    res.sendStatus(200);

  } catch (err) {
    console.error('Error en webhook:', err);
    res.sendStatus(500);
  }
}
