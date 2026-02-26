// Strip ELECTRON_RUN_AS_NODE which is set by VS Code's terminal
// and prevents Electron from loading its built-in modules
delete process.env.ELECTRON_RUN_AS_NODE

const { spawn } = require('child_process')
const path = require('path')

const electronVite = path.resolve(__dirname, '..', 'node_modules', '.bin', 'electron-vite')
const cwd = path.resolve(__dirname, '..')
const child = spawn(`"${electronVite}"`, ['dev'], {
  stdio: 'inherit',
  env: process.env,
  shell: true,
  cwd
})

child.on('close', (code) => process.exit(code))
