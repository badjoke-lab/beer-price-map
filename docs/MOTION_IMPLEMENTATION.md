# Beer Price Map — Motion Implementation

This document records the production motion layer for the poster home.

## Motion now implemented

- staged hero entrance for header, tracking label, title, handwritten copy, explanation and CTAs
- slow floating beer-glass motion and independent hanging-sign sway
- ambient sun/glow loop and live-status pulse
- pointer parallax on the desktop hero artwork and counter-parallax on the copy
- viewport reveal for KPI plates and major poster sections
- KPI value count-up once live data replaces placeholders
- progressive country-map reveal after D3 inserts geometry
- animated ranking-row insertion/re-render
- Country Spotlight crossfade/slide when selection changes
- Price/FX chart line-draw when a history series is rendered or changed
- mobile retains subtle poster motion but disables pointer parallax
- `prefers-reduced-motion: reduce` removes non-essential animation and parallax

## Motion constraints

Motion is progressive enhancement only. It cannot change price, source, FX, ranking, market-scope or freshness semantics. All controls remain usable with motion disabled.

This implementation intentionally avoids video backgrounds and third-party animation libraries.
