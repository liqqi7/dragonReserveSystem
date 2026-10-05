# Components

> 来源：https://docs.pen.dev/core-concepts/components（镜像于 2026-10-05，仅供项目内部参考）

# Components

## Why Use Components[#why-use-components](#why-use-components)

Components let you maintain consistency across your designs. Edit the main component once and its instances inherit the change, except for properties you override on an instance.

Components serve as the foundation for building design systems.

## Creating Components[#creating-components](#creating-components)

Any standard design element — a frame, shape, or text — can be converted into a reusable component.

1. Select the element
2. Press **Cmd/Ctrl + Option/Alt + K** or click **Create Component** at the top of the properties panel
3. The element is now your component origin, marked with a magenta bounding box when selected

For more complex structures, you can create nested components.

## Using Components[#using-components](#using-components)

Simply copy the component origin on the canvas to create an instance.

A component instance is marked with a violet bounding box when selected.

For a component in the same file, click **Go to component** in the properties panel to navigate back to the origin. For an imported component, open its source from **Libraries**.

You can also insert an instance from **Components** in the left panel. Search
by name, then click or drag the component onto the canvas.

## Overrides and detaching[#overrides-and-detaching](#overrides-and-detaching)

Edit an instance’s fill, size, or text to override that property for that
instance. Other properties continue to follow the origin. For example, changing
a button label to **Save** preserves that text when you change the origin’s
label, while a font-size change at the origin still reaches the instance.

Use [slots](https://docs.pen.dev/core-concepts/slots) for content that users need to insert into an
instance. Layers inherited from an origin cannot be freely reparented inside
the instance.

Select an instance and click **Detach instance** in the properties panel to
disconnect it from its origin. To start again with the origin’s current values,
insert a fresh instance from **Components**.

Detaching keeps nested instances and variable references linked to their sources.
