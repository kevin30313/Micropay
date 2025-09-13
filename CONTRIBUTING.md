# Contributing to MicroPay

Thank you for your interest in contributing to MicroPay! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contributing Process](#contributing-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct:

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Respect different viewpoints and experiences
- Show empathy towards other community members

## Getting Started

### Prerequisites

- Node.js 18+ 
- Docker and Docker Compose
- Git
- AWS CLI (for deployment)
- kubectl (for Kubernetes)

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/micropay-microservices.git
   cd micropay-microservices
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run Tests**
   ```bash
   npm test
   ```

5. **Start Development**
   ```bash
   npm run dev
   ```

## Contributing Process

### 1. Choose an Issue

- Look for issues labeled `good first issue` for beginners
- Check `help wanted` for areas needing contribution
- Create a new issue if you find a bug or have a feature request

### 2. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-number
```

### 3. Make Changes

- Follow our coding standards
- Write tests for new functionality
- Update documentation as needed
- Ensure all tests pass

### 4. Commit Changes

We follow conventional commits:

```bash
git commit -m "feat: add user authentication endpoint"
git commit -m "fix: resolve payment processing bug"
git commit -m "docs: update API documentation"
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

## Coding Standards

### JavaScript Style Guide

We use ESLint and Prettier for code formatting:

```bash
# Check linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

### Key Principles

1. **Consistency**: Follow existing code patterns
2. **Readability**: Write self-documenting code
3. **Modularity**: Keep functions and modules focused
4. **Error Handling**: Always handle errors appropriately
5. **Security**: Follow security best practices

### File Organization

```
src/
├── api-gateway/          # API Gateway service
├── services/            # Microservices
│   ├── users/
│   ├── payments/
│   ├── orders/
│   └── notifications/
├── middleware/          # Shared middleware
├── utils/              # Utility functions
└── config/             # Configuration files
```

## Testing Guidelines

### Test Types

1. **Unit Tests**: Test individual functions/modules
2. **Integration Tests**: Test service interactions
3. **End-to-End Tests**: Test complete workflows

### Writing Tests

```javascript
describe('User Service', () => {
  beforeEach(() => {
    // Setup
  });

  test('should create user successfully', async () => {
    // Arrange
    const userData = testUtils.createTestUser();
    
    // Act
    const result = await userService.createUser(userData);
    
    // Assert
    expect(result).toBeDefined();
    expect(result.email).toBe(userData.email);
  });
});
```

### Test Requirements

- Minimum 80% code coverage
- All new features must have tests
- Tests should be fast and reliable
- Use descriptive test names

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Specific test file
npm test -- users.test.js
```

## Pull Request Process

### Before Submitting

1. **Rebase on main**
   ```bash
   git fetch origin
   git rebase origin/main
   ```

2. **Run full test suite**
   ```bash
   npm test
   npm run lint
   ```

3. **Update documentation**
   - Update README if needed
   - Add/update API documentation
   - Update CHANGELOG.md

### PR Template

When creating a PR, include:

- **Description**: What changes were made and why
- **Type**: Feature, bugfix, documentation, etc.
- **Testing**: How the changes were tested
- **Screenshots**: If UI changes are involved
- **Breaking Changes**: Any breaking changes
- **Checklist**: Completed items from PR template

### Review Process

1. **Automated Checks**: All CI checks must pass
2. **Code Review**: At least one maintainer review required
3. **Testing**: Reviewer will test the changes
4. **Approval**: PR approved and merged by maintainer

## Issue Reporting

### Bug Reports

Include:
- **Environment**: OS, Node.js version, etc.
- **Steps to Reproduce**: Clear, numbered steps
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Screenshots**: If applicable
- **Additional Context**: Any other relevant information

### Feature Requests

Include:
- **Problem**: What problem does this solve?
- **Solution**: Proposed solution
- **Alternatives**: Other solutions considered
- **Use Cases**: How would this be used?

## Development Workflow

### Branch Naming

- `feature/feature-name` - New features
- `fix/issue-number` - Bug fixes
- `docs/update-readme` - Documentation updates
- `refactor/service-name` - Code refactoring

### Commit Messages

Follow conventional commits format:

```
type(scope): description

[optional body]

[optional footer]
```

Examples:
```
feat(auth): add JWT token refresh endpoint
fix(payments): resolve circuit breaker timeout issue
docs(api): update authentication documentation
```

## Architecture Guidelines

### Microservices Principles

1. **Single Responsibility**: Each service has one business purpose
2. **Loose Coupling**: Services are independent
3. **High Cohesion**: Related functionality is grouped together
4. **Fault Tolerance**: Services handle failures gracefully

### API Design

1. **RESTful**: Follow REST principles
2. **Consistent**: Use consistent naming and patterns
3. **Versioned**: Version APIs for backward compatibility
4. **Documented**: Comprehensive API documentation

### Error Handling

1. **Consistent Format**: Use standard error response format
2. **Meaningful Messages**: Provide helpful error messages
3. **Proper Status Codes**: Use appropriate HTTP status codes
4. **Logging**: Log errors for debugging

## Getting Help

- **Documentation**: Check existing documentation first
- **Issues**: Search existing issues before creating new ones
- **Discussions**: Use GitHub Discussions for questions
- **Discord**: Join our Discord server for real-time help

## Recognition

Contributors will be recognized in:
- CONTRIBUTORS.md file
- Release notes
- Project documentation
- Annual contributor highlights

Thank you for contributing to MicroPay! 🚀