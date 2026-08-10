require('dotenv').config();

module.exports = {
  botName: 'MoE',
  ownerName: 'MoE',
  ownerNumber: (process.env.OWNER_NUMBER || '12136061765').replace(/[^0-9]/g, ''),
  prefix: process.env.PREFIX || '.',
  whatsappLink: 'https://wa.me/message/HEYNTN2KD6K7O1',
  email: 'nhafsathy@gmail.com',
  github: 'https://github.com/Newhafsathy048',
  version: '1.0.0'
};
