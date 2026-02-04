import {
  Browsers,
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  jidDecode,
  DisconnectReason,
} from '@whiskeysockets/baileys'

import NodeCache from 'node-cache'
import handler from '../handler.js'
import events from '../commands/events.js'
import pino from 'pino'
import fs from 'fs'
import chalk from 'chalk'
import { smsg } from './message.js'

if (!global.conns) global.conns = []

const msgRetryCounterCache = new NodeCache({ stdTTL: 0 })
const userDevicesCache = new NodeCache({ stdTTL: 0 })
const groupCache = new NodeCache({ stdTTL: 3600 })

let reintentos = {}

const cleanJid = (jid = '') => jid.replace(/:\d+/, '').split('@')[0]

export async function startModBot(
  m,
  client,
  caption = '',
  isCode = false,
  phone = '',
  chatId = '',
  commandFlags = {},
  isCommand = false,
) {
  const id = phone || (m?.sender || '').split('@')[0]

  // ⭐ CARPETA MOD
  const sessionFolder = `./Sessions/Mods/${id}`

  const senderId = m?.sender

  const { state, saveCreds } = await useMultiFileAuthState(sessionFolder)
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: Browsers.macOS('Chrome'),

    auth: state,

    markOnlineOnConnect: true,
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,

    getMessage: async () => '',

    msgRetryCounterCache,
    userDevicesCache,
    cachedGroupMetadata: async (jid) => groupCache.get(jid),

    keepAliveIntervalMs: 45000,
    maxIdleTimeMs: 90000,

    version,
  })

  sock.isInit = false

  sock.ev.on('creds.update', saveCreds)

  sock.decodeJid = (jid) => {
    if (!jid) return jid
    if (/:\d+@/gi.test(jid)) {
      let decode = jidDecode(jid) || {}
      return decode.user + '@' + decode.server
    }
    return jid
  }

  // ======================
  // CONEXIÓN
  // ======================
  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (connection === 'open') {
      sock.userId = cleanJid(sock.user.id)

      const botDir = sock.userId + '@s.whatsapp.net'

      if (!global.db.data.settings[botDir])
        global.db.data.settings[botDir] = {}

      // ⭐ FLAGS MOD
      global.db.data.settings[botDir].botmod = true
      global.db.data.settings[botDir].botprem = false
      global.db.data.settings[botDir].type = 'Mod'

      if (!global.conns.find((c) => c.userId === sock.userId))
        global.conns.push(sock)

      delete reintentos[sock.userId]

      console.log(chalk.yellow(`[MOD] Conectado → ${sock.userId}`))
    }

    // ======================
    // RECONEXIÓN
    // ======================
    if (connection === 'close') {
      const botId = sock.userId || id

      const intentos = reintentos[botId] || 0
      reintentos[botId] = intentos + 1

      if (intentos > 5) {
        try {
          fs.rmSync(sessionFolder, { recursive: true, force: true })
        } catch {}
        return
      }

      setTimeout(() => {
        startModBot(m, client, caption, isCode, phone, chatId, {}, isCommand)
      }, 3000)
    }

    // ======================
    // PAIR CODE
    // ======================
    if (qr && isCode && phone && client && chatId && commandFlags[senderId]) {
      let code = await sock.requestPairingCode(phone)
      code = code.match(/.{1,4}/g)?.join('-')

      await client.sendMessage(chatId, { text: caption })
      await client.sendMessage(chatId, { text: code })

      delete commandFlags[senderId]
    }
  })

  // ======================
  // MENSAJES
  // ======================
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return

    for (let raw of messages) {
      if (!raw.message) continue
      let msg = await smsg(sock, raw)
      handler(sock, msg, messages)
    }
  })

  await events(sock, m)

  return sock
}