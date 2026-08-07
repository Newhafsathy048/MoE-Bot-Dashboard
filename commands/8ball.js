const ANSWERS = [
  'Yes, definitely.',
  'It is certain.',
  'Without a doubt.',
  'You may rely on it.',
  'Most likely.',
  'Signs point to yes.',
  'Ask again later.',
  'Cannot predict now.',
  'Better not tell you now.',
  'Concentrate and ask again.',
  'Don\'t count on it.',
  'My reply is no.',
  'My sources say no.',
  'Very doubtful.'
];

module.exports = {
  name: '8ball',
  aliases: ['ball'],
  description: 'Ask the magic 8-ball a yes/no question — usage: .8ball <question>',
  execute: async ({ sock, from, args }) => {
    if (!args.length) {
      await sock.sendMessage(from, { text: 'Ask a question first, e.g. *.8ball will it rain today?*' });
      return;
    }

    const answer = ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
    await sock.sendMessage(from, { text: `🎱 ${answer}` });
  }
};
