# AI Integration

> 来源：https://docs.pen.dev/getting-started/ai-integration（镜像于 2026-10-05，仅供项目内部参考）

# AI Integration

Agents can work with pen.dev in two ways:

1. Use an **integrated agent** from the desktop app
2. Connect an **external MCP client** to a running pen.dev desktop or IDE host

## Use an integrated agent[#use-an-integrated-agent](#use-an-integrated-agent)

Open or create a `.pen` document in the desktop app. Choose a model, then
enter a request in the agent composer.

See [Authentication](https://docs.pen.dev/getting-started/authentication) for account and provider
setup and [AI agents and Skills](https://docs.pen.dev/core-concepts/ai-agents) for sessions, context, skills,
and design variants in the desktop app.

## Connect an external MCP client[#connect-an-external-mcp-client](#connect-an-external-mcp-client)

1. Install the pen.dev desktop app or IDE extension
2. Open the `.pen` document the agent should use
3. Enable the client in **Settings (⚙️) → MCP**
4. Start or reload the external client
5. Confirm that `pencil` appears in the client’s MCP server list

See [Installation](https://docs.pen.dev/getting-started/installation#connect-an-ai-client-with-mcp)
for Claude Code, ChatGPT and Codex setup.

Continue with [Create your first design](https://docs.pen.dev/getting-started/create-your-first-design)
to try your connected agent.

## MCP tools[#mcp-tools](#mcp-tools)

The public server registers these top-level tools:

| Tool | Availability |
| --- | --- |
| `get_style` | Standard |
| `read_skill` | Standard |
| `get_app_state` | Standard |
| `execute` | Standard |
| `browser` | When the MCP server targets the desktop app |
| `spawn_agents` | Only when the MCP server starts with `-enable_spawn_agents` |

Check the client’s live tool list for the tools in your installed version.

The external client communicates with the MCP server over stdio. The server
connects to the running pen.dev app through a local Unix socket on macOS/Linux
or a named pipe on Windows.

## Troubleshooting[#troubleshooting](#troubleshooting)

### The integrated agent has no model[#the-integrated-agent-has-no-model](#the-integrated-agent-has-no-model)

Open **Settings (⚙️) → Agents** and check the selected provider.

### The external client cannot connect[#the-external-client-cannot-connect](#the-external-client-cannot-connect)

- Confirm pen.dev is running and a `.pen` document is open
- Reload the client after changing its MCP configuration

For missing tools, failed calls, or configuration changes, see [MCP troubleshooting](https://docs.pen.dev/troubleshooting#mcp--ai-integration).

### A documented tool is missing[#a-documented-tool-is-missing](#a-documented-tool-is-missing)

Inspect the live tool list. `browser` and `spawn_agents` are conditional.

### An agent is using the wrong document[#an-agent-is-using-the-wrong-document](#an-agent-is-using-the-wrong-document)

Open the intended `.pen` file and include its full path in your prompt. Ask the
agent to check `get_app_state()` and confirm the active document before editing.
