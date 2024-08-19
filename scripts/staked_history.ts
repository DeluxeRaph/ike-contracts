import dotenv from "dotenv"
import axios from "axios"
import {initPolkadotJs} from "./utils/initPolkadotJs"
import Analytics from "./Analytics.json" assert { type: 'json' }

const chainId = process.env.CHAIN || 'development'
dotenv.config({
  path: `.env.${chainId}`,
})

async function main() {
  // Initialization
  const initParams = await initPolkadotJs()
  const {api} = initParams

  const data = Analytics.data.analytics
  const bonded = {
    '69558413': {
      '167': 10522124629456843n,
      '168': 10171062575928059n,
      '169': 800727936805088n,
    },
    '69558356': {
      '167': 8387021223523283n,
      '168': 0n,
      '169': 11612978776476717n,
    },
    '69558331': {
      '167': 13835073473640510n,
      '168': 0n,
      '169': 19164926526359490n,
    },
    '69558212': {
      '167': 8381379799036568n,
      '168': 0n,
      '169': 11618620200963432n,
    },
    '69558070': {
      '167': 10474061133419349n,
      '168': 0n,
      '169': 14525938866580151n,
    },
  }

  const table = []
  const deltaTable = []

  const MIN = 13_585
  const MAX = 13_591
  const INC = 1

  for (let i=Math.max(MIN, 0); i<Math.min(MAX, data.length); i+=INC) {
    const block = data[i].block
    const totalPooled = toBI(data[i].totalPooled)

    console.log(`Looking up block hash for block ${block} (i=${i}) ...`)
    let blockHash = await getBlockHash(block) // await api.query.system.blockHash(blockNumber)

    console.log(`Looking up points at block hash ${blockHash} ...`)
    const snapshotApi = await api.at(blockHash)
    let points_167 = await snapshotApi.query.nominationPools.bondedPools(167).then(codec => codec.toHuman()['points']).then(toBI)
    let points_168 = await snapshotApi.query.nominationPools.bondedPools(168).then(codec => codec.toHuman()['points']).then(toBI)
    let points_169 = await snapshotApi.query.nominationPools.bondedPools(169).then(codec => codec.toHuman()['points']).then(toBI).catch(() => 0n)
    const points_total = points_167 + points_168 + points_169

    if (table.length > 0) {
      const tableEntry = table[table.length - 1]
      const pointsDelta_167 = points_167 - tableEntry.points_167
      const pointsDelta_168 = points_168 - tableEntry.points_168
      const pointsDelta_169 = points_169 - tableEntry.points_169
      const bonded_167 = bonded[block]?.[167] ?? 0n
      const bonded_168 = bonded[block]?.[168] ?? 0n
      const bonded_169 = bonded[block]?.[169] ?? 0n

      deltaTable.push({
        'block': block,
        // 'hash': blockHash,
        '-': "increase",
        'pool167': pointsDelta_167,
        'pool168': pointsDelta_168,
        'pool169': pointsDelta_169,
        'total': pointsDelta_167 + pointsDelta_168 + pointsDelta_169,
      })
      deltaTable.push({
        '-': "bonded",
        'pool167': bonded_167,
        'pool168': bonded_168,
        'pool169': bonded_169,
        'total': bonded_167 + bonded_168 + bonded_169,
      })
      deltaTable.push({
        '-': "diff",
        'pool167': bonded_167 - pointsDelta_167,
        'pool168': bonded_168 - pointsDelta_168,
        'pool169': bonded_169 - pointsDelta_169,
        'total': (bonded_167 + bonded_168 + bonded_169) - (pointsDelta_167 + pointsDelta_168 + pointsDelta_169)
      })
    }

    table.push({
      i,
      block,
      points_167,
      points_168,
      points_169,
      points_total,
      totalPooled: totalPooled,
      delta: points_total - totalPooled,
    })
  }

  console.table(table)
  console.table(deltaTable)

  await api.disconnect()
}

async function getBlockHash(blockNumber: number) {
  try {
    const response = await axios.post(
      'https://alephzero-testnet.api.subscan.io/api/scan/block',
      {
        block_num: blockNumber,
        only_head: true,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': '7c2cf433b2ca4b16971bf6b77a8be375'
        }
      }
    )
    return response.data.data.hash
  } catch (error) {
    console.error(`Error fetching blockhash for block ${blockNumber}:`, error.message)
    return null
  }
}

function toBI(input: string): bigint {
  return BigInt(input.trim().replace(/,/g, ''))
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
