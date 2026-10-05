# Create your first design

> 来源：https://docs.pen.dev/getting-started/create-your-first-design（镜像于 2026-10-05，仅供项目内部参考）

# Create your first design

Create a shape, change it with an agent, and save your first `.pen` file.

Before you start, [install the desktop app](https://docs.pen.dev/getting-started/installation).
Sign in to pen.dev when prompted.

## Create a shape[#create-a-shape](#create-a-shape)

Select **New File** on the desktop dashboard, then connect an agent:

- **In the desktop app:** [Connect an AI provider](https://docs.pen.dev/getting-started/authentication)
  in **Settings (⚙️) → Agents**, then choose a model in the agent composer
- **From Claude Code or Codex:** [Connect the client](https://docs.pen.dev/getting-started/ai-integration)
  and keep the document open in the desktop app

Send this request in the desktop agent composer or your connected client:

```
In the current document, add a blue
rectangle named First button,
160 pixels wide and 48 pixels tall,
inside the existing frame.
```

The agent uses tools to change the canvas. If it asks for permission, review the
requested action before allowing it.

When the agent finishes, expand **Frame** in **Layers** and select **First
button**. In the properties panel, check that the rectangle is blue, with **W**
set to **160** and **H** set to **48**.

## Change the selection[#change-the-selection](#change-the-selection)

In the desktop app, the selected rectangle appears in the agent composer’s
context. Send this follow-up request to the same agent:

```
Change the selected rectangle's
fill to #16A34A.
Keep its size and position.
```

When the agent finishes, check that the rectangle is green. Click the rectangle
on the canvas before using **Edit → Undo** to undo the change. Use **Edit →
Redo** to restore it. An agent request can make several changes, so undo each
change you want to reverse.

## Save your file[#save-your-file](#save-your-file)

New desktop documents save automatically as drafts. To keep this design in a
folder of your choice, select **File → Save As…** and save it as
`first-design.pen`.

After further edits, use **Cmd/Ctrl + S** to save changes to that file. See
[.pen Files](https://docs.pen.dev/core-concepts/pen-files) for saving and recovery behavior.

## If the agent cannot start[#if-the-agent-cannot-start](#if-the-agent-cannot-start)

If the desktop model picker has no model or the integrated agent reports an
authentication error, check your provider in **Settings (⚙️) → Agents**. Follow the
[provider troubleshooting steps](https://docs.pen.dev/getting-started/authentication), then retry
the request.

If your external client cannot connect, follow the
[MCP troubleshooting steps](https://docs.pen.dev/getting-started/ai-integration#the-external-client-cannot-connect).

See the [pen.dev Interface](https://docs.pen.dev/core-concepts/pencil-interface) for more ways to
select and edit your design.
