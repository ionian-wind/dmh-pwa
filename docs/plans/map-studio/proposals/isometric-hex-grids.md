# Proposal — isometric view and hex grids

> **Status: deferred proposal. Isometric view is explicitly out of the current
> implementation scope; hex grids are not planned for the current milestone.**

## Isometric

The current studio is a top-down orthogonal grid editor. Isometric would be a
display-only projection applied to the world container, with input coordinates
transformed back into orthogonal document space. It is not part of the current
task and no isometric controls are exposed in the current UI.

## Hex grids

Hex grids would add grid variants, hex snapping and hex-aware measurement while
keeping the same document geometry. This is lower priority than the current
orthogonal dungeon workflow.

## If activated

- Define projection and inverse-input transforms.
- Add grid type and orientation settings.
- Implement hex snapping and wall/room alignment.
- Add export/raster parity and dedicated tests.
