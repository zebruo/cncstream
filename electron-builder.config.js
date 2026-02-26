/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'com.cncstream.app',
  productName: 'CNCStream',
  directories: {
    output: 'dist',
    buildResources: 'build'
  },
  files: [
    'out/**/*',
    'package.json'
  ],
  win: {
    target: ['dir'],
    icon: 'build/icon.ico'
  }
}
