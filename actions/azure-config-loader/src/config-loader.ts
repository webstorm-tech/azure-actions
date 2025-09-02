import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import * as core from "@actions/core";

export interface AzureEnvironmentConfig {
  client_id: string;
  tenant_id: string;
  subscription_id: string;
  resource_group: string;
  location: string;
  [key: string]: string; // Allow additional properties
}

export interface AzureConfigFile {
  environments: {
    [environment: string]: AzureEnvironmentConfig;
  };
}

export class AzureConfigLoader {
  private configFile: string;
  private config: AzureConfigFile | null = null;

  constructor(configFile: string) {
    this.configFile = configFile;
  }

  /**
   * Load and parse the configuration file
   */
  private loadConfig(): AzureConfigFile {
    if (this.config) {
      return this.config;
    }

    try {
      // Resolve the config file path relative to the workspace
      const workspacePath = process.env.GITHUB_WORKSPACE || process.cwd();
      const fullPath = path.resolve(workspacePath, this.configFile);

      core.debug(`Loading configuration from: ${fullPath}`);

      if (!fs.existsSync(fullPath)) {
        throw new Error(`Configuration file not found: ${fullPath}`);
      }

      const fileContents = fs.readFileSync(fullPath, "utf8");
      this.config = yaml.load(fileContents) as AzureConfigFile;

      if (!this.config || !this.config.environments) {
        throw new Error(
          'Invalid configuration file format: missing "environments" key',
        );
      }

      return this.config;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to load configuration file: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get configuration for a specific environment
   */
  public getEnvironmentConfig(environment: string): AzureEnvironmentConfig {
    const config = this.loadConfig();

    if (!config.environments[environment]) {
      const availableEnvironments = Object.keys(config.environments).join(", ");
      throw new Error(
        `Environment '${environment}' not found in configuration. ` +
          `Available environments: ${availableEnvironments}`,
      );
    }

    return config.environments[environment];
  }

  /**
   * Validate that all required fields are present in the configuration
   */
  public validateConfig(config: AzureEnvironmentConfig): void {
    const requiredFields = ["client_id", "tenant_id", "subscription_id"];
    const missingFields = requiredFields.filter((field) => !config[field]);

    if (missingFields.length > 0) {
      throw new Error(
        `Missing required fields in configuration: ${missingFields.join(", ")}`,
      );
    }

    // Validate format of IDs (basic UUID validation)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(config.client_id)) {
      core.warning(
        `client_id doesn't appear to be a valid UUID: ${config.client_id}`,
      );
    }

    if (!uuidRegex.test(config.tenant_id)) {
      core.warning(
        `tenant_id doesn't appear to be a valid UUID: ${config.tenant_id}`,
      );
    }

    if (!uuidRegex.test(config.subscription_id)) {
      core.warning(
        `subscription_id doesn't appear to be a valid UUID: ${config.subscription_id}`,
      );
    }
  }

  /**
   * Get all available environments
   */
  public getAvailableEnvironments(): string[] {
    const config = this.loadConfig();
    return Object.keys(config.environments);
  }
}
