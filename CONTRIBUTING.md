# Contributing to wapi-cloud

Thank you for your interest in contributing to **wapi-cloud**! ❤️

wapi-cloud is an open-source, fully typed Node.js wrapper for the WhatsApp Cloud API / Meta Graph API. Contributions are welcome, including bug fixes, new API modules, improvements to TypeScript types, documentation, examples, tests, and developer experience.

Before making a significant change, please open an issue to discuss the proposed change.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Adding New API Features](#adding-new-api-features)
- [TypeScript Guidelines](#typescript-guidelines)
- [Error Handling](#error-handling)
- [Testing](#testing)
- [Build and Type Checking](#build-and-type-checking)
- [Documentation](#documentation)
- [Commit Guidelines](#commit-guidelines)
- [Pull Requests](#pull-requests)
- [Issue Guidelines](#issue-guidelines)
- [Security Issues](#security-issues)
- [API Compatibility](#api-compatibility)
- [Release Guidelines](#release-guidelines)
- [License](#license)

---

## Code of Conduct

Please be respectful and constructive when participating in the project.

Contributors are expected to:

- Be respectful to other contributors.
- Provide constructive feedback.
- Keep discussions focused on the project.
- Avoid personal attacks or inappropriate language.
- Help maintain an inclusive and welcoming environment.

---

## Getting Started

### Requirements

Before contributing, make sure you have:

- Node.js 18 or later
- npm
- Git
- A GitHub account

Check your versions:

```bash
node --version
npm --version
git --version
```

The package currently targets Node.js `>=18`.

---

## Development Setup

### 1. Fork the repository

Fork the repository on GitHub and clone your fork:

```bash
git clone https://github.com/YOUR_USERNAME/wapi-cloud.git
```

Enter the project:

```bash
cd wapi-cloud
```

Add the upstream repository:

```bash
git remote add upstream https://github.com/niyassby/wapi-cloud.git
```

Verify your remotes:

```bash
git remote -v
```

---

### 2. Install dependencies

```bash
npm install
```

---

### 3. Create a development branch

Do not work directly on `master`.

Create a feature or fix branch:

```bash
git checkout -b feat/add-new-endpoint
```

or:

```bash
git checkout -b fix/webhook-signature
```

Recommended branch prefixes:

```text
feat/       New functionality
fix/        Bug fixes
docs/       Documentation
refactor/   Code refactoring
test/       Tests
chore/      Maintenance
```

Examples:

```text
feat/add-catalog-module
fix/media-upload-error
docs/update-webhook-guide
test/template-module
refactor/http-client
```

---

## Project Structure

The repository is organized around the SDK source, examples, and supporting documentation.

A simplified structure is:

```text
wapi-cloud/
│
├── assets/
│
├── examples/
│   └── ...
│
├── src/
│   ├── ...
│   └── index.ts
│
├── .gitignore
├── .npmignore
├── LICENSE
├── README.md
├── package.json
├── package-lock.json
├── tsconfig.json
└── CONTRIBUTING.md
```

The main SDK implementation lives inside `src/`.

When adding API functionality, keep related functionality organized into the appropriate module rather than adding large amounts of logic directly to the root entry point.

---

## Development Workflow

After making changes, run:

```bash
npm run typecheck
```

Then build the package:

```bash
npm run build
```

The build uses `tsup` and generates:

- ESM output
- CommonJS output
- TypeScript declaration files

The package is published with both ESM and CommonJS entry points.

---

## Adding New API Features

wapi-cloud wraps the Meta WhatsApp Cloud API.

When adding a new endpoint or feature, follow the existing architecture and conventions.

Before implementing a new API:

1. Check the official Meta documentation.
2. Verify the endpoint and HTTP method.
3. Verify required parameters.
4. Verify request and response structures.
5. Check authentication requirements.
6. Check the required WhatsApp Business assets.
7. Check the required Graph API version.
8. Determine whether the endpoint should belong to an existing module or a new module.

Do not implement API behavior based only on third-party examples.

---

## API Module Guidelines

When adding a new module:

- Keep the module focused on a specific API area.
- Use TypeScript types for requests and responses.
- Reuse the existing HTTP/client infrastructure.
- Follow existing naming conventions.
- Return the standard `{ data, error }` response pattern.
- Avoid unnecessary dependencies.
- Add documentation and examples where appropriate.

For example, a module might follow a structure similar to:

```text
src/
├── index.ts
├── client.ts
├── types/
│   └── ...
└── modules/
    ├── messages/
    ├── templates/
    ├── media/
    ├── contacts/
    ├── flows/
    └── ...
```

Follow the existing repository structure when adding new modules rather than creating a parallel architecture.

---

## TypeScript Guidelines

TypeScript is a core part of wapi-cloud.

Prefer explicit types over `any`.

Avoid:

```ts
const response: any = ...
```

Prefer:

```ts
interface ExampleResponse {
  id: string;
  name: string;
}

const response: ExampleResponse = ...
```

Use type narrowing where appropriate.

The SDK should provide useful type information to users without requiring them to manually cast API responses.

### Public APIs

Any type exposed through the public package API should be intentionally designed.

Before exporting a new type, consider:

- Is this type useful to package consumers?
- Is the name clear?
- Is the type stable?
- Does it accurately represent the Meta API?
- Can it be reused elsewhere?

---

## Error Handling

One of the core design principles of wapi-cloud is the consistent response pattern:

```ts
const { data, error } = await whatsapp.templates.list();
```

Expected API failures should not require consumers to wrap every SDK call in `try/catch`.

When implementing new functionality, follow the existing `{ data, error }` pattern.

For example:

```ts
const { data, error } = await whatsapp.someModule.someMethod();

if (error) {
  console.error(error.message);
} else {
  console.log(data);
}
```

Do not introduce a new error-handling pattern for individual modules unless there is a strong architectural reason.

---

## Webhooks

Webhook functionality requires additional care because it deals with externally supplied HTTP requests.

When modifying webhook functionality:

- Validate webhook signatures correctly.
- Do not weaken signature verification.
- Avoid logging sensitive payloads unnecessarily.
- Preserve existing event parsing behavior.
- Maintain useful TypeScript event types.
- Test malformed and unexpected payloads.
- Follow Meta's webhook requirements.

Never commit real:

```text
Access tokens
App secrets
Webhook verify tokens
Phone numbers used for private testing
Business Account credentials
Other credentials
```

Use environment variables for secrets.

For example:

```bash
WA_TOKEN=your-token
WA_PHONE_ID=your-phone-number-id
WA_WABA_ID=your-business-account-id
WA_APP_SECRET=your-app-secret
WA_VERIFY_TOKEN=your-webhook-verify-token
```

Never commit `.env` files containing real credentials.

---

## Testing

Every bug fix or significant feature should include appropriate testing.

At minimum, verify:

```bash
npm run typecheck
npm run build
```

When tests are available for the affected functionality, run the relevant test suite as well.

### What should be tested?

For a new API method, consider testing:

- Correct HTTP method
- Correct endpoint
- Required parameters
- Optional parameters
- Request body
- Query parameters
- Successful response
- API error response
- Missing configuration
- TypeScript type behavior
- Pagination where applicable

For webhook functionality, also test:

- Valid signatures
- Invalid signatures
- Malformed payloads
- Unknown event types
- Multiple events
- Different message types

---

## Build and Type Checking

Before opening a pull request, run:

```bash
npm run typecheck
```

and:

```bash
npm run build
```

The repository uses `tsup` to build the package.

The build should successfully produce:

```text
dist/
├── index.js
├── index.cjs
└── index.d.ts
```

Do not commit generated `dist` files unless the project maintainers specifically request it.

---

## Testing the Package Locally

Before publishing or submitting a major package change, you can test the package as an installed npm package.

Build it:

```bash
npm run build
```

Create a package archive:

```bash
npm pack
```

This produces a file similar to:

```text
wapi-cloud-1.0.0.tgz
```

Create or use a separate test project and install the generated archive:

```bash
npm install ../wapi-cloud/wapi-cloud-1.0.0.tgz
```

Then test:

```ts
import { Whatsapp } from "wapi-cloud";

const whatsapp = new Whatsapp({
  accessToken: process.env.WA_TOKEN!,
  phoneNumberId: process.env.WA_PHONE_ID!,
  businessAccountId: process.env.WA_WABA_ID!,
});
```

This is useful for detecting packaging problems before a release.

---

## Documentation

Documentation is an important part of the project.

When adding a public feature, update the relevant documentation.

Documentation changes may include:

- `README.md`
- API documentation
- Examples
- Webhook documentation
- Type documentation
- Configuration documentation

A feature is easier to maintain when another developer can understand how to use it without reading the implementation.

### Examples

If you add a commonly used feature, consider adding an example under:

```text
examples/
```

Examples should:

- Be simple.
- Be runnable where practical.
- Avoid real credentials.
- Use environment variables for secrets.
- Follow the same API style as the SDK.

---

## Commit Guidelines

Use clear and descriptive commit messages.

Recommended format:

```text
type: description
```

Examples:

```text
feat: add catalog module
fix: handle media upload errors
docs: improve webhook documentation
refactor: simplify request handling
test: add template tests
chore: update dependencies
```

Recommended commit types:

| Type | Purpose |
|---|---|
| `feat` | New functionality |
| `fix` | Bug fix |
| `docs` | Documentation |
| `test` | Tests |
| `refactor` | Code restructuring |
| `chore` | Maintenance |
| `perf` | Performance improvement |
| `security` | Security-related changes |

Keep commits focused.

Avoid combining unrelated changes in one commit.

---

## Pull Requests

Before opening a pull request:

```bash
npm install
npm run typecheck
npm run build
```

Then review your changes:

```bash
git diff
```

Check the status:

```bash
git status
```

Commit your changes:

```bash
git add .
git commit -m "feat: add new API module"
```

Push your branch:

```bash
git push origin feat/add-new-api-module
```

Then open a pull request against the `master` branch.

---

## Pull Request Guidelines

A good pull request should:

- Explain what changed.
- Explain why the change was necessary.
- Keep the scope focused.
- Include tests where appropriate.
- Update documentation where necessary.
- Avoid unrelated formatting changes.
- Avoid breaking existing public APIs unless explicitly discussed.

### Pull Request description

Please include:

```markdown
## What changed?

Describe the change.

## Why?

Explain the problem or motivation.

## How was it tested?

Explain the tests or commands you ran.

## Breaking changes

List any breaking changes.

## Additional notes

Anything else maintainers should know.
```

---

## Breaking Changes

Avoid breaking existing APIs whenever possible.

For example, changing:

```ts
whatsapp.messages.sendText(to, options)
```

into:

```ts
whatsapp.messages.sendText(options)
```

would potentially break existing applications.

If a breaking change is necessary:

1. Open an issue first.
2. Explain the motivation.
3. Discuss alternative approaches.
4. Clearly document the breaking change.
5. Update examples.
6. Consider whether a major version release is required.

Do not introduce breaking changes silently.

---

## Backward Compatibility

When adding functionality, prefer additive changes.

Good:

```ts
whatsapp.messages.sendText(...)
whatsapp.messages.sendTemplate(...)
```

Potentially breaking:

```ts
whatsapp.messages.sendText(...) // existing method changed
```

Existing users should be able to upgrade without unexpected behavior changes whenever possible.

---

## Meta API Version Compatibility

wapi-cloud integrates with the Meta Graph API.

Meta can change:

- API versions
- Request parameters
- Response fields
- Permissions
- Business requirements
- Endpoint availability
- WhatsApp Cloud API behavior

When updating Meta API functionality:

1. Verify the current official Meta documentation.
2. Check the supported Graph API version.
3. Confirm request and response changes.
4. Check for deprecated fields.
5. Update TypeScript types.
6. Update examples.
7. Update documentation.
8. Test affected functionality.

Do not remove or change existing functionality solely because a newer Meta API version exists without considering compatibility.

---

## Security Issues

Please **do not publicly open a GitHub issue for a security vulnerability**.

Security vulnerabilities may include:

- Authentication bypass
- Token exposure
- Webhook signature bypass
- Credential leakage
- Sensitive data exposure
- Remote code execution
- Injection vulnerabilities
- Unsafe request handling

If you discover a security issue, contact the project maintainer privately before publicly disclosing the vulnerability.

Do not include:

```text
Access tokens
App secrets
Webhook secrets
Customer information
Private WhatsApp data
Production credentials
```

in issues or pull requests.

---

## WhatsApp / Meta API Credentials

Contributors should use their own development/test credentials.

Never use production credentials belonging to another person or organization.

Use environment variables:

```bash
WA_TOKEN=
WA_PHONE_ID=
WA_WABA_ID=
WA_APP_SECRET=
WA_VERIFY_TOKEN=
```

Make sure sensitive files are excluded from Git.

Before pushing:

```bash
git status
```

and verify that no credentials are staged.

---

## Adding Dependencies

Avoid adding dependencies unless they provide meaningful value.

Before adding a dependency, consider:

- Can the functionality be implemented using the existing code?
- Is the dependency actively maintained?
- Is it compatible with Node.js 18+?
- Does it increase package size significantly?
- Does it introduce security concerns?
- Does it support ESM/CJS appropriately?
- Is its license compatible with this project?

For a lightweight SDK, keeping the dependency footprint small is preferred.

---

## Performance

wapi-cloud is intended to be a lightweight Node.js SDK.

When contributing:

- Avoid unnecessary dependencies.
- Avoid unnecessary API requests.
- Avoid unnecessary object transformations.
- Preserve pagination behavior.
- Avoid blocking operations.
- Avoid unnecessary memory usage.
- Keep the public API simple.

Performance-sensitive changes should include an explanation of the trade-offs.

---

## API Design Principles

When contributing to wapi-cloud, keep the following principles in mind:

### 1. Type safety

Consumers should get useful TypeScript types.

### 2. Consistency

Similar operations should behave similarly across modules.

### 3. Predictability

Users should be able to understand what an SDK method does without reading its implementation.

### 4. Small surface area

Do not expose internal implementation details unnecessarily.

### 5. Backward compatibility

Avoid breaking existing applications.

### 6. Developer experience

The SDK should make the WhatsApp Cloud API easier to use, not simply reproduce the raw Graph API.

---

## Issue Guidelines

Before opening an issue, search existing issues to make sure the problem has not already been reported.

When reporting a bug, provide:

- Node.js version
- wapi-cloud version
- Operating system
- Relevant API/module
- Expected behavior
- Actual behavior
- Error message
- Minimal reproduction
- Relevant code

### Good bug report

```markdown
## Description

`messages.sendText()` returns an unexpected error when...

## Environment

- Node.js: 20.x
- wapi-cloud: 1.0.0
- OS: Ubuntu 24.04

## Expected behavior

The message should be sent successfully.

## Actual behavior

The SDK returns...

## Reproduction

```ts
// minimal example
```

## Additional information

...
```

Never include real credentials in an issue.

---

## Feature Requests

For feature requests, explain:

1. What problem the feature solves.
2. Why the current API is insufficient.
3. What API design you propose.
4. Whether the feature matches the Meta API.
5. Whether the feature introduces breaking changes.

For significant features, please discuss the idea in an issue before implementing it.

---

## Keeping Your Fork Updated

Before starting new work, update your local repository:

```bash
git checkout master
git fetch upstream
git merge upstream/master
```

Then create a new branch:

```bash
git checkout -b feat/my-feature
```

Alternatively, you can use:

```bash
git pull upstream master
```

---

## Pull Request Review

Maintainers may request:

- Code changes
- Additional tests
- Documentation updates
- API design changes
- Type improvements
- Better error handling
- Smaller scope
- Compatibility improvements

Please treat review comments as part of the collaborative development process.

A pull request may be modified or closed if it does not align with the project's architecture or goals.

---

## Release Guidelines

Package releases are maintained by project maintainers.

Before a release, verify:

```bash
npm run typecheck
npm run build
```

Also verify the package contents:

```bash
npm pack --dry-run
```

The package should only contain files required by consumers.

The package currently exposes:

- ESM
- CommonJS
- TypeScript declarations

Release versions should follow Semantic Versioning.

### Patch release

Bug fixes:

```text
1.0.0 → 1.0.1
```

### Minor release

Backward-compatible features:

```text
1.0.1 → 1.1.0
```

### Major release

Breaking changes:

```text
1.1.0 → 2.0.0
```

---

## What Makes a Good Contribution?

A strong contribution generally has:

- A clear purpose.
- A small and focused scope.
- Good TypeScript types.
- Appropriate tests.
- Updated documentation.
- No unnecessary dependencies.
- No breaking changes unless discussed.
- Clear commit messages.
- No secrets or sensitive information.

---

## Thank You

Every contribution helps make **wapi-cloud** better for developers building applications with the WhatsApp Cloud API.

Whether you are fixing a typo, improving documentation, fixing a bug, adding tests, or implementing a new API module — thank you for contributing! ❤️

Happy coding! 🚀

---

## License

By contributing to this repository, you agree that your contributions will be licensed under the same MIT License that covers the project.

See [`LICENSE`](./LICENSE) for details.