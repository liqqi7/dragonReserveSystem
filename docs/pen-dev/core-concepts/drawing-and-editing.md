# Drawing and editing

> 来源：https://docs.pen.dev/core-concepts/drawing-and-editing（镜像于 2026-10-05，仅供项目内部参考）

# Drawing and editing

Use the canvas toolbar to draw shapes, paths, and text. Select an element to
edit its dimensions and appearance in the properties panel.

## Shapes[#shapes](#shapes)

Press **R** for a rectangle or **O** for an ellipse, then drag on the canvas.
The **Primitives** menu also contains **Polygon** and **Icon**. Press **V** to
return to the Move tool.

Use **W** and **H** in the properties panel for exact dimensions. Rectangles
and frames have corner-radius controls under **Appearance**.

To arrange elements in a container, see
[Frames and flex layout](https://docs.pen.dev/core-concepts/pencil-interface#frames).

## Scale[#scale](#scale)

Use Scale to resize a selection and its contents together, including text,
strokes, corners, spacing, and effects.

1. Select the elements and press **K**
2. In **Scale**, choose the point to keep in place with the anchor grid
3. Enter a factor such as `2` or `200%` to double the size
4. Press **Enter** to apply and return to the Move tool

![Scale controls with width, height, scale factor, and anchor point outlined](https://docs.pen.dev/_next/image?url=%2F_next%2Fstatic%2Fimmutable%2Fmedia%2Fscale.3japor_5vk16-.png&w=1080&q=75)

You can also drag a corner handle, or enter **W** or **H** under **Scale**.
Both dimensions change proportionally. Press **V** to return to Move.

Scaling replaces affected variable values with fixed values and creates
overrides in component instances. If the selection uses **Fill Width** or
**Fill Height**, scaling fixes that dimension.

## Paths[#paths](#paths)

1. Press **P** to use the Pen tool
2. Click to add points, or drag as you add a point to create a curve
3. Click the first point to close the path, or press **Esc** to finish an open path

Select a shape and press **Enter** to edit its points. Use **Cut** (**X**) to
split a segment. Double-click a point to switch between smooth and corner.
Press **Enter** to finish editing.

For connecting points and adjusting curve handles, see
[Path editing shortcuts](https://docs.pen.dev/core-concepts/keyboard-shortcuts#path-editing).

## Text and fonts[#text-and-fonts](#text-and-fonts)

Press **T**, click the canvas, and type. Double-click existing text to edit it.
Use **Typography** in the properties panel to choose the font, weight, size,
line height, letter spacing, and alignment.

Under **Layout → Resizing**, choose how the text box grows:

- **Auto width** fits the text without wrapping
- **Auto height** wraps at the box’s width and grows vertically
- **Fixed size** keeps both dimensions fixed

If text does not wrap, choose **Auto height** and set **W**. If text extends
beyond a fixed-height box, increase **H** or switch to **Auto height**.

Open the font picker to search available fonts. Use **Add custom fonts**
(**Manage custom fonts** after adding one) to import `.ttf`, `.otf`, `.woff`,
or `.woff2` files. Keep imported font files with the `.pen` file when moving or
sharing the design. Imported fonts are available only in that document.

If **Typography** reports that a font was not found, click the warning to open
**Custom Fonts** and import the missing font, or choose an available font in
the picker. Check the text’s wrapping after replacing a font.

## Icons[#icons](#icons)

Choose **Icon** from **Primitives** and drag on the canvas. In the properties
panel’s **Icon** section, select a library and open the icon picker to search
for a symbol. Use **Fill** to change its color and **W** and **H** to resize it.

## Fill, stroke, and effects[#fill-stroke-and-effects](#fill-stroke-and-effects)

Use the **+** beside **Fill** or **Stroke** to add one, then click its swatch
to edit it. Use the eye control to hide a fill without removing it, or **−**
on its row to remove it. Use **Appearance** to change the element’s opacity.

In the fill editor, choose **Color**, **Gradient**, or **Image**:

- Under **Gradient**, choose **Linear**, **Radial**, **Angular**, or **Mesh**. For a
  linear, radial, or angular gradient, edit the colors and positions under
  **Stops** and drag the handles on the canvas to position the gradient
- For a **Mesh** gradient, choose a **Grid** size, then select and move its
  points on the canvas. Change selected points’ colors in the fill editor
- **Image** accepts an imported image or an image path or URL. Choose **Fill**
  to cover the shape, **Fit** to show the whole image, or **Stretch** to match
  its dimensions

The fill editor’s blend-mode menu controls how that fill combines with the
content beneath it. Under **Stroke**, set the width and choose **Inside**,
**Center**, or **Outside** alignment.

For a shader fill, choose **Shader** and use **Import shader file**, or enter a
shader path or URL. The shader’s editable inputs appear below the file field
after it loads. **Shader Gallery…** opens examples in **Goodies**.

Use **+** beside **Effects** to add **Drop Shadow**, **Inner Shadow**,
**Layer Blur**, or **Background Blur**. Click an effect to adjust its settings.
A drop shadow falls outside the element. An inner shadow falls inside it, over
the fill and beneath the stroke.

## Edit images[#edit-images](#edit-images)

Select an image and click its **Fill** swatch to open the image controls:

- **Remove background** replaces the image fill with a transparent cutout
- **Vectorize image** creates editable vector layers in a separate frame beside
  the design, leaving the original image in place. Select one layer at a time

![Image fill editor with Remove background and Vectorize image outlined](https://docs.pen.dev/_next/image?url=%2F_next%2Fstatic%2Fimmutable%2Fmedia%2Fimage-controls.1w-hl90yac-ag.png&w=1080&q=75)

Ask an agent to replace an image’s background with one you describe.

These actions need an internet connection and a pen.dev sign-in. Wait for the
result before exporting. Use **Cmd/Ctrl + Z** to undo a change.

To save an image of the result, select the elements and choose the format and
scale under **Export**. See [Import and Export](https://docs.pen.dev/core-concepts/import-and-export).
