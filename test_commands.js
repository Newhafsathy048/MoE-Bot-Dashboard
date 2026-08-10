const { loadCommands } = require('./lib/commandLoader');
const commands = loadCommands();

console.log('Total commands loaded:', commands.size);
console.log('Command list:', Array.from(commands.keys()));

if (commands.has('ping')) {
  console.log('✅ Ping command is loaded correctly.');
} else {
  console.log('❌ Ping command is NOT loaded.');
}
