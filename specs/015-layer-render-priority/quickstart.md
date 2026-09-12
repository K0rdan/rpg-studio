# Quickstart: Layer Render Priority

1. Open a map with a player.
2. Keep the ground layer set to **Below**.
3. Paint a trunk or low obstacle on a layer set to **Same depth**.
4. Paint foliage or a roof on a layer set to **Above**.
5. Save and open Preview.
6. Move north and south of the trunk: overlap changes with the player's feet.
7. Walk under the foliage: it remains above the player.
8. Reopen the map and confirm priorities are retained.

## Regression checks

- A legacy map with no priority looks unchanged.
- Hidden layers remain hidden in editor and preview.
- Isolated and subdued editor layers retain their current behavior.
- NPCs and objects sort with the player at same depth.
