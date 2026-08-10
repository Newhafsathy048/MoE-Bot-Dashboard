const axios = require('axios');

module.exports = {
  name: 'manus',
  aliases: ['manusai', 'agent'],
  description: 'Delegate a task to Manus AI agent (usage: .manus <describe your task>)',
  execute: async ({ sock, from, args }) => {
    const query = args.join(' ').trim();
    if (!query) {
      await sock.sendMessage(from, {
        text: 'Usage: .manus <describe your task>\n\nExample: .manus Find me 5 cheap flights to Dubai this weekend'
      });
      return;
    }

    await sock.sendMessage(from, { text: '🧠 Handing your task to Manus AI... this may take a moment.' });

    try {
      const result = await delegateToManus(query);
      await sock.sendMessage(from, {
        text: `🧠 *Manus AI Result*\n\n${result}`
      });
    } catch (err) {
      console.error('Manus command error:', err.message);
      await sock.sendMessage(from, {
        text: '❌ Manus AI could not be reached right now. Please try again later.'
      });
    }
  }
};

/**
 * Delegates a task to Manus via its built-in chat completions API. This runs
 * the task reasoning inside this same process and returns the final answer,
 * so WhatsApp users can trigger "Manus-style" agent work directly from chat.
 */
async function delegateToManus(task) {
  const MANUS_PROMPT = `You are Manus, an autonomous general AI agent. The user is asking you to perform a task through WhatsApp. Think step by step, gather any facts you know, and return the best possible final answer to the task. Be practical, specific and complete. Format with WhatsApp markdown (*bold*, _italic_, numbered lists) where helpful. Keep it under 300 words.`;

  const client = axios.create({
    baseURL: process.env.OPENAI_API_BASE || 'https://api.openai.com/v1',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    timeout: 120000
  });

  const { data } = await client.post('/chat/completions', {
    model: process.env.MANUS_MODEL || 'gpt-5-mini',
    messages: [
      { role: 'system', content: MANUS_PROMPT },
      { role: 'user', content: `Task: ${task}` }
    ],
    max_tokens: 2000
  });

  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from Manus AI');
  return content.trim();
}
