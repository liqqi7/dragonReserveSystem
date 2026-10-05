# Troubleshooting

> 来源：https://docs.pen.dev/troubleshooting（镜像于 2026-10-05，仅供项目内部参考）

# Troubleshooting

---

## Installation & Setup[#installation--setup](#installation--setup)

### A `.pen` file opens as text[#a-pen-file-opens-as-text](#a-pen-file-opens-as-text)

1. Confirm the **pen.dev** extension is installed and enabled
2. Open the Command Palette and run **pen.dev: Toggle Design Mode**
3. Run **pen.dev: New File** to confirm the visual editor can create and open a document
4. Reload the IDE window if the pen.dev commands are missing

### Don’t see the pen.dev icon[#dont-see-the-pendev-icon](#dont-see-the-pendev-icon)

1. Confirm the extension is enabled
2. Look for **pen.dev** in the Activity Bar
3. Open the Command Palette and search for **pen.dev**
4. Reload the IDE window if the extension is enabled but its commands and icon are missing

### The `pen` command is not found[#the-pen-command-is-not-found](#the-pen-command-is-not-found)

1. Confirm Node.js is version 22.19 or later
2. Install the current package with `npm install -g @pen.dev/cli`
3. Confirm npm’s global binary directory is on `PATH`
4. Run `pen version`, not `pen --version`

See [Installation](https://docs.pen.dev/getting-started/installation) for installation options.

---

## Authentication & AI Providers[#authentication--ai-providers](#authentication--ai-providers)

### Not receiving a sign-in email[#not-receiving-a-sign-in-email](#not-receiving-a-sign-in-email)

1. Check the spam or junk folder
2. Confirm the email address and use **Resend code** after the cooldown

### An AI provider is not connected[#an-ai-provider-is-not-connected](#an-ai-provider-is-not-connected)

Open **Settings (⚙️) → Agents**, choose the provider, and use one of the authentication methods shown for that provider.

If you selected **Your Claude Code settings**, run `claude` in a terminal and complete authentication.

See [Authentication](https://docs.pen.dev/getting-started/authentication) for account and provider setup.

---

## Welcome File & Onboarding[#welcome-file--onboarding](#welcome-file--onboarding)

### Didn’t get the welcome file[#didnt-get-the-welcome-file](#didnt-get-the-welcome-file)

Open the Command Palette and run **pen.dev: Open Welcome File**. You can also select **Welcome** from the pen.dev sidebar.

### Add pen.dev to a project[#add-pendev-to-a-project](#add-pendev-to-a-project)

1. Create a file such as `design.pen` in the project workspace
2. Open it in VS Code or Cursor

---

## Canvas & Interface[#canvas--interface](#canvas--interface)

### Can’t navigate nested elements[#cant-navigate-nested-elements](#cant-navigate-nested-elements)

**Use keyboard shortcuts:**

- `Cmd/Ctrl + Click`: Deep select
- `Enter`: Select children
- `Shift + Enter`: Select parent

**Or use the Layers panel:**

- Expand the hierarchy
- Select an element from the list

### Selection box colors[#selection-box-colors](#selection-box-colors)

- **Light blue**: Standard element
- **Magenta**: Component origin
- **Purple**: Component instance

---

## Importing & Exporting[#importing--exporting](#importing--exporting)

### Images don’t paste from Figma[#images-dont-paste-from-figma](#images-dont-paste-from-figma)

Images are not included when you copy and paste from Figma. For a full import with images, export a local `.fig` file from Figma and drag it onto the pen.dev canvas.

---

## MCP & AI Integration[#mcp--ai-integration](#mcp--ai-integration)

### An external agent does not list pen.dev tools[#an-external-agent-does-not-list-pendev-tools](#an-external-agent-does-not-list-pendev-tools)

The pen.dev MCP server runs locally.

1. Confirm the target pen.dev app is running and the intended document is open
2. Open **Settings (⚙️) → MCP** and confirm the integration is enabled for the external client
3. Restart or reconnect the external client after changing its MCP configuration

See [AI Integration](https://docs.pen.dev/getting-started/ai-integration) for setup details.

### A tool is present but a call fails[#a-tool-is-present-but-a-call-fails](#a-tool-is-present-but-a-call-fails)

Ask the connected agent to run `read_skill()` and inspect the document with `get_app_state()` before retrying the failed call.

Advanced users can call these tools directly from `pen interactive`.

### pen.dev changed an MCP configuration file[#pendev-changed-an-mcp-configuration-file](#pendev-changed-an-mcp-configuration-file)

Enabling an integration in **Settings (⚙️) → MCP** adds or updates the `pencil` entry in that client’s MCP configuration. Disable the integration to remove the entry.

---

## Saving & Version Control[#saving--version-control](#saving--version-control)

### Desktop changes are visible but the original file has not changed[#desktop-changes-are-visible-but-the-original-file-has-not-changed](#desktop-changes-are-visible-but-the-original-file-has-not-changed)

For an existing `.pen` file, the pen.dev desktop app writes a separate recovery backup in the background. The original file changes only after **File → Save** or `Cmd/Ctrl + S` succeeds.

Documents created from the desktop dashboard are saved automatically.

### pen.dev reopened a file with “Recovered changes”[#pendev-reopened-a-file-with-recovered-changes](#pendev-reopened-a-file-with-recovered-changes)

pen.dev found a newer recovery backup after an unexpected stop. Review the restored document, then save it to write those changes to the original `.pen` file.

The recovery backup is not version history and does not replace Git.

---

## Platform-Specific[#platform-specific](#platform-specific)

### Windows desktop app[#windows-desktop-app](#windows-desktop-app)

The pen.dev desktop app is available for Windows. See [Installation](https://docs.pen.dev/getting-started/installation) for the current download.

### Linux desktop app[#linux-desktop-app](#linux-desktop-app)

The pen.dev desktop app is available for Linux. See [Installation](https://docs.pen.dev/getting-started/installation) for the available packages.

---

## CLI Issues[#cli-issues](#cli-issues)

### Authentication required[#authentication-required](#authentication-required)

Run `pen login` or set `PEN_CLI_KEY`. Agent, export, and interactive commands require CLI authentication.

### A command fails[#a-command-fails](#a-command-fails)

- Run `pen --help` or `pen interactive --help` from the installed CLI
- Check the process exit status and confirm the expected output file was created before using it
- In the interactive shell, call `save()` before `exit()` to write changes

See the [pen.dev CLI reference](https://docs.pen.dev/for-developers/pen-cli) for current commands and options.

---

## Getting More Help[#getting-more-help](#getting-more-help)

### Review the relevant documentation[#review-the-relevant-documentation](#review-the-relevant-documentation)

- [Installation](https://docs.pen.dev/getting-started/installation)
- [Authentication](https://docs.pen.dev/getting-started/authentication)
- [AI Integration](https://docs.pen.dev/getting-started/ai-integration)
- [pen.dev CLI](https://docs.pen.dev/for-developers/pen-cli)

### Report a reproducible problem[#report-a-reproducible-problem](#report-a-reproducible-problem)

Include:

- Operating system and version
- pen.dev app and exact version
- IDE and extension version, when applicable
- CLI command with secrets removed, when applicable
- Selected AI provider and authentication method, without credentials
- Exact error message
- Steps to reproduce
- A minimal non-sensitive `.pen` file, screenshot, or log excerpt when useful

Never include passwords, session tokens, API keys, verification codes, or private design content in a public report.

---

## Prevention Tips[#prevention-tips](#prevention-tips)

1. Keep pen.dev and the IDE extension up to date
2. Keep the selected AI provider authenticated when using AI features
3. Keep `.pen` files in the project workspace when using the IDE extension
4. Save existing files with `Cmd/Ctrl + S`
5. Use Git commits for version history
6. Do not edit `.pen` files manually
