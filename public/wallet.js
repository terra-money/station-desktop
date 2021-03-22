const bip39 = require('bip39')
const bip32 = require('bip32')
const { bech32 } = require('bech32')
const secp256k1 = require('secp256k1')
const crypto = require('crypto')

function standardRandomBytesFunc(size) {
  return crypto.randomBytes(size)
}

async function generateWalletFromSeed(mnemonic, bip) {
  const masterKey = await deriveMasterKey(mnemonic)
  const { privateKey, publicKey } = deriveKeypair(masterKey, bip)
  const terraAddress = createTerraAddress(publicKey)
  return {
    privateKey: privateKey.toString(`hex`),
    publicKey: publicKey.toString(`hex`),
    terraAddress,
  }
}

function generateSeed(randomBytesFunc = standardRandomBytesFunc) {
  const randomBytes = randomBytesFunc(32)
  if (randomBytes.length !== 32) throw Error(`Entropy has incorrect length`)
  return bip39.entropyToMnemonic(randomBytes.toString(`hex`))
}

async function generateWallet(randomBytesFunc = standardRandomBytesFunc) {
  const mnemonic = generateSeed(randomBytesFunc)
  return await generateWalletFromSeed(mnemonic)
}

function createTerraAddress(publicKey) {
  const sha256 = crypto.createHash('sha256').update(publicKey).digest()
  const address = crypto.createHash('ripemd160').update(sha256).digest()
  return bech32ify(address, 'terra')
}

async function deriveMasterKey(mnemonic) {
  bip39.validateMnemonic(mnemonic)
  const seed = await bip39.mnemonicToSeed(mnemonic)
  const masterKey = bip32.fromSeed(seed)
  return masterKey
}

function deriveKeypair(masterKey, bip) {
  const terraHD = masterKey.derivePath(`m/44'/${bip || 330}'/0'/0/0`)
  const privateKey = terraHD.privateKey
  const publicKey = Buffer.from(secp256k1.publicKeyCreate(privateKey, true))
  return { privateKey, publicKey }
}

function bech32ify(address, prefix) {
  const words = bech32.toWords(address)
  return bech32.encode(prefix, words)
}

function prepareSignBytes(jsonTx) {
  if (Array.isArray(jsonTx)) {
    return jsonTx.map(prepareSignBytes)
  }

  if (typeof jsonTx !== `object`) {
    return jsonTx
  }

  const sorted = {}
  Object.keys(jsonTx)
    .sort()
    .forEach((key) => {
      if (jsonTx[key] === undefined || jsonTx[key] === null) return
      sorted[key] = prepareSignBytes(jsonTx[key])
    })
  return sorted
}

function createSignMessage(jsonTx, { sequence, account_number, chain_id }) {
  const fee = {
    amount: jsonTx.fee.amount || [],
    gas: jsonTx.fee.gas,
  }

  return JSON.stringify(
    prepareSignBytes({
      fee,
      memo: jsonTx.memo,
      msgs: jsonTx.msg,
      sequence,
      account_number,
      chain_id,
    })
  )
}

function signWithPrivateKey(signMessage, privateKey) {
  const signHash = crypto.createHash('sha256').update(signMessage).digest()
  const { signature } = secp256k1.ecdsaSign(
    signHash,
    Buffer.from(privateKey, `hex`)
  )
  return Buffer.from(signature)
}

function createSignature(signature, sequence, account_number, publicKey) {
  return {
    signature: signature.toString(`base64`),
    account_number,
    sequence,
    pub_key: {
      type: `tendermint/PubKeySecp256k1`,
      value: publicKey.toString(`base64`),
    },
  }
}

function sign(jsonTx, wallet, requestMetaData) {
  const { sequence, account_number } = requestMetaData
  const signMessage = createSignMessage(jsonTx, requestMetaData)
  const signatureBuffer = signWithPrivateKey(signMessage, wallet.privateKey)
  const pubKeyBuffer = Buffer.from(wallet.publicKey, `hex`)
  return createSignature(
    signatureBuffer,
    sequence,
    account_number,
    pubKeyBuffer
  )
}

function createSignedTx(tx, signature) {
  return Object.assign({}, tx, {
    signatures: [signature],
  })
}

function createBroadcastBody(signedTx, returnType = `sync`) {
  return JSON.stringify({
    tx: signedTx,
    mode: returnType,
  })
}

module.exports = {
  standardRandomBytesFunc,
  generateWalletFromSeed,
  generateSeed,
  generateWallet,
  createTerraAddress,
  prepareSignBytes,
  createSignMessage,
  signWithPrivateKey,
  createSignature,
  sign,
  createSignedTx,
  createBroadcastBody,
}
