# An empty slice cannot be borrowed for 'static

Upstream: https://github.com/silk-lang/silk/issues/2428

Run `silk check --manifest-path compiler-bugs/011-static-empty-slice/silk.toml`.
On `0.1.0-dev.20+10a8c67813a1` both `return &[]` and `return &NONE` (an empty
`const` array) report SEM0212 for a `&'static [Point]` result; the expected
result is success.

Harfrust's `ShaperData` keeps a one-element `noCoords` array and slices zero
elements from it to build its cached default-instance `GlyphMetrics`.
