import { startPremBot } from '../../lib/prems.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

let commandFlags = {}

export default {
  command: ['codeprem'],
  category: 'socket',

  run: async (client, m, args, command) => {

    const db = global.db.data
    const chatId = m.chat
    const chatData = db.chats[chatId]

    if (!chatData) return

    const user = chatData.users[m.sender]
    if (!user) return m.reply('❌ No estás registrado.')

    /* =========================
       💰 COSTO
    ========================= */

    const COST = 200000

    if (!user.coins) user.coins = 0

    if (user.coins < COST)
      return m.reply(`❌ Necesitas *¥${COST.toLocaleString()} Coins* para vincular un Premium-Bot.`)

    /* =========================
       ⏳ COOLDOWN
    ========================= */

    let time = user.Prem + 120000 || 0

    if (new Date() - user.Prem < 120000) {
      return client.reply(
        m.chat,
        `⏳ Espera *${msToTime(time - new Date())}* para volver a generar otro código.`,
        m
      )
    }

    /* =========================
       📂 LIMITE
    ========================= */

    const premsPath = path.join(dirname, '../../Sessions/Prems')

    const count = fs.existsSync(premsPath)
      ? fs.readdirSync(premsPath).filter(dir =>
          fs.existsSync(path.join(premsPath, dir, 'creds.json'))
        ).length
      : 0

    const maxPrems = 20

    if (count >= maxPrems)
      return m.reply('❌ No hay espacios disponibles para más Premium-Bots.')

    /* =========================
       💸 DESCONTAR COINS (AQUÍ)
    ========================= */

    user.coins -= COST

    await m.reply(
      `💸 Se descontaron *¥${COST.toLocaleString()} Coins*\nRestante: *¥${user.coins.toLocaleString()}*`
    )

    /* =========================
       🚩 BANDERA
    ========================= */

    commandFlags[m.sender] = true

    const phone = args[0]
      ? args[0].replace(/\D/g, '')
      : m.sender.split('@')[0]

    const caption =
`✦ Vinculación PREMIUM ✦

Sigue estos pasos:
✦ Dispositivos vinculados
✦ Vincular dispositivo
✦ Con número telefónico

⭐ Obtendrás funciones PREMIUM`

    await startPremBot(
      m,
      client,
      caption,
      true,
      phone,
      m.chat,
      commandFlags,
      true
    )

    user.Prem = Date.now()
  }
}


/* ================= UTIL ================= */

function msToTime(duration) {
  var seconds = Math.floor((duration / 1000) % 60)
  var minutes = Math.floor((duration / (1000 * 60)) % 60)

  if (minutes)
    return `${minutes}m ${seconds}s`
  return `${seconds}s`
}