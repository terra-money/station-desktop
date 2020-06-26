const w = require('./wallet')

const signTx = ({ wallet, tx, request }) => {
  const signature = w.sign(tx, wallet, request)
  const signedTx = w.createSignedTx(tx, signature)
  return w.createBroadcastBody(signedTx, 'block')
}

const generateAddresses = async (mnemonic) => {
  const generateAddress = async (n) => {
    const { terraAddress } = await w.generateWalletFromSeed(mnemonic, n)
    return terraAddress
  }

  return [await generateAddress(118), await generateAddress(330)]
}

module.exports = {
  signTx,
  generateAddresses,
}
