import {
  Browsers,
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  jidDecode,
} from '@whiskeysockets/baileys'

import NodeCache from 'node-cache'
import handler from '../handler.js'
import events from '../commands/events.js'
import pino from 'pino'
import fs from 'fs'
import chalk from 'chalk'
import { smsg } from './message.js'

if (!global.conns) global.conns = []

const msgRetryCounterCache = new NodeCache({ stdTTL: 0, checkperiod: 0 })
const userDevicesCache = new NodeCache({ stdTTL: 0, checkperiod: 0 })
const groupCache = new NodeCache({ stdTTL: 3600, checkperiod: 300 })

let reintentos = {}

const cleanJid = (jid = '') => jid.replace(/:\d+/, '').split('@')[0]


export async function startPremBot(
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

  /* 🔥 CARPETA PROPIA PREMIUM */
  const sessionFolder = `./Sessions/Prems/${id}`

  const senderId = m?.sender

  const { state, saveCreds } = await useMultiFileAuthState(sessionFolder)
  const { version } = await fetchLatestBaileysVersion()

  console.info = () => {}

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
    version,
    keepAliveIntervalMs: 60_000,
    maxIdleTimeMs: 120_000,
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


  /* ================= CONEXIÓN ================= */

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {

    /* -------- OPEN -------- */

    if (connection === 'open') {

      sock.isInit = true
      sock.uptime = Date.now()

      sock.userId = cleanJid(sock.user?.id)

      const botDir = sock.userId + '@s.whatsapp.net'

      if (!globalThis.db.data.settings[botDir])
        globalThis.db.data.settings[botDir] = {}

      /* ⭐ FLAGS PREMIUM */
      globalThis.db.data.settings[botDir].botprem = true
      globalThis.db.data.settings[botDir].botmod = false
      globalThis.db.data.settings[botDir].type = 'Prem'

      if (!global.conns.find(c => c.userId === sock.userId))
        global.conns.push(sock)

      delete reintentos[sock.userId]

      console.log(chalk.green(`[ ✿  ]  PREMIUM-BOT conectado: ${sock.userId}`))
    }


    /* -------- CLOSE -------- */

    if (connection === 'close') {

      const botId = sock.userId || id
      const reason = lastDisconnect?.error?.output?.statusCode || 0

      const intentos = reintentos[botId] || 0
      reintentos[botId] = intentos + 1

      if ([401, 403].includes(reason)) {

        if (intentos >= 5) {
          fs.rmSync(sessionFolder, { recursive: true, force: true })
          delete reintentos[botId]
          return
        }
      }

      setTimeout(() => {
        startPremBot(m, client, caption, isCode, phone, chatId, {}, isCommand)
      }, 3000)
    }


    /* -------- CÓDIGO -------- */

    if (qr && isCode && commandFlags[senderId]) {
      try {
        let code = await sock.requestPairingCode(phone, 'ABCD1234')
        code = code.match(/.{1,4}/g)?.join('-') || code

        const msg = await m.reply(caption)
        const msgCode = await m.reply(code)

        delete commandFlags[senderId]

        setTimeout(async () => {
          await client.sendMessage(chatId, { delete: msg.key })
          await client.sendMessage(chatId, { delete: msgCode.key })
        }, 60000)

      } catch (e) {
        console.log(e)
      }
    }

  })


  /* ================= MENSAJES ================= */

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return

    for (let raw of messages) {
      if (!raw.message) continue
      let msg = await smsg(sock, raw)
      handler(sock, msg, messages)
    }
  })


  try {
    await events(sock, m)
  } catch {}

  return sock
}