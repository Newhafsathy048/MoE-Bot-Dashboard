import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  Command,
  Copy,
  Download,
  Eye,
  FileWarning,
  Link2,
  LockKeyhole,
  Menu,
  MessageSquare,
  MoreHorizontal,
  PanelLeft,
  Radio,
  RefreshCw,
  Send,
  Settings2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  Users,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const API_BASE = "https://moe-bot-dashboard-7gt1.onrender.com";
const LOGO = "/moe-logo.png";

type Tab = "overview" | "connect" | "commands" | "settings";
type ConnectionState = "online" | "offline" | "connecting";

type BotStatus = {
  activeSockets?: number;
  totalUsers?: number;
  totalSessions?: number;
  maxSessions?: number;
  state?: string;
  registered?: boolean;
  session?: { state?: string; registered?: boolean };
  global?: { activeSockets?: number; totalUsers?: number; totalSessions?: number; maxSessions?: number };
};

const commands = [
  { name: "autoviewstatus", detail: "Mark incoming statuses as viewed", icon: Eye, tone: "violet" },
  { name: "antidelete", detail: "Recover deleted messages", icon: Trash2, tone: "orange" },
  { name: "antilink", detail: "Protect groups from unsafe links", icon: Link2, tone: "cyan" },
  { name: "ai", detail: "Ask the bot for an intelligent reply", icon: Sparkles, tone: "pink" },
  { name: "tiktok", detail: "Download TikTok media", icon: Download, tone: "blue" },
  { name: "sticker", detail: "Turn media into stickers", icon: Zap, tone: "yellow" },
];

const navItems: { id: Tab; label: string; icon: typeof Activity }[] = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "connect", label: "Connect", icon: Smartphone },
  { id: "commands", label: "Commands", icon: Command },
  { id: "settings", label: "Settings", icon: Settings2 },
];

function tabFromPath(path: string): Tab {
  if (path === "/connect") return "connect";
  if (path === "/commands") return "commands";
  if (path === "/settings") return "settings";
  return "overview";
}

