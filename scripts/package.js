// Fix winCodeSign extraction that fails on Windows due to macOS symlinks
// Pre-extract the archive without symlink preservation if needed

const { spawn, execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false'
delete process.env.ELECTRON_RUN_AS_NODE

// Pre-populate winCodeSign cache to avoid symlink errors
const cacheDir = path.join(process.env.LOCALAPPDATA || '', 'electron-builder', 'Cache', 'winCodeSign')
const markerFile = path.join(cacheDir, 'extracted.marker')

if (!fs.existsSync(markerFile)) {
  console.log('Pre-extracting winCodeSign cache to avoid symlink errors...')
  const sevenZip = path.resolve(__dirname, '..', 'node_modules', '7zip-bin', 'win', 'x64', '7za.exe')

  if (fs.existsSync(sevenZip)) {
    // Download winCodeSign if needed
    const archiveUrl = 'https://github.com/electron-userland/electron-builder-binaries/releases/download/winCodeSign-2.6.0/winCodeSign-2.6.0.7z'
    const archivePath = path.join(cacheDir, 'winCodeSign-2.6.0.7z')
    const extractDir = path.join(cacheDir, 'winCodeSign-2.6.0')

    fs.mkdirSync(cacheDir, { recursive: true })

    if (!fs.existsSync(archivePath)) {
      console.log('Downloading winCodeSign...')
      try {
        execSync(`curl -L -o "${archivePath}" "${archiveUrl}"`, { stdio: 'inherit' })
      } catch {
        console.log('Download failed, electron-builder will retry.')
      }
    }

    if (fs.existsSync(archivePath)) {
      fs.mkdirSync(extractDir, { recursive: true })
      try {
        // Extract WITHOUT -snld flag (no symlink preservation)
        execSync(`"${sevenZip}" x -bd -y "${archivePath}" "-o${extractDir}"`, { stdio: 'inherit' })
        fs.writeFileSync(markerFile, 'ok')
        console.log('winCodeSign cache ready.')
      } catch {
        console.log('Pre-extraction failed, continuing anyway...')
      }
    }
  }
}

const electronBuilder = path.resolve(__dirname, '..', 'node_modules', '.bin', 'electron-builder')
const cwd = path.resolve(__dirname, '..')
const args = ['--config', 'electron-builder.config.js', ...process.argv.slice(2)]

const child = spawn(`"${electronBuilder}"`, args, {
  stdio: 'inherit',
  env: process.env,
  shell: true,
  cwd
})

child.on('close', (code) => process.exit(code))
