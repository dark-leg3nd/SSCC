import { startModBot } from '../../lib/mods.js'

export default {
  command: ['mod'],
  category: 'socket',
  isOwner: true, // ⭐ SOLO OWNER

  run: async (client, m, args) => {

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
      m.chat
    )
  }
}