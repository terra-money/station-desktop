const path = require('path')
const { app, shell, BrowserWindow, ipcMain } = require('electron')
const debug = require('electron-debug')

/* enable devtools hotkeys in Windows production builds */
process.platform === "win32" && debug({ isEnabled: true, showDevTools: false })

/* version */
const version = '1.1.0'
const isLocal = process.env.LOCAL

/* window */
let win
const createWindow = () => {
  const config = {
    width: isLocal ? 1600 : 1440,
    height: 960,
    minWidth: 320,
    minHeight: 480,
    maxWidth: isLocal ? 3840 : 1440,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    },
  }

  const url = isLocal
    ? `https://local.terra.money:${process.env.PORT || 3000}`
    : 'https://station.terra.money'

  win = new BrowserWindow(config)
  win.removeMenu()
  win.loadURL(url)
  win.on('closed', () => (win = null))

  win.webContents.on('new-window', (e, url) => {
    e.preventDefault()
    shell.openExternal(url)
  })
}

const onCertError = (event, webContents, url, error, certificate, callback) => {
  event.preventDefault()
  callback(true)
}

/* app */
app.on('ready', createWindow)
app.on('window-all-closed', () => app.quit())
app.on('activate', () => win === null && createWindow())
isLocal && app.on('certificate-error', onCertError)

/* ipc */
const { signTx, generateAddresses } = require('./station')
const { generateSeed, generateWalletFromSeed } = require('./wallet')
const { encrypt, decrypt } = require('./keystore')

ipcMain.on('version', (event, arg) => {
  event.returnValue = version
})

ipcMain.on('signTx', (event, arg) => {
  event.returnValue = signTx(arg)
})

ipcMain.on('generateAddresses', async (event, seed) => {
  event.returnValue = await generateAddresses(seed)
})

ipcMain.on('generateSeed', (event) => {
  event.returnValue = generateSeed()
})

ipcMain.on('generateWalletFromSeed', async (event, [seed, bip]) => {
  event.returnValue = await generateWalletFromSeed(seed, bip)
})

ipcMain.on('encrypt', (event, [msg, pass]) => {
  event.returnValue = encrypt(msg, pass)
})

ipcMain.on('decrypt', (event, [msg, pass]) => {
  event.returnValue = decrypt(msg, pass)
})

/**
 * Ledger integration
 */
async function callLedger(fn) {
  const TransportNodeHid = require('@ledgerhq/hw-transport-node-hid').default

  return await TransportNodeHid
    .create(10000, 20000)
    .then(async transport => {
      const TerraApp = require('@terra-money/ledger-terra-js').default
      const app = new TerraApp(transport)
      await app.initialize()
      const ret = await fn(app)
      await transport.close()
      return ret;
    })
    .catch(err => {
      return {
        error_message: err.message
      }
    })
}

ipcMain.on('ledger:initialize', async (event) => {
  event.returnValue = await callLedger(app => app.initialize())
})

ipcMain.on('ledger:getInfo', async (event) => {
  event.returnValue = await callLedger(app => app.getInfo())
})

ipcMain.on('ledger:getVersion', async (event) => {
  event.returnValue = await callLedger(app => app.getVersion())
})

ipcMain.on('ledger:getDeviceInfo', async (event) => {
  event.returnValue = await callLedger(app => app.getDeviceInfo())
})

ipcMain.on('ledger:getPublicKey', async (event, args) => {
  event.returnValue = await callLedger(app => app.getPublicKey(...args))
})

ipcMain.on('ledger:getAddressAndPubKey', async (event, args) => {
  event.returnValue = await callLedger(app => app.getAddressAndPubKey(...args))
})

ipcMain.on('ledger:showAddressAndPubKey', async (event, args) => {
  event.returnValue = await callLedger(app => app.showAddressAndPubKey(...args))
})

ipcMain.on('ledger:sign', async (event, args) => {
  event.returnValue = await callLedger(app => app.sign(...args))
})
