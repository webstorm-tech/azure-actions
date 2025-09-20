import * as core from '@actions/core'
import { AzureConfigLoader } from './config-loader.js'

/**
 * Configuration for data masking
 */
interface MaskingConfig {
  // Fields that should always be masked (explicit unsafe)
  alwaysMask: string[]
  // Fields that should never be masked (explicit safe)
  neverMask: string[]
  // Pattern-based rules for masking
  maskPatterns: RegExp[]
  // Pattern-based rules for NOT masking
  safePatterns: RegExp[]
}

/**
 * Default masking configuration for Azure environments
 */
const DEFAULT_MASKING_CONFIG: MaskingConfig = {
  alwaysMask: [
    'client-secret',
    'api-key',
    'access-key',
    'secret-key',
    'password',
    'token',
    'connection-string',
    'sas-token'
  ],
  neverMask: [
    'subscription-id',
    'tenant-id',
    'client-id',
    'resource-group',
    'location',
    'region',
    'environment'
  ],
  maskPatterns: [
    /.*secret.*/i, // Any field containing 'secret'
    /.*password.*/i, // Any field containing 'password'
    /.*key$/i, // Any field ending with 'key'
    /.*token.*/i, // Any field containing 'token'
    /.*connection.*/i, // Any field containing 'connection'
    /.*credential.*/i // Any field containing 'credential'
  ],
  safePatterns: [
    /.*-id$/i, // Most Azure IDs are safe to show
    /.*-name$/i, // Resource names are typically safe
    /.*-url$/i, // URLs are typically safe
    /^location$/i, // Location is always safe
    /^region$/i, // Region is always safe
    /^environment$/i // Environment name is safe
  ]
}

/**
 * Determine if a field should be masked based on configuration
 */
function shouldMaskField(
  fieldName: string,
  config: MaskingConfig = DEFAULT_MASKING_CONFIG
): boolean {
  // Check explicit never mask list first (highest priority)
  if (config.neverMask.includes(fieldName)) {
    return false
  }

  // Check explicit always mask list (second priority)
  if (config.alwaysMask.includes(fieldName)) {
    return true
  }

  // Check safe patterns (third priority)
  if (config.safePatterns.some((pattern) => pattern.test(fieldName))) {
    return false
  }

  // Check mask patterns (fourth priority)
  if (config.maskPatterns.some((pattern) => pattern.test(fieldName))) {
    return true
  }

  // Default to not masking if no rules match
  return false
}

/**
 * Convert snake_case to kebab-case for output names
 */
function toKebabCase(str: string): string {
  return str.replace(/_/g, '-')
}

/**
 * Get custom masking configuration from action inputs (optional)
 */
function getCustomMaskingConfig(): Partial<MaskingConfig> {
  const customConfig: Partial<MaskingConfig> = {}

  // Allow users to specify additional fields to mask
  const additionalMaskFields = core.getInput('mask-fields')
  if (additionalMaskFields) {
    customConfig.alwaysMask = additionalMaskFields.split(',').map((s) => s.trim())
  }

  // Allow users to specify additional safe fields
  const additionalSafeFields = core.getInput('safe-fields')
  if (additionalSafeFields) {
    customConfig.neverMask = additionalSafeFields.split(',').map((s) => s.trim())
  }

  return customConfig
}

/**
 * Merge custom masking config with defaults
 */
function getMaskingConfig(): MaskingConfig {
  const customConfig = getCustomMaskingConfig()

  return {
    alwaysMask: [
      ...DEFAULT_MASKING_CONFIG.alwaysMask,
      ...(customConfig.alwaysMask || [])
    ],
    neverMask: [...DEFAULT_MASKING_CONFIG.neverMask, ...(customConfig.neverMask || [])],
    maskPatterns: DEFAULT_MASKING_CONFIG.maskPatterns,
    safePatterns: DEFAULT_MASKING_CONFIG.safePatterns
  }
}

/**
 * Main action execution
 */
