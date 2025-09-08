import * as core from "@actions/core";
import { AzureConfigLoader } from "./config-loader.js";

/**
 * Convert snake_case to kebab-case for output names
 */
function toKebabCase(str: string): string {
  return str.replace(/_/g, "-");
}

/**
 * Main action execution
 */
export async function run(): Promise<void> {
  try {
    // Get inputs
    const environment = core.getInput("environment", { required: true });
    
    const configFile =
      core.getInput("config-file") || ".github/config/azure-environments.yml";

    core.info(`Loading Azure configuration for environment: ${environment}`);
    core.info(`Configuration file: ${configFile}`);

    // Create loader and get configuration
    const loader = new AzureConfigLoader(configFile);

    // Log available environments for debugging
    const availableEnvs = loader.getAvailableEnvironments();
    core.debug(`Available environments: ${availableEnvs.join(", ")}`);

    // Get the specific environment configuration
    const config = loader.getEnvironmentConfig(environment);

    // Validate configuration
    loader.validateConfig(config);

    // Set outputs for each configuration value
    for (const [key, value] of Object.entries(config)) {
      const outputName = toKebabCase(key);
      core.setOutput(outputName, value);

      // Mask sensitive IDs in logs if needed (though they're not secret with OIDC)
      if (key.includes("id") && core.isDebug() === false) {
        core.setSecret(value);
      }

      core.debug(`Set output ${outputName}: ${value}`);
    }

    // Also export as environment variables for convenience
    core.exportVariable("AZURE_CLIENT_ID", config.client_id);
    core.exportVariable("AZURE_TENANT_ID", config.tenant_id);
    core.exportVariable("AZURE_SUBSCRIPTION_ID", config.subscription_id);

    if (config.resource_group) {
      core.exportVariable("AZURE_RESOURCE_GROUP", config.resource_group);
    }

    if (config.location) {
      core.exportVariable("AZURE_LOCATION", config.location);
    }

    core.info(
      `✅ Successfully loaded configuration for ${environment} environment`
    );

    // Set summary
    await core.summary
      .addHeading("Azure Configuration Loaded")
      .addTable([
        [{ data: "Environment", header: true }, { data: environment }],
        [
          { data: "Client ID", header: true },
          { data: `${config.client_id.substring(0, 8)}...` },
        ],
        [
          { data: "Tenant ID", header: true },
          { data: `${config.tenant_id.substring(0, 8)}...` },
        ],
        [
          { data: "Subscription ID", header: true },
          { data: `${config.subscription_id.substring(0, 8)}...` },
        ],
        [
          { data: "Resource Group", header: true },
          { data: config.resource_group || "N/A" },
        ],
        [
          { data: "Location", header: true },
          { data: config.location || "N/A" },
        ],
      ])
      .write();
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);

      // Provide helpful error messages
      if (error.message.includes("not found")) {
        core.error(
          "Make sure the configuration file exists and the path is correct.",
        );
        core.error("The path should be relative to your repository root.");
      } else if (error.message.includes("Environment")) {
        core.error(
          "Check that the environment name matches one defined in your configuration file.",
        );
      }
    } else {
      core.setFailed("An unexpected error occurred");
    }
  }
}
