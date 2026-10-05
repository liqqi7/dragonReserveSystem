# Build a small design system

> 来源：https://docs.pen.dev/core-concepts/build-a-design-system（镜像于 2026-10-05，仅供项目内部参考）

# Build a small design system

Build a Button and Card library in the desktop app, then use it in a second
document with light and dark themes.

[Download the example files](https://docs.pen.dev/examples/design-system.zip) to inspect the
finished library and design. Extract both files into the same folder.

## Define the variables[#define-the-variables](#define-the-variables)

Create a new file and save it as `starter.pen` in an empty folder. Open
**Variables** in the toolbar and add these variables:

| Name | Type | Value |
| --- | --- | --- |
| `surface` | Color | `#FFFFFF` |
| `ink` | Color | `#18181B` |
| `accent` | Color | `#2563EB` |
| `space` | Number | `16` |
| `font-body` | String | `Inter` |
| `font-size` | Number | `16` |

Use **+** beside the column headings to add a theme value. Rename the columns
**Light** and **Dark**. Set `surface` to `#18181B` and `ink` to `#FAFAFA` in
**Dark**. Keep the other values the same in both columns.

## Create the components[#create-the-components](#create-the-components)

1. Create a frame named **Button**, 144 pixels wide and 48 pixels tall
2. Add a text layer named **Label** with the text **Continue** and a white fill
3. Set the frame’s flex alignment to center the label horizontally and vertically
4. Apply `accent` to the frame’s fill, and `font-body` and `font-size` to the label
5. Select the frame and click **Create Component**

Create a second frame named **Card**, 360 pixels wide, with vertical flex
layout and **Hug Height**. Apply `surface` to its fill and `space` to its gap
and padding. Add two text layers:

- **Title**: **Your next step**, using Inter at 24 pixels and `ink` for its fill
- **Detail**: **Choose an action below.**, using `font-body`, `font-size`, and `ink`

Turn **Card** into a component. Add an empty frame named **Actions** inside it,
48 pixels tall with **Fill Width**. Select **Actions**, click **Make slot**,
and use **+** beside **Slot** to suggest **Button**.

Save the file. Open **Libraries** and choose **Turn this file into a library**.
The resulting file is `starter.lib.pen`.

## Use the library[#use-the-library](#use-the-library)

1. Create a second document and save it as `consumer.pen` in the same folder
2. Open **Libraries**, click **+** beside **No imported libraries**, and select `starter.lib.pen`
3. Open **Components** and click **Card** to insert an instance
4. Select its **Actions** slot and click **Button** under **Slot** in the properties panel
5. Change the instance’s **Title** to **Ready to continue** and its button label to **Save**
6. Copy and paste the Card instance, then select the copy and choose **Theme → Add theme → Theme**, followed by **Dark**

The second Card has a dark background and light text. Both instances keep their
custom text. Save the document.

## Update the source[#update-the-source](#update-the-source)

Open `starter.lib.pen`. In both theme columns, change `accent` to `#7C3AED`
and `font-size` to `18`.
Save it, then close and reopen `consumer.pen`. Both buttons turn purple and
their labels grow. The labels still read **Save** because you overrode their text.

Keep both `.pen` files together when moving this design. If the consumer reports
a missing library, open **Libraries**, click the missing entry, and use
**Locate** to select `starter.lib.pen` in its new location.
Save the consumer after reconnecting the library.

This example uses Inter from the font picker and has no image files. For designs
with imported fonts or images, follow the [copying and resource guidance](https://docs.pen.dev/core-concepts/design-libraries#copying-between-documents).
