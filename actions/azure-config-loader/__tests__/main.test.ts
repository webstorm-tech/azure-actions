import { jest, describe, test, beforeEach, expect } from "@jest/globals";
import * as coreFixtures from "../__fixtures__/core.js";
import * as azureConfigLoaderFixtures from "../__fixtures__/config-loader.js";

jest.unstable_mockModule("@actions/core", () => coreFixtures);
jest.unstable_mockModule("../src/config-loader.js", () => azureConfigLoaderFixtures);

const { run } = await import("../src/main.js");

describe("Azure Config Loader Action", () => {
  const environment = "production"
  const productionEnvironmentConfig = {
    client_id: "00000000-0000-0000-0000-000000000000",
    tenant_id: "11111111-1111-1111-1111-111111111111",
    subscription_id: "22222222-2222-2222-2222-222222222222",
    resource_group: "prod-rg",
    location: "eastus"
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    azureConfigLoaderFixtures.getAvailableEnvironments.mockReturnValue(["development", "production"]);
    azureConfigLoaderFixtures.getEnvironmentConfig.mockReturnValue(productionEnvironmentConfig);

    // Mock isDebug to return true to avoid setSecret calls
    coreFixtures.isDebug.mockReturnValue(true);

    coreFixtures.getInput.mockImplementation((name) => {
      switch (name) {
        case "config-file":
          return "";
        case "environment":
          return environment;
        default:
          return "";
      }
    });
  });

  test("sets up the action with default config file path when no input is provided", async () => {
    await run();

    expect(coreFixtures.getInput).toHaveBeenCalledWith("config-file");
    expect(coreFixtures.getInput).toHaveBeenCalledWith("environment", { required: true });

    // Verify the constructor was called with the default config file path
    expect(azureConfigLoaderFixtures.AzureConfigLoader).toHaveBeenCalledWith(
      ".github/config/azure-environments.yml"
    );
    expect(azureConfigLoaderFixtures.AzureConfigLoader).toHaveBeenCalledTimes(1);

    // Verify info logs for loading configuration
    expect(coreFixtures.info).toHaveBeenCalledWith(
      "Loading Azure configuration for environment: production"
    );
    expect(coreFixtures.info).toHaveBeenCalledWith(
      "Configuration file: .github/config/azure-environments.yml"
    );

    // Verify debug log for available environments
    expect(coreFixtures.debug).toHaveBeenCalledWith(
      "Available environments: development, production"
    );

    // Verify that the environment configuration was retrieved and validated
    expect(azureConfigLoaderFixtures.getEnvironmentConfig).toHaveBeenCalledWith("production");
    expect(azureConfigLoaderFixtures.getEnvironmentConfig).toHaveBeenCalledTimes(1);

    expect(azureConfigLoaderFixtures.validateConfig).toHaveBeenCalledWith(productionEnvironmentConfig);
    expect(azureConfigLoaderFixtures.validateConfig).toHaveBeenCalledTimes(1);

    // Verify outputs are set with kebab-case conversion
    expect(coreFixtures.setOutput).toHaveBeenCalledTimes(5);
    
    expect(coreFixtures.setOutput).toHaveBeenNthCalledWith(
      1,
      "client-id",
      productionEnvironmentConfig.client_id
    );
    expect(coreFixtures.setOutput).toHaveBeenNthCalledWith(
      2,
      "tenant-id",
      productionEnvironmentConfig.tenant_id
    );
    expect(coreFixtures.setOutput).toHaveBeenNthCalledWith(
      3,
      "subscription-id",
      productionEnvironmentConfig.subscription_id
    );
    expect(coreFixtures.setOutput).toHaveBeenNthCalledWith(
      4,
      "resource-group",
      productionEnvironmentConfig.resource_group
    );
    expect(coreFixtures.setOutput).toHaveBeenNthCalledWith(
      5,
      "location",
      productionEnvironmentConfig.location
    );

    // Verify environment variables are exported
    expect(coreFixtures.exportVariable).toHaveBeenCalledWith(
      "AZURE_CLIENT_ID",
      productionEnvironmentConfig.client_id
    );
    expect(coreFixtures.exportVariable).toHaveBeenCalledWith(
      "AZURE_TENANT_ID",
      productionEnvironmentConfig.tenant_id
    );
    expect(coreFixtures.exportVariable).toHaveBeenCalledWith(
      "AZURE_SUBSCRIPTION_ID",
      productionEnvironmentConfig.subscription_id
    );
    expect(coreFixtures.exportVariable).toHaveBeenCalledWith(
      "AZURE_RESOURCE_GROUP",
      productionEnvironmentConfig.resource_group
    );
    expect(coreFixtures.exportVariable).toHaveBeenCalledWith(
      "AZURE_LOCATION",
      productionEnvironmentConfig.location
    );
    
    // Verify info logs for exporting environment variables
    expect(coreFixtures.info).toHaveBeenCalledWith(
      `✅ Successfully loaded configuration for ${environment} environment`
    );
  });
});
