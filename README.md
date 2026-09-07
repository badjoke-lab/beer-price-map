# Beer Price Map

Public world map for comparing exact beer products using selected retailer shelf prices, normalized to 330 ml.

## Current product

- Corona Extra
- Daily automated collection on GitHub-hosted runners
- Fail-closed publication gate: at least 50 fresh countries
- Original shelf price, package volume, currency, source URL and freshness retained
- Daily FX snapshots preserved under `data/fx/history/`
- Historical conversion uses the same-date FX snapshot when available, otherwise the nearest prior preserved snapshot; today's FX is never applied retroactively
- Country history UI supports Price / FX / Both and Actual / Indexed=100 views

The current country value is a selected source reference, not a national average. Market/metro/store coverage is tracked separately in the public launch completion gate.

Live: https://badjoke-lab.github.io/beer-price-map/

Completion gate: https://github.com/badjoke-lab/beer-price-map/issues/5
