# Code Signing Policy

## Project

- **Name:** Radio 247
- **Repository:** https://github.com/Elgato-dark/radio-247
- **License:** MIT

## Code Signing

This project uses free code signing provided by [SignPath Foundation](https://signpath.org/).

All release binaries are signed using Authenticode certificates managed by SignPath.io with keys stored on Hardware Security Modules (HSMs).

## Team Roles

| Role | Member |
|------|--------|
| Author | Reyniel Herrera (@Elgato-dark) |
| Reviewer | Reyniel Herrera (@Elgato-dark) |
| Approver | Reyniel Herrera (@Elgato-dark) |

## Build Process

1. Builds are triggered by pushing a version tag (`v*`) to the repository
2. GitHub Actions compiles the Electron app on `windows-latest`
3. The unsigned installer is submitted to SignPath for code signing
4. The signed installer is published as a GitHub Release

## Verification

All signed artifacts can be verified by checking the Authenticode signature on the `.exe` file:
- Right-click the `.exe` → Properties → Digital Signatures tab

## Privacy

This application connects to `discord.elgatodark.com` to stream radio content. No personal data is collected or transmitted beyond what is required for Discord Rich Presence integration.

---

*Code signing infrastructure provided by [SignPath.io](https://signpath.io/) — free for open-source projects.*
