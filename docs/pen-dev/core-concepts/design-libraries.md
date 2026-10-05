# Design Libraries

> 来源：https://docs.pen.dev/core-concepts/design-libraries（镜像于 2026-10-05，仅供项目内部参考）

# Design Libraries

Design libraries contain reusable components and variables that you can import into other .pen files.

Saved changes to a library’s components and variables load in documents that import it when you reopen them. Instance overrides still take precedence.

## Create a Design Library[#create-a-design-library](#create-a-design-library)

1. Create and save a new .pen file
2. Populate it with components
3. Open the **Libraries** tab in the left sidebar, then click **Turn this file into a library** at the bottom

Design library files use the `.lib.pen` suffix.

Once a file is marked as a design library, it cannot be undone.

## Import a Library Into a File[#import-a-library-into-a-file](#import-a-library-into-a-file)

1. Open the **Libraries** tab in the left sidebar
2. Select the library you want to import to this file — you can also choose from the default libraries

To browse for a `.lib.pen` file, click **+** beside **Imported Libraries**
(**No imported libraries** in an empty list).

## Use Design Library Assets[#use-design-library-assets](#use-design-library-assets)

1. Open the **Components** tab in the left sidebar
2. Scroll through the grid to find your desired asset or search it by name
3. Drag and drop or click it to place it onto the canvas

## Copying between documents[#copying-between-documents](#copying-between-documents)

When you copy a component origin from a `.lib.pen` file into a document that has
not imported it, pen.dev asks whether to import the library. Choose **Yes, import**
to preserve the link, or **No, paste verbatim copies** for independent copies.

Pasting from an ordinary `.pen` file copies the design without a link to the
source document. Referenced variables and their themes travel with the copied
content. If **Variable conflicts** appears, choose **Use existing** to use the
destination’s value, or **Add renamed** to keep the incoming value as a separate
variable, then click **Paste**.

Copying a layer does not install its custom fonts in the destination document.
Import missing fonts through [Custom Fonts](https://docs.pen.dev/core-concepts/drawing-and-editing#text-and-fonts).
Keep referenced image files available too. Check text wrapping and image fills
after moving a design.
