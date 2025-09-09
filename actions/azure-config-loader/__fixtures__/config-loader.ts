import { jest } from '@jest/globals'

export const getAvailableEnvironments =
  jest.fn<
    typeof import('../src/config-loader.js').AzureConfigLoader.prototype.getAvailableEnvironments
  >()
export const getEnvironmentConfig =
  jest.fn<
    typeof import('../src/config-loader.js').AzureConfigLoader.prototype.getEnvironmentConfig
  >()
export const loadConfig =
  jest.fn<
    typeof import('../src/config-loader.js').AzureConfigLoader.prototype.loadConfig
  >()
export const validateConfig =
  jest.fn<
    typeof import('../src/config-loader.js').AzureConfigLoader.prototype.validateConfig
  >()

// Mock constructor that returns an object with the mocked methods
export const AzureConfigLoader = jest.fn((configFile: string) => ({
  getAvailableEnvironments,
  getEnvironmentConfig,
  loadConfig,
  validateConfig
}))
