# Contributing to LazyKitty

Thank you for your interest in contributing to LazyKitty! This document provides guidelines and instructions for contributing.

## Development Setup

### Prerequisites

- Node.js 20+
- pnpm 8+
- Git

### Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/lazykitty.git
   cd lazykitty
   ```

3. Install dependencies:
   ```bash
   pnpm install
   ```

4. Build all packages:
   ```bash
   pnpm build
   ```

5. Start the development server:
   ```bash
   pnpm --filter @lazykitty/api dev
   ```

### Project Structure

```
lazykitty/
├── packages/
│   ├── cli/          # Command-line interface
│   ├── api/          # HTTP server (Hono)
│   ├── builder/      # Build service
│   └── shared/       # Shared types and constants
├── apps/
│   └── test-expo-app # Test Expo application
└── scripts/          # Development scripts
```

### Making Changes

1. Create a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes

3. Build and test:
   ```bash
   pnpm build
   ```

4. Test with the example app:
   ```bash
   cd apps/test-expo-app
   node ../../packages/cli/dist/index.js deploy
   ```

## Code Style

- Use TypeScript for all new code
- Follow existing code patterns
- Keep functions small and focused
- Add comments for complex logic

## Commit Messages

Use clear, descriptive commit messages:

- `feat: add new feature`
- `fix: resolve issue with X`
- `docs: update README`
- `refactor: improve code structure`

## Pull Requests

1. Ensure your code builds without errors
2. Update documentation if needed
3. Describe your changes in the PR description
4. Link any related issues

## Reporting Issues

When reporting issues, please include:

- LazyKitty version
- Node.js version
- Operating system
- Steps to reproduce
- Expected vs actual behavior
- Any error messages

## Areas for Contribution

We welcome contributions in these areas:

- **Bug fixes** - Help us squash bugs
- **Documentation** - Improve docs and examples
- **New features** - Add new functionality
- **Performance** - Optimize build times and server performance
- **Testing** - Add tests for existing code
- **Deployment guides** - Add guides for new platforms

## Questions?

Feel free to open an issue for any questions about contributing.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
