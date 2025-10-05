const express = require("express");
const {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  Browsers,
} = require("@whiskeysockets/baileys");
const fs = require("fs");
const path = require("path");
const P = require("pino");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

let sock;
let isConnected = false;
let plugins = {};

// === LOAD PLUGINS ===
function loadPlugins() {
  plugins = {};
  const plugDir = path.join(__dirname, "plugin");
  if (!fs.existsSync(plugDir)) fs.mkdirSync(plugDir, { recursive: true });
  for (const file of fs.readdirSync(plugDir)) {
    if (file.endsWith(".js")) {
      const name = file.replace(".js", "");
      delete require.cache[require.resolve(`./plugin/${file}`)];
      plugins[name] = require(`./plugin/${file}`);
      console.log("✅ Loaded plugin:", name);
    }
  }
}
loadPlugins();

// === START BOT ===
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./session");
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    logger: P({ level: "silent" }),
    browser: Browsers.macOS("Safari"),
    printQRInTerminal: false,
  });

  sock.ev.on("creds.update", saveCreds);

  if (!sock.authState.creds.registered) {
    const phone = process.env.PHONE_NUMBER;
    if (!phone) {
      console.log("❌ PHONE_NUMBER environment belum diisi");
      process.exit(1);
    }
    const code = await sock.requestPairingCode(phone.replace(/\D/g, ""));
    console.log(`🔑 Pairing code (${phone}): ${code.match(/.{1,4}/g).join("-")}`);
  }

  sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    if (connection === "open") {
      isConnected = true;
      console.log("✅ Bot Connected!");
    } else if (connection === "close") {
      isConnected = false;
      const reason = lastDisconnect?.error?.output?.statusCode;
      console.log("❌ Disconnected, reconnecting...");
      if (reason !== DisconnectReason.loggedOut) startBot();
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || !msg.key.remoteJid) return;

    const from = msg.key.remoteJid;
    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      msg.message.imageMessage?.caption ||
      msg.message.videoMessage?.caption ||
      "";

    if (!text.startsWith(".")) return;
    const args = text.slice(1).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    const context = {
      from,
      msg,
      quoted: msg.message?.extendedTextMessage?.contextInfo?.quotedMessage,
      isOwner: msg.key.fromMe,
    };

    if (plugins[cmd]) {
      try {
        await plugins[cmd](sock, context, args);
      } catch (err) {
        console.error("Plugin error:", err);
        sock.sendMessage(from, { text: "⚠️ Error di plugin" });
      }
    }
  });
}

startBot();

// === API ENDPOINTS ===

// status bot
app.get("/status", (req, res) => {
  res.json({
    connected: isConnected,
    phone: process.env.PHONE_NUMBER,
    plugins: Object.keys(plugins),
    uptime: process.uptime().toFixed(0) + "s",
  });
});

// kirim pesan
app.post("/send", async (req, res) => {
  const { number, message } = req.body;
  try {
    await sock.sendMessage(number + "@s.whatsapp.net", { text: message });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// reload plugin
app.post("/reload", (req, res) => {
  loadPlugins();
  res.json({ success: true, plugins: Object.keys(plugins) });
});

app.listen(3000, () => console.log("🌐 Dashboard: http://localhost:3000"));
