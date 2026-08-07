const QUOTES = [
  { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
  { text: 'It always seems impossible until it\'s done.', author: 'Nelson Mandela' },
  { text: 'Success is not final, failure is not fatal: it is the courage to continue that counts.', author: 'Winston Churchill' },
  { text: 'The best way to predict the future is to create it.', author: 'Peter Drucker' },
  { text: 'Believe you can and you\'re halfway there.', author: 'Theodore Roosevelt' },
  { text: 'Do what you can, with what you have, where you are.', author: 'Theodore Roosevelt' },
  { text: 'Hardships often prepare ordinary people for an extraordinary destiny.', author: 'C.S. Lewis' },
  { text: 'The journey of a thousand miles begins with a single step.', author: 'Lao Tzu' },
  { text: 'What lies behind us and before us are small matters compared to what lies within us.', author: 'Ralph Waldo Emerson' },
  { text: 'You miss 100% of the shots you don\'t take.', author: 'Wayne Gretzky' },
  { text: 'It does not matter how slowly you go as long as you do not stop.', author: 'Confucius' },
  { text: 'Start where you are. Use what you have. Do what you can.', author: 'Arthur Ashe' }
];

module.exports = {
  name: 'quote',
  aliases: ['motivate'],
  description: 'Get a random motivational quote',
  execute: async ({ sock, from }) => {
    const pick = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    await sock.sendMessage(from, { text: `💬 "${pick.text}"\n— ${pick.author}` });
  }
};
