import { jest, describe, test, beforeEach, expect, afterEach } from "@jest/globals";

// Mock the @actions/core module
const mockCore = {
  getInput: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  setOutput: jest.fn(),
  setSecret: jest.fn(),
  exportVariable: jest.fn(),
  setFailed: jest.fn(),
  error: jest.fn(),
  isDebug: jest.fn(),
  summary: {
    addHeading: jest.fn().mockReturnThis(),
    addTable: jest.fn().mockReturnThis(),
    write: jest.fn().mockImplementation(() => Promise.resolve()),
  },
};

jest.unstable_mockModule("@actions/core", () => mockCore);

// Mock the fs module
jest.unstable_mockModule("fs", () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));

// Import the mocked modules
const core = await import("@actions/core");
const { existsSync, readFileSync } = await import("fs");
const { dump } = await import("js-yaml");

describe("Azure Config Loader Action", () => {
  let originalExit: typeof process.exit;

  beforeEach(() => {
    // Mock process.exit to prevent tests from actually exiting
    originalExit = process.exit;
    process.exit = jest.fn() as any;
    
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore process.exit
    process.exit = originalExit;
    
    // Clear the module cache to ensure fresh imports
    jest.resetModules();
  });
  const mockConfig = {
    environments: {
      development: {
        client_id: "11111111-1111-1111-1111-111111111111",
        tenant_id: "22222222-2222-2222-2222-222222222222",
        subscription_id: "33333333-3333-3333-3333-333333333333",
        resource_group: "dev-rg",
        location: "westus2",
      },
      production: {
        client_id: "44444444-4444-4444-4444-444444444444",
        tenant_id: "55555555-5555-5555-5555-555555555555",
        subscription_id: "66666666-6666-6666-6666-666666666666",
        resource_group: "prod-rg",
        location: "eastus",
      },
    },
  };

  test("successfully loads and processes configuration", async () => {
    // Setup default mocks
    (existsSync as jest.Mock).mockReturnValue(true);
    (readFileSync as jest.Mock).mockReturnValue(dump(mockConfig));
    (core.isDebug as jest.Mock).mockReturnValue(false);
    
    // Setup inputs
    (core.getInput as jest.Mock)
      .mockReturnValueOnce("development") // environment
      .mockReturnValueOnce(""); // config-file (should use default)

    // Import and run the action (since main.ts auto-executes)
    await import("../src/main.js");

    // Verify core.info calls
    expect(core.info).toHaveBeenCalledWith("Loading Azure configuration for environment: development");
    expect(core.info).toHaveBeenCalledWith("Configuration file: .github/config/azure-environments.yml");
    expect(core.info).toHaveBeenCalledWith("✅ Successfully loaded configuration for development environment");

    // Verify outputs are set with kebab-case conversion
    expect(core.setOutput).toHaveBeenCalledWith("client-id", "11111111-1111-1111-1111-111111111111");
    expect(core.setOutput).toHaveBeenCalledWith("tenant-id", "22222222-2222-2222-2222-222222222222");
    expect(core.setOutput).toHaveBeenCalledWith("subscription-id", "33333333-3333-3333-3333-333333333333");
    expect(core.setOutput).toHaveBeenCalledWith("resource-group", "dev-rg");
    expect(core.setOutput).toHaveBeenCalledWith("location", "westus2");

    // Verify environment variables are exported
    expect(core.exportVariable).toHaveBeenCalledWith("AZURE_CLIENT_ID", "11111111-1111-1111-1111-111111111111");
    expect(core.exportVariable).toHaveBeenCalledWith("AZURE_TENANT_ID", "22222222-2222-2222-2222-222222222222");
    expect(core.exportVariable).toHaveBeenCalledWith("AZURE_SUBSCRIPTION_ID", "33333333-3333-3333-3333-333333333333");
    expect(core.exportVariable).toHaveBeenCalledWith("AZURE_RESOURCE_GROUP", "dev-rg");
    expect(core.exportVariable).toHaveBeenCalledWith("AZURE_LOCATION", "westus2");

    // Verify secrets are set for ID fields when not in debug mode
    expect(core.setSecret).toHaveBeenCalledWith("11111111-1111-1111-1111-111111111111");
    expect(core.setSecret).toHaveBeenCalledWith("22222222-2222-2222-2222-222222222222");
    expect(core.setSecret).toHaveBeenCalledWith("33333333-3333-3333-3333-333333333333");

    // Verify summary is created
    expect(core.summary.addHeading).toHaveBeenCalledWith("Azure Configuration Loaded");
    expect(core.summary.addTable).toHaveBeenCalled();
    expect(core.summary.write).toHaveBeenCalled();
  });

  test("uses custom config file when provided", async () => {
    (existsSync as jest.Mock).mockReturnValue(true);
    (readFileSync as jest.Mock).mockReturnValue(dump(mockConfig));
    (core.isDebug as jest.Mock).mockReturnValue(false);
    
    (core.getInput as jest.Mock)
      .mockReturnValueOnce("production") // environment
      .mockReturnValueOnce("custom/config.yml"); // config-file

    await import("../src/main.js");

    expect(core.info).toHaveBeenCalledWith("Configuration file: custom/config.yml");
  });

  test("handles missing environment error", async () => {
    (existsSync as jest.Mock).mockReturnValue(true);
    (readFileSync as jest.Mock).mockReturnValue(dump(mockConfig));
    (core.isDebug as jest.Mock).mockReturnValue(false);
    
    (core.getInput as jest.Mock)
      .mockReturnValueOnce("staging") // non-existent environment
      .mockReturnValueOnce("");

    await import("../src/main.js");

    expect(core.setFailed).toHaveBeenCalledWith(
      expect.stringContaining("Environment 'staging' not found")
    );
    expect(core.error).toHaveBeenCalledWith(
      "Check that the environment name matches one defined in your configuration file."
    );
  });

  test("handles missing config file error", async () => {
    (existsSync as jest.Mock).mockReturnValue(false);
    (core.isDebug as jest.Mock).mockReturnValue(false);
    
    (core.getInput as jest.Mock)
      .mockReturnValueOnce("development")
      .mockReturnValueOnce("");

    await import("../src/main.js");

    expect(core.setFailed).toHaveBeenCalledWith(
      expect.stringContaining("not found")
    );
    expect(core.error).toHaveBeenCalledWith(
      "Make sure the configuration file exists and the path is correct."
    );
    expect(core.error).toHaveBeenCalledWith(
      "The path should be relative to your repository root."
    );
  });

  test("handles unexpected errors", async () => {
    (core.isDebug as jest.Mock).mockReturnValue(false);
    
    (core.getInput as jest.Mock)
      .mockReturnValueOnce("development")
      .mockReturnValueOnce("");
    
    // Mock a non-Error object being thrown
    (existsSync as jest.Mock).mockImplementation(() => {
      throw "Unexpected error type";
    });

    await import("../src/main.js");

    expect(core.setFailed).toHaveBeenCalledWith("An unexpected error occurred");
  });

  test("does not set secrets when in debug mode", async () => {
    (existsSync as jest.Mock).mockReturnValue(true);
    (readFileSync as jest.Mock).mockReturnValue(dump(mockConfig));
    (core.isDebug as jest.Mock).mockReturnValue(true);
    
    (core.getInput as jest.Mock)
      .mockReturnValueOnce("development")
      .mockReturnValueOnce("");

    await import("../src/main.js");

    // Should not call setSecret when in debug mode
    expect(core.setSecret).not.toHaveBeenCalled();
  });

  test("handles environment with missing optional fields", async () => {
    const configWithMissingFields = {
      environments: {
        minimal: {
          client_id: "11111111-1111-1111-1111-111111111111",
          tenant_id: "22222222-2222-2222-2222-222222222222",
          subscription_id: "33333333-3333-3333-3333-333333333333",
          // No resource_group or location
        },
      },
    };

    (existsSync as jest.Mock).mockReturnValue(true);
    (readFileSync as jest.Mock).mockReturnValue(dump(configWithMissingFields));
    (core.isDebug as jest.Mock).mockReturnValue(false);
    
    (core.getInput as jest.Mock)
      .mockReturnValueOnce("minimal")
      .mockReturnValueOnce("");

    await import("../src/main.js");

    // Should not export environment variables for missing optional fields
    expect(core.exportVariable).not.toHaveBeenCalledWith("AZURE_RESOURCE_GROUP", expect.anything());
    expect(core.exportVariable).not.toHaveBeenCalledWith("AZURE_LOCATION", expect.anything());

    // Summary should show "N/A" for missing fields
    const summaryCall = (core.summary.addTable as jest.Mock).mock.calls[0][0];
    expect(summaryCall).toEqual(
      expect.arrayContaining([
        [{ data: "Resource Group", header: true }, { data: "N/A" }],
        [{ data: "Location", header: true }, { data: "N/A" }],
      ])
    );
  });

  test("converts snake_case to kebab-case correctly", async () => {
    const configWithSnakeCase = {
      environments: {
        test: {
          client_id: "test-client",
          tenant_id: "test-tenant",
          subscription_id: "test-sub",
          custom_field_name: "custom-value",
        },
      },
    };

    (existsSync as jest.Mock).mockReturnValue(true);
    (readFileSync as jest.Mock).mockReturnValue(dump(configWithSnakeCase));
    (core.isDebug as jest.Mock).mockReturnValue(false);
    
    (core.getInput as jest.Mock)
      .mockReturnValueOnce("test")
      .mockReturnValueOnce("");

    await import("../src/main.js");

    expect(core.setOutput).toHaveBeenCalledWith("client-id", "test-client");
    expect(core.setOutput).toHaveBeenCalledWith("tenant-id", "test-tenant");
    expect(core.setOutput).toHaveBeenCalledWith("subscription-id", "test-sub");
    expect(core.setOutput).toHaveBeenCalledWith("custom-field-name", "custom-value");
  });
});
