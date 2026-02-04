import {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers,
  DisconnectReason
} from '@whiskeysockets/baileys'

import pino from 'pino'
import NodeCache from 'node-cache'
import fs from 'fs'
import path from 'path'
import handler from '../handler.js'
import events from '../commands/events.js'
import { smsg } from '../lib/message.js'

const msgRetryCounterCache = new NodeCache()

export async function startModBot(
  m,
  parentClient,
  caption,
  usePairing = true,
  phone,
  chat
) {

  const sessionPath = `./Sessions/Mods/${phone}`

  if (!fs.existsSync(sessionPath))
    fs.mkdirSync(sessionPath, { recursive: true })

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),

    browser: Browsers.macOS('Chrome'), // ⭐ rápido

    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
    },

    markOnlineOnConnect: false,
    syncFullHistory: false, // ⭐ CLAVE VELOCIDAD
    generateHighQualityLinkPreview: false,
    keepAliveIntervalMs: 10000,
    maxIdleTimeMs: 20000,

    msgRetryCounterCache
  })

  sock.ev.on('creds.update', saveCreds)

  /*
  ⭐ PAIRING (igual subs/prem)
  */
  if (usePairing && !state.creds.registered) {
    setTimeout(async () => {
      const code = await sock.requestPairingCode(phone)
      const format = code?.match(/.{1,4}/g)?.join('-') || code

      await parentClient.sendMessage(chat, {
        text: `${caption}\n\n🔑 *Código:* ${format}`
      })
    }, 1500)
  }

  /*
  ⭐ CONEXIÓN
  */
  sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {

    if (connection === 'open') {
      await parentClient.sendMessage(chat, {
        text: '✅ Mod-Bot conectado correctamente.'
      })
    }

    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode

      if (reason !== DisconnectReason.loggedOut) {
        startModBot(m, parentClient, caption, usePairing, phone, chat)
      }
    }
  })

  /*
  ⭐ MENSAJES → handler principal (igual sub)
  */
  sock.ev.on('messages.upsert', async ({ messages }) => {
    try {
      let msg = messages[0]
      if (!msg?.message) return

      msg = await smsg(sock, msg)

      await handler(sock, msg, messages)
    } catch {}
  })

  try {
    await events(sock)
  } catch {}

  sock.userId = phone
  global.conns.push(sock)

  return sock
}