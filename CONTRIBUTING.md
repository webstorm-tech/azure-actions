# Contributing to Azure Actions

Thank you for your interest in contributing to Azure Actions! This guide will help you get started with contributing to this monorepo.

## Repository Structure

This is a **monorepo** containing multiple GitHub Actions for Azure. Each action in the `actions/` folder is developed here but **published to separate repositories** for easy consumption by users.

### Important Notes

- **All development work must be done in this repository**
- Actions are automatically published to separate repositories for distribution
- Do not attempt to make changes directly in the published action repositories
- Each action is a separate npm package managed by [Lerna](https://lerna.js.org/)

## Getting Started

### Prerequisites

- Node.js (version specified in [`.node-version`](.node-version))
- npm (latest stable version)
- Git

### Development Setup

1. **Fork and Clone** (if you don't have direct access)
   ```bash
   git clone https://github.com/YOUR-USERNAME/azure-actions.git
   cd azure-actions
   ```

2. **Install Dependencies**
   ```bash
   npm ci
   ```

3. **Verify Setup**
   ```bash
   npm run ci
   ```

## Contributing Workflow

We follow **GitHub Flow** for all contributions:

### 1. Create or Find an Issue

- **All work must have an associated GitHub issue** for detailed tracking
- Search existing issues before creating a new one
- Use issue templates when available
- Clearly describe the problem, feature request, or improvement

### 2. Create a Branch

```bash
# For new features
git checkout -b feature/issue-123-description

# For bug fixes
git checkout -b fix/issue-456-description

# For documentation
git checkout -b docs/issue-789-description
```

### 3. Make Your Changes

- Follow the existing code style and patterns
- Write or update tests for your changes
- Update documentation as needed
- Ensure all linting and formatting rules pass

### 4. Test Your Changes

```bash
# Run all tests
npm run ci-test

# Run tests for specific action
npm run ci-test --workspace=actions/action-name

# Check formatting
npm run format:check

# Run linting
npm run lint

# Build all packages
npm run package
```

### 5. Commit Your Changes

- Use clear, descriptive commit messages
- Reference the issue number in your commits
- Follow conventional commit format when possible

```bash
git add .
git commit -m "feat: add new Azure configuration validation (fixes #123)"
```

### 6. Push and Create Pull Request

```bash
git push origin your-branch-name
```

Create a pull request with:
- Clear title referencing the issue
- Detailed description of changes
- Links to related issues
- Screenshots or examples if applicable

## Development Guidelines

### Code Style

- **TypeScript**: All actions are written in TypeScript
- **ESLint**: Follow the configured ESLint rules
- **Prettier**: Code formatting is enforced
- **Tests**: All code must have appropriate test coverage

### Testing

- Use Jest for unit testing
- Aim for high test coverage (80%+ preferred)
- Test both happy path and error scenarios
- Mock external dependencies appropriately

### Adding a New Action

1. **Create Issue**: Describe the new action's purpose and functionality
2. **Create Package Structure**:
   ```bash
   npx lerna create action-name actions/action-name
   ```

3. **Follow Package Structure**:
   ```
   actions/action-name/
   ├── __fixtures__/           # Test fixtures
   ├── __tests__/              # Jest tests
   ├── src/                    # Source code
   │   ├── main.ts             # Entry point
   │   └── *.ts                # Implementation files
   ├── action.yml              # Action metadata
   ├── package.json            # Package configuration
   ├── tsconfig.json           # TypeScript config
   ├── tsconfig.eslint.json    # ESLint TypeScript config
   ├── jest.config.js          # Jest configuration
   └── README.md               # Action documentation
   ```

4. **Required Scripts** in `package.json`:
   ```json
   {
     "scripts": {
       "ci-test": "cross-env NODE_OPTIONS=--experimental-vm-modules NODE_NO_WARNINGS=1 npx jest",
       "coverage": "npx make-coverage-badge --output-path ../../badges/action-name.svg",
       "lint": "npx eslint .",
       "package": "npx rollup --config ../../rollup.config.ts --configPlugin @rollup/plugin-typescript",
       "test": "cross-env NODE_OPTIONS=--experimental-vm-modules NODE_NO_WARNINGS=1 npx jest",
       "all": "npm run lint && npm run test && npm run coverage && npm run package"
     }
   }
   ```

5. **Update Root README**: Add your action to the actions table

### Action Requirements

- **action.yml**: Complete metadata with all inputs/outputs documented
- **README.md**: Comprehensive documentation with examples
- **Tests**: Unit tests with good coverage
- **TypeScript**: Proper typing and interfaces
- **Error Handling**: Graceful error handling with clear messages

## Code Review Process

1. **Automated Checks**: All PRs must pass CI/CD checks
2. **Peer Review**: At least one maintainer review required
3. **Testing**: Verify functionality works as expected
4. **Documentation**: Ensure documentation is updated

## Release Process

- Actions are automatically published to separate repositories
- Semantic versioning is used for releases
- Release notes are generated from commit messages
- Distribution files are built and committed automatically

## Getting Help

- **Issues**: Use GitHub issues for bug reports and feature requests
- **Discussions**: Use GitHub Discussions for questions and ideas
- **Documentation**: Check existing action READMEs for examples

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and grow
- Follow GitHub's Community Guidelines

## Useful Commands

```bash
# Install dependencies
npm ci

# Run all checks (format, lint, test, build)
npm run ci

# Format code
npm run format:write

# Check formatting
npm run format:check

# Lint all packages
npm run lint

# Test all packages
npm run ci-test

# Build all packages
npm run package

# Clean build artifacts
npm run clean

# Generate coverage reports
npm run coverage

# Work with specific action
npm run test --workspace=actions/azure-config-loader
npm run lint --workspace=actions/azure-config-loader
```

## Project Structure

```
├── .github/                  # GitHub workflows and templates
├── actions/                  # Individual action packages
│   └── azure-config-loader/  # Example action
├── badges/                   # Coverage badges
├── eslint.config.mjs         # ESLint configuration
├── jest.config.base.js       # Shared Jest configuration
├── lerna.json                # Lerna configuration
├── package.json              # Root package configuration
├── rollup.config.ts          # Rollup build configuration
├── tsconfig.base.json        # Base TypeScript configuration
└── tsconfig.eslint.base.json # ESLint TypeScript configuration
```

---

Thank you for contributing to Azure Actions! Your contributions help make Azure workflows easier for everyone. 🚀
