# The .pen Format

> 来源：https://docs.pen.dev/for-developers/the-pen-format（镜像于 2026-10-05，仅供项目内部参考）

# The .pen Format

pen.dev documents are stored in .pen files. This documentation is for developers who would like to read or write .pen files. Use pen.dev, its MCP tools, or the [CLI](https://docs.pen.dev/for-developers/pen-cli#interactive-mode) to make changes instead of editing serialized IDs and references by hand.

**The following sections provide a birds-eye view of the .pen format. For the authoritative, exhaustive reference of all the supported features, please consult the [TypeScript schema](#typescript-schema) at the end of this page.**

This is a live documentation, and we reserve the right to introduce breaking changes in the .pen format.

The document’s `version` field identifies its schema. Keep the original file before opening it in a different version of pen.dev.

pen.dev converts supported older formats when it opens a document. Saving writes the converted format. If pen.dev reports an unsupported file format, update the app before editing the file.

## Overview[#overview](#overview)

The examples below are JSON excerpts, not complete documents. pen.dev also accepts JSON comments.

- .pen files contain a JSON structure, that describes an *object tree*, not unlike HTML or SVG.
- Each object in the document is a graphical entity on pen.dev’s infinite two-dimensional canvas.
- The objects must have an `id` property that uniquely identifies them within the document, and a `type` field from one of the possible object types (like `rectangle`, `frame`, `text`, [`script`](https://docs.pen.dev/core-concepts/code-on-canvas), etc. – consult the [TypeScript schema](#typescript-schema) for the exhaustive list of supported types).

## Layout[#layout](#layout)

- The top-level objects in a document are placed on an infinite two-dimensional canvas. Use `x` and `y` to position their top-left corner.
- Objects nested under other objects are positioned relative to their parents’ top-left corner.
- A parent object can take over the sizing and positioning of its children using a flexbox-style layout system via properties like `layout`, `justifyContent` and `alignItems`.
- Child objects can choose to fill their parent, or use a fixed `width` and/or `height`.
- Parent objects can choose to fit the size of their children, or use a fixed `width` and/or `height`.

## Graphics[#graphics](#graphics)

- The graphical appearance of objects is controlled by the `fill`, `stroke` and `effect` properties.
- A fill can be a solid `color`, a `gradient` (linear, radial or angular), an `image` or a `mesh_gradient`.
- An object can have multiple fills, which are painted on top of each other the same order they appear in the document.
- An object can have a single stroke, but the stroke can have multiple fills.
- An object can have multiple effects, which are applied in the same order they appear in the document.

## Components and Instances[#components-and-instances](#components-and-instances)

A key difference between pen.dev documents and HTML or SVG is that pen.dev documents allow reusing existing chunks of the object tree at different places. This enables the building of reusable components, that can be used as concise building blocks for more complicated structures.

### Components[#components](#components)

When an object is marked with the property `reusable: true`, it becomes a *reusable component*:

```
{
  "id": "foo",
  "type": "rectangle",
  "reusable": true, // <- this object is now a reusable component
  "x": 0, "y": 0, "width": 100, "height": 100,
  "fill": "#FF0000"
}
```

### Instances[#instances](#instances)

The object type `ref` is used to create an *instance* of such components:

```
{
  "id": "bar",
  "type": "ref",
  "ref": "foo", // <- this object is an instance of the component "foo"
  "x": 120, "y": 0
}
```

Here `foo` is a 100x100 red (`#FF0000`) square, and a reusable component. `bar` is an instance of `foo`, so it is also a 100x100 red square.

### Overrides[#overrides](#overrides)

Instances can override properties from their component definition:

```
{
  "id": "baz",
  "type": "ref",
  "ref": "foo",
  "x": 240, "y": 0,
  "fill": "#0000FF"
}
```

Even though `baz` is an instance of `foo`, it overrides the inherited `fill` property with a different one. So it’s going to be a 100x100 *blue* (`#0000FF`) square!

### Nesting[#nesting](#nesting)

An instance replicates everything under the component root:

```
{
  "id": "round-button",
  "type": "frame",
  "reusable": true,
  "cornerRadius": 9999,
  "children": [
    {
      "id": "label",
      "type": "text",
      "content": "Submit",
      "fill": "#000000"
    }
  ]
}
 
{
  "id": "red-round-button",
  "type": "ref",
  "ref": "round-button",
  "fill": "#FF0000"
}
```

Here `red-round-button` will have an identical `"Submit"` label as `round-button`. But this label, too, can be customized using the `descendants` property:

```
{
  "id": "red-round-button",
  "type": "ref",
  "ref": "round-button",
  "fill": "#FF0000",
  "descendants": {
    "label": { // <- "label" is the `id` of the object under "red-round-button" that we want to customize
      "content": "Cancel",
      "fill": "#FFFFFF"
    }
  }
}
```

Now the red button’s label will be white, and say `"Cancel"`.

Components can be built from instances of other components:

```
{
  "id": "alert",
  "type": "frame",
  "reusable": true,
  "children": [
    {
      "id": "message",
      "type": "text",
      "content": "This is an alert!",
      "fill": "#000000"
    },
    {
      "id": "ok-button",
      "type": "ref",
      "ref": "round-button",
      "descendants": {
        "label": {
          "content": "OK"
        }
      }
    },
    {
      "id": "cancel-button",
      "type": "ref",
      "ref": "round-button",
      "descendants": {
        "label": {
          "content": "Cancel"
        }
      }
    }
  ]
}
```

And children of nested instances can be customized by prefixing their IDs with the containing instance’s ID and a slash in the `descendants` map:

```
{
  "id": "save-alert",
  "type": "ref",
  "ref": "alert",
  "descendants": {
    "message": {
      "content": "You have unsaved changes. Do you want to save them?"
    },
    "ok-button/label": { // <- we're customizing the "label" under "ok-button"
      "content": "Save"
    },
    "cancel-button/label": { // <- we're customizing the "label" under "cancel-button"
      "content": "Discard Changes",
      "fill": "#FF0000"
    }
  }
}
```

In addition to customization, an object inside an instance can be completely replaced with new object:

```
{
  "id": "icon-button",
  "type": "ref",
  "ref": "round-button",
  "reusable": true,
  "descendants": {
    "label": {
      "id": "icon",
      "type": "icon", // <- the presence of the `type` property indicates that this is an object replacement
      "library": "lucide",
      "icon": "check",
      "width": 24, "height": 24,
      "fill": "#000000"
    }
  }
}
```

Alternatively to 1:1 replacement, an object can be kept as is, and we can replace only its `children` with new objects:

```
{
  "id": "sidebar",
  "type": "frame",
  "reusable": true,
  "children": [
    {
      "id": "header",
      "type": "frame",
      "fill": "#FF0000"
    },
    {
      "id": "content",
      "type": "frame",
      "fill": "#00FF00"
    },
    {
      "id": "footer",
      "type": "frame",
      "fill": "#0000FF"
    }
  ]
}
 
{
  "id": "menu-sidebar",
  "type": "ref",
  "ref": "sidebar",
  "descendants": {
    "content": {
      "children": [ // <- the children of "content" are replaced with some "round-button" instances
        {
          "id": "home-button",
          "type": "ref",
          "ref": "round-button",
          "descendants": {
            "label": {
              "content": "Home"
            }
          }
        },
        {
          "id": "settings-button",
          "type": "ref",
          "ref": "round-button",
          "descendants": {
            "label": {
              "content": "Settings"
            }
          }
        },
        {
          "id": "help-button",
          "type": "ref",
          "ref": "round-button",
          "descendants": {
            "label": {
              "content": "Help"
            }
          }
        }
      ]
    }
  }
}
```

This children replacement mechanism is ideal for container-style components, like panels, cards, windows, sidebars, etc.

### Slots[#slots](#slots)

When a frame inside a component is intended to have its children replaced (e.g. the content holder frame inside a panel), it can be marked with the `slot` property:

```
{
  "id": "sidebar",
  "type": "frame",
  "reusable": true,
  "children": [
    {
      "id": "header",
      "type": "frame",
      "fill": "#FF0000"
    },
    {
      "id": "content",
      "type": "frame",
      "fill": "#00FF00",
      "slot": [ // <- "content" is marked as a slot, which is intended to be populated with "round-button" or "icon-button" instances
        "round-button",
        "icon-button"
      ]
    },
    {
      "id": "footer",
      "type": "frame",
      "fill": "#0000FF"
    }
  ]
}
```

pen.dev displays such slots with a special effect, and lets users insert instances of the suggested components (i.e. `round-button` or `icon-button` above) with a single click.

## Variables and Themes[#variables-and-themes](#variables-and-themes)

pen.dev supports extracting commonly used colors and numeric values (padding, corner radius, opacity, etc.) into document-wide variables:

```
{
  "variables": {
    "color.background": {
      "type": "color",
      "value": "#FFFFFF"
    },
    "color.text": {
      "type": "color",
      "value": "#333333"
    },
    "text.title": {
      "type": "number",
      "value": 72
    }
  },
  "children": [
    {
      "id": "landing-page",
      "type": "frame",
      "fill": "$color.background",
      "children": [
        {
          "id": "welcome-label",
          "type": "text",
          "fill": "$color.text",
          "fontSize": "$text.title",
          "content": "Welcome!"
        }
      ]
    }
  ]
}
```

pen.dev also implements a powerful theming system, whereby variables can dynamically change their values depending on the theme configuration of each object:

```
{
  "variables": {
    "color.background": {
      "type": "color",
      "value": [ // <- when a variable has multiple values, the value that wins during evaluation is the _last_ one whose theme is satisfied
        { "value": "#FFFFFF", "theme": { "mode": "light" } },
        { "value": "#000000", "theme": { "mode": "dark" } }
      ]
    },
    "color.text": {
      "type": "color",
      "value": [
        { "value": "#333333", "theme": { "mode": "light" } },
        { "value": "#AAAAAA", "theme": { "mode": "dark" } }
      ]
    },
    "text.title": {
      "type": "number",
      "value": [
        { "value": 72, "theme": { "spacing": "regular" } },
        { "value": 36, "theme": { "spacing": "condensed" } }
      ]
    }
  },
  "themes": { // <- the default value of each theme axis is the first value, so the default theme is { "mode": "light", "spacing": "regular" }
    "mode": ["light", "dark"],
    "spacing": ["regular", "condensed"]
  },
  "children": [
    {
      "id": "landing-page-light",
      "type": "frame",
      "fill": "$color.background", // #FFFFFF
      "children": [
        {
          "id": "welcome-label",
          "type": "text",
          "fill": "$color.text", // #333333
          "fontSize": "$text.title", // 72
          "content": "Welcome!"
        }
      ]
    },
    {
      "id": "landing-page-dark",
      "type": "frame",
      "theme": { "mode": "dark" }, // <- everything under this frame is using "mode": "dark"
      "fill": "$color.background", // #000000
      "children": [
        {
          "id": "welcome-label-dark",
          "type": "text",
          "fill": "$color.text", // #AAAAAA
          "fontSize": "$text.title", // 72
          "content": "Welcome!"
        }
      ]
    },
    {
      "id": "landing-page-dark-condensed",
      "type": "frame",
      "fill": "$color.background", // #000000
      "theme": { "mode": "dark", "spacing": "condensed" }, // <- everything under this frame is using { "mode": "dark", "spacing": "condensed" }
      "children": [
        {
          "id": "welcome-label-condensed",
          "type": "text",
          "fill": "$color.text", // #AAAAAA
          "fontSize": "$text.title", // 36
          "content": "Welcome!"
        }
      ]
    }
  ]
}
```

## TypeScript Schema[#typescript-schema](#typescript-schema)

```
/** Theme axis -> axis value. E.g. { 'device': 'phone' } */
export interface Theme { [key: string]: string; }
/** Dollar-prefixed variable name; binds the property to that variable. */
export type Variable = string;
export type NumberOrVariable = number | Variable;
/** Hex color: #RGB, #RRGGBB, or #RRGGBBAA. */
export type Color = string;
export type ColorOrVariable = Color | Variable;
export type BooleanOrVariable = boolean | Variable;
export type StringOrVariable = string | Variable;
export interface Layout {
  /** Flex layout direction. 'none'=absolutely positioned children. */
  layout?: "none" | "vertical" | "horizontal";
  /** Main-axis gap between children. Default 0. */
  gap?: NumberOrVariable;
  layoutIncludeStroke?: boolean;
  /** Inside padding. */
  padding?: /** all sides */ NumberOrVariable | /** [vertical, horizontal] */ [NumberOrVariable, NumberOrVariable] | /** [top, right, bottom, left] */ [NumberOrVariable, NumberOrVariable, NumberOrVariable, NumberOrVariable];
  /** Main-axis alignment. Default 'start'. */
  justifyContent?: "start" | "center" | "end" | "space_between" | "space_around";
  /** Cross-axis alignment. Default 'start'. */
  alignItems?: "start" | "center" | "end";
}
/** Dynamic layout size:
- fit_content: combined size of children, requires layout on the node (fallback when no children).
- fill_container: parent size, requires layout on the parent (fallback when not in a layout or when using absolute position).
Optional fallback in parens, e.g. 'fit_content(100)'. */
export type SizingBehavior = string;
/** Position relative to parent. X right, Y down. IGNORED when parent uses flex layout. */
export interface Position { x?: number; y?: number; }
export interface Size { width?: NumberOrVariable | SizingBehavior; height?: NumberOrVariable | SizingBehavior; }
/** Affine matrix [a, b, c, d, tx, ty]. */
export type AffineTransform = [number, number, number, number, number, number];
export type BlendMode = 'normal' | 'darken' | 'multiply' | 'linearBurn' | 'colorBurn' | 'light' | 'screen' | 'linearDodge' | 'colorDodge' | 'overlay' | 'softLight' | 'hardLight' | 'difference' | 'exclusion' | 'hue' | 'saturation' | 'color' | 'luminosity';
export type Fill = ColorOrVariable | {
type: "color";
enabled?: BooleanOrVariable;
blendMode?: BlendMode;
/** Fill opacity can only be set via the hex alpha channel. */
color: ColorOrVariable;
} | {
type: "gradient";
enabled?: BooleanOrVariable;
blendMode?: BlendMode;
gradientType?: "linear" | "radial" | "angular";
opacity?: NumberOrVariable;
/** Normalized to bbox. Default 0.5,0.5. */
center?: Position;
/** Normalized to bbox. Default 1,1. Linear: height = gradient length, width ignored. Radial/Angular: ellipse diameters. */
size?: { width?: NumberOrVariable; height?: NumberOrVariable };
/** Degrees CCW (0° up, 90° left, 180° down). */
rotation?: NumberOrVariable;
colors?: { color: ColorOrVariable; position: NumberOrVariable }[];
} | /** Image fill. URL is relative to the .pen file, e.g. `./image.jpg`. */ {
type: "image";
enabled?: BooleanOrVariable;
blendMode?: BlendMode;
opacity?: NumberOrVariable;
url?: string;
/** Default 'cover'. */
mode?: "cover" | "contain" | "stretch";
/** Crops the image. Maps normalized image coordinates (0..1 across its width and height) into the crop's 0..1 box, so [2, 0, 0, 1, -1, 0] is the right half. The mode fits the crop into the shape like a whole image, and cover keeps it inside the image. Defaults to identity, no crop. */
transform?: AffineTransform;
} | /** Shader fill. URL points to a WebGL 1.0 (#version 100) fragment shader file, relative to the .pen file, e.g. `./effect.glsl`. Uniforms are described via `@directive` annotations inside block comments in the shader source. A `vec2` uniform annotated with `@resolution` is auto-bound to the fill size in pixels. Other uniforms' user-set values are stored in `uniforms`. */ {
type: "shader";
enabled?: BooleanOrVariable;
blendMode?: BlendMode;
opacity?: NumberOrVariable;
url: string;
/** Override values for shader uniforms, keyed by uniform name. Uniforms annotated with `@resolution` or `@time` must not appear here. Allowed value shapes: number (float/int), boolean (bool), hex color string like `#RRGGBB[AA]` (color), array of 2-4 numbers (vec2/3/4), or a variable reference `$name` (numeric uniforms accept number variables; color uniforms accept color variables). */
uniforms?: { [key: string]: number | boolean | string | number[] };
} | /** Bezier-interpolated color grid, row-major. Keep edge points at default positions. */ {
type: "mesh_gradient";
enabled?: BooleanOrVariable;
blendMode?: BlendMode;
opacity?: NumberOrVariable;
columns?: number;
rows?: number;
/** Color per vertex. */
colors?: ColorOrVariable[];
/** columns * rows points in [0,1]. */
points?: (/** Auto-generated handles. */ [number, number] | /** Optional bezier handles (relative offsets); omitted = auto. */ { position: [number, number]; leftHandle?: [number, number]; rightHandle?: [number, number]; topHandle?: [number, number]; bottomHandle?: [number, number] })[];
};
export type Fills = Fill | Fill[];
export interface CanHaveStroke {
  stroke?: Fills;
  /** Stroke thickness, uniform or per side. */
  strokeWidth?: NumberOrVariable | { top?: NumberOrVariable; right?: NumberOrVariable; bottom?: NumberOrVariable; left?: NumberOrVariable };
  strokeLinecap?: "butt" | "round" | "square";
  strokeLinejoin?: "miter" | "bevel" | "round";
  strokeAlignment?: "inner" | "center" | "outer";
}
export type Effect = /** Blurs the entire node. */ { enabled?: BooleanOrVariable; type: "blur"; radius?: NumberOrVariable } | /** Blurs the backdrop behind the node. */ { enabled?: BooleanOrVariable; type: "background_blur"; radius?: NumberOrVariable } | /** Inner or outer drop shadow. */ { type: "shadow"; enabled?: BooleanOrVariable; shadowType?: "inner" | "outer"; offset?: { x: NumberOrVariable; y: NumberOrVariable }; blur?: NumberOrVariable; color?: ColorOrVariable; blendMode?: BlendMode };
export type Effects = Effect | Effect[];
export interface CanHaveEffects { effect?: Effects; }
export interface CanHaveGraphics extends CanHaveEffects, CanHaveStroke { fill?: Fills; }
export interface Entity extends Position {
  /** Unique string; MUST NOT contain '/'. Auto-generated if omitted. */
  id: string;
  name?: string;
  context?: string;
  /** When true, can be duplicated via `ref` objects. Default false. */
  reusable?: boolean;
  theme?: Theme;
  enabled?: BooleanOrVariable;
  opacity?: NumberOrVariable;
  flipX?: BooleanOrVariable;
  flipY?: BooleanOrVariable;
  /** Absolute position detaches the object from parent's layout and can be absolute positioned. Default auto */
  layoutPosition?: "auto" | "absolute";
  metadata?: { type: string; [key: string]: any };
  /** Degrees CCW around top-left corner. */
  rotation?: NumberOrVariable;
}
export interface Rectangleish extends Entity, Size, CanHaveGraphics { cornerRadius?: NumberOrVariable | [NumberOrVariable, NumberOrVariable, NumberOrVariable, NumberOrVariable]; }
/** Position is the top-left corner. */
export interface Rectangle extends Rectangleish { type: "rectangle"; }
/** Defined by its bounding rectangle. */
export interface Ellipse extends Entity, Size, CanHaveGraphics {
  type: "ellipse";
  /** Ring inner/outer radius ratio. 0=solid, 1=hollow. Default 0. */
  innerRadius?: NumberOrVariable;
  /** Arc start angle, degrees CCW from right. Default 0. */
  startAngle?: NumberOrVariable;
  /** Arc length from startAngle. Positive=CCW, negative=CW. Range -360..360. Default 360. */
  sweepAngle?: NumberOrVariable;
}
/** Defined by its bounding rectangle. */
export interface Polygon extends Entity, Size, CanHaveGraphics { type: "polygon"; polygonCount?: NumberOrVariable; cornerRadius?: NumberOrVariable; }
export interface Path extends Entity, Size, CanHaveGraphics {
  /** Default 'nonzero'. */
  fillRule?: "nonzero" | "evenodd";
  /** SVG path. */
  geometry?: string;
  /** SVG coord-space [x,y,w,h] mapping onto the node box. Default: tight bbox of geometry. */
  viewBox?: [number, number, number, number];
  type: "path";
}
export interface TextStyle {
  fontFamily?: StringOrVariable;
  fontSize?: NumberOrVariable;
  fontWeight?: StringOrVariable;
  letterSpacing?: NumberOrVariable;
  fontStyle?: StringOrVariable;
  underline?: BooleanOrVariable;
  /** Multiplier of fontSize. Defaults to font's built-in. */
  lineHeight?: NumberOrVariable;
  textAlign?: "left" | "center" | "right" | "justify";
  textAlignVertical?: "top" | "middle" | "bottom";
  strikethrough?: BooleanOrVariable;
  href?: string;
}
export type TextContent = StringOrVariable;
export interface Text extends Entity, Size, CanHaveGraphics, TextStyle {
  type: "text";
  content?: TextContent;
  /** Required before width/height take effect.
'auto': grows to fit; no wrapping.
'fixed-width': width fixed, wraps; height grows.
'fixed-width-height': both fixed; may overflow. */
  textGrowth?: "auto" | "fixed-width" | "fixed-width-height";
}
export interface CanHaveChildren { children?: Child[]; }
/** Container to create hierarchy and layout. default layout=horizontal, width=fit_content, height=fit_content, clip=false. */
export interface Frame extends Rectangleish, CanHaveChildren, Layout {
  type: "frame";
  /** Clip overflow. Default false. */
  clip?: BooleanOrVariable;
  placeholder?: boolean;
  /** Marks frame as a slot for component instances. Array entries are IDs of recommended reusable child components (e.g. menu items inside a menu bar). */
  slot?: false | string[];
}
export interface Group extends Entity, CanHaveChildren, CanHaveEffects { type: "group"; }
export interface Note extends Entity, Size, TextStyle { type: "note"; content?: TextContent; }
export interface Prompt extends Entity, Size, TextStyle { type: "prompt"; content?: TextContent; model?: StringOrVariable; }
export interface Context extends Entity, Size, TextStyle { type: "context"; content?: TextContent; }
/** Icon from a library. The icon is scaled to fit the width and height. */
export interface Icon extends Entity, Size, CanHaveEffects {
  type: "icon";
  /** Valid: 'lucide', 'feather', 'Material Symbols Outlined', 'Material Symbols Rounded', 'Material Symbols Sharp', 'phosphor'. */
  library?: StringOrVariable;
  icon?: StringOrVariable;
  /** Variable weight, 100-700; only for libraries that support it. */
  weight?: NumberOrVariable;
  fill?: Fills;
}
/** Generates nested children from JavaScript. */
export interface Script extends Entity, Size {
  type: "script";
  /** Clip overflow. Default false. */
  clip?: BooleanOrVariable;
  /** JS file URI, relative to the .pen file. */
  scriptUri?: string;
  /** Input values by name. */
  inputs?: { [key: string]: string | number | boolean | Variable };
}
/** Live web page shown on the canvas. */
export interface Browser extends Entity, Size, CanHaveEffects, CanHaveStroke {
  type: "browser";
  /** Page URL. Empty shows a URL prompt. */
  url?: string;
  /** Device emulation preset id. Omit for responsive. */
  deviceId?: string;
  /** Page zoom factor. Default 1. */
  zoom?: number;
  scrollX?: number;
  scrollY?: number;
  cornerRadius?: NumberOrVariable | [NumberOrVariable, NumberOrVariable, NumberOrVariable, NumberOrVariable];
}
/** Reuses another object. */
export interface Ref extends Entity {
  type: "ref";
  /** ID of the referenced object. */
  ref: string;
  /** Customize descendant properties. */
  descendants?: { [key: string /** ID path of the descendant. */]: {} /** Based on the presence of `type`:
- `type` is not present = property overrides: the descendant node is updated with the listed properties.
- `type` is present = replacement: the descendant node is fully replaced with a new node tree. */ };
  [key: string]: any;
}
export type Child = Frame | Group | Rectangle | Ellipse | Path | Polygon | Text | Note | Prompt | Context | Icon | Script | Browser | Ref;
export type IdPath = string;
export interface Document { version: "2.20"; themes?: { [key: string /** RegEx: [^:]+ */]: string[] }; imports?: { [key: string]: string /** Value: relative URI of imported .pen file. Key: short alias. */ }; variables?: { [key: string /** RegEx: [^:]+ */]: { type: "boolean"; value: BooleanOrVariable | { value: BooleanOrVariable; theme?: Theme }[] } | { type: "color"; value: ColorOrVariable | { value: ColorOrVariable; theme?: Theme }[] } | { type: "number"; value: NumberOrVariable | { value: NumberOrVariable; theme?: Theme }[] } | { type: "string"; value: StringOrVariable | { value: StringOrVariable; theme?: Theme }[] } }; children: (Frame | Group | Rectangle | Ellipse | Polygon | Path | Text | Note | Context | Prompt | Icon | Script | Browser | Ref)[]; }
```
