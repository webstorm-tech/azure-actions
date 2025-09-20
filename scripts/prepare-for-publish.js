#!/usr/bin/env node
/**
 * Prepare GitHub Actions for publication to standalone repositories
 * This script creates self-contained action packages with bundled dependencies
 */

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function prepareActionForPublish(actionName) {
  const actionPath = path.join(__dirname, '..', 'actions', actionName)
  const packageJsonPath = path.join(actionPath, 'package.json')
  const publishPath = path.join(__dirname, '..', 'publish', actionName)

  if (!fs.existsSync(packageJsonPath)) {
    console.error(`❌ Package.json not found for ${actionName}`)
    return false
  }

  console.log(`🔧 Preparing ${actionName} for publication...`)

  try {
    // Read package.json
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

    // Build the action with bundled dependencies
    console.log(`📦 Building ${actionName}...`)
    execSync(`npm run package --workspace=actions/${actionName}`, {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit'
    })

    // Create dist directory
    if (fs.existsSync(publishPath)) {
      fs.rmSync(publishPath, { recursive: true, force: true })
    }
    fs.mkdirSync(publishPath, { recursive: true })

    // Copy essential files for publication
    const filesToCopy = ['dist/main.js', 'action.yml', 'README.md']

    // Optional files to copy if they exist
    const optionalFiles = ['LICENSE', 'CHANGELOG.md', 'dist/main.js.map']

    for (const file of filesToCopy) {
      const sourcePath = path.join(actionPath, file)
      const destPath = path.join(publishPath, path.basename(file))

      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, destPath)
        console.log(`✅ Copied ${file}`)
      } else {
        console.error(`❌ Required file missing: ${file}`)
        return false
      }
    }

    for (const file of optionalFiles) {
      const sourcePath = path.join(actionPath, file)
      const destPath = path.join(publishPath, path.basename(file))

      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, destPath)
        console.log(`✅ Copied ${file} (optional)`)
      }
    }

    // Create a minimal package.json for the published action
    const publishPackageJson = {
      name: packageJson.name,
      version: packageJson.version,
      description: packageJson.description,
      main: 'main.js',
      type: 'module',
      repository: packageJson.repository,
      author: packageJson.author,
      license: packageJson.license
    }

    fs.writeFileSync(
      path.join(publishPath, 'package.json'),
      JSON.stringify(publishPackageJson, null, 2)
    )

    // Verify the bundle is self-contained
    console.log(`🧪 Verifying ${actionName} bundle...`)
    try {
      execSync(`node main.js`, {
        cwd: publishPath,
        stdio: 'pipe' // Don't show output, just check if it runs
      })
      console.log(`✅ Bundle verification passed`)
    } catch (error) {
      // Expected to fail due to missing inputs, but should not fail due to missing dependencies
      if (error.message.includes('MODULE_NOT_FOUND')) {
        console.error(`❌ Bundle verification failed - missing dependencies`)
        return false
      }
      console.log(`✅ Bundle verification passed (expected exit with missing inputs)`)
    }

    console.log(`🚀 ${actionName} ready for publication at: ${publishPath}`)
    console.log(`📁 Files included:`)
    const files = fs.readdirSync(publishPath)
    files.forEach((file) => {
      const stat = fs.statSync(path.join(publishPath, file))
      const size = (stat.size / 1024).toFixed(1)
      console.log(`   ${file} (${size} KB)`)
    })

    return true
  } catch (error) {
    console.error(`❌ Failed to prepare ${actionName}:`, error.message)
    return false
  }
}

// Get action name from command line or prepare all actions
const actionName = process.argv[2]

if (actionName) {
  console.log(`🎯 Preparing specific action: ${actionName}`)
  const success = await prepareActionForPublish(actionName)
  process.exit(success ? 0 : 1)
} else {
  console.log(`🎯 Preparing all actions for publication...`)

  // Discover and prepare all actions
  const actionsDir = path.join(__dirname, '..', 'actions')
  const actions = fs
    .readdirSync(actionsDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)

  console.log(`📋 Found actions: ${actions.join(', ')}`)

  let allSuccess = true
  for (const action of actions) {
    const success = await prepareActionForPublish(action)
    if (!success) {
      allSuccess = false
    }
    console.log('') // Empty line between actions
  }

  if (allSuccess) {
    console.log(`🎉 All actions prepared successfully!`)
    console.log(`📂 Ready for publication in: ${path.join(__dirname, '..', 'publish')}`)
  } else {
    console.log(`⚠️  Some actions failed to prepare`)
  }

  process.exit(allSuccess ? 0 : 1)
}
