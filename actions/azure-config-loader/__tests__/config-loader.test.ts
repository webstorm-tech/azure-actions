import { jest, describe, test, beforeEach, expect } from "@jest/globals";
import { dump } from "js-yaml";

// Mock the entire fs module
jest.unstable_mockModule("fs", () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));

// Import the mocked fs and the class under test
const { existsSync, readFileSync } = await import("fs");
const { AzureConfigLoader } = await import("../src/config-loader.js");

describe("AzureConfigLoader", () => {
  const mockConfig = {
    environments: {
      development: {
        client_id: "dev-client-id",
        tenant_id: "dev-tenant-id",
        subscription_id: "dev-subscription-id",
        resource_group: "dev-rg",
        location: "westus2",
      },
      production: {
        client_id: "prod-client-id",
        tenant_id: "prod-tenant-id",
        subscription_id: "prod-subscription-id",
        resource_group: "prod-rg",
        location: "eastus",
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (existsSync as jest.Mock).mockReturnValue(true);
    (readFileSync as jest.Mock).mockReturnValue(
      dump(mockConfig),
    );
  });

  test("loads configuration successfully", () => {
    const loader = new AzureConfigLoader(
      ".github/config/azure-environments.yml",
    );
    const config = loader.getEnvironmentConfig("development");

    expect(config.client_id).toBe("dev-client-id");
    expect(config.resource_group).toBe("dev-rg");
  });

  test("throws error for missing environment", () => {
    const loader = new AzureConfigLoader(
      ".github/config/azure-environments.yml",
    );

    expect(() => {
      loader.getEnvironmentConfig("staging");
    }).toThrow("Environment 'staging' not found");
  });

  test("returns available environments", () => {
    const loader = new AzureConfigLoader(
      ".github/config/azure-environments.yml",
    );
    const environments = loader.getAvailableEnvironments();

    expect(environments).toEqual(["development", "production"]);
  });

  test("validates configuration successfully", () => {
    const loader = new AzureConfigLoader(
      ".github/config/azure-environments.yml",
    );
    const config = loader.getEnvironmentConfig("production");

    expect(() => {
      loader.validateConfig(config);
    }).not.toThrow();
  });
});
