import { startPremBot } from '../../lib/prems.js'

let commandFlags = {}

export default {
  command: ['codeprem'],
  category: 'socket',

  run: async (client, m, args, command) => {
    commandFlags[m.sender] = true

    const phone = args[0]
      ? args[0].replace(/\D/g, '')
      : m.sender.split('@')[0]

    const caption =
      '✦ Vincula tu *Premium-Bot* con este código.\n\nDuración: 60 segundos.'

    await startPremBot(
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