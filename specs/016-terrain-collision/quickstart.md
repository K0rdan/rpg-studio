# Quickstart: Terrain Collision

1. Open a map that uses a tileset and has a player entity.
2. In the tile palette, select a wall or water tile and mark it **Blocking**.
3. Paint a closed room with that tile on a **Below** layer; leave the floor unmarked.
4. Turn on the collision overlay and confirm only the wall cells are highlighted.
5. Save, then open Preview.
6. Walk on the floor: movement continues. Walk into the walls or off the map: movement stops.
7. Paint the same blocking tile on a **Same depth** or **Above** layer only: overlay stays clear there and Preview lets the player walk through while overlap still follows priority.
8. Reopen the project and confirm the blocking mark is still on the tileset.

## Regression checks

- A legacy tileset with no `tiles` array is fully walkable inside the map.
- Hidden below layers do not block and do not appear on the overlay.
- Changing a layer from Below to Same depth immediately clears those cells from the overlay.
- Diagonal movement against a wall slides along the open axis.
- Painting a blocking tile under the standing player does not teleport them; they can walk out.
- Maps that share the tileset share the same blocking marks.
