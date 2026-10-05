# Import and Export

> 来源：https://docs.pen.dev/core-concepts/import-and-export（镜像于 2026-10-05，仅供项目内部参考）

# Import & Export

## Import[#import](#import)

### Complete Figma Files[#complete-figma-files](#complete-figma-files)

- **Toolbar** — Click the chevron below the Rectangle icon in the toolbar and select `Import Figma`
- **File menu (Desktop app only)** — Go to `File` > `Import Image/SVG/Figma...` and select a Figma file.

### Individual Figma Layers[#individual-figma-layers](#individual-figma-layers)

- **Copy and paste** — Select and copy individual elements in Figma and paste them onto the pen.dev canvas.

Copying and pasting image elements is not supported. Either import the complete Figma file or add images manually.

### Images[#images](#images)

- **Drag and drop** — Drag an image from your computer onto the pen.dev canvas.
- **Copy and paste** — Copy an image to your clipboard and paste it onto the pen.dev canvas.
- **Toolbar** — Click the chevron below the Rectangle icon in the toolbar and select `Import Image or SVG...`
- **File menu (Desktop app only)** — Go to `File` > `Import Image/SVG/Figma...` and select an image.

Supported image formats: PNG, JPEG, and SVG.

SVG files become editable canvas layers. PNG and JPEG files become image layers.
See [Edit images](https://docs.pen.dev/core-concepts/drawing-and-editing#edit-images) to remove a
background or convert an image to editable vectors.

### Web pages (desktop app)[#web-pages-desktop-app](#web-pages-desktop-app)

Use the built-in browser to import a web page or an individual element as
editable layers.

1. Click the globe icon in the top bar to open the built-in browser
2. Enter the page’s URL, including a localhost URL for a local development server
3. To import one element, click **Select an element** and select it in the page
4. Click **Import** to add the page or selected element to the canvas

Use **Zoom and device settings** to choose the page’s preview size before
importing. Check the imported layout, fonts, and effects against the page.
Imported layers do not retain the page’s JavaScript interactions.

For an image instead of editable layers, use **Screenshot**. With an element
selected, it captures that element. Otherwise, choose **Full Page** or
**Visible Area**. Check for private content before importing a signed-in page.

A connected desktop agent can also import a page or capture it with the
[`browser` MCP tool](https://docs.pen.dev/getting-started/ai-integration#mcp-tools).

### Icons[#icons](#icons)

- pen.dev includes the following built-in icon libraries: Material Symbols (Outlined, Rounded, Sharp), Lucide Icons, Feather, and Phosphor.
- You can also import your own SVG icons the same way as individual images.

## Export[#export](#export)

### Design to Code[#design-to-code](#design-to-code)

- In the desktop app, press `Cmd/Ctrl + K` to open the AI chat and ask it to generate code from your design. In an IDE, use the IDE’s agent chat.

For HTML export, select the elements and use the properties panel’s **Code**
section. Choose **HTML + Tailwind** or **HTML + CSS**, then **Copy HTML** or
**Export HTML**. Open **Code export settings** to choose how assets are included
and whether to **Include HTML scaffold** for a complete HTML document.

### Individual Elements[#individual-elements](#individual-elements)

You can export one or more elements from pen.dev as PNG, JPEG, WEBP, or PDF.

1. Select the elements you want to export.
2. At the bottom of the properties panel, choose the format and a **1x**, **2x**, or **3x** scale for raster images
3. Click **Export layer**, pick a location, and click **Save**.

![Export section with scale, format, and the Export layer button outlined](https://docs.pen.dev/_next/image?url=%2F_next%2Fstatic%2Fimmutable%2Fmedia%2Fexport.1680ykuj_s6_8.png&w=1080&q=75)

Multiple raster selections produce an `export.zip` with one image per layer.
PDF exports put each selected layer on a separate page, in selection order.
For a presentation in slide order, use [Slides and presentations](https://docs.pen.dev/core-concepts/presentations).

Right-click a selection and choose **Copy as → Copy as PNG** to copy an image to the
clipboard. For command-line exports, see the [CLI guide](https://docs.pen.dev/for-developers/pen-cli).