function formatUpdated(date: Date | null) {
  if (!date) return "Waiting for first sync";
  return `Updated ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function StatusPill({ state }: { state: ConnectionState }) {
  const online = state === "online";
  const connecting = state === "connecting";
  return (
    <span className={`status-pill ${online ? "status-pill-online" : connecting ? "status-pill-connecting" : "status-pill-offline"}`}>
      <span className="status-dot" />
      {online ? "NODE ONLINE" : connecting ? "SYNCING" : "NODE OFFLINE"}
    </span>
  );
}

function MetricCard({ label, value, icon: Icon, accent, helper }: { label: string; value: string | number; icon: typeof Users; accent: string; helper: string }) {
  return (
    <div className="metric-card">
      <div className={`metric-icon ${accent}`}><Icon size={17} strokeWidth={2.2} /></div>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-helper">{helper}</div>
    </div>
  );
}

export default function Home() {
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>(() => tabFromPath(location));
  const [menuOpen, setMenuOpen] = useState(false);
  const [status, setStatus] = useState<BotStatus>({});
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [phone, setPhone] = useState(() => localStorage.getItem("moe-phone") || "");
  const [pairingCode, setPairingCode] = useState("");
  const [pairingBusy, setPairingBusy] = useState(false);
  const [clearingSession, setClearingSession] = useState(false);
  const [groupCommandsEnabled, setGroupCommandsEnabled] = useState(true);
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [commandEnabled, setCommandEnabled] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem("moe-command-enabled") || "{}") as Record<string, boolean>;
    } catch {
      return {};
    }
  });

  useEffect(() => {
    setActiveTab(tabFromPath(location));
  }, [location]);

  const fetchStatus = async (showToast = false) => {
    setRefreshing(true);
    try {
      const query = phone ? `?number=${encodeURIComponent(phone)}` : "";
      const response = await fetch(`${API_BASE}/api/status${query}`);
      if (!response.ok) throw new Error("Status request failed");
      const data = (await response.json()) as BotStatus;
      setStatus(data.global || data);
      setConnection(data.session?.state === "open" || data.state === "open" || Number(data.activeSockets) > 0 ? "online" : "offline");
      setUpdatedAt(new Date());
      if (showToast) toast.success("Bot status synced");
    } catch {
      setConnection("offline");
      if (showToast) toast.error("Could not reach the Render bot");
    } finally {
      setRefreshing(false);
    }
  };

  const fetchCommandSettings = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/commands`);
      if (!response.ok) return;
      const data = await response.json() as { enabledCommands?: Record<string, boolean>; groupCommandsEnabled?: boolean };
      if (data.enabledCommands) {
        setCommandEnabled(data.enabledCommands);
        localStorage.setItem("moe-command-enabled", JSON.stringify(data.enabledCommands));
      }
      if (typeof data.groupCommandsEnabled === "boolean") setGroupCommandsEnabled(data.groupCommandsEnabled);
    } catch {
      // Keep local preferences if the bot is temporarily unreachable.
    }
  };

  useEffect(() => {
    void fetchStatus();
    void fetchCommandSettings();
    const interval = window.setInterval(() => void fetchStatus(), 20000);
    return () => window.clearInterval(interval);
  }, [phone]);

  useEffect(() => {
    const onInstall = (event: Event) => {
      event.preventDefault?.();
      setInstallPrompt(event);
    };
    window.addEventListener("beforeinstallprompt", onInstall);
    return () => window.removeEventListener("beforeinstallprompt", onInstall);
  }, []);

  const filteredCommands = useMemo(
    () => commands.filter((item) => `${item.name} ${item.detail}`.toLowerCase().includes(search.toLowerCase())),
    [search],
  );

  const requestPairing = async () => {
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    if (cleanPhone.length < 8) {
      toast.error("Enter a valid number with country code");
      return;
    }
    setPairingBusy(true);
    setPairingCode("");
    localStorage.setItem("moe-phone", cleanPhone);
    try {
      const response = await fetch(`${API_BASE}/api/pair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: cleanPhone }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not request pairing code");
      setPairingCode(data.code || data.pairingCode || "");
      toast.success("Pairing code received");
      setConnection("connecting");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Pairing failed");
    } finally {
      setPairingBusy(false);
    }
  };

  const restartBot = async () => {
    try {
      await fetch(`${API_BASE}/api/restart`, { method: "POST" });
      toast.success("Restart request sent to bot");
      setConnection("connecting");
    } catch {
      toast.error("Could not send restart request");
    }
  };

  const clearSession = async () => {
    if (!phone) {
      toast.error("Enter the paired WhatsApp number first");
      return;
    }
    if (!window.confirm("Clear this WhatsApp session? You will need to pair it again.")) return;
    setClearingSession(true);
    try {
      const response = await fetch(`${API_BASE}/api/session/clear`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: phone }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not clear session");
      setPairingCode("");
      setConnection("offline");
      toast.success("WhatsApp session cleared. Pair again when ready.");
      void fetchStatus(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not clear session");
    } finally {
      setClearingSession(false);
    }
  };

  const copyCode = async () => {
    if (!pairingCode) return;
    await navigator.clipboard.writeText(pairingCode);
    toast.success("Pairing code copied");
  };

  const toggleGroupCommands = async () => {
    const nextEnabled = !groupCommandsEnabled;
    if (!phone) {
      toast.error("Pair your WhatsApp account before changing group commands");
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/api/group-commands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: phone, enabled: nextEnabled }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update group commands");
      setGroupCommandsEnabled(nextEnabled);
      toast.success(`Group commands ${nextEnabled ? "enabled" : "disabled"}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update group commands");
    }
  };

  const installApp = async () => {
    if (installPrompt && "prompt" in installPrompt) {
      await (installPrompt as Event & { prompt: () => Promise<void> }).prompt();
      setInstallPrompt(null);
    } else {
      toast.success("Use your browser menu and choose Add to Home screen or Install app");
    }
  };

  const toggleCommand = async (name: string) => {
    const nextEnabled = !(commandEnabled[name] ?? true);
    const next = { ...commandEnabled, [name]: nextEnabled };
    setCommandEnabled(next);
    localStorage.setItem("moe-command-enabled", JSON.stringify(next));
    if (!phone) {
      toast.error("Pair your WhatsApp account before changing live commands");
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/api/commands/${encodeURIComponent(name)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: phone, enabled: nextEnabled }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update command");
      toast.success(`${name} ${nextEnabled ? "enabled" : "disabled"} on Moe Bot`);
    } catch (error) {
      const reverted = { ...next, [name]: !nextEnabled };
      setCommandEnabled(reverted);
      localStorage.setItem("moe-command-enabled", JSON.stringify(reverted));
      toast.error(error instanceof Error ? error.message : "Could not update command");
    }
  };

  const navigate = (tab: Tab) => {
    setActiveTab(tab);
    setLocation(tab === "overview" ? "/" : `/${tab}`);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="brand-lockup">
          <img src={LOGO} alt="Moe Bot" className="brand-logo" />
          <div>
            <div className="brand-name">MOE <span>BOT</span></div>
            <div className="brand-subtitle">COMMAND CENTER</div>
          </div>
          <button className="mobile-close" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X size={20} /></button>
        </div>
        <div className="sidebar-section-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item ${activeTab === id ? "nav-item-active" : ""}`} onClick={() => navigate(id)}>
              <Icon size={18} /><span>{label}</span>{activeTab === id && <ChevronRight size={15} className="nav-chevron" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-card">
          <div className="sidebar-card-top"><span className="live-pulse" /><span>LIVE SERVICE</span></div>
          <p>Your bot is hosted on Render and ready to pair.</p>
          <button className="sidebar-link" onClick={() => navigate("connect")}>Open connection <ChevronRight size={14} /></button>
        </div>
        <div className="sidebar-footer"><LockKeyhole size={13} /> Local controls · v1.0</div>
      </aside>

      {menuOpen && <button className="sidebar-backdrop" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}

      <main className="main-content">
        <header className="topbar">
          <button className="menu-trigger" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={21} /></button>
          <div className="mobile-brand"><img src={LOGO} alt="Moe Bot" /><span>MOE <b>BOT</b></span></div>
          <div className="topbar-right">
            <div className="topbar-status"><span className="topbar-status-dot" /> {connection === "online" ? "Connected" : "Awaiting connection"}</div>
            <button className="icon-button" onClick={() => void fetchStatus(true)} aria-label="Refresh status"><RefreshCw size={17} className={refreshing ? "spin" : ""} /></button>
            <button className="avatar-button" onClick={() => navigate("settings")}><img src={LOGO} alt="Profile" /></button>
          </div>
        </header>

        <div className="content-wrap">
          <section className="page-heading">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> MOE BOT / {activeTab.toUpperCase()}</div>
              <h1>{activeTab === "overview" ? "Command center." : activeTab === "connect" ? "Connect your WhatsApp." : activeTab === "commands" ? "Your command deck." : "Bot preferences."}</h1>
              <p>{activeTab === "overview" ? "Everything you need to keep your automation moving." : activeTab === "connect" ? "Pair a WhatsApp account in under a minute." : activeTab === "commands" ? "A quick reference for the tools built into Moe Bot." : "Tune the bot experience around your workflow."}</p>
            </div>
            <StatusPill state={connection} />
          </section>

          {activeTab === "overview" && (
            <>
              <section className="hero-panel">
                <div className="hero-copy">
                  <div className="hero-kicker"><Radio size={14} /> WHATSAPP AUTOMATION CORE</div>
                  <h2>Make every message<br /><em>do more.</em></h2>
                  <p>Pair your account, activate your commands, and let Moe Bot handle the repetitive work.</p>
                  <div className="hero-actions"><button className="ghost-button" onClick={() => void installApp()}><Download size={17} /> Download app</button><button className="primary-button" onClick={() => navigate("connect")}><Smartphone size={17} /> Connect WhatsApp <ChevronRight size={16} /></button><button className="ghost-button" onClick={() => navigate("commands")}>Explore commands</button></div>
                </div>
                <div className="hero-orbit"><div className="orbit-ring ring-one" /><div className="orbit-ring ring-two" /><div className="hero-logo-wrap"><img src={LOGO} alt="Moe Cinema logo" /><div className="hero-logo-glow" /></div><div className="orbit-chip chip-top"><Wifi size={13} /> {connection === "online" ? "ONLINE" : "READY"}</div><div className="orbit-chip chip-bottom"><Zap size={13} /> FAST RESPONSE</div></div>
              </section>

              <div className="metrics-grid">
                <MetricCard label="Active sockets" value={status.activeSockets ?? 0} icon={Wifi} accent="accent-cyan" helper="Live bot sessions" />
                <MetricCard label="Total users" value={status.totalUsers ?? 0} icon={Users} accent="accent-violet" helper="Users reached" />
                <MetricCard label="Session capacity" value={`${status.totalSessions ?? 0}/${status.maxSessions ?? 5}`} icon={ShieldCheck} accent="accent-orange" helper="Pairing slots used" />
              </div>

              <div className="section-row"><div><div className="section-kicker">QUICK ACCESS</div><h3>Keep it moving</h3></div><button className="text-button" onClick={() => navigate("commands")}>View all commands <ChevronRight size={15} /></button></div>
              <div className="quick-grid">
                <button className="quick-card quick-connect" onClick={() => navigate("connect")}><div className="quick-icon"><Smartphone size={19} /></div><div><strong>Pair WhatsApp</strong><span>Get your 8-digit code</span></div><ChevronRight size={17} /></button>
                <button className="quick-card quick-command" onClick={() => navigate("commands")}><div className="quick-icon"><Command size={19} /></div><div><strong>Browse commands</strong><span>Explore bot capabilities</span></div><ChevronRight size={17} /></button>
                <button className="quick-card quick-restart" onClick={() => void restartBot()}><div className="quick-icon"><RefreshCw size={19} /></div><div><strong>Restart bot</strong><span>Refresh the service node</span></div><ChevronRight size={17} /></button>
              </div>

              <section className="activity-panel"><div className="section-row activity-head"><div><div className="section-kicker">SYSTEM PULSE</div><h3>Service overview</h3></div><span className="updated-label"><Clock3 size={13} /> {formatUpdated(updatedAt)}</span></div><div className="activity-list"><div className="activity-item"><div className="activity-mark activity-mark-green"><CheckCircle2 size={16} /></div><div><strong>Dashboard is reachable</strong><span>Render endpoint responded successfully</span></div><time>now</time></div><div className="activity-item"><div className="activity-mark activity-mark-violet"><MessageSquare size={16} /></div><div><strong>Commands are loaded</strong><span>AI, media and security tools ready</span></div><time>ready</time></div><div className="activity-item"><div className="activity-mark activity-mark-orange"><ShieldCheck size={16} /></div><div><strong>Protected by owner controls</strong><span>Settings commands require your account</span></div><time>active</time></div></div></section>
            </>
          )}

          {activeTab === "connect" && (
            <section className="connect-layout"><div className="connect-card"><div className="connect-card-heading"><div className="large-icon large-icon-cyan"><Smartphone size={22} /></div><div><div className="section-kicker">SECURE PAIRING</div><h3>Link a WhatsApp account</h3></div></div><p className="connect-intro">Use your number with country code. No plus sign, spaces, or brackets.</p><label className="field-label" htmlFor="phone">WHATSAPP NUMBER</label><div className="phone-field"><span>+</span><input id="phone" inputMode="numeric" placeholder="255700000000" value={phone} onChange={(event) => setPhone(event.target.value.replace(/[^0-9]/g, ""))} /></div><button className="primary-button wide-button" onClick={() => void requestPairing()} disabled={pairingBusy}>{pairingBusy ? <><RefreshCw size={17} className="spin" /> Requesting code...</> : <><Send size={17} /> Request pairing code</>}</button>{pairingCode && <div className="pairing-result"><div><span className="result-label">YOUR PAIRING CODE</span><strong>{pairingCode}</strong><span className="result-hint">Enter this code in WhatsApp → Linked devices</span></div><button className="copy-button" onClick={() => void copyCode()}><Copy size={16} /> Copy</button></div>}<div className="privacy-note"><LockKeyhole size={15} /><span>Your number is used only to initiate the WhatsApp pairing request.</span></div></div><div className="steps-card"><div className="section-kicker">HOW IT WORKS</div><h3>Four quick steps.</h3>{["Enter your number with country code", "Request your one-time pairing code", "Open Linked Devices in WhatsApp", "Enter the code and start automating"].map((step, index) => <div className="step-item" key={step}><span>{String(index + 1).padStart(2, "0")}</span><p>{step}</p></div>)}<div className="help-callout"><CircleHelp size={17} /><span>Need help? Make sure your number is active on WhatsApp and already has internet access.</span></div></div></section>
          )}

          {activeTab === "commands" && (
            <section className="commands-section"><div className="command-toolbar"><div className="command-search"><Command size={17} /><input placeholder="Search commands..." value={search} onChange={(event) => setSearch(event.target.value)} /></div><span className="command-count">{filteredCommands.length} available</span></div><div className="command-grid">{filteredCommands.map(({ name, detail, icon: Icon, tone }) => { const enabled = commandEnabled[name] ?? true; return <div className={`command-card ${enabled ? "command-card-enabled" : "command-card-disabled"}`} key={name}><button className={`command-toggle ${enabled ? "command-toggle-on" : "command-toggle-off"}`} onClick={() => toggleCommand(name)} aria-label={`${enabled ? "Disable" : "Enable"} .${name}`} aria-pressed={enabled}><span /></button><div className={`command-icon tone-${tone}`}><Icon size={19} /></div><div className="command-info"><strong>.{name}</strong><span>{detail}</span></div><span className={`command-state ${enabled ? "command-state-on" : "command-state-off"}`}>{enabled ? "ON" : "OFF"}</span><MoreHorizontal size={18} className="command-more" /></div>; })}</div><div className="owner-note"><ShieldCheck size={18} /><div><strong>Owner-only controls</strong><span>Turn a command off here when you do not want it active. This preference is stored on this device.</span></div></div></section>
          )}

          {activeTab === "settings" && (
            <section className="settings-grid"><div className="settings-card profile-card"><div className="profile-row"><img src={LOGO} alt="Moe Bot" /><div><div className="section-kicker">BOT PROFILE</div><h3>Moe Bot</h3><p>WhatsApp automation by MoE</p></div></div><div className="profile-status"><span className="status-dot" /> {connection === "online" ? "Connected and ready" : "Waiting for WhatsApp pair"}</div></div><div className="settings-card"><div className="settings-card-heading"><div><div className="section-kicker">PREFERENCES</div><h3>Service controls</h3></div><Settings2 size={19} /></div><div className="setting-row"><div><strong>Auto-view statuses</strong><span>Mark new statuses as viewed automatically</span></div><div className="toggle toggle-on"><span /></div></div><div className="setting-row"><div><strong>Anti-delete recovery</strong><span>Keep deleted-for-everyone messages recoverable</span></div><div className="toggle toggle-on"><span /></div></div><div className="setting-row"><div><strong>Group commands</strong><span>Allow or block all commands inside WhatsApp groups</span></div><button className={`toggle ${groupCommandsEnabled ? "toggle-on" : "toggle-off"}`} onClick={() => void toggleGroupCommands()} aria-label="Toggle group commands"><span /></button></div></div><div className="settings-card danger-card"><div className="settings-card-heading"><div><div className="section-kicker">MAINTENANCE</div><h3>Session & service</h3></div><AlertTriangle size={19} /></div><p>Clear the paired WhatsApp session from the server, or restart the bot service.</p><div className="danger-actions"><button className="outline-danger" onClick={() => void clearSession()} disabled={clearingSession}><Trash2 size={16} /> {clearingSession ? "Clearing session..." : "Clear WhatsApp session"}</button><button className="outline-danger" onClick={() => void restartBot()}><RefreshCw size={16} /> Restart bot server</button></div></div></section>
          )}
        </div>
      </main>

      <nav className="bottom-nav" aria-label="Mobile navigation">{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={activeTab === id ? "bottom-nav-active" : ""} onClick={() => navigate(id)}><Icon size={19} /><span>{label}</span></button>)}</nav>
      <button className="mobile-fab" onClick={() => navigate("connect")} aria-label="Connect WhatsApp"><PanelLeft size={19} /></button>
    </div>
  );
}
