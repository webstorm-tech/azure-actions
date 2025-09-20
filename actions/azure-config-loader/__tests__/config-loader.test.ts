import { jest, describe, test, beforeEach, expect } from '@jest/globals'
import { dump } from 'js-yaml'

// Mock the entire fs module
jest.unstable_mockModule('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn()
}))

// Import the mocked fs and the class under test
const { existsSync, readFileSync } = await import('fs')
const { AzureConfigLoader } = await import('../src/config-loader.js')

describe('AzureConfigLoader', () => {
  // Test constants for Azure IDs
  const TEST_IDS = {
    DEV_CLIENT_ID: '00000000-0000-0000-0000-000000000000',
    DEV_TENANT_ID: '11111111-1111-1111-1111-111111111111',
    DEV_SUBSCRIPTION_ID: '22222222-2222-2222-2222-222222222222',
    PROD_CLIENT_ID: '33333333-3333-3333-3333-333333333333',
    PROD_TENANT_ID: '44444444-4444-4444-4444-444444444444',
    PROD_SUBSCRIPTION_ID: '55555555-5555-5555-5555-555555555555'
  } as const

  const mockConfig = {
    environments: {
      development: {
        client_id: TEST_IDS.DEV_CLIENT_ID,
        tenant_id: TEST_IDS.DEV_TENANT_ID,
        subscription_id: TEST_IDS.DEV_SUBSCRIPTION_ID,
        resource_group: 'dev-rg',
        location: 'westus2'
      },
      production: {
        client_id: TEST_IDS.PROD_CLIENT_ID,
        tenant_id: TEST_IDS.PROD_TENANT_ID,
        subscription_id: TEST_IDS.PROD_SUBSCRIPTION_ID,
        resource_group: 'prod-rg',
        location: 'eastus'
      }
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(existsSync as jest.Mock).mockReturnValue(true)
    ;(readFileSync as jest.Mock).mockReturnValue(dump(mockConfig))
  })

  test('loads configuration successfully', () => {
    const loader = new AzureConfigLoader('.github/config/azure-environments.yml')
    const config = loader.getEnvironmentConfig('development')

    expect(config.client_id).toBe(TEST_IDS.DEV_CLIENT_ID)
    expect(config.tenant_id).toBe(TEST_IDS.DEV_TENANT_ID)
    expect(config.subscription_id).toBe(TEST_IDS.DEV_SUBSCRIPTION_ID)
    expect(config.resource_group).toBe('dev-rg')
    expect(config.location).toBe('westus2')
  })

  test('loads production configuration correctly', () => {
    const loader = new AzureConfigLoader('.github/config/azure-environments.yml')
    const config = loader.getEnvironmentConfig('production')

    expect(config.client_id).toBe(TEST_IDS.PROD_CLIENT_ID)
    expect(config.tenant_id).toBe(TEST_IDS.PROD_TENANT_ID)
    expect(config.subscription_id).toBe(TEST_IDS.PROD_SUBSCRIPTION_ID)
    expect(config.resource_group).toBe('prod-rg')
    expect(config.location).toBe('eastus')
  })

  test('throws error for missing environment', () => {
    const loader = new AzureConfigLoader('.github/config/azure-environments.yml')

    expect(() => {
      loader.getEnvironmentConfig('staging')
    }).toThrow("Environment 'staging' not found")
  })

  test('returns available environments', () => {
    const loader = new AzureConfigLoader('.github/config/azure-environments.yml')
    const environments = loader.getAvailableEnvironments()

    expect(environments).toEqual(['development', 'production'])
  })

  test('validates configuration successfully', () => {
    const loader = new AzureConfigLoader('.github/config/azure-environments.yml')
    const config = loader.getEnvironmentConfig('production')

    expect(() => {
      loader.validateConfig(config)
    }).not.toThrow()
  })

  test('throws error for invalid client-id format', () => {
    const loader = new AzureConfigLoader('.github/config/azure-environments.yml')
    const invalidConfig = {
      client_id: 'invalid-client-id',
      tenant_id: TEST_IDS.DEV_TENANT_ID,
      subscription_id: TEST_IDS.DEV_SUBSCRIPTION_ID,
      resource_group: 'dev-rg',
      location: 'westus2'
    }

    expect(() => {
      loader.validateConfig(invalidConfig)
    }).toThrow('client-id must be a valid UUID format: invalid-client-id')
  })

  test('throws error for invalid tenant-id format', () => {
    const loader = new AzureConfigLoader('.github/config/azure-environments.yml')
    const invalidConfig = {
      client_id: TEST_IDS.DEV_CLIENT_ID,
      tenant_id: 'not-a-uuid',
      subscription_id: TEST_IDS.DEV_SUBSCRIPTION_ID,
      resource_group: 'dev-rg',
      location: 'westus2'
    }

    expect(() => {
      loader.validateConfig(invalidConfig)
    }).toThrow('tenant-id must be a valid UUID format: not-a-uuid')
  })

  test('throws error for invalid subscription-id format', () => {
    const loader = new AzureConfigLoader('.github/config/azure-environments.yml')
    const invalidConfig = {
      client_id: TEST_IDS.DEV_CLIENT_ID,
      tenant_id: TEST_IDS.DEV_TENANT_ID,
      subscription_id: '12345',
      resource_group: 'dev-rg',
      location: 'westus2'
    }

    expect(() => {
      loader.validateConfig(invalidConfig)
    }).toThrow('subscription-id must be a valid UUID format: 12345')
  })
})
