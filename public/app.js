// ---------- starfield ----------
(function starfield() {
  const field = document.getElementById('starfield');
  const count = window.innerWidth < 560 ? 32 : 55;
  const frag = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const dot = document.createElement('span');
    dot.style.left = Math.random() * 100 + '%';
    dot.style.top = Math.random() * 100 + '%';
    dot.style.animationDelay = (Math.random() * 4).toFixed(2) + 's';
    frag.appendChild(dot);
  }
  field.appendChild(frag);
})();

// ---------- nav dropdown ----------
const menuBtn = document.getElementById('menuBtn');
const navDrop = document.getElementById('navDrop');
menuBtn.addEventListener('click', () => {
  const open = navDrop.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', String(open));
});
navDrop.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    navDrop.classList.remove('open');
    menuBtn.setAttribute('aria-expanded', 'false');
  });
});

// ---------- per-visitor identity ----------
// No login system — each browser just remembers the WhatsApp number it
// paired here (this is a real deployed site, not a Claude.ai artifact, so
// localStorage is fine). That's enough for the dashboard to show "your"
// bot's status separately from the deployment-wide totals.
const STORAGE_KEY = 'moebot:number';
let myNumber = localStorage.getItem(STORAGE_KEY) || '';

// ---------- elements ----------
const statusPill = document.getElementById('statusPill');
const statusText = document.getElementById('statusText');
const statActiveSockets = document.getElementById('statActiveSockets');
const statTotalUsers = document.getElementById('statTotalUsers');
const capacityNote = document.getElementById('capacityNote');
const pairForm = document.getElementById('pairForm');
const pairedNotice = document.getElementById('pairedNotice');
const resetLink = document.getElementById('resetLink');
const whatsappLinkBtn = document.getElementById('whatsappLinkBtn');
const emailLinkBtn = document.getElementById('emailLinkBtn');
const emailLinkText = document.getElementById('emailLinkText');
const footerText = document.getElementById('footerText');
const restartBtn = document.getElementById('restartBtn');
const restartBtnText = document.getElementById('restartBtnText');

const STATUS_COPY = {
  unpaired: { text: 'READY TO PAIR // NODE ONLINE', cls: '' },
  connecting: { text: 'CONNECTING // NODE ONLINE', cls: '' },
  open: { text: 'SESSION READY // NODE ONLINE', cls: '' },
  close: { text: 'RECONNECTING // NODE ONLINE', cls: 'state-warn' },
  loggedOut: { text: 'LOGGED OUT // PAIR AGAIN BELOW', cls: 'state-error' }
};

let infoPopulated = false;

async function pollStatus() {
  try {
    const url = myNumber ? `/api/status?number=${encodeURIComponent(myNumber)}` : '/api/status';
    const res = await fetch(url);
    const data = await res.json();

    const session = data.session; // null until this browser has a saved number
    const key = session ? session.state : 'unpaired';
    const copy = STATUS_COPY[key] || STATUS_COPY.connecting;
    statusText.textContent = copy.text;
    statusPill.className = 'status-pill' + (copy.cls ? ' ' + copy.cls : '');

    statActiveSockets.textContent = data.global.activeSockets;
    statTotalUsers.textContent = data.global.totalUsers;
    capacityNote.textContent = `${data.global.totalSessions} of ${data.global.maxSessions} account slots in use.`;

    if (session?.registered && session.state === 'open') {
      pairForm.hidden = true;
      pairedNotice.hidden = false;
    } else {
      pairForm.hidden = false;
      pairedNotice.hidden = true;
    }

    if (!infoPopulated) {
      if (data.whatsappLink) whatsappLinkBtn.href = data.whatsappLink;
      if (data.email) {
        emailLinkBtn.href = 'mailto:' + data.email;
        emailLinkText.textContent = data.email.toUpperCase();
      }
      footerText.textContent = `© ${new Date().getFullYear()} ${data.ownerName || 'MoE'} — All rights reserved.`;
      infoPopulated = true;
    }
  } catch (err) {
    statusText.textContent = 'DASHBOARD OFFLINE';
    statusPill.className = 'status-pill state-error';
  }
}

pollStatus();
setInterval(pollStatus, 4000);

resetLink.addEventListener('click', () => {
  localStorage.removeItem(STORAGE_KEY);
  myNumber = '';
  phoneInput.value = '';
  pollStatus();
});

restartBtn.addEventListener('click', async () => {
  if (!myNumber) return;
  
  restartBtn.disabled = true;
  restartBtnText.textContent = 'RESTARTING...';
  
  try {
    const res = await fetch('/api/restart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: myNumber })
    });
    const data = await res.json();
    
    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'Restart failed.');
    }
    
    restartBtnText.textContent = 'RESTARTED!';
    setTimeout(() => {
      restartBtnText.textContent = 'RESTART BOT SESSION';
      restartBtn.disabled = false;
    }, 3000);
    
    pollStatus();
  } catch (err) {
    alert('Error: ' + err.message);
    restartBtnText.textContent = 'RESTART BOT SESSION';
    restartBtn.disabled = false;
  }
});

// ---------- pairing form ----------
const phoneInput = document.getElementById('phoneInput');
const pairBtn = document.getElementById('pairBtn');
const pairBtnText = document.getElementById('pairBtnText');
const pairResult = document.getElementById('pairResult');
const pairCode = document.getElementById('pairCode');
const pairError = document.getElementById('pairError');
const copyBtn = document.getElementById('copyBtn');

pairForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const number = phoneInput.value.trim();
  if (!number) return;

  pairBtn.disabled = true;
  pairBtnText.textContent = 'REQUESTING…';
  pairError.hidden = true;
  pairResult.hidden = true;

  try {
    const res = await fetch('/api/pair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number })
    });
    const data = await res.json();

    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'Could not get a pairing code. Try again.');
    }

    myNumber = number.replace(/[^0-9]/g, '');
    localStorage.setItem(STORAGE_KEY, myNumber);

    pairCode.textContent = data.code;
    pairResult.hidden = false;
    pollStatus();
  } catch (err) {
    pairError.textContent = err.message;
    pairError.hidden = false;
  } finally {
    pairBtn.disabled = false;
    pairBtnText.textContent = 'REQUEST PAIRING CODE';
  }
});

copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(pairCode.textContent);
    const original = copyBtn.textContent;
    copyBtn.textContent = 'COPIED';
    setTimeout(() => { copyBtn.textContent = original; }, 1500);
  } catch (err) {
    // Clipboard API can fail on non-HTTPS/local contexts — the code is
    // already shown on screen, so this is a minor convenience miss only.
  }
});

if (myNumber) phoneInput.value = myNumber;
