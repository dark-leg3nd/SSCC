import { startModBot } from '../../lib/mods.js'

let commandFlags = {}

export default {
  command: ['codemod'],
  category: 'socket',

  run: async (client, m, args) => {
    const userData = global.db.data.users[m.sender] || {}

    // ⭐ PERMISOS REALES
    if (!m.isOwner && !userData.isMod) return
    // 👆 NO reply → handler muestra "comando no existe"

    commandFlags[m.sender] = true

    const phone = args[0]
      ? args[0].replace(/\D/g, '')
      : m.sender.split('@')[0]

    const caption =
      '✦ Vincula tu *Mod-Bot* con este código.\n\nDuración: 60 segundos.'

    await startModBot(
      m,
      client,
      caption,
      true,
      phone,
      m.chat,
      commandFlags,
      true,
    )
  },
}