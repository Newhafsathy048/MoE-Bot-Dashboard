const axios = require('axios');

const AI_SYSTEM_PROMPT = `You are MoE, a helpful, friendly and concise WhatsApp bot assistant. Reply briefly (max ~150 words), keep answers clear and to the point. You can answer general questions, give advice, explain concepts, translate, and brainstorm. Format text with WhatsApp markdown (*bold*, _italic_, ~strikethrough~) where helpful. Never claim to be OpenAI or ChatGPT.`;

module.exports = {
  name: 'ai',
  aliases: ['gpt', 'chatgpt', 'ask'],
  description: 'Ask the AI anything (usage: .ai <your question>)',
  execute: async ({ sock, from, args }) => {
    const query = args.join(' ').trim();
    if (!query) {
      await sock.sendMessage(from, {
        text: 'Usage: .ai <your question>\n\nExample: .ai Explain black holes in simple terms'
      });
      return;
    }

    await sock.sendMessage(from, { text: '🤖 Thinking...' });

    try {
      const answer = await askAI(query);
      await sock.sendMessage(from, {
        text: `🤖 *MoE AI*\n\n${answer}`
      });
    } catch (err) {
      console.error('AI command error:', err.message);
      await sock.sendMessage(from, {
        text: '❌ The AI is not available right now. Check that the AI API key is configured and try again.'
      });
    }
  }
};

async function askAI(prompt) {
  // Uses the sandbox's pre-configured OpenAI-compatible API so the bot
  // answers questions without needing any external paid key from the owner.
  const client = axios.create({
    baseURL: process.env.OPENAI_API_BASE || 'https://api.openai.com/v1',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    timeout: 60000
  });

  const { data } = await client.post('/chat/completions', {
    model: process.env.AI_MODEL || 'gpt-5-mini',
    messages: [
      { role: 'system', content: AI_SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ],
    max_tokens: 1000
  });

  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from AI');
  return content.trim();
}
