import fs from 'fs'
import path from 'path'
import ws from 'ws'
import { fileURLToPath } from 'url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default {
  command: ['bots', 'sockets'],
  category: 'socket',

  run: async (client, m) => {
    const from = m.key.remoteJid

    const groupMetadata = m.isGroup
      ? await client.groupMetadata(from).catch(() => {})
      : ''

    const groupParticipants =
      groupMetadata?.participants?.map(
        (p) => p.phoneNumber || p.jid || p.lid || p.id
      ) || []

    const mainBotJid =
      global.client.user.id.split(':')[0] + '@s.whatsapp.net'

    const basePath = path.join(dirname, '../../Sessions')

    const getBotsFromFolder = (folderName) => {
      const folderPath = path.join(basePath, folderName)
      if (!fs.existsSync(folderPath)) return []

      return fs
        .readdirSync(folderPath)
        .filter((dir) =>
          fs.existsSync(path.join(folderPath, dir, 'creds.json'))
        )
        .map((id) => id.replace(/\D/g, ''))
    }

    const subs = getBotsFromFolder('Subs')
    const mods = getBotsFromFolder('Mods') // ⭐ ahora serán principales
    const prems = getBotsFromFolder('Prems')

    const categorizedBots = {
      Principal: [],
      Premium: [],
      Sub: [],
    }

    const mentionedJid = []

    const formatBot = (number, label) => {
      const jid = number + '@s.whatsapp.net'
      if (!groupParticipants.includes(jid)) return null

      mentionedJid.push(jid)

      const data = global.db.data.settings[jid] || {}
      const name = data.namebot2 || 'Bot'

      return `- [${label} *${name}*] › @${number}`
    }

    // ======================
    // OWNER PRINCIPAL
    // ======================
    if (groupParticipants.includes(mainBotJid)) {
      const name =
        global.db.data.settings[mainBotJid]?.namebot2 || 'Main'

      mentionedJid.push(mainBotJid)

      categorizedBots.Principal.push(
        `- [Owner *${name}*] › @${mainBotJid.split('@')[0]}`
      )
    }

    // ======================
    // ⭐ MODS → PRINCIPAL
    // ======================
    mods.forEach((num) => {
      const line = formatBot(num, 'Main')
      if (line) categorizedBots.Principal.push(line)
    })

    // ======================
    // PREMIUM
    // ======================
    prems.forEach((num) => {
      const line = formatBot(num, 'Premium')
      if (line) categorizedBots.Premium.push(line)
    })

    // ======================
    // SUB
    // ======================
    subs.forEach((num) => {
      const line = formatBot(num, 'Sub')
      if (line) categorizedBots.Sub.push(line)
    })

    // ======================
    // CONTADORES
    // ======================
    const totalPrincipal =
      categorizedBots.Principal.length

    const totalPremium = prems.length
    const totalSub = subs.length

    const totalBots =
      totalPrincipal + totalPremium + totalSub

    const totalInGroup =
      categorizedBots.Principal.length +
      categorizedBots.Premium.length +
      categorizedBots.Sub.length

    // ======================
    // MENSAJE
    // ======================
    let message = `ꕥ Números de Sockets activos *(${totalBots})*\n\n`

    message += `ੈ❖‧₊˚ Principales › *${totalPrincipal}*\n`
    message += `ੈ✰︎︎‧₊˚ Premiums › *${totalPremium}*\n`
    message += `ੈ✿‧₊˚ Subs › *${totalSub}*\n\n`

    message += `➭ *Bots en el grupo ›* ${totalInGroup}\n\n`

    for (const category of ['Principal', 'Premium', 'Sub']) {
      if (categorizedBots[category].length) {
        message += categorizedBots[category].join('\n') + '\n'
      }
    }

    await client.sendContextInfoIndex(
      m.chat,
      message,
      {},
      m,
      true,
      mentionedJid
    )
  },
}