export default {
  command: ['delmod'],
  isOwner: true,

  run: async (client, m) => {
    const user =
      m.mentionedJid?.[0] ||
      (m.quoted ? m.quoted.sender : null)

    if (!user) return

    delete global.db.data.users[user].isMod

    m.reply('❌ Mod eliminado')
  },
}