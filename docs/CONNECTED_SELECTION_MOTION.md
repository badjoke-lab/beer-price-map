# Beer Price Map — Connected Selection Motion

Status: **Normative for Home / Explore selection motion**  
Scope: desktop + mobile  
Depends on: `PC_UI_SPEC.md`, `MOBILE_UI_SPEC.md`, `MOTION_IMPLEMENTATION.md`

## 1. Purpose

The World Map, Country Spotlight and Country Ranking are three views of the same selected-country state. They must not feel like unrelated panels. Selection motion must make the relationship explicit without changing any price, source, rank, scope or FX semantics.

## 2. Desktop

Country Spotlight is the visual hub.

### Map-origin selection

1. selected map country highlights,
2. an animated gold connector draws from the country to Country Spotlight,
3. Spotlight content reveals,
4. a second connector draws from Spotlight to the selected ranking row,
5. the ranking row pulses and remains selected.

### Ranking-origin selection

1. selected ranking row highlights,
2. an animated connector draws from the row to Country Spotlight,
3. Spotlight content reveals,
4. a second connector draws from Spotlight to the selected map country,
5. the map country pulses and remains selected.

The two connector legs are separate. Do not draw a direct Map → Ranking line that bypasses Country Spotlight.

### Visual treatment

- warm gold / amber connector,
- soft glow,
- curved SVG path,
- bright moving head while the path is drawn,
- short destination pulse,
- settled selected state remains on map, Spotlight and ranking after the transient connector fades.

Ranking rows outside the ranking viewport should be brought into view inside the ranking scroller before the second connector finishes.

## 3. Mobile

Do not reproduce the desktop cross-page curves on a narrow viewport. Mobile uses a separate **vertical selection rail**.

### Map-origin selection

1. map country highlights,
2. the fixed vertical rail advances to the Country Story stage,
3. Country Story is brought into view and revealed,
4. after a short dwell the rail advances to the Ranking stage,
5. the selected ranking row is revealed, brought into view and pulsed.

### Ranking-origin selection

Ranking selection may route upward to Country Story without automatically bouncing back to Map. Country Story remains the mobile hub.

The mobile rail is a progress/relationship device, not a literal geometric line connecting distant off-screen coordinates.

## 4. Reduced motion

With `prefers-reduced-motion: reduce`:

- do not draw moving connector paths,
- do not animate the mobile rail,
- keep selected-state highlights,
- keep necessary scrolling/navigation functional,
- reveal Country Spotlight without large transforms.

## 5. Acceptance

Desktop browser proof must demonstrate both directions:

- Map → Spotlight → Ranking,
- Ranking → Spotlight → Map.

Mobile browser proof must demonstrate:

- map selection activates the vertical rail,
- Country Story becomes the intermediate state,
- the selected ranking row is revealed and highlighted,
- page-level horizontal overflow stays within the existing 2 px tolerance.

The connector layer is progressive enhancement only. Existing country selection, data, source links, market scope, FX history and ranking behavior must remain usable if the connector layer is disabled.
