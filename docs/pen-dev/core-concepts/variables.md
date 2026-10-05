# Variables

> 来源：https://docs.pen.dev/core-concepts/variables（镜像于 2026-10-05，仅供项目内部参考）

# Variables

## What are Variables?[#what-are-variables](#what-are-variables)

Variables in pen.dev work similar to CSS custom properties or design tokens.

You define HEX codes for colors, numbers for spacing, border radii, and sizes, or strings for font names — once. Then you use them throughout your design.

When you change a variable in the variables panel, it updates everywhere it’s used. For variables shared through an imported library, save the source library and reopen the documents that import it to load the changes.

## Creating Variables[#creating-variables](#creating-variables)

- **Manually** — Define variables directly in pen.dev and set values for different themes. Click the **Variables** icon in the toolbar to open the panel.
  Choose **Add variable**, then **Color**, **Number**, **String**, or **Boolean**.
  Enter a name and value in the new row. Use the row menu to rename, duplicate,
  or delete a variable.
- **From CSS** — Attach your `globals.css` and ask the AI agent to create variables from its colors, spacing, and fonts. Review the resulting names and values in the variables panel.
- **From Figma** — Paste a screenshot of the variables table and ask the AI to set them up in pen.dev. You can also simply copy and paste individual token values from Figma.

## Using Variables[#using-variables](#using-variables)

- **Apply to elements** — Instead of hardcoding values, reference variables. When a variable changes, every element using it updates automatically.
  Use **Apply variable** beside a supported property to choose a variable of
  the matching type. Colors work in fills and strokes, numbers in spacing and
  font sizes, strings in font names, and booleans in visibility controls.
- **Theming** — Add a new column in the variables panel to create themes like light and dark mode. Switch between themes in the properties panel to see how your designs adapt.
  Use **+** beside the column headings to add a value such as **Dark**. The
  **+** beside the theme tabs adds a separate theme axis, such as **Device**.
  Rename a column from its menu, then set each variable’s value for that column.
  Select a frame and use **Theme → Add theme** in the properties panel to choose
  an axis, then select its value. Children inherit that choice unless they
  have their own setting for the same axis. **Remove theme** restores inheritance.
  The first value of each axis is the document default.

### Variable aliases[#variable-aliases](#variable-aliases)

A variable can reference another variable of the same type. For example,
`button-fill` can reference `accent`, so changing `accent` also changes the
button color. Use the variable picker in the value cell to create the reference.

If a value looks wrong, check the selected element’s **Theme**, its parents’
theme settings, and the referenced variable’s value in that theme. Define a
value for every theme you use.

See [copying between documents](https://docs.pen.dev/core-concepts/design-libraries#copying-between-documents)
for variable conflicts when pasting.

## Sync with Code[#sync-with-code](#sync-with-code)

You can keep variables in sync between pen.dev and your codebase. Ask the AI assistant to update CSS variables based on your pen.dev file, or import CSS changes back into pen.dev. This enables a two-way design-to-code workflow.
