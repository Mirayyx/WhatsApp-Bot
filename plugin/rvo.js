const { downloadContentFromMessage } = require("@whiskeysockets/baileys")

module.exports = async (sock, msg, args) => {
  try {
    const from = msg.from
    let quoted = msg.quoted

    if (!quoted) {
      return sock.sendMessage(from, { text: "❗ Reply pesan view-once dulu" }, { quoted: msg })
    }


    if (quoted.viewOnceMessageV2) quoted = quoted.viewOnceMessageV2.message
    if (quoted.viewOnceMessage) quoted = quoted.viewOnceMessage.message

    const mediaMsg = quoted.imageMessage || quoted.videoMessage || quoted.audioMessage
    if (!mediaMsg) {
      return sock.sendMessage(from, { text: "❗ Itu bukan pesan view-once media" }, { quoted: msg })
    }

    const mime = mediaMsg.mimetype || ""
    const mediaType = /image/.test(mime) ? "image"
                    : /video/.test(mime) ? "video"
                    : "audio"

    const stream = await downloadContentFromMessage(mediaMsg, mediaType)
    let buffer = Buffer.from([])
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk])
    }

    if (/image/.test(mime)) {
      await sock.sendMessage(from, { image: buffer, caption: mediaMsg.caption || "" }, { quoted: msg })
    } else if (/video/.test(mime)) {
      await sock.sendMessage(from, { video: buffer, caption: mediaMsg.caption || "" }, { quoted: msg })
    } else if (/audio/.test(mime)) {
      await sock.sendMessage(from, { audio: buffer, mimetype: "audio/mpeg", ptt: true }, { quoted: msg })
    }
  } catch (err) {
    console.error("Plugin rvo error:", err)
    await sock.sendMessage(msg.from, { text: "⚠️ Gagal membuka pesan view-once" }, { quoted: msg })
  }
}
