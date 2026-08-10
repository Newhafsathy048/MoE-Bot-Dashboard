const path = require('path');
const express = require('express');
const sessionManager = require('./sessionManager');

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
