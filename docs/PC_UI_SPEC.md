# Beer Price Map — PC UI Specification

Status: **Normative for the PC redesign**  
Scope: **Desktop / PC only**  
Reference direction: the approved dark cinematic beer-advertising-poster mock discussed on 2026-09-08.  
Mobile is intentionally out of scope for this document and must not be derived by simply shrinking this layout.

## 1. Product definition

Beer Price Map is an independent live-data site for comparing the same exact beer product across countries using selected retailer observations normalized to a common 330 ml basis.

The initial tracked product is **Corona Extra**. The product name may be shown as text, but the Beer Price Map brand and visual system must remain independent so additional beers such as Heineken can be added only after they pass the same acquisition and validation requirements.

The home experience is not a monitoring dashboard. It is a **live-data beer advertising poster**: visually strong enough to work as a poster while every displayed price, rank, chart and update indicator remains driven by real production data.

## 2. Hard visual constraints

The redesign must follow these rules:

- Dark cinematic beer-poster aesthetic.
- Deep navy / near-black base, warm amber/gold highlights, cream typography, restrained green-to-yellow-to-red map scale.
- Large display typography, editorial spacing and selective handwritten/paint-marker-style accent copy.
- Generic/original beer imagery only: unbranded beer glass or bottle, foam, condensation, lime, sunset, sea, wood/signage, travel-poster elements.
- **Do not use official Corona logos, official label artwork, official advertising photography or a lookalike recreation of protected brand assets.**
- The product name `Corona Extra` may appear as plain product text where required by data semantics.
- Avoid generic SaaS/dashboard styling: no wall of identical cards, no developer-console visual language, no dense operational metadata in the primary UI.
- The page should remain visually coherent if captured as a single poster-like desktop screenshot.

## 3. User goals

The PC home page must answer these questions quickly:

1. Where is the tracked beer cheapest and most expensive today?
2. Where does a selected country rank?
3. What is the comparable 330 ml price versus the local unit price and package price?
4. Has the selected country's beer price changed over time?
5. Did the displayed converted price move because of the local beer price, FX, or both?
6. What source and market scope does the observation represent?
7. Where can the user go for full ranking, multi-country comparison and aggregate statistics?

## 4. Information architecture

Target site structure:

- `/` — Explore / poster home
- `/compare/` — compare 2–4 countries
- `/insights/` — aggregate statistics and world-level history
- `/about/`
- `/methodology/`
- `/source-policy/`
- `/contact/`

`Compare` and `Insights` are separate experiences. Do not overload the home page with all comparison and statistical controls.

### Home purpose

The home page focuses on:

- world overview,
- single-country exploration,
- current ranking,
- selected-country price/FX history,
- concise navigation into deeper pages.

### Compare purpose

The dedicated Compare page will handle 2–4 selected countries, current normalized prices, historical comparison, indexed comparison and FX impact comparison.

### Insights purpose

The dedicated Insights page will handle aggregate statistics such as world median, distribution, regional medians, movers and global median history once enough real history exists.

## 5. Desktop reference layout

Reference desktop viewport: approximately **1440 px wide**. The layout should remain usable at narrower desktop widths, but this specification does not define mobile behavior.

The approved home composition is:

1. Header / navigation embedded into the poster hero.
2. Hero poster.
3. Four-stat KPI strip.
4. Main row: World Map on the left + Country Spotlight on the right.
5. Lower row: Country Ranking on the left + selected-country Price/FX History on the right.
6. Poster-style footer.

The relative composition of the approved mock is the starting point. Implementation may refine spacing and proportions for legibility, but must not revert to the previous generic dashboard layout.

## 6. Header

### Required content

Left:

- small eyebrow: `GLOBAL BEER PRICE TRACKER`
- brand title: `BEER PRICE MAP`

Navigation:

- Home
- Map
- Ranking
- About
- Methodology

When Compare and Insights are implemented, add them without turning the header into a dense application toolbar.

Right:

- display-currency selector, e.g. `USD — US Dollar`

### Behavior

- Header visually belongs to the hero poster; it should not look like a detached admin navbar.
- Currency switching updates all comparable displayed values that use the selected display currency.
- Local source-currency values remain local and are never relabeled as display-currency values.

## 7. Hero poster

### Required content

- Giant `BEER PRICE MAP` title.
- Short handwritten-style campaign copy. Final wording may be refined, but it must be independent Beer Price Map copy and not imitate a specific brand campaign.
- One concise explanatory block:
  - compare the same beer across countries,
  - normalized to 330 ml,
  - local currency plus selected comparison currency,
  - daily production observations.
- Large original/unbranded beer visual.
- Small current-product label such as `TRACKING NOW — CORONA EXTRA`.
- Last price update timestamp.
- FX snapshot date.
- Number of supported display currencies.

### Hero priority

Atmosphere first, explanation second. Do not fill the hero with methodology text.

## 8. KPI strip

Keep four prominent poster-style data plates:

1. **Fresh countries**
2. **Median / 330 ml**
3. **Cheapest / 330 ml** + country
4. **Highest / 330 ml** + country

Requirements:

- Values are live data, never hard-coded mock values.
- Median is the primary central-tendency statistic. Mean may exist in Insights later, but does not replace the median here.
- Cards should read as printed data plates in the poster, not four generic SaaS cards.

## 9. World Map

### Role

On PC the world map is a primary exploration and selection surface.

### Required content

- `WORLD MAP`
- unit label such as `Price per 330 ml (USD)` using the selected display currency
- continuous or bucketed legend from lower to higher price
- no-data state
- country search field
- zoom controls where useful
- optional poster decoration such as compass/travel copy, provided it does not obstruct data

### Interaction

- Hover a data country: show country, normalized 330 ml price, local unit price, rank and freshness/update state.
- Click a data country: update the Country Spotlight and Price/FX History to that country.
- Search selection performs the same state change as map click.
- Selected country receives a clear but restrained highlight/glow.
- No-data countries remain visually distinct and non-misleading.

### Data semantics

Map color represents the normalized comparable 330 ml price in the selected display currency. It does **not** imply a national average.

## 10. Country Spotlight

The right-hand spotlight card is a major part of the approved desktop composition.

### Required hierarchy

For the selected country, display in this order:

1. Country name and rank (`#N of M`).
2. **Comparable normalized price** — largest numeric treatment, e.g. `$1.59 / 330 ml`.
3. **Local unit price**, e.g. `¥248 / 330 ml`.
4. **Package price**, e.g. `¥5,948`.
5. **Package size**, e.g. `24 × 330 ml`.
6. Source name / retailer link.
7. Updated timestamp.
8. Fresh/stale state.
9. Scope label where needed.

### Price-label rule

Never display a package total in a way that can be mistaken for a one-bottle price.

Japan is the canonical acceptance example:

- comparable: approximately `$1.59 / 330 ml` at that day's FX,
- local unit: approximately `¥248 / 330 ml`,
- package price: `¥5,948`,
- package: `24 × 330 ml`,
- source: Costco Japan Online,
- scope: selected-source / online retailer reference, **not a Japan national average**.

The exact live values remain data-driven.

### Visual treatment

- Country atmosphere may use original/appropriately licensed abstract travel-poster imagery.
- Do not use copyrighted brand advertising assets.
- Keep text contrast strong over imagery.

## 11. Market / city scope

Country reference values and city/market observations are separate data layers.

Rules:

- Never silently relabel a city/store observation as a national value.
- Each observation must carry a visible scope when relevant: country reference, region, city, store/retailer reference.
- Current verified examples include Australia city observations and Ontario/LCBO regional reference data.
- When a selected country has verified market data, provide a clear route from the Country Spotlight to market detail without crowding the primary price hierarchy.
- Market comparison details may expand below the spotlight or in the country-detail experience; they should not replace the global normalized reference on the home map.

## 12. Country Ranking

The lower-left area of the approved mock is the ranking surface.

### Primary tabs

- Cheapest
- Most Expensive
- Biggest Movers — only when enough real history exists to compute the chosen period honestly

### Core columns

- Rank
- Country
- normalized display-currency price / 330 ml
- local unit price
- package
- updated

Source and scope remain accessible but should not overload the default row.

### Interaction

- Hover: highlight row.
- Click: select that country and synchronize Map, Country Spotlight and History.
- The selected country must remain clearly identifiable even if it is not near the visible top of a sorted list.
- `View full ranking` routes to or expands the complete ranking experience.

## 13. Price / FX History

The lower-right area of the approved mock is the main time-series surface for the selected country.

### Series modes

- **Price** — beer price only
- **FX** — exchange rate only
- **Both** — beer price and FX on the same time axis

### Value modes

- **Actual values**
- **Indexed (100)**

### Ranges

- 30 days
- 90 days
- 1 year
- All

Do not fabricate a long chart when only a few production observations exist. The control may remain available, but the plotted history must reflect only preserved real observations.

### Actual mode

- Price-only uses the price axis.
- FX-only uses the FX axis.
- Both uses separate left/right Y axes because the units differ.

### Indexed mode

- Normalize each visible series to 100 at the first valid observation in the selected period.
- This mode exists to compare relative movement, not absolute values.

### Historical conversion rule

Historical converted beer prices must use the FX snapshot from the same date when available. If that date has no preserved FX snapshot, use the nearest prior preserved FX observation and expose that fallback in methodology/tooltips. **Never apply today's FX retrospectively to historical beer observations.**

### Tooltip / scrub content

At a hovered date show, where available:

- date,
- local beer price / 330 ml,
- FX rate,
- converted display-currency price / 330 ml,
- package price and package size if useful for explaining a discontinuity.

### Motion

- Initial selected-country chart may draw on from left to right.
- Price / FX / Both transitions must morph/fade smoothly rather than replace the chart abruptly.
- Actual ↔ Indexed must animate the scale transition clearly enough that the user understands the meaning changed.

## 14. Observation history

A chart alone is not sufficient evidence for history. Add an expandable daily observation list beneath or adjacent to the chart.

Each observation may include:

- date,
- local normalized price / 330 ml,
- package price,
- package size,
- converted price using preserved historical FX,
- FX rate/date used,
- source,
- scope,
- freshness / source-change note where relevant.

This list is supporting evidence, not the visual hero. Keep it collapsed or concise by default.

Do **not** add speculative AI-generated explanations for why a price moved. Only show causes that are mechanically supported by recorded data, such as a source/package change or FX contribution.

## 15. Aggregate statistics / Insights

Heavy statistics belong on a separate **Insights** page, not the home poster.

The home page keeps only the four headline KPIs.

When enough real history exists, Insights may contain:

- current world median,
- current min/max and spread,
- global median price history,
- regional medians,
- price distribution,
- biggest risers/fallers for defined periods,
- volatility,
- coverage history.

Every aggregate must state the actual coverage and remain scoped to Beer Price Map selected-source observations. Do not describe them as national retail averages or a general cost-of-living index.

## 16. Multi-country comparison

Multi-country comparison is a separate **Compare** experience rather than a dense mode inside the home poster.

Target rules:

- 2–4 countries at a time.
- Current normalized-price comparison first.
- Local unit and package context underneath.
- Historical comparison in selected display currency.
- Indexed-to-100 comparison for relative movement.
- FX/local-price contribution comparison presented in a readable summary rather than placing eight indistinguishable lines on one chart.
- Scope labels must remain visible so country references, regional references and city observations are never silently mixed.

The home page should provide a clear route into Compare without sacrificing the approved poster composition.

## 17. Source and diagnostic information

Primary consumer UI may show:

- source/retailer name,
- source link,
- updated time,
- scope,
- freshness.

Hide developer/collector diagnostics from the default presentation, including:

- `HTTP 200`,
- raw observed text,
- parser/source mode,
- internal validator details.

Those belong in expandable Source Details, Methodology, or operator diagnostics.

## 18. Motion system

The site must not feel like the previous static dashboard. Motion must support hierarchy and data comprehension rather than exist as decoration everywhere.

### Hero

- staged title/copy/visual entrance,
- subtle ambient light movement,
- subtle condensation/foam/particle treatment where performant,
- restrained pointer parallax on the large visual only.

### KPI

- short numeric count-up/tween on initial reveal or refreshed live snapshot.

### Map

