# Quickstart: Asset Folders

1. Open the editor and expand Assets → Tilesets.
2. Create a folder `Grass`, then create `edge` inside it.
3. From `Grass/edge`, upload a tileset image; it appears in that folder.
4. From another folder, generate a tileset; it is saved where it was started.
5. Right-click an asset at the root and move it to `Grass`; its preview still loads.
6. Close the right sidebar, right-click an unused asset, and delete it.
7. Try to delete a tileset a map still uses: it is refused with the usage count.
8. Try to delete `Grass` while `Grass/edge` exists: it is refused; delete the empty leaf first.
9. Reload the editor: folders, empty ones included, and asset placement are unchanged.
