const path = require('path');

const express = require('express');

const sessionManager = require('./sessionManager');
const { loadCommands } = require('./commandLoader');
const { getBotSettings, setCommandEnabled } = require('./botSettings');



/**

 * Serves the dashboard (public/) and the small JSON API it talks to.

 * This is also what makes hosting platforms (Railway, Render, etc.) that

 * expect a bound port see the service as healthy.

 *

 * ?number= on /api/status is the visitor's OWN number (remembered

 * client-side after they pair) — returns that specific account's status

 * alongside the deployment-wide totals used for the hero stat cards.

 */

function startServer(settings) {
  
  const port = process.env.PORT || 3000;
  
  const app = express();
  

  
  // Allow the branded Taskade app to call this API directly.
  
  // Keep the allow-list narrow so arbitrary websites cannot request pairing codes.
  
  const allowedOrigins = new Set([
    
    'https://moebot-dashboard-8882.taskade.app',
    
    'https://moe-bot-dashboard.onrender.com'
    
  ]);
  
  app.use((req, res, next) => {
    
    const origin = req.get('origin');
    
    if (origin && (allowedOrigins.has(origin) || origin.endsWith('.manus.computer') || origin.endsWith('.taskade.app'))) {
      
      res.setHeader('Access-Control-Allow-Origin', origin);
      
      res.setHeader('Vary', 'Origin');
      
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      
    }
    
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    
    next();
    
  });
  

  
  app.use(express.json());
  
  app.use(express.static(path.join(__dirname, '..', 'public')));
  

  
  app.get('/api/status', (req, res) => {
    
    res.json({
      
      botName: settings.botName,
      
      ownerName: settings.ownerName,
      
      whatsappLink: settings.whatsappLink,
      
      email: settings.email,
      
      global: sessionManager.getGlobalStats(),
      
      session: req.query.number ? sessionManager.getSessionStatus(req.query.number) : null
        
    });
    
  });
  

  
  app.get('/api/commands', (req, res) => {
    const commands = [...new Set([...loadCommands().values()].map((command) => command.name))];
    const settings = getBotSettings();
    res.json({
      ok: true,
      commands,
      enabledCommands: Object.fromEntries(commands.map((name) => [name, settings.enabledCommands?.[name] !== false]))
    });
  });

  app.post('/api/commands/:name', (req, res) => {
    const number = req.body?.number;
    const name = String(req.params.name || '').toLowerCase();
    const command = loadCommands().get(name);
    if (!command) return res.status(404).json({ ok: false, error: 'Command not found.' });
    if (!number || !sessionManager.hasSession(number)) {
      return res.status(403).json({ ok: false, error: 'Pair the bot account before changing commands.' });
    }
    const enabled = setCommandEnabled(command.name, req.body?.enabled !== false);
    return res.json({ ok: true, command: command.name, enabled });
  });

  app.post('/api/pair', async (req, res) => {
    
    try {
      
      const code = await sessionManager.requestPairingCode(req.body?.number);
      
      res.json({ ok: true, code });
      
    } catch (err) {
      
      res.status(400).json({ ok: false, error: err.message });
      
    }
    
  });
  

  
  app.post('/api/restart', (req, res) => {
    
    res.json({ ok: true, message: 'Restarting...' });
    
    console.log('🔄 Restart requested from dashboard. Exiting process...');
    
    setTimeout(() => {
      
      process.exit(0);
      
    }, 1000);
    
  });
  

  
  app.listen(port, () => console.log(`🌐 Dashboard running on port ${port}`));
  
}



module.exports = { startServer };




















































