import { jest, describe, test, beforeEach, expect } from '@jest/globals'
import * as coreFixtures from '../__fixtures__/core.js'
import * as azureConfigLoaderFixtures from '../__fixtures__/config-loader.js'

jest.unstable_mockModule('@actions/core', () => coreFixtures)
jest.unstable_mockModule('../src/config-loader.js', () => azureConfigLoaderFixtures)

const { run, shouldMaskField, DEFAULT_MASKING_CONFIG } = await import('../src/main.js')

describe('Azure Config Loader Action', () => {
  const environment = 'production'
  const productionEnvironmentConfig = {
    client_id: '00000000-0000-0000-0000-000000000000',
    tenant_id: '11111111-1111-1111-1111-111111111111',
    subscription_id: '22222222-2222-2222-2222-222222222222',
    resource_group: 'prod-rg',
    location: 'eastus'
  }

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()

    azureConfigLoaderFixtures.getAvailableEnvironments.mockReturnValue([
      'development',
      'production'
    ])
    azureConfigLoaderFixtures.getEnvironmentConfig.mockReturnValue(
      productionEnvironmentConfig
    )

    // Mock isDebug to return true to avoid setSecret calls
    coreFixtures.isDebug.mockReturnValue(true)

    coreFixtures.getInput.mockImplementation((name) => {
      switch (name) {
        case 'config-file':
          return ''
        case 'environment':
          return environment
        case 'mask-fields':
          return ''
        case 'safe-fields':
          return ''
        default:
          return ''
      }
    })
  })

  test('sets up the action with default config file path when no input is provided', async () => {
    await run()

    expect(coreFixtures.getInput).toHaveBeenCalledWith('config-file')
    expect(coreFixtures.getInput).toHaveBeenCalledWith('environment', {
      required: true
    })

    // Verify the constructor was called with the default config file path
    expect(azureConfigLoaderFixtures.AzureConfigLoader).toHaveBeenCalledWith(
      '.github/config/azure-environments.yml'
    )
    expect(azureConfigLoaderFixtures.AzureConfigLoader).toHaveBeenCalledTimes(1)

    // Verify info logs for loading configuration
    expect(coreFixtures.info).toHaveBeenCalledWith(
      'Loading Azure configuration for environment: production'
    )
    expect(coreFixtures.info).toHaveBeenCalledWith(
      'Configuration file: .github/config/azure-environments.yml'
    )

    // Verify debug log for available environments
    expect(coreFixtures.debug).toHaveBeenCalledWith(
      'Available environments: development, production'
    )

    // Verify that the environment configuration was retrieved and validated
    expect(azureConfigLoaderFixtures.getEnvironmentConfig).toHaveBeenCalledWith(
      'production'
    )
    expect(azureConfigLoaderFixtures.getEnvironmentConfig).toHaveBeenCalledTimes(1)

    expect(azureConfigLoaderFixtures.validateConfig).toHaveBeenCalledWith(
      productionEnvironmentConfig
    )
    expect(azureConfigLoaderFixtures.validateConfig).toHaveBeenCalledTimes(1)

    // Verify outputs are set with kebab-case conversion
    expect(coreFixtures.setOutput).toHaveBeenCalledTimes(5)

    expect(coreFixtures.setOutput).toHaveBeenNthCalledWith(
      1,
      'client-id',
      productionEnvironmentConfig.client_id
    )
    expect(coreFixtures.setOutput).toHaveBeenNthCalledWith(
      2,
      'tenant-id',
      productionEnvironmentConfig.tenant_id
    )
    expect(coreFixtures.setOutput).toHaveBeenNthCalledWith(
      3,
      'subscription-id',
      productionEnvironmentConfig.subscription_id
    )
    expect(coreFixtures.setOutput).toHaveBeenNthCalledWith(
      4,
      'resource-group',
      productionEnvironmentConfig.resource_group
    )
    expect(coreFixtures.setOutput).toHaveBeenNthCalledWith(
      5,
      'location',
      productionEnvironmentConfig.location
    )

    // Verify environment variables are exported
    expect(coreFixtures.exportVariable).toHaveBeenCalledWith(
      'AZURE_CLIENT_ID',
      productionEnvironmentConfig.client_id
    )
    expect(coreFixtures.exportVariable).toHaveBeenCalledWith(
      'AZURE_TENANT_ID',
      productionEnvironmentConfig.tenant_id
    )
    expect(coreFixtures.exportVariable).toHaveBeenCalledWith(
      'AZURE_SUBSCRIPTION_ID',
      productionEnvironmentConfig.subscription_id
    )
    expect(coreFixtures.exportVariable).toHaveBeenCalledWith(
      'AZURE_RESOURCE_GROUP',
      productionEnvironmentConfig.resource_group
    )
    expect(coreFixtures.exportVariable).toHaveBeenCalledWith(
      'AZURE_LOCATION',
      productionEnvironmentConfig.location
    )

    // Verify info logs for exporting environment variables
    expect(coreFixtures.info).toHaveBeenCalledWith(
      `✅ Successfully loaded configuration for ${environment} environment`
    )

    // Verify masking transparency logs
    expect(coreFixtures.info).toHaveBeenCalledWith(
      '🔓 Safe fields (not masked): client-id, location, resource-group, subscription-id, tenant-id'
    )
  })

  test('masks sensitive fields based on configuration with sensitive data', async () => {
    const configWithSecrets = {
      api_key: 'secret-api-key',
      client_id: '00000000-0000-0000-0000-000000000000',
      client_secret: 'very-secret-value',
      location: 'eastus',
      resource_group: 'prod-rg',
      subscription_id: '22222222-2222-2222-2222-222222222222',
      tenant_id: '11111111-1111-1111-1111-111111111111'
    }

    azureConfigLoaderFixtures.getEnvironmentConfig.mockReturnValue(configWithSecrets)

    await run()

    // Verify setSecret was called for sensitive fields
    expect(coreFixtures.setSecret).toHaveBeenCalledWith('very-secret-value')
    expect(coreFixtures.setSecret).toHaveBeenCalledWith('secret-api-key')

    // Verify setSecret was NOT called for safe fields
    expect(coreFixtures.setSecret).not.toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000000'
    )
    expect(coreFixtures.setSecret).not.toHaveBeenCalledWith(
      '22222222-2222-2222-2222-222222222222'
    )
    expect(coreFixtures.setSecret).not.toHaveBeenCalledWith('prod-rg')
    expect(coreFixtures.setSecret).not.toHaveBeenCalledWith('eastus')

    // Verify transparency logs
    expect(coreFixtures.info).toHaveBeenCalledWith(
      '🔒 Masked sensitive fields: api-key, client-secret'
    )
    expect(coreFixtures.info).toHaveBeenCalledWith(
      '🔓 Safe fields (not masked): client-id, location, resource-group, subscription-id, tenant-id'
    )
  })

  test('respects custom masking configuration from inputs', async () => {
    const configWithCustomFields = {
      client_id: '00000000-0000-0000-0000-000000000000',
      custom_secret: 'should-be-masked',
      custom_public_id: 'should-not-be-masked',
      location: 'eastus',
      resource_group: 'prod-rg',
      subscription_id: '22222222-2222-2222-2222-222222222222',
      tenant_id: '11111111-1111-1111-1111-111111111111'
    }

    azureConfigLoaderFixtures.getEnvironmentConfig.mockReturnValue(configWithCustomFields)

    // Mock custom masking inputs
    coreFixtures.getInput.mockImplementation((name) => {
      switch (name) {
        case 'config-file':
          return ''
        case 'environment':
          return environment
        case 'mask-fields':
          return 'custom-secret'
        case 'safe-fields':
          return 'custom-public-id'
        default:
          return ''
      }
    })

    await run()

    // Verify custom field is masked
    expect(coreFixtures.setSecret).toHaveBeenCalledWith('should-be-masked')

    // Verify custom safe field is not masked
    expect(coreFixtures.setSecret).not.toHaveBeenCalledWith('should-not-be-masked')

    // Verify transparency logs include custom fields
    expect(coreFixtures.info).toHaveBeenCalledWith(
      '🔒 Masked sensitive fields: custom-secret'
    )
    expect(coreFixtures.info).toHaveBeenCalledWith(
      '🔓 Safe fields (not masked): client-id, custom-public-id, location, resource-group, subscription-id, tenant-id'
    )
  })

  test('handles multiple custom mask and safe fields from comma-separated input', async () => {
    const configWithMultipleFields = {
      client_id: '00000000-0000-0000-0000-000000000000',
      location: 'eastus',
      resource_group: 'prod-rg',
      subscription_id: '22222222-2222-2222-2222-222222222222',
      tenant_id: '11111111-1111-1111-1111-111111111111',
      // Custom Fields to test
      field1: 'value1',
      field2: 'value2',
      field3: 'value3',
      field4: 'value4'
    }

    azureConfigLoaderFixtures.getEnvironmentConfig.mockReturnValue(
      configWithMultipleFields
    )

    // Mock multiple custom fields
    coreFixtures.getInput.mockImplementation((name) => {
      switch (name) {
        case 'config-file':
          return ''
        case 'environment':
          return environment
        case 'mask-fields':
          return 'field1, field2' // Comma-separated
        case 'safe-fields':
          return 'field3, field4' // Comma-separated
        default:
          return ''
      }
    })

    await run()

    // Verify multiple fields are masked
    expect(coreFixtures.setSecret).toHaveBeenCalledWith('value1')
    expect(coreFixtures.setSecret).toHaveBeenCalledWith('value2')

    // Verify safe fields are not masked
    expect(coreFixtures.setSecret).not.toHaveBeenCalledWith('value3')
    expect(coreFixtures.setSecret).not.toHaveBeenCalledWith('value4')
  })
})

