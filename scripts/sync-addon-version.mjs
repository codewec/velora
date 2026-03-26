import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

// This script keeps the Home Assistant add-on metadata aligned with the main
// app release version. It is called after `changelogen --release` so a manual
// `pnpm run release` updates all release-facing version fields together.
const rootDir = resolve(import.meta.dirname, '..')
const packageJsonPath = resolve(rootDir, 'package.json')
const addonConfigPath = resolve(rootDir, 'velora', 'config.yaml')
const addonBuildPath = resolve(rootDir, 'velora', 'build.yaml')

const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
const version = packageJson.version

if (typeof version !== 'string' || !version) {
  throw new Error('package.json version is missing or invalid')
}

const addonConfig = readFileSync(addonConfigPath, 'utf8')
const addonBuild = readFileSync(addonBuildPath, 'utf8')

// Home Assistant add-on metadata keeps its own version field. We intentionally
// sync it from package.json after each manual release so the add-on store shows
// the same version as the main application release.
const nextAddonConfig = addonConfig.replace(/^version:\s*".*"$/m, `version: "${version}"`)

if (!/^version:\s*".*"$/m.test(addonConfig)) {
  throw new Error('Failed to locate velora/config.yaml version field')
}

if (nextAddonConfig !== addonConfig) {
  writeFileSync(addonConfigPath, nextAddonConfig)
}

// The add-on should pull the immutable release-tagged standalone image that
// matches package.json, instead of continuing to point at the mutable `:dev`
// image after a release has been prepared.
const nextAddonBuild = addonBuild.replace(
  /^(\s*VELORA_IMAGE:\s*).+$/m,
  `$1ghcr.io/codewec/velora:v${version}`,
)

if (!/^(\s*VELORA_IMAGE:\s*).+$/m.test(addonBuild)) {
  throw new Error('Failed to locate velora/build.yaml VELORA_IMAGE field')
}

if (nextAddonBuild !== addonBuild) {
  writeFileSync(addonBuildPath, nextAddonBuild)
}
