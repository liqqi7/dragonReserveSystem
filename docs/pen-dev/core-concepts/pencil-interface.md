# pen.dev Interface

> 来源：https://docs.pen.dev/core-concepts/pencil-interface（镜像于 2026-10-05，仅供项目内部参考）

# pen.dev Interface

## Infinite Canvas[#infinite-canvas](#infinite-canvas)

The canvas gives you an unlimited workspace to freely explore and develop your designs. It builds on principles you already know from professional design tools, so it should feel familiar right away.

With a mouse, hold Space and drag to pan. Hold Cmd/Ctrl while scrolling to
zoom. On a trackpad, use two fingers to pan and pinch to zoom.

### Navigation Shortcuts[#navigation-shortcuts](#navigation-shortcuts)

Keyboard shortcuts can save you a lot of time. You can find the [full list here](https://docs.pen.dev/core-concepts/keyboard-shortcuts), or open it anytime in the app by clicking the keyboard icon in the toolbar.

- **Spacebar + Drag** - Pan canvas
- **Shift + Scroll** - Horizontal pan
- **Cmd/Ctrl + 0** - Zoom to 100%
- **Shift + 1** - Zoom to fit all elements
- **Shift + 2** - Zoom to selection

## Frames[#frames](#frames)

Frames are containers for your designs.

- Group related elements
- Define screen boundaries
- **Cmd/Ctrl + Option/Alt + G** - Wrap a selection in a frame

Use **Cmd/Ctrl + G** to keep selected elements together as a group. A frame’s
**Clip Content** checkbox hides content outside its bounds. If a child disappears
at the frame’s edge, clear **Clip Content** or enlarge the frame.

### Flex layout[#flex-layout](#flex-layout)

Select a frame or several elements and press **Shift + A** to add flex layout.
In the properties panel, choose **Horizontal** or **Vertical**, then set
**Gap** between children and **Padding** inside the frame.

Use the layout’s **Alignment** grid to position children inside the frame.
Choose **Space Between** to distribute extra space between children, or
**Space Around** to include space at the ends as well.

- Enter **W** and **H** values for fixed dimensions
- Use **Hug Width** or **Hug Height** to size a flex frame around its children
- Use **Fill Width** or **Fill Height** on a child to use space in its parent’s flex layout

For example, put two buttons in a horizontal frame with a fixed width, set
**Gap** to `12`, and enable **Fill Width** on both buttons. They share the
available width. Enable **Hug Height** on the frame to size it around them.

If a child stretches unexpectedly, check its **Fill Width** and **Fill Height**
settings. If a frame collapses, give it a fixed dimension or a child that does
not fill that dimension. A frame cannot hug children that all depend on it for
their size.

Enable **Absolute Position** on a child to position it independently of the
flex layout. Use **Shift + Option/Alt + A** to remove flex layout.

### Selection & Highlighting[#selection--highlighting](#selection--highlighting)

Click and drag to select elements on the canvas. Selected elements are highlighted with colored bounding boxes that indicate their type.

**Blue** bounding boxes appear around regular elements like frames, shapes, and text.

**Magenta and violet** bounding boxes appear around reusable components.

- Magenta marks the component source, and source changes apply unless an
  instance overrides that property
- Violet marks instances of components

### Selection Shortcuts[#selection-shortcuts](#selection-shortcuts)

- **Click** - Select element
- **Cmd/Ctrl + Click** - Direct select (deepest element)
- **Cmd/Ctrl + Drag** - Box-select nested elements
- **Shift + Click** - Add to selection
- **Cmd/Ctrl + A** - Select all
- **Enter** - Select children of a selected container
- **Shift + Enter** - Select the parent

If you keep selecting the container instead of its contents, use
**Cmd/Ctrl + Click** to select the nested element directly.

## Layers Panel[#layers-panel](#layers-panel)

The layers panel sits on the left side of the screen and lists every element on the canvas. It gives you a clear view of your design hierarchy, making it easy to browse, edit, and organize elements in complex nested structures.

- Rename a layer by double-clicking it in the panel
- Click the “Layers” icon to toggle the panel
- Drag a layer in the list to change its order or move it into another container
- Use the eye icon beside a layer to hide or show it

If an instance blocks a layer move, edit the component source to change its
structure across instances. To reorganize only that instance, [detach
it](https://docs.pen.dev/core-concepts/keyboard-shortcuts#components) first. A detached instance
no longer receives changes from its source.

## Properties Panel[#properties-panel](#properties-panel)

The properties panel appears on the right side of the screen when you select one or more elements on the canvas. It lets you view and edit properties like alignment, layout, appearance, fill, stroke, effects, and more.

- Export selections as PNG, JPEG, WEBP, and PDF
- Click the icon in the top right corner to minimize it

For elements outside flex layout, use **Alignment** to align a selection’s
edges or centers. For children in flex layout, use the parent frame’s layout
controls instead. See [Arrange shortcuts](https://docs.pen.dev/core-concepts/keyboard-shortcuts#arrange).

For drawing tools, text, icons, and appearance controls, see
[Drawing and editing](https://docs.pen.dev/core-concepts/drawing-and-editing).

## Settings[#settings](#settings)

Open **Settings (⚙️) → General** to change pixel grid visibility and snapping.
**Snap to pixel grid** rounds positions and dimensions when you move or resize
elements. **Snap to objects** controls
snapping to other elements.

Enable **Use scroll wheel to zoom** to zoom with the wheel instead of panning.
Use **Invert zoom direction** to reverse the zoom direction.

Under **Custom nudge amount**, set **Small nudge** for arrow keys and
**Big nudge** for **Shift + Arrow keys**. The defaults are 1px and 10px.
These amounts also apply to selected path points.

Turn off **Animations & effects (turn off to save GPU/CPU)** to reduce interface
animation and GPU use. These editor preferences take effect without restarting
and are saved locally by the desktop app or IDE extension, outside the `.pen`
document.

For agent setup, see [AI Integration](https://docs.pen.dev/getting-started/ai-integration).
HTML export options are under **Code export settings** in the properties
panel’s **Code** section. See [Design to Code](https://docs.pen.dev/core-concepts/import-and-export#design-to-code).

**General** also contains the **Light Mode** and **Dark Mode** options.

## AI Chat[#ai-chat](#ai-chat)

pen.dev’s AI chat is the interface for vibe-designing. You can ask it to design something from scratch or edit existing designs on the canvas.

The chat panel is built into the desktop app. When using the pen.dev extension in your IDE, use your IDE’s built-in chat to work with the AI agent instead.

- Any selections you make on the canvas are automatically added to the context
- Click **New agent** to start a separate conversation

See [AI agents and Skills](https://docs.pen.dev/core-concepts/ai-agents) for sessions, attachments, skills,
permissions, and design variants.

## Undo / Redo[#undo--redo](#undo--redo)

- Use Cmd + Z (Ctrl + Z) to undo changes
- Use Cmd + Shift + Z (Ctrl + Shift + Z) to redo changes

Focus the canvas before using these shortcuts. When a text field or chat input
has focus, the shortcut can apply to that input instead.

**Best Practices:**

- For an existing file in the pen.dev desktop app, use `Cmd/Ctrl + S` to save
  changes to the original `.pen` file
- Documents created from the desktop dashboard are saved automatically
- Use Git history to revert if needed
