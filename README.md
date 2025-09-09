# azure-actions

A monorepo containing all of the custom GitHub Actions for Azure

## Actions

| Action | Coverage | Description |
|--------|----------|-------------|
| [azure-config-loader](./actions/azure-config-loader) | ![Coverage](./badges/azure-config-loader.svg) | Loads Azure configuration from a YAML file for GitHub Actions |

## Development

This repository uses [Lerna](https://lerna.js.org/) to manage multiple packages. Each action is a separate package in the `actions/` directory.

### Getting Started

```bash
# Install dependencies
npm ci

# Run tests for all packages
npm run ci-test

# Format code
npm run format:write

# Lint code
npm run lint

# Build all packages
npm run package
```

### Adding a New Action

1. Create a new directory under `actions/`
2. Follow the same package structure as existing actions
3. Ensure your package.json includes the standard scripts
4. Add your action to the table above