describe('shouldMaskField function', () => {
  test('masks fields in alwaysMask list', () => {
    expect(shouldMaskField('client-secret')).toBe(true)
    expect(shouldMaskField('api-key')).toBe(true)
    expect(shouldMaskField('password')).toBe(true)
    expect(shouldMaskField('token')).toBe(true)
  })

  test('does not mask fields in neverMask list', () => {
    expect(shouldMaskField('subscription-id')).toBe(false)
    expect(shouldMaskField('tenant-id')).toBe(false)
    expect(shouldMaskField('client-id')).toBe(false)
    expect(shouldMaskField('resource-group')).toBe(false)
    expect(shouldMaskField('location')).toBe(false)
  })

  test('masks fields matching mask patterns', () => {
    expect(shouldMaskField('my-secret-value')).toBe(true) // contains 'secret'
    expect(shouldMaskField('user-password')).toBe(true) // contains 'password'
    expect(shouldMaskField('access-key')).toBe(true) // ends with 'key'
    expect(shouldMaskField('auth-token')).toBe(true) // contains 'token'
    expect(shouldMaskField('db-connection')).toBe(true) // contains 'connection'
    expect(shouldMaskField('service-credential')).toBe(true) // contains 'credential'
  })

  test('does not mask fields matching safe patterns', () => {
    expect(shouldMaskField('custom-id')).toBe(false) // ends with '-id'
    expect(shouldMaskField('app-name')).toBe(false) // ends with '-name'
    expect(shouldMaskField('api-url')).toBe(false) // ends with '-url'
    expect(shouldMaskField('region')).toBe(false) // matches 'region'
    expect(shouldMaskField('environment')).toBe(false) // matches 'environment'
  })

  test('neverMask takes precedence over mask patterns', () => {
    // Even though 'subscription-id' ends with 'id', it's in neverMask list
    expect(shouldMaskField('subscription-id')).toBe(false)
  })

  test('alwaysMask takes precedence over safe patterns', () => {
    // Even though 'token' might match safe patterns, it's in alwaysMask list
    expect(shouldMaskField('token')).toBe(true)
  })

  test('safePatterns take precedence over maskPatterns', () => {
    // A field ending in '-id' should be safe even if it contains other trigger words
    expect(shouldMaskField('secret-database-id')).toBe(false)
  })

  test('defaults to not masking when no rules match', () => {
    expect(shouldMaskField('random-field')).toBe(false)
    expect(shouldMaskField('custom-value')).toBe(false)
    expect(shouldMaskField('some-property')).toBe(false)
  })

  test('works with custom masking configuration', () => {
    const customConfig = {
      alwaysMask: ['custom-secret'],
      neverMask: ['custom-safe'],
      maskPatterns: [/dangerous/i],
      safePatterns: [/safe$/i]
    }

    expect(shouldMaskField('custom-secret', customConfig)).toBe(true)
    expect(shouldMaskField('custom-safe', customConfig)).toBe(false)
    expect(shouldMaskField('dangerous-value', customConfig)).toBe(true)
    expect(shouldMaskField('totally-safe', customConfig)).toBe(false)
  })
})