export async function run(): Promise<void> {
  try {
    // Get inputs
    const environment = core.getInput('environment', { required: true })
    const configFile =
      core.getInput('config-file') || '.github/config/azure-environments.yml'

    core.info(`Loading Azure configuration for environment: ${environment}`)
    core.info(`Configuration file: ${configFile}`)

    // Create loader and get configuration
    const loader = new AzureConfigLoader(configFile)

    // Log available environments for debugging
    const availableEnvs = loader.getAvailableEnvironments()
    core.debug(`Available environments: ${availableEnvs.join(', ')}`)

    // Get the specific environment configuration
    const config = loader.getEnvironmentConfig(environment)

    // Validate configuration
    loader.validateConfig(config)

    // Get masking configuration
    const maskingConfig = getMaskingConfig()

    // Set outputs for each configuration value with intelligent masking
    const maskedFields: string[] = []
    const safeFields: string[] = []

    for (const [key, value] of Object.entries(config)) {
      const outputName = toKebabCase(key)
      core.setOutput(outputName, value)

      // Apply intelligent masking (convert to kebab-case for consistent masking logic)
      if (shouldMaskField(outputName, maskingConfig)) {
        core.setSecret(value)
        maskedFields.push(outputName)
        core.debug(`Masked field: ${outputName}`)
      } else {
        safeFields.push(outputName)
        core.debug(`Safe field: ${outputName} = ${value}`)
      }
    }

    // Log masking decisions for transparency (sort for consistent output)
    if (maskedFields.length > 0) {
      core.info(`🔒 Masked sensitive fields: ${maskedFields.sort().join(', ')}`)
    }
    if (safeFields.length > 0) {
      core.info(`🔓 Safe fields (not masked): ${safeFields.sort().join(', ')}`)
    }

    // Export environment variables (applying same masking logic)
    const envVarMappings = [
      { envVar: 'AZURE_CLIENT_ID', configKey: 'client_id' },
      { envVar: 'AZURE_TENANT_ID', configKey: 'tenant_id' },
      { envVar: 'AZURE_SUBSCRIPTION_ID', configKey: 'subscription_id' },
      { envVar: 'AZURE_RESOURCE_GROUP', configKey: 'resource_group' },
      { envVar: 'AZURE_LOCATION', configKey: 'location' }
    ]

    for (const { envVar, configKey } of envVarMappings) {
      if (config[configKey]) {
        core.exportVariable(envVar, config[configKey])

        // Apply masking to environment variables too (convert to kebab-case for masking check)
        if (shouldMaskField(toKebabCase(configKey), maskingConfig)) {
          core.setSecret(config[configKey])
        }
      }
    }

    core.info(`✅ Successfully loaded configuration for ${environment} environment`)

    // Enhanced summary with masking info
    const summaryRows = [
      [{ data: 'Environment', header: true }, { data: environment }],
      [
        { data: 'Fields Processed', header: true },
        { data: Object.keys(config).length.toString() }
      ],
      [{ data: 'Masked Fields', header: true }, { data: maskedFields.length.toString() }],
      [{ data: 'Safe Fields', header: true }, { data: safeFields.length.toString() }]
    ]

    // Add sample values for safe fields only
    for (const [key, value] of Object.entries(config)) {
      if (!shouldMaskField(toKebabCase(key), maskingConfig)) {
        const displayValue = key.includes('id') ? `${value.substring(0, 8)}...` : value
        const displayKey = toKebabCase(key)
        summaryRows.push([
          {
            data:
              displayKey.charAt(0).toUpperCase() + displayKey.slice(1).replace(/-/g, ' '),
            header: true
          },
          { data: displayValue }
        ])
      }
    }

    await core.summary
      .addHeading('Azure Configuration Loaded')
      .addTable(summaryRows)
      .write()
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)

      // Provide helpful error messages
      if (error.message.includes('not found')) {
        core.error('Make sure the configuration file exists and the path is correct.')
        core.error('The path should be relative to your repository root.')
      } else if (error.message.includes('Environment')) {
        core.error(
          'Check that the environment name matches one defined in your configuration file.'
        )
      }
    } else {
      core.setFailed('An unexpected error occurred')
    }
  }
}

// Export for testing
export { shouldMaskField, DEFAULT_MASKING_CONFIG, type MaskingConfig }

run()
