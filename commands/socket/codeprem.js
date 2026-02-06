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

    const user = global.db.data.users[m.sender]
    if (!user) return

    /* ========= COOLDOWN ========= */
    let time = user.Prem + 120000 || 0

    if (new Date() - user.Prem < 120000) {
      return client.reply(
        m.chat,
        `⏳ Espera *${msToTime(time - new Date())}* para volver a generar otro código.`,
        m
      )
    }

    /* ========= LIMITE DE BOTS ========= */
    const premsPath = path.join(dirname, '../../Sessions/Prems')

    const count = fs.existsSync(premsPath)
      ? fs.readdirSync(premsPath).filter(dir =>
          fs.existsSync(path.join(premsPath, dir, 'creds.json'))
        ).length
      : 0

    const maxPrems = 20

    if (count >= maxPrems) {
      return client.reply(
        m.chat,
        '❌ No hay espacios disponibles para más Premium-Bots.',
        m
      )
    }

    /* ========= BANDERA ========= */
    commandFlags[m.sender] = true

    /* ========= NUMERO ========= */
    const phone = args[0]
      ? args[0].replace(/\D/g, '')
      : m.sender.split('@')[0]

    /* ========= MENSAJE ========= */
    const caption =
`✦ Vinculación PREMIUM ✦

Sigue estos pasos:
✦ Dispositivos vinculados
✦ Vincular dispositivo
✦ Con número telefónico

✦ Obtendrás funciones PREMIUM`

    const isCode = true
    const isCommand = true

    /* ========= INICIAR PREMIUM ========= */
    await startPremBot(
      m,
      client,
      caption,
      isCode,
      phone,
      m.chat,
      commandFlags,
      isCommand
    )

    user.Prem = Date.now()
  }
}


/* ========= UTILS ========= */

function msToTime(duration) {
  var seconds = Math.floor((duration / 1000) % 60)
  var minutes = Math.floor((duration / (1000 * 60)) % 60)

  if (minutes)
    return `${minutes}m ${seconds}s`
  return `${seconds}s`
}