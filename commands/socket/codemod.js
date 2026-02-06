import { startModBot } from '../../lib/mods.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

let commandFlags = {}

export default {
  command: ['codemod'],
  category: 'socket',
  isOwner: true, // 🔥 SOLO OWNER puede ejecutarlo

  run: async (client, m, args, command) => {

    const user = global.db.data.users[m.sender]
    if (!user) return

    /* =========================
       ⏳ COOLDOWN
    ========================= */

    let time = user.Mod + 120000 || 0

    if (new Date() - user.Mod < 120000) {
      return client.reply(
        m.chat,
        `⏳ Espera *${msToTime(time - new Date())}* para volver a generar otro código.`,
        m
      )
    }

    /* =========================
       📂 LIMITE DE BOTS
    ========================= */

    const modsPath = path.join(dirname, '../../Sessions/Mods')

    const count = fs.existsSync(modsPath)
      ? fs.readdirSync(modsPath).filter(dir =>
          fs.existsSync(path.join(modsPath, dir, 'creds.json'))
        ).length
      : 0

    const maxMods = 20

    if (count >= maxMods) {
      return client.reply(
        m.chat,
        '❌ No hay espacios disponibles para más Mod-Bots.',
        m
      )
    }

    /* =========================
       🚩 BANDERA
    ========================= */

    commandFlags[m.sender] = true

    const phone = args[0]
      ? args[0].replace(/\D/g, '')
      : m.sender.split('@')[0]

    const caption =
`✦ Vinculación MOD / MAIN ✦

Sigue estos pasos:
✦ Dispositivos vinculados
✦ Vincular dispositivo
✦ Con número telefónico

🛡️ Bot tipo MOD activado`

    /* =========================
       INICIAR MOD
    ========================= */

    await startModBot(
      m,
      client,
      caption,
      true,
      phone,
      m.chat,
      commandFlags,
      true
    )

    user.Mod = Date.now()
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