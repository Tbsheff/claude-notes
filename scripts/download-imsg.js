#!/usr/bin/env node
/**
 * Downloads the imsg binary from GitHub releases.
 * imsg is a macOS CLI tool for interacting with iMessage/SMS.
 * https://github.com/steipete/imsg
 */

const https = require('https')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const IMSG_VERSION = 'v0.5.0'
const IMSG_URL = `https://github.com/steipete/imsg/releases/download/${IMSG_VERSION}/imsg-macos.zip`
const BIN_DIR = path.join(__dirname, '..', 'vendor', 'bin')
const ZIP_PATH = path.join(BIN_DIR, 'imsg.zip')
const BINARY_PATH = path.join(BIN_DIR, 'imsg')

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    const request = (reqUrl) => {
      https.get(reqUrl, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          file.destroy()
          if (fs.existsSync(dest)) fs.unlinkSync(dest)
          return request(response.headers.location)
        }
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: HTTP ${response.statusCode}`))
          return
        }
        response.pipe(file)
        file.on('finish', () => file.close(resolve))
      }).on('error', reject)
    }
    request(url)
  })
}

async function main() {
  if (process.platform !== 'darwin') {
    console.log('imsg is only supported on macOS. Skipping download.')
    return
  }

  if (fs.existsSync(BINARY_PATH)) {
    console.log(`imsg binary already exists at ${BINARY_PATH}`)
    return
  }

  fs.mkdirSync(BIN_DIR, { recursive: true })

  console.log(`Downloading imsg ${IMSG_VERSION}...`)
  await download(IMSG_URL, ZIP_PATH)

  console.log('Extracting...')
  execSync(`unzip -o "${ZIP_PATH}" -d "${BIN_DIR}"`)
  fs.unlinkSync(ZIP_PATH)

  if (fs.existsSync(BINARY_PATH)) {
    fs.chmodSync(BINARY_PATH, 0o755)
    console.log(`imsg installed at ${BINARY_PATH}`)
  } else {
    const extracted = execSync(`find "${BIN_DIR}" -name "imsg" -type f 2>/dev/null`).toString().trim()
    if (extracted && extracted !== BINARY_PATH) {
      fs.renameSync(extracted, BINARY_PATH)
      fs.chmodSync(BINARY_PATH, 0o755)
      console.log(`imsg installed at ${BINARY_PATH}`)
    } else {
      throw new Error('imsg binary not found after extraction')
    }
  }
}

main().catch((err) => {
  console.error('Failed to download imsg:', err.message)
  process.exit(1)
})
