const { app, shell, BrowserWindow, ipcMain } = require('electron')

/* version */
const version = '1.0.0'

/* window */
let win
const createWindow = () => {
  const config = {
    width: 1440,
    height: 960,
    minWidth: 320,
    minHeight: 480,
    maxWidth: 1440,
    titleBarStyle: 'hidden',
    webPreferences: { nodeIntegration: true, webSecurity: false }
  }

  const url = process.env.LOCAL
    ? 'http://localhost:3000'
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

/* app */
app.on('ready', createWindow)
app.on('window-all-closed', () => app.quit())
app.on('activate', () => win === null && createWindow())

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

ipcMain.on('generateSeed', event => {
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
