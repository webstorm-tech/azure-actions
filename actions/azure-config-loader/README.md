# Azure Config Loader

A GitHub Action that loads Azure environment configuration from a YAML file, making it
easy to manage multiple Azure environments (development, staging, production) in your
workflows.

## Features

- 🔧 **Environment-specific configuration** - Load different Azure settings per
  environment
- 📝 **YAML-based configuration** - Store all environments in a single, readable file
- 🔍 **Validation** - Automatically validates Azure ID formats (UUIDs)
- 🚀 **Multiple output formats** - Provides both action outputs and environment variables
- 🛡️ **Error handling** - Clear error messages for missing environments or invalid
  configurations

## Usage

### Basic Example

```yaml
name: Deploy to Azure
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Load Azure Configuration
        id: azure-config
        uses: webstorm-tech/azure-config-loader
        with:
          environment: production

      - name: Azure Login
        uses: azure/login@v1
        with:
          client-id: ${{ steps.azure-config.outputs.client-id }}
          tenant-id: ${{ steps.azure-config.outputs.tenant-id }}
          subscription-id: ${{ steps.azure-config.outputs.subscription-id }}

      - name: Deploy Resources
        run: |
          az deployment group create \
            --resource-group ${{ steps.azure-config.outputs.resource-group }} \
            --template-file template.json \
            --parameters location=${{ steps.azure-config.outputs.location }}
```

### Matrix Strategy Example

```yaml
name: Multi-Environment Deploy
on:
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: [development, staging, production]

    steps:
      - uses: actions/checkout@v4

      - name: Load Azure Configuration
        uses: webstorm-tech/azure-config-loader
        with:
          environment: ${{ matrix.environment }}

      - name: Deploy to ${{ matrix.environment }}
        run: |
          echo "Deploying to $AZURE_RESOURCE_GROUP in $AZURE_LOCATION"
          # The action automatically exports environment variables
```

## Configuration File

Create a YAML configuration file at `.github/config/azure-environments.yml` (or specify a
custom path):

```yaml
environments:
  development:
    client_id: '00000000-0000-0000-0000-000000000000'
    tenant_id: '11111111-1111-1111-1111-111111111111'
    subscription_id: '22222222-2222-2222-2222-222222222222'
    resource_group: 'my-app-dev-rg'
    location: 'westus2'

  staging:
    client_id: '33333333-3333-3333-3333-333333333333'
    tenant_id: '44444444-4444-4444-4444-444444444444'
    subscription_id: '55555555-5555-5555-5555-555555555555'
    resource_group: 'my-app-staging-rg'
    location: 'eastus'

  production:
    client_id: '66666666-6666-6666-6666-666666666666'
    tenant_id: '77777777-7777-7777-7777-777777777777'
    subscription_id: '88888888-8888-8888-8888-888888888888'
    resource_group: 'my-app-prod-rg'
    location: 'eastus2'
```

## Inputs

| Input         | Description                                               | Required | Default                                 |
| ------------- | --------------------------------------------------------- | -------- | --------------------------------------- |
| `environment` | Environment name (e.g., development, staging, production) | ✅       | -                                       |
| `config-file` | Path to the YAML configuration file                       | ❌       | `.github/config/azure-environments.yml` |

## Outputs

| Output            | Description                                         |
| ----------------- | --------------------------------------------------- |
| `client-id`       | Azure Client ID for the specified environment       |
| `tenant-id`       | Azure Tenant ID for the specified environment       |
| `subscription-id` | Azure Subscription ID for the specified environment |
| `resource-group`  | Azure Resource Group for the specified environment  |
| `location`        | Azure Location/Region for the specified environment |

## Environment Variables

The action also exports the following environment variables for convenience:

- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`
- `AZURE_RESOURCE_GROUP`
- `AZURE_LOCATION`

## Error Handling

The action provides clear error messages for common issues:

- **Missing environment**: Lists available environments when an invalid one is specified
- **Invalid configuration file**: Clear guidance on file path and format requirements
- **Invalid Azure IDs**: Validates that client_id, tenant_id, and subscription_id are
  proper UUIDs

## Security Considerations

- Store sensitive Azure credentials as GitHub secrets, not in the configuration file
- Use Azure OIDC authentication with federated credentials when possible
- The action automatically masks ID values in debug logs (though they're not secret with
  OIDC)

## Advanced Usage

### Custom Configuration File Path

```yaml
- name: Load Azure Configuration
  uses: webstorm-tech/azure-config-loader
  with:
    environment: production
    config-file: .azure/environments.yml
```

### Using with Azure CLI

```yaml
- name: Load Azure Configuration
  uses: webstorm-tech/azure-config-loader
  with:
    environment: ${{ github.event.inputs.environment }}

- name: Set Azure CLI defaults
  run: |
    az configure --defaults group=$AZURE_RESOURCE_GROUP location=$AZURE_LOCATION
```

### Dynamic Environment Selection

```yaml
- name: Determine Environment
  id: env
  run: |
    if [[ "${{ github.ref }}" == "refs/heads/main" ]]; then
      echo "environment=production" >> $GITHUB_OUTPUT
    elif [[ "${{ github.ref }}" == "refs/heads/staging" ]]; then
      echo "environment=staging" >> $GITHUB_OUTPUT
    else
      echo "environment=development" >> $GITHUB_OUTPUT
    fi

- name: Load Azure Configuration
  uses: webstorm-tech/azure-config-loader
  with:
    environment: ${{ steps.env.outputs.environment }}
```

## Validation

The action automatically validates:

- ✅ Required fields: `client_id`, `tenant_id`, `subscription_id`
- ✅ UUID format for all Azure ID fields
- ✅ Configuration file exists and is readable
- ✅ Environment exists in configuration

## License

MIT - see [LICENSE](LICENSE) for details.
