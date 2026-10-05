# .pen Files

> 来源：https://docs.pen.dev/core-concepts/pen-files（镜像于 2026-10-05，仅供项目内部参考）

# .pen Files

Looking to inspect the format programmatically? See the [developer
documentation](https://docs.pen.dev/for-developers/the-pen-format). Use pen.dev, the CLI or the
MCP tools to modify `.pen` files instead of editing the JSON directly.

## What are `.pen` files?[#what-are-pen-files](#what-are-pen-files)

`.pen` files are pen.dev’s design file format:

- **JSON-based** - Structured, readable data
- **Version-control friendly** - Works with Git like a code file
- **Portable** - Share files across teams and platforms

## Working with `.pen` files[#working-with-pen-files](#working-with-pen-files)

**Creating:**

- In an IDE, create a file with a `.pen` extension
- In the desktop app, select **File → New File** or press
  `Cmd/Ctrl + Shift + N`

**Opening:**

- Open a `.pen` file in the desktop app
- Open it in a supported IDE with the pen.dev extension installed

**Saving:**

- In an IDE, use the normal save command
- In the desktop app, use `Cmd/Ctrl + S` to save an existing file
- Documents created from the desktop dashboard are saved automatically
- To save a desktop draft in your project folder, use **File → Save As…**
  (`Cmd/Ctrl + Shift + S`), then choose a name and location
- Use Git commits for version history

## Desktop dashboard[#desktop-dashboard](#desktop-dashboard)

Open **File → Dashboard** or press `Cmd/Ctrl + N` in the desktop app.

- **Recents** lists files and drafts you have opened
- **Drafts** lists documents that pen.dev manages and saves automatically
- **Design Systems** opens the bundled [design libraries](https://docs.pen.dev/core-concepts/design-libraries)

Use **New File** to create a draft or **Open File** to open a `.pen` file.
You can also drag a `.pen` file onto the dashboard. Opening a document that is
already open focuses its existing window.

Switch to **List view** to sort by **Name**, **Last Used**, or **Created**.
**Grid view** shows document previews. Hold `Cmd/Ctrl` while clicking to select
multiple documents.

Right-click a document for its actions. **Remove from Recents** removes the
entry from that list and keeps the document. **Delete Draft** permanently deletes
the draft and cannot be undone. Use **Save As…** before deleting a draft you
want to keep.

## Recovering desktop changes[#recovering-desktop-changes](#recovering-desktop-changes)

The desktop app writes unsaved changes for an existing file to a separate
recovery backup. If pen.dev stops unexpectedly, reopen the file and review the
recovered changes before saving them to the original file.

If the document shows **Recovered changes**, inspect the canvas. Use **Save** to
keep the recovered work in the original file, or **Save As…** to keep it separately.
The close dialog’s **Don’t Save and Discard Backup** option deletes the recovery
backup. Use **Cancel** to return to the document if you still need to inspect it.

The recovery backup is not version history and does not replace Git.

## IDE and CLI saving[#ide-and-cli-saving](#ide-and-cli-saving)

In VS Code and Cursor, the IDE manages saving and backups for the custom editor.
Use `Cmd/Ctrl + S` to write changes to the file. When the IDE restores an
unsaved editor from a backup, review the restored design before saving.

If the IDE reports that the file’s contents have changed, **Reload** loads the
version on disk. Choose **Ignore** and use **Save As…** to save a separate copy
first if you need to preserve the design currently open in the editor.

For CLI edits, use `--in` for the source and `--out` for a separate output file
when you want to preserve the source. See the [CLI guide](https://docs.pen.dev/for-developers/pen-cli).

## Working with Git[#working-with-git](#working-with-git)

Save and close a `.pen` file before switching branches or pulling changes that
affect it. Keep referenced images, custom fonts, and library files at their
relative paths in the repository so others can open the design with its assets.

If Git reports a conflict, preserve both versions before resolving it. Choose
one version as the starting point and reapply the other design changes in
pen.dev. Do not resolve a design conflict by editing the JSON directly. Open
the resulting file and inspect the affected frames before committing.

**Best Practices:**

- Keep `.pen` files in your project workspace alongside the code
- Use descriptive names such as `dashboard.pen` and `components.pen`
- Commit important changes to Git
