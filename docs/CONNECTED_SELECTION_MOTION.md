# Beer Price Map — Connected Selection Motion

Status: **Normative for Home / Explore selection motion**  
Scope: desktop + mobile  
Depends on: `PC_UI_SPEC.md`, `MOBILE_UI_SPEC.md`, `MOTION_IMPLEMENTATION.md`

## 1. Purpose

The World Map, Country Spotlight and Country Ranking are three views of the same selected-country state. Selection motion should make that relationship explicit without forcing cross-panel scrolling or changing any price, source, rank, scope or FX semantics.

## 2. Desktop

Country Spotlight is the visual hub, but **only one animated connector is drawn per selection**.

### Map-origin selection

1. selected map country highlights,
2. one animated gold connector draws from the selected country to Country Spotlight,
3. Country Spotlight content remains visible and updates to the selected country,
4. the matching ranking row is highlighted in place,
5. do **not** auto-scroll the ranking and do **not** draw a second Spotlight → Ranking connector.

### Ranking-origin selection

1. selected ranking row highlights,
2. one animated connector draws from the row to Country Spotlight,
3. Country Spotlight content remains visible and updates to the selected country,
4. the matching map country is highlighted in place,
5. do **not** draw a second Spotlight → Map connector.

### Visual treatment

- warm gold / amber connector,
- soft glow,
- curved SVG path,
- bright moving head while the path is drawn,
- short destination pulse,
- settled selected state remains on map, Spotlight and ranking after the transient connector fades.

The connector is never allowed to hide Country Spotlight content. Selection information must be readable while the connector is drawing and after it completes.

## 3. Mobile

Do not reproduce desktop cross-page curves on a narrow viewport. Mobile uses a short **vertical selection rail** whose destination is Country Story only.

### Map-origin selection

1. map country highlights,
2. the fixed vertical rail advances to Country Story,
3. Country Story is brought into view and remains readable,
4. the selected ranking row is highlighted/revealed in the ranking list,
5. do **not** auto-scroll to the ranking and do **not** extend the rail to a Ranking stage.

### Ranking-origin selection

Ranking selection may route to Country Story. The map country remains highlighted as counterpart state, but the page does not bounce back to the Map.

The mobile rail is a progress/relationship device, not a literal geometric line connecting distant off-screen coordinates.

## 4. Reduced motion

With `prefers-reduced-motion: reduce`:

- do not draw moving connector paths,
- do not animate the mobile rail,
- keep selected-state highlights,
- keep necessary Country Story navigation functional,
- keep Country Spotlight content visible.

## 5. Acceptance

Desktop browser proof must demonstrate:

- Map → Spotlight as the only map-origin connector,
- Ranking → Spotlight as the only ranking-origin connector,
- no second connector leg,
- no connector-driven ranking auto-scroll,
- selected map country and selected ranking row remain highlighted,
- Country Spotlight details are visible after map selection.

Mobile browser proof must demonstrate:

- map selection activates the vertical rail to Country Story,
- Country Story details are visible,
- the selected ranking row is highlighted/revealed without automatic ranking scroll,
- no Ranking rail stage is used,
- page-level horizontal overflow stays within the existing 2 px tolerance.

The connector layer is progressive enhancement only. Existing country selection, data, source links, market scope, FX history and ranking behavior must remain usable if the connector layer is disabled.
