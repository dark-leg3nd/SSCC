export default {
  command: ['addmod'],
  category: 'owner',
  isOwner: true, // ⭐ SOLO OWNER (igual que eval)

  run: async (client, m) => {
    const user =
      m.mentionedJid?.[0] ||
      (m.quoted ? m.quoted.sender : null)

    if (!user) return m.reply('✦ Menciona o responde a un usuario')

    if (!global.db.data.users[user])
      global.db.data.users[user] = {}

    global.db.data.users[user].isMod = true

    m.reply(`✅ @${user.split('@')[0]} ahora es *Mod/Main*`, {
      mentions: [user],
    })
  },
}