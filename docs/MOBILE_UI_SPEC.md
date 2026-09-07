# Beer Price Map — Mobile UI Specification

Status: **Normative for the mobile redesign**  
Scope: **Mobile only**  
Reference relationship: shares the approved Beer Price Map beer-advertising-poster visual language with the PC specification, but **must not be implemented by shrinking the desktop layout**.  
Desktop behavior remains defined in `docs/PC_UI_SPEC.md`.

## 1. Product definition

Beer Price Map is an independent live-data experience for comparing the same exact beer product across countries using selected retailer observations normalized to a common 330 ml basis.

The initial tracked product is **Corona Extra**. The Beer Price Map brand, imagery and UI must remain independent of any tracked beer brand so additional products such as Heineken can be introduced only after they pass the same acquisition and validation rules.

On mobile, the product should feel like a **sequence of vertical beer-advertising posters that become interactive as the user scrolls**. The experience must remain practical with one thumb: users must be able to discover one country, inspect it deeply, compare multiple countries, inspect price/FX history and reach aggregate Insights without fighting a desktop layout compressed into 390 px.

## 2. Hard mobile principles

These are non-negotiable:

1. **Do not shrink the PC layout.** Mobile gets a different information architecture.
2. **Do not use a full-world map as the primary country-selection control.** Countries become too small to tap reliably.
3. **Search, regional navigation and country lists are the primary selection surfaces.**
4. **A world map may remain as an overview / poster visual, not the only way to choose a country.**
5. **Country detail is full-width.** Do not squeeze evidence or history into a narrow sidebar.
6. **No required horizontal scrolling for primary content.** Ranking rows, price cards and controls must reflow vertically.
7. **Touch targets must remain comfortably tappable**, with approximately 44–48 px minimum interactive height where practical.
8. **The visual theme remains a cinematic beer poster**, not a generic mobile dashboard.
9. **Every displayed value remains live production data**, never a hard-coded mock value.
10. **Package totals, local unit prices and normalized comparison prices must never be visually conflated.**

## 3. Target mobile widths

The implementation must be verified at least at:

- 360 px
- 390 px
- 412 px
- 430 px

Tablet behavior may interpolate between mobile and desktop, but this specification is concerned with mobile-first behavior.

Acceptance target:

- no page-level horizontal overflow beyond 2 px tolerance,
- no essential text clipped,
- no control requiring hover,
- no map interaction that depends on sub-finger-size country targets.

## 4. Visual direction

Mobile shares the same visual system as PC:

- deep navy / near-black base,
- warm amber/gold highlights,
- cream typography,
- restrained green → yellow → red price scale,
- large poster typography,
- selective handwritten/paint-marker-style accent copy,
- generic/original beer imagery only,
- sunset, sea, foam, condensation, lime, travel-poster motifs where useful.

Rights constraints are identical to desktop:

- do not use official Corona logos,
- do not use official Corona label artwork,
- do not use official advertising photography,
- do not create lookalike brand assets,
- `Corona Extra` may be shown as plain product text because it is the tracked product.

The mobile experience should feel like a stack of poster panels rather than a stack of SaaS cards.

## 5. Mobile site structure

Primary routes remain:

- `/` — Explore / poster home
- `/compare/` — compare 2–4 countries
- `/insights/` — aggregate statistics and world-level history
- `/about/`
- `/methodology/`
- `/source-policy/`
- `/contact/`

Mobile navigation must make these routes reachable without maintaining a large desktop-style navigation bar.

## 6. Mobile header

### Initial hero state

At the top of the page, keep the header visually light:

- Beer Price Map brand title / compact wordmark,
- display-currency selector,
- optional compact menu trigger.

Do not place the full desktop nav across the top.

### Sticky state after scrolling

Use a compact sticky header approximately 44–52 px tall containing:

- `BEER PRICE MAP`,
- current display currency,
- compact menu trigger.

Menu sheet / drawer may contain:

- Explore
- Compare
- Insights
- About
- Methodology
- Source Policy
- Contact

The sticky header must not consume a large fraction of the viewport.

## 7. Hero poster

The first screen should work as a **vertical beer poster** on its own.

Required content:

- large `BEER PRICE MAP` display title,
- short independent campaign copy,
- original/unbranded beer visual,
- concise statement that the same beer is compared around the world on a normalized 330 ml basis,
- current tracked product as plain text,
- compact live highlights such as:
  - fresh country count,
  - cheapest current country,
  - a useful reference-country rank if available,
- display-currency selector or direct access to it.

Do not crowd the first viewport with methodology, four full desktop KPI cards, map controls and ranking controls simultaneously.

The first mobile screenshot should still feel like a poster, not a compressed application shell.

## 8. Mobile scroll story

The preferred vertical sequence is:

1. **Poster Hero**
2. **Country search / discovery entry**
3. **World overview**
4. **Region selector**
5. **Large regional map + regional country list**
6. **Selected Country Story**
7. **Price / FX History**
8. **Verified market/city observations when available**
9. **Condensed ranking**
10. **Insights teaser / route**
11. **Poster footer**

The narrative is intentionally:

**world → region → country → time → city/market → broader comparison/statistics**.

## 9. Country discovery: priority order

Mobile country selection must prioritize the following methods:

1. **Search**
2. **Ranking / country list**
3. **Region selector + regional map**
4. **World overview map**

The user must never be forced to accurately tap a tiny country on a full-world map.

## 10. Country search

Place a prominent `Search country…` field near the start of the exploration flow.

Search result rows should show enough context to decide quickly, for example:

- country name,
- current normalized 330 ml price,
- rank,
- freshness where useful,
- `+` compare action where Compare is enabled.

Selecting a result should:

- set the selected country,
- update the relevant region state,
- transition/scroll to the Country Story without requiring a world-map tap.

## 11. World overview map

A full-world map may appear on mobile, but its role is **overview / poster context**, not precise country selection.

Rules:

- do not shrink a 2:1 desktop map into a large empty card where all countries are tiny,
- keep the overview visually compact enough that it does not dominate the mobile page,
- use it to communicate global price distribution,
- it may support coarse region selection, but must not be the sole country-selection surface,
- small countries must never require direct world-map tapping.

The current production behavior where the full world is rendered inside a large mobile card and countries become impractically small is explicitly rejected by this specification.

## 12. Region-first navigation

Provide a region selector such as:

- Americas
- Europe
- Africa / Middle East
- Asia
- Oceania

The exact geographic grouping can be refined, but the behavior is fixed:

1. select a region,
2. show that region at a useful scale,
3. show an accompanying country list,
4. select a country by either map or list.

The region selector should remain easily reachable while exploring, potentially sticky within the map/discovery section.

## 13. Regional map

Unlike the world overview, the regional map is a genuine mobile selection surface.

Requirements:

- fills most available width,
- frames only the selected region,
- data countries have clear price color,
- selected country gets a strong but restrained highlight,
- country targets should be as large as practical,
- zoom may be offered as a secondary aid but must not be required for normal selection,
- map state and region country list remain synchronized.

Tap behavior:

- first tap selects a country,
- selection updates the country summary / bottom preview,
- a clear `View details` action moves into the Country Story.

## 14. Small-country fallback

Small countries such as Malta or Luxembourg must remain selectable even when map geometry is too small.

Therefore every regional map must be paired with a country list.

The list is not a fallback hidden behind an error state; it is a first-class selection method.

## 15. Selected-country preview

After selecting a country from search, region map or list, show a compact preview before the full detail where useful:

- country name,
- normalized 330 ml comparison price,
- rank,
- local unit price if space permits,
- `View country` / equivalent CTA,
- `Add to compare` action.

A bottom sheet may be used for this preview, provided it does not become an oversized modal that hides the map entirely.

## 16. Country Story

Country detail must become a full-width poster section.

Required hierarchy:

1. Country name and rank.
2. **Comparable normalized price / 330 ml** — largest numeric element.
3. **Local unit price / 330 ml**.
4. **Package price**.
5. **Package size**.
6. Source / retailer.
7. Updated timestamp.
8. Fresh/stale state.
9. Market/scope statement.

Canonical Japan example:

- comparable: approximately `$1.59 / 330 ml` at preserved historical/current FX,
- local unit: approximately `¥248 / 330 ml`,
- package price: `¥5,948`,
- package: `24 × 330 ml`,
- source: Costco Japan Online,
- scope: selected online retailer reference, **not a Japan national average**.

The exact values are live data.

### Critical price semantics

Never show `¥5,948` in a way that looks like a one-bottle price.

The visual hierarchy must communicate:

**comparison price → local unit price → package total → package size**.

## 17. Source details

Primary country detail should show only consumer-relevant source information:

- retailer/source name,
- source link,
- scope,
- update time,
- freshness.

Keep diagnostic fields collapsed under `Source details` or equivalent:

- HTTP status,
- raw observed price text,
- parser mode,
- internal validator details.

Do not reproduce the current developer-facing diagnostic panel in the main mobile experience.

## 18. Price / FX History

History must use the full mobile width and should not be a miniature desktop chart.

Series controls:

- **Price**
- **FX**
- **Both**

Value controls:

- **Actual**
- **Indexed 100**

Range controls:

- 30D
- 90D
- 1Y
- All

Recommended chart height is roughly 280–360 px depending on viewport and surrounding content.

Do not fabricate long history when only a small number of real observations exists.

## 19. Mobile history interaction

Mobile has no hover. Use touch scrub behavior:

- user drags horizontally over the chart,
- a vertical cursor tracks the selected date,
- detailed values appear in a fixed information area above or beside the chart,
- do not put the critical tooltip directly underneath the user's finger.

For the selected date show, where available:

- date,
- local beer price / 330 ml,
- FX rate,
- converted display-currency price / 330 ml,
- package context when needed.

## 20. History data semantics

The same historical rules as desktop apply:

- preserve daily FX snapshots,
- historical conversion uses the same-date FX snapshot when available,
- otherwise use the nearest prior preserved FX observation,
- expose that fallback honestly,
- never apply today's FX retroactively to historical beer prices.

## 21. History observation list

The chart is not the only history evidence.

Add an expandable daily observation list beneath the chart.

Each row may contain:

- observation date,
- local normalized 330 ml price,
- package price,
- package size,
- converted price,
- FX rate/date used,
- source,
- source/scope change note where relevant.

Keep this collapsed or concise by default. It is an evidence layer, not the visual hero.

Do not add speculative explanations for price movements.

## 22. Verified market / city layer

When a selected country has verified market data, show it after the main country reference and history.

Example structure for Australia:

- Country reference
- Sydney
- Melbourne
- Brisbane

Mobile presentation should be vertical, not three narrow cards squeezed side-by-side.

A compact regional/country mini-map may show city nodes. Selecting a city should:

- highlight that city node,
- highlight its row,
- reveal store/source/package/update details,
- preserve the distinction between country reference and city observation.

Never silently compare a city observation as if it were a national average.

## 23. Mobile ranking

Do not load a dense 54-row six-column desktop table into the initial mobile view.

Default home ranking should be concise, for example:

- Top 5 cheapest,
- selected country's current rank,
- optional bottom 3 / most expensive preview,
- `View all ranking` action.

A mobile row may use two lines, e.g.:

`12  JAPAN                 $1.59`  
`    ¥248 / 330ml      24 × 330ml`

Do not require horizontal table scrolling for the primary ranking.

Full ranking may live on its own route or expanded view with filters/sorting optimized for mobile.

## 24. Compare entry points

Multi-country comparison is a first-class mobile requirement.

A country can be added to comparison from:

- search result,
- regional country list,
- country preview,
- Country Story,
- ranking row.

Use a clear `+` / `Add to compare` affordance.

## 25. Compare tray

As soon as one country is added, show a persistent compact comparison tray near the bottom of the viewport.

Example behavior:

- selected-country chips or abbreviated names,
- current count,
- `COMPARE N →` CTA,
- `+` action to add another country,
- tray persists while the user moves between regions/search/ranking.

Maximum initial comparison set: **4 countries**.

The purpose of the limit is readability, especially for history comparison.

## 26. Mobile Compare page

The Compare page is separate from single-country Explore.

Its first screen should answer the simplest question immediately:

**Which selected country is cheapest now on the common 330 ml basis?**

Recommended vertical order:

1. selected-country strip / editable chips,
2. current normalized-price comparison,
3. relative differences / rank within selected set,
4. local unit and package context,
5. historical price comparison,
6. Indexed 100 comparison,
7. FX / local-price contribution summary,
8. market/scope details,
9. source details where needed.

## 27. Current-price comparison

For 2–4 countries, use a readable vertical comparison rather than four compressed columns.

Example information per country:

- country,
- display-currency price / 330 ml,
- local unit price / 330 ml,
- package total and package size,
- scope.

The common normalized comparison price remains the primary measure.

## 28. Historical multi-country comparison

For multiple countries, provide:

- **Actual price** history in the selected display currency,
- **Indexed 100** history for relative movement.

Do not place each country's beer-price line plus each country's FX line on the same chart when that would create 6–8 indistinguishable lines.

For multi-country FX impact, use a separate contribution summary.

## 29. FX / local-price contribution comparison

A readable compare summary may show, over the selected period:

- local beer price change,
- FX contribution,
- resulting converted-price change.

This answers:

- which country changed most,
- whether local shelf price or FX drove the converted movement.

Only show mechanically supported calculations. Do not generate speculative economic narratives.

## 30. Compare-map role

When several countries are selected, the world map may reappear as a poster visualization showing **only the selected countries prominently**.

On this screen the world map is context, not a tiny country-selection interface.

## 31. Insights on mobile

Heavy aggregate statistics remain on the separate `/insights/` page.

The home page may include only a short teaser such as:

- current world median,
- biggest riser / faller once enough history exists,
- `Explore the numbers →`.

Insights may eventually contain:

- global median history,
- regional medians,
- current min/max and spread,
- price distribution,
- biggest movers,
- volatility,
- coverage history.

Do not invent 30-day or 1-year statistics before enough real history exists.

## 32. Motion system on mobile

Mobile must feel alive, but motion must remain performant and touch-friendly.

### Hero

- staged title / visual entrance,
- subtle ambient light / poster texture motion,
- no heavy pointer-parallax requirement.

### Scroll transitions

Use section reveal and poster-to-poster transition to reinforce the narrative:

**Hero → World → Region → Country → Time → Markets**.

### Map

- selected country / region highlight,
- subtle price-color reveal,
- short selection transition.

### Country Story

- price values may tween during currency/country changes,
- country visual may crossfade.

### Chart

- line draw on entry,
- Price / FX / Both smooth transition,
- Actual / Indexed smooth rescaling,
- range changes animate without delaying interaction.

### Timing guidance

- tap feedback: ~100–160 ms
- ordinary control change: ~200–300 ms
- country / panel transition: ~300–500 ms
- graph morph: ~400–700 ms
- hero entrance: ~1.0–1.4 s total
- ambient loops: slow, ~8–20 s

Do not block scrolling or taps while decorative motion finishes.

## 33. Reduced motion

Honor `prefers-reduced-motion`.

When enabled:

- remove parallax,
- remove large scroll-linked transforms,
- shorten crossfades,
- disable decorative looping particles where possible,
- preserve every feature and data state.

## 34. Touch and accessibility

Requirements:

- visible focus styles for keyboard-capable mobile/tablet devices,
- semantic buttons and selects,
- accessible labels for map alternatives and controls,
- touch targets approximately 44–48 px minimum where practical,
- no essential action available only through a gesture,
- chart scrub is supplemental; exact values must also remain accessible in textual history,
- color must not be the only indicator of freshness or price state,
- handwritten decoration must never contain essential-only information.

## 35. Performance

The poster aesthetic must remain lightweight enough for mobile networks and devices.

Prefer:

- optimized original raster/WebP/AVIF assets,
- CSS/SVG texture treatments,
- lightweight D3/SVG map and charts,
- lazy loading below the fold,
- no mandatory autoplay video background,
- no dependence on protected brand advertising assets.

Avoid loading all years of all-country history on first paint. History should be fetched/loaded at the selected-country or selected-compare scope where practical.

## 36. Mobile data rules

Same as desktop:

- normalized comparison basis: **330 ml**,
- retain original package total, count/volume, source currency and source URL,
- current country value is a selected-source reference unless evidence supports another scope,
- never call selected-source data a national average,
- country/reference, region, city and store scopes must remain explicit,
- stale data must not be presented as freshly observed,
- stale observations do not count toward the fresh-country publication gate,
- current and historical display conversions must be reproducible from preserved price and FX observations.

## 37. Mobile acceptance criteria

The mobile redesign is not accepted until all of the following are true on the production-like build:

### Layout

- 360/390/412/430 px widths render without meaningful page-level horizontal overflow.
- No desktop sidebar survives as a narrow unreadable column.
- No desktop six-column ranking table is merely scaled down.
- Hero remains poster-like rather than a compressed dashboard.

### Country discovery

- User can find any covered country through search.
- User can select a region and then a country without using the world overview map.
- Small countries remain selectable from the synchronized regional list.
- The world overview is not the sole country-selection method.

### Country detail

- normalized price, local unit price, package total and package size are visually distinct,
- Japan's package total cannot reasonably be mistaken for a one-bottle price,
- source/scope/update/freshness are readable,
- diagnostics are not dumped into the primary presentation.

### History

- Price / FX / Both work,
- Actual / Indexed 100 work,
- 30D / 90D / 1Y / All controls work against real preserved observations,
- touch scrub works without placing critical text under the finger,
- observation history can be opened textually,
- historical FX conversion uses preserved same-date or prior-date FX.

### Compare

- user can add countries from at least search, list/ranking and Country Story,
- compare tray persists while exploring,
- 2–4 countries can be compared,
- current normalized price comparison is readable in one column,
- Actual and Indexed historical comparison are available,
- FX contribution is summarized without unreadable 8-line charts,
- selected scope remains visible.

### Market layer

- verified market/city observations render beneath the country reference,
- country reference and city/region observations are not conflated,
- Australia verified markets remain usable on mobile.

### Motion / accessibility

- motion does not block interaction,
- `prefers-reduced-motion` is honored,
- touch targets are practical,
- no essential feature depends on hover.

## 38. Explicitly rejected mobile patterns

The following are rejected and must not reappear:

- full-world map enlarged vertically while the world geometry itself remains tiny,
- requiring users to tap Japan, Malta, Luxembourg, etc. on a full-world 390 px map,
- desktop Country Evidence sidebar squeezed into a narrow mobile column,
- desktop history text wrapping one word/letter per line beside the chart,
- desktop ranking table requiring horizontal scrolling for ordinary use,
- four-country compare implemented as four tiny side-by-side cards,
- all price, FX, market, source, history and diagnostics controls visible simultaneously above the fold,
- generic dashboard cards replacing the agreed beer-poster visual direction.

## 39. Implementation order

Implement mobile in this order:

1. Mobile poster header + Hero.
2. Search-first country discovery.
3. World overview demoted from primary selection.
4. Region selector + regional map + synchronized list.
5. Full-width Country Story with corrected price/package hierarchy.
6. Full-width touch-optimized Price/FX History + observation list.
7. Verified market/city section.
8. Mobile condensed ranking.
9. Persistent compare tray + `/compare/` mobile experience.
10. Insights teaser + `/insights/` mobile layout.
11. Motion polish, reduced-motion pass and mobile production smoke.

Do not postpone Compare until after the rest of mobile is considered complete; multi-country comparison is part of the defined mobile user model.

## 40. Relationship to PC specification

Desktop and mobile share:

- visual brand language,
- data semantics,
- 330 ml normalization,
- preserved FX history rules,
- price/package hierarchy,
- Compare and Insights responsibilities,
- rights constraints,
- source/scope honesty.

They intentionally differ in interaction:

- **PC:** world map can be a primary selection surface.
- **Mobile:** world map is primarily overview; search + region + list drive selection.
- **PC:** map and Country Spotlight can sit side by side.
- **Mobile:** Country Story is full-width and sequential.
- **PC:** ranking can use a multi-column table.
- **Mobile:** ranking must use compact stacked rows.
- **PC:** compare may use wider horizontal layouts.
- **Mobile:** compare uses vertical comparison and a persistent selection tray.

This difference is deliberate and must be preserved during implementation.