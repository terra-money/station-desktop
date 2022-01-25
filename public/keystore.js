const crypto = require('crypto')

const KEY_SIZE = 256
const ITERATIONS = 100

function encrypt(plainText, pass) {
  try {
    const salt = crypto.randomBytes(16)
    const iv = crypto.randomBytes(16)
    const key = crypto.pbkdf2Sync(pass, salt, ITERATIONS, KEY_SIZE / 8, 'sha1')

    const cipher = crypto.createCipheriv('AES-256-CBC', key, iv)
    const encryptedText = Buffer.concat([
      cipher.update(plainText),
      cipher.final(),
    ]).toString('base64')

    // salt, iv will be hex 32 in length
    // append them to the ciphertext for use  in decryption
    return salt.toString('hex') + iv.toString('hex') + encryptedText
  } catch (error) {
    console.error(error.message)
    return ''
  }
}

function decrypt(transitmessage, pass) {
  try {
    const salt = Buffer.from(transitmessage.substr(0, 32), 'hex')
    const iv = Buffer.from(transitmessage.substr(32, 32), 'hex')
    const key = crypto.pbkdf2Sync(pass, salt, ITERATIONS, KEY_SIZE / 8, 'sha1')

    const encryptedText = transitmessage.substring(64)
    const cipher = crypto.createDecipheriv('AES-256-CBC', key, iv)
    const decryptedText = Buffer.concat([
      cipher.update(encryptedText, 'base64'),
      cipher.final(),
    ]).toString()

    return decryptedText
  } catch (error) {
    console.error(error.message)
    return ''
  }
}

module.exports = {
  encrypt,
  decrypt,
}
