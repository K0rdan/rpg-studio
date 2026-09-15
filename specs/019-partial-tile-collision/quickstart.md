# Quickstart: Partial Tile Collision

1. Open a map, select a wall tile, keep Blocking on with no custom rectangle — overlay fills the cell; Preview cannot enter it.
2. Select a tree-trunk tile, turn Blocking on, set the rectangle to the bottom-center third (or Fit opaque). Overlay shows only that box.
3. Paint the trunk on a **below** layer. Preview: walk through the empty sides of the cell; stop on the trunk.
4. Paint the same blocking tile on **Above** only: overlay stays clear there; Preview walks through (016 layer rule unchanged).
5. Save, reopen, confirm the rectangle is still on the tileset.
6. Enable collision overlay after editing the rect and confirm highlighted shapes match Preview blocking.

Pass:

- Full blocking tiles still stop the whole cell.
- Partial rects allow walking in the empty part of the cell.
- Feet box, not the full sprite square, is what hits solids.
- Fit opaque writes a rectangle; play does not depend on the PNG after that.
- Above/Same still never contribute solids.
