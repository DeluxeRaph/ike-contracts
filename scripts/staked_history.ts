import dotenv from "dotenv"
import axios from "axios"
import {initPolkadotJs} from "./utils/initPolkadotJs"
import Compounds from "./Compounds.json" assert { type: 'json' }
import Analytics from "./Analytics.json" assert { type: 'json' }
import BatchUnlocks from "./BatchUnlocks.json" assert { type: 'json' }

const chainId = process.env.CHAIN || 'development'
dotenv.config({
  path: `.env.${chainId}`,
})


const BLOCKS = Array.from(new Set([
  ...Compounds.map(c => c.block),
  ...BatchUnlocks.map(c => c.block),
]))

BLOCKS.sort((a, b) => a - b)
console.log(BLOCKS)

async function main() {
  // Initialization
  const initParams = await initPolkadotJs()
  const {api} = initParams

  const DB = []
  let index_set = new Set<number>()

  for (const BLOCK of BLOCKS) {
    const index = Analytics.findIndex(a => a.block === BLOCK)
    if (index >= 0) {
      index_set.add(index - 1)
      index_set.add(index)
    }
  }

  const indexes = Array.from(index_set)
  indexes.sort((a, b) => a - b)

  console.log(indexes)

  for (const i of indexes) {
    const block = Analytics[i].block
    const totalPooled = toBI(Analytics[i].totalPooled)

    let blockHash = await getBlockHash(block) // await api.query.system.blockHash(blockNumber)

    console.log(`Looking up data for block ${block} (i=${i}) (${blockHash}) ...`)
    const snapshotApi = await api.at(blockHash)

    let [staking_total_167, staking_active_167] = await snapshotApi.query.staking.ledger('5EYCAe5ijiYfAXEth5DNsom62h3M85mpW93WcHeBo5jGb9y2').then(codec => [codec.toHuman()['total'], codec.toHuman()['active']]).then(x => x.map(toBI)).catch(() => [0n, 0n])
    let [staking_total_168, staking_active_168] = await snapshotApi.query.staking.ledger('5EYCAe5ijiYfAXEth5DNwNcpyzpp8QvuTb2N7e26KYei8YvK').then(codec => [codec.toHuman()['total'], codec.toHuman()['active']]).then(x => x.map(toBI)).catch(() => [0n, 0n])
    let [staking_total_169, staking_active_169] = await snapshotApi.query.staking.ledger('5EYCAe5ijiYfAXEth5DNzwUZwJcH8k5zR31DczPzr1a9fya7').then(codec => [codec.toHuman()['total'], codec.toHuman()['active']]).then(x => x.map(toBI)).catch(() => [0n, 0n])
    let staking_inactive_167 = staking_total_167 - staking_active_167
    let staking_inactive_168 = staking_total_168 - staking_active_168
    let staking_inactive_169 = staking_total_169 - staking_active_169

    DB.push({
      block,
      blockHash,
      staking_total_167,
      staking_total_168,
      staking_total_169,
      staking_active_167,
      staking_active_168,
      staking_active_169,
      staking_inactive_167,
      staking_inactive_168,
      staking_inactive_169,
      totalPooled,
    })
  }

  const table = []
  for (const block of BLOCKS) {
    const index = DB.findIndex(db => db.block === block)
    const activeDelta_167 = DB[index].staking_active_167 - DB[index - 1].staking_active_167
    const activeDelta_168 = DB[index].staking_active_168 - DB[index - 1].staking_active_168
    const activeDelta_169 = DB[index].staking_active_169 - DB[index - 1].staking_active_169
    const inactiveDelta_167 = DB[index].staking_inactive_167 - DB[index - 1].staking_inactive_167
    const inactiveDelta_168 = DB[index].staking_inactive_168 - DB[index - 1].staking_inactive_168
    const inactiveDelta_169 = DB[index].staking_inactive_169 - DB[index - 1].staking_inactive_169
    const totalPooledDelta = DB[index].totalPooled - DB[index - 1].totalPooled

    table.push({
      'block': block,
      '-': "active",
      'pool167': activeDelta_167,
      'pool168': activeDelta_168,
      'pool169': activeDelta_169,
      'sum': activeDelta_167 + activeDelta_168 + activeDelta_169,
    })
    table.push({
      '-': "inactive",
      'pool167': inactiveDelta_167,
      'pool168': inactiveDelta_168,
      'pool169': inactiveDelta_169,
      'sum': inactiveDelta_167 + inactiveDelta_168 + inactiveDelta_169,
    })
    table.push({
      '-': "totalPooled",
      'sum': totalPooledDelta,
    })
  }
  console.table(table)

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
