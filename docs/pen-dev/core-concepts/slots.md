# Slots

> 来源：https://docs.pen.dev/core-concepts/slots（镜像于 2026-10-05，仅供项目内部参考）

# Slots

Slots are designated areas within a component where elements can be dropped in. They let you define flexible, customizable regions in your components.

## Create a Slot[#create-a-slot](#create-a-slot)

1. Create a frame and turn it into a component — press **Cmd/Ctrl + Option/Alt + K** or click **Create Component** at the top of the properties panel
2. Style it to your liking
3. Select an empty frame in the component origin and click **Make slot** at the top of the properties panel

- Only empty frames in component origins can be turned into slots
- Slots are marked with diagonal lines on the canvas, indicating the area where elements can be dropped

### Suggested Slot Components[#suggested-slot-components](#suggested-slot-components)

Other components in the same .pen file can be marked as “suggested slot components”.

For example, a `table` component’s slot can suggest `table-row` as the intended content. Suggested slot components give both human and AI designers guidance about what belongs in a given slot.

To mark a component as suggested:

1. Select the layer with a slot in the component origin
2. Click the `+` button beside **Slot** at the top of the properties panel
3. Select the components you’d like to define as suggested

## Drop Elements into Slots[#drop-elements-into-slots](#drop-elements-into-slots)

Once you have a component with a slot, you can populate it with elements.

1. Create a component instance
2. Drag and drop or copy and paste an element into the slot

You can also select the slot in an instance and click one of its suggested
components in the properties panel. Suggestions do not restrict the slot to
those components. Content you add belongs to that instance.
