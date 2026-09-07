# Beer Price Map

World beer price map with automated, source-backed price collection and normalized comparisons.

## Current dataset

- **Corona Extra** is the first production dataset.
- Heineken may be added later using the same product/source/history pipeline.
- Raw local price, package size, normalized 330 ml price, FX conversion, source URL, and collection health are kept separately.

## Operating model

Daily GitHub Actions collection with a fail-closed production gate. A refresh is not published when the validated fresh-country floor is not met. Collection uses public product pages; no paid price API or paid proxy is required for the current Corona dataset.