- data colors can reveal progressively on first entry,
- hover brightness/outline,
- selected-country glow,
- smooth country-state update.

### Spotlight

- crossfade/slide between selected countries,
- numeric tween where appropriate.

### Ranking

- animate row reordering between ranking tabs rather than hard-replacing the list where practical.

### Charts

- line draw on entry,
- smooth series-mode transition,
- smooth Actual/Indexed re-scaling,
- stable tooltip/scrub interactions.

### Timing guidance

- hover feedback: ~120–180 ms
- ordinary UI state transition: ~250–350 ms
- country transition: ~450–650 ms
- graph morph: ~600–900 ms
- hero entrance: ~1.2–1.6 s total
- ambient loops: slow, roughly 8–20 s

These are targets, not reasons to block a better implementation.

### Reduced motion

Honor `prefers-reduced-motion`: remove parallax and large animated transforms, shorten transitions and keep all data/features fully usable.

## 19. Poster footer

The footer continues the visual story instead of ending in a generic gray legal block.

Target treatment:

- dark horizon / landscape silhouette or equivalent original poster motif,
- central campaign line such as `GOOD BEER. A WIDER WORLD.` (wording may still be refined),
- links: About, Methodology, Source Policy, Contact,
- small independence notice such as `Independent project. Not affiliated with the tracked beer brands or retailers.`

## 20. Data and copy rules

- Normalized comparison basis: **330 ml**.
- Every package observation retains original package total, count/volume, currency and source.
- The country value is a selected-source reference unless explicitly supported otherwise.
- Never call the selected source a national average.
- Fresh and stale states must not be visually equivalent.
- Stale data must not count toward the fresh-country publication gate.
- Current and historical display conversions must be reproducible from preserved price and FX observations.
- Never hard-code mock prices, rankings or coverage into the UI.

## 21. Accessibility and desktop interaction

- Keyboard-accessible map alternatives via search/ranking.
- Visible focus styles.
- Semantic buttons/selects/links.
- Sufficient contrast over photography and textures.
- Do not make color the only representation of price state or freshness.
- Decorative handwritten copy must never be the only location of essential information.
- Motion must respect reduced-motion preference.

## 22. Performance constraints

The poster aesthetic must not require a heavyweight video background or large third-party advertising assets.

Prefer:

- optimized original static imagery plus CSS/SVG motion,
- modest ambient animation,
- D3/SVG for map and charts where already used,
- lazy loading of non-critical poster imagery,
- no animation that causes continuous expensive layout work.

Static GitHub Pages hosting and zero-dollar operation remain constraints.

## 23. PC home acceptance criteria

The PC redesign is not accepted merely because it has the correct dark colors. It must satisfy all of the following:

- Visually matches the approved **beer advertising poster** direction rather than a generic dashboard.
- Uses no official Corona logos/labels/ad photography.
- Hero, four KPI plates, Map + Spotlight, Ranking + History and poster footer are present as the main composition.
- Live production values drive coverage, median, min/max, map, ranking and country detail.
- Japan-style package totals cannot be mistaken for a bottle/unit price.
- Map click/search/ranking click synchronize selected-country state.
- Price / FX / Both works.
- Actual / Indexed works.
- 30D / 90D / 1Y / All does not invent missing observations.
- Daily observation evidence is available beyond the chart.
- Same-date historical FX behavior is preserved.
- Source and scope are visible without exposing raw collector diagnostics by default.
- Market/city data, when shown, is explicitly scoped and never presented as a national average.
- Motion is present and meaningful, with reduced-motion support.
- Compare and Insights are treated as dedicated deeper experiences, not shoved into the home dashboard.
- Existing production fail-closed data requirements continue to hold.

## 24. Explicitly deferred from this document

This specification does **not** define the final mobile UI. Mobile has already been identified as requiring a different interaction model: a full-world map must not be the primary country-selection surface on a small screen. Mobile region-first selection, search, list fallback and mobile compare behavior will be specified separately.

The following also remain separate follow-up work:

- final logo artwork,
- final display/handwriting typeface selection,
- final exact color tokens,
- final copywriting,
- full Compare page specification,
- full Insights page specification,
- additional beer product selector behavior after another product passes production acquisition requirements.
