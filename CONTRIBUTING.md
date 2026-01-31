# Contributing to Steam Playtime Farmer

Thanks for considering contributing! Here's how to get started.

## Getting Started

1. Fork the repo
2. Clone your fork:
```bash
git clone https://github.com/your-username/steam-playtime-farmer.git
cd steam-playtime-farmer
```
3. Create a branch:
```bash
git checkout -b feature/your-feature-name
```

## Development Setup

### Requirements
- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
- Visual Studio 2022+ or VS Code with C# extension

### Building
```bash
dotnet build
```

### Running
```bash
dotnet run --project steam-playtime-farmer
```

### Testing
Before submitting, test your changes:
1. Build for your platform
2. Test with a throwaway Steam account
3. Verify 2FA prompts work
4. Test multi-account scenarios if applicable

## Code Style

- Follow the existing `.editorconfig` rules
- Keep lines under 120 characters (if possible, if not, it's fine)
- No AI slop - write clean, maintainable code

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/) for clear commit history.

### Format
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style/formatting (no logic changes)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding/updating tests
- `chore`: Maintenance tasks (deps, build scripts, etc.)

### Examples
```bash
feat (auth): add automatic 2FA code generation
fix (farming): prevent duplicate game entries
docs (readme): update installation instructions
refactor (config): simplify JSON parsing logic
chore (deps): update SteamKit2 to 3.5.0
```

### Scope (optional but recommended)
- `auth` - Authentication/login logic
- `farming` - Game farming functionality
- `config` - Configuration handling
- `reconnect` - Connection/reconnection logic
- `targets` - Target hour tracking

## Pull Request Process

1. Update README.md if you're adding features
2. Update CHANGELOG.md (if it exists) with your changes
3. Test on at least one platform
4. Use conventional commit format for PR title
5. Describe what changed and why in PR description
6. Link related issues if applicable

### PR Title Format
```
<type>(<scope>): <description>
```

Example:
```
feat(auth): add shared secret support for auto-2FA
```

## What to Contribute

### Good First Issues
- Documentation improvements
- Error message clarity
- Config validation
- Additional platform support

### Feature Ideas
- Shared secret auto-2FA
- Web UI for config management
- Playtime statistics/logging
- Game library auto-discovery

### Bug Reports
If you find a bug, open an issue with:
- Steps to reproduce
- Expected vs actual behavior
- Platform/OS
- Logs (sanitize sensitive info)

## Code Review

All PRs need review before merging. Expect feedback on:
- Code quality and maintainability
- Performance implications
- Breaking changes
- Security concerns

Be open to feedback and ready to make changes.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Open an issue or reach out via GitHub Discussions.
