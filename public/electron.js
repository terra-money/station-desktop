const path = require('path')
const { app, shell, BrowserWindow, ipcMain, nativeImage } = require('electron')
const debug = require('electron-debug')

/* enable devtools hotkeys in Windows production builds */
process.platform === 'win32' && debug({ isEnabled: true, showDevTools: false })

/* version */
const version = '1.2.0'
const isLocal = process.env.LOCAL

const appIcon = path.join(__dirname, '..', 'build', process.platform.match('win32') ? 'icon.ico' : 'icon.png')

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
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: nativeImage.createFromPath(appIcon)
  }

  const url = isLocal
    ? `https://localhost:${process.env.PORT || 3000}`
    : 'https://station.terra.money'

  win = new BrowserWindow(config)
  win.removeMenu()
  win.loadURL(url)
  win.on('closed', () => (win = null))

  win.webContents.setZoomFactor(1.0)
  win.webContents
    .setVisualZoomLevelLimits(1, 10)
    .catch((err) => console.log(err))

  const zoomFunction = (win, event, zoomDirection) => {
    const currentZoom = win.webContents.getZoomFactor()
    if (zoomDirection === 'in') {
      win.webContents.setZoomFactor(currentZoom + 0.1)
    }
    if (zoomDirection === 'out' && currentZoom > 0.2) {
      win.webContents.setZoomFactor(currentZoom - 0.1)
    }
  }

  win.webContents.on('zoom-changed', (event, zoomDirection) => {
    zoomFunction(win, event, zoomDirection)
  })

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
