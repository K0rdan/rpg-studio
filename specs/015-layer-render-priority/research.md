# Research: Layer Render Priority

## Priority ownership

**Decision**: Store semantic priority on each map layer.

**Rationale**: Scenery owns its overlap behavior. A player layer index would be
fragile when layers are reordered and could not express Y-sorted objects.

**Alternatives considered**: A numeric player height and fixed insertion index.

## Same-depth ordering

**Decision**: Sort same-depth tile rows, the player, and other entities by their
bottom Y coordinate. Draw tile rows before actors at equal depth.

**Rationale**: Bottom-edge sorting approximates feet-based depth, supports
continuous player movement, and has a deterministic readable tie-break.

**Alternatives considered**: Whole-layer ordering cannot let one actor move from
behind to in front of scenery; converting every decoration to an entity makes
map painting impractical.

## Backward compatibility

**Decision**: Make priority optional and resolve a missing value to `below`.

**Rationale**: Existing maps currently draw all tiles before entities. This
preserves that result without a database migration.

**Alternatives considered**: A required field would require normalization or migration.

## Collision

**Decision**: Keep collision outside this feature.

**Rationale**: Visual overlap and movement blocking are independent properties.

**Alternatives considered**: Inferring collision from same-depth or above layers
would prevent valid bridges, canopies, shadows, and low obstacles.