describe('DEFAULT_MASKING_CONFIG', () => {
  test('has expected alwaysMask fields', () => {
    expect(DEFAULT_MASKING_CONFIG.alwaysMask).toContain('client-secret')
    expect(DEFAULT_MASKING_CONFIG.alwaysMask).toContain('api-key')
    expect(DEFAULT_MASKING_CONFIG.alwaysMask).toContain('password')
    expect(DEFAULT_MASKING_CONFIG.alwaysMask).toContain('token')
    expect(DEFAULT_MASKING_CONFIG.alwaysMask).toContain('connection-string')
  })

  test('has expected neverMask fields', () => {
    expect(DEFAULT_MASKING_CONFIG.neverMask).toContain('subscription-id')
    expect(DEFAULT_MASKING_CONFIG.neverMask).toContain('tenant-id')
    expect(DEFAULT_MASKING_CONFIG.neverMask).toContain('client-id')
    expect(DEFAULT_MASKING_CONFIG.neverMask).toContain('resource-group')
    expect(DEFAULT_MASKING_CONFIG.neverMask).toContain('location')
  })

  test('has expected mask patterns', () => {
    const patterns = DEFAULT_MASKING_CONFIG.maskPatterns
    expect(patterns.some((p) => p.test('secret-value'))).toBe(true)
    expect(patterns.some((p) => p.test('user-password'))).toBe(true)
    expect(patterns.some((p) => p.test('access-key'))).toBe(true)
    expect(patterns.some((p) => p.test('auth-token'))).toBe(true)
  })

  test('has expected safe patterns', () => {
    const patterns = DEFAULT_MASKING_CONFIG.safePatterns
    expect(patterns.some((p) => p.test('custom-id'))).toBe(true)
    expect(patterns.some((p) => p.test('app-name'))).toBe(true)
    expect(patterns.some((p) => p.test('api-url'))).toBe(true)
    expect(patterns.some((p) => p.test('location'))).toBe(true)
  })
})
