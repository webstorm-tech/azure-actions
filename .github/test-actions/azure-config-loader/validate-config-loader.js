#!/usr/bin/env node
/**
 * Validate Azure Config Loader action outputs
 * Usage: node validate-config-loader.js <environment> <config-file> <outputs-json>
 */

import fs from 'fs'
import path from 'path'
import yaml from 'yaml'

const [environment, configFile, outputsJson] = process.argv.slice(2)

if (!environment || !configFile) {
    console.error('❌ Usage: node validate-config-loader.js <environment> <config-file> [outputs-json]')
    process.exit(1)
}

try {
    // Read and parse the config file
    const configContent = fs.readFileSync(configFile, 'utf8')
    const config = yaml.parse(configContent)

    if (!config.environments || !config.environments[environment]) {
        console.error(`❌ Environment '${environment}' not found in config file`)
        process.exit(1)
    }

    const expectedConfig = config.environments[environment]
    console.log(`📋 Expected configuration for '${environment}':`)
    console.log(JSON.stringify(expectedConfig, null, 2))

    // If outputs are provided, validate them
    if (outputsJson) {
        const actualOutputs = JSON.parse(outputsJson)

        const validations = [
            { field: 'subscription-id', expected: expectedConfig.subscriptionId, actual: actualOutputs['subscription-id'] },
            { field: 'resource-group', expected: expectedConfig.resourceGroup, actual: actualOutputs['resource-group'] },
            { field: 'location', expected: expectedConfig.location, actual: actualOutputs['location'] }
        ]

        let errors = 0

        console.log('\n🧪 Validation Results:')
        for (const validation of validations) {
            if (validation.actual === validation.expected) {
                console.log(`✅ ${validation.field}: PASS`)
            } else {
                console.log(`❌ ${validation.field}: FAIL`)
                console.log(`   Expected: '${validation.expected}'`)
                console.log(`   Actual: '${validation.actual}'`)
                errors++
            }
        }

        if (errors > 0) {
            console.log(`\n💥 ${errors} validation(s) failed!`)
            process.exit(1)
        } else {
            console.log('\n🎉 All validations passed!')
        }
    }

} catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
}
