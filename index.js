const WebSocket = require('ws');
const axios = require('axios');
const etherbot = require('./etherbot')

let config = {
  headers: {"x-api-key": "UAK000000000000000000000000demo0001"}
}

const getEtherPrice = async () => {
  const response = await axios.get(`https://web3api.io/api/v1/market/rankings`, config)
  const eth = response.data.payload.data.filter( (asset) => asset.symbol === 'ETH')[0]
  return eth.currentPrice
}

const getNumTokenTrans = async (block) => {
  const response = await axios.get(`https://web3api.io/api/v1/blocks/${block}/token-transfers`, config)
  return response.data.payload.data.length
}

const getBlockTransactions = async (block) => {
  const response = await axios.get(`https://web3api.io/api/v1/blocks/${block}/transactions`, config)
  return response.data.payload.records
}

const getBlockTime = async (block) => {
  const response = await axios.get(`https://web3api.io/api/v1/blocks/${block}`, config)
  return response.data.payload.duration
}

const transactionsDataAgg = (transactions) => {
  let totalFees = 0
  let contractsCreated = 0
  let ethTrans = 0
  for(txn in transactions) {
    if (transactions[txn].statusResult.success) {
      totalFees += parseInt(transactions[txn].fee)
      contractsCreated += transactions[txn].contractAddress !== 'null'
      ethTrans += parseInt(transactions[txn].value)
    }
  }
  console.log({totalFees, contractsCreated, ethTrans})
  return {totalFees, contractsCreated, ethTrans}
}

const ws = new WebSocket('wss://ws.web3api.io', config);

ws.on('open', async () => {
  ws.send(JSON.stringify({
    jsonrpc: '2.0',
    method: 'subscribe',
    params: ['block'],
    id: 1,
  }));
});

ws.on('message', data => {
  responseHandler(JSON.parse(data))
});

ws.on('error', err => {
  console.log(err)
})

const responseHandler = async (data) => {

  if(data.params) {

    const result = data.params.result

    const numTransfers = await getNumTokenTrans(result.number)
    const price = await getEtherPrice()
    const transactions = await getBlockTransactions(result.number)
    const blockTime = await getBlockTime(result.number)

    const {totalFees, contractsCreated, ethTrans} = transactionsDataAgg(transactions)

    const rewardEth = reward(result)
    const rewardUSD = round(rewardEth * price)
    const percFilled = getPercFilled(result)

    const tweet = `
    📜 Block 【 ${result.number} 】
    ⛏ Miner ${result.miner}
        💰 Total Reward ${reward(result)} ​$ETH $${rewardUSD}
    ⛽️ ${percFilled}%
    💸 Fees ${round(toEth(totalFees), 4)}
    👴 Uncles ${result.numUncles}
    💳 Txns ${result.numTransactions}
        ⇄ Token Transfers ${numTransfers}
    🔗 wb3.io/${result.number}
    `

    console.log(tweet)
    etherbot.sendTweet((tweet))

    dbClient.insert('blocks', {
      number: result.number,
      transactions: result.numTransactions,
      tokenTrans: numTransfers,
      contractsCreated: contractsCreated,
      size: result.size,
      ethTrans: ethTrans,
      fees: totalFees,
      blockTime: blockTime
    })

  } else {
    console.log(data)
  }
}

const filledEmoji = (percFilled) =>  {
  const bars = ( parseInt(percFilled) / 10 ) * 2
  console.log('bars - ', bars)

  const emptyBars = 20 - bars
  console.log('emptyBars - ', emptyBars)
  return `${'🁢'.repeat(bars)}${'🁣'.repeat(emptyBars)}` // 🁣🁣🁣🁣🁣
}

const getPercFilled = (data) => round(data.gasUsed / data.gasLimit) * 100

const reward = (data) => {
    return round(toEth(data.reward)).trim()
}

const toEth = (wei) =>  {
  return wei / 1000000000000000000
}

const round = (n, digits=2) => {
  return Number.parseFloat(n).toFixed(digits)
}

/*
* can't add fees yet -> 💵 Fees ${round(reward(result) - 2)}$ETH
* */

