# Specialized alias constructor loses its argument binding

Upstream: https://github.com/silk-lang/silk/issues/2412

Run `silk check --manifest-path compiler-bugs/009-specialized-alias/silk.toml`.
On `0.1.0-dev.20+10a8c67813a1` this reports SEM0012 at `IntRef.new(value)`;
the expected result is success. Replacing that call with
`Wrapped<i32>.new(value)` succeeds. Harfrust uses explicit nominal owners or
`ShaperData.shaper` when constructing its default shaping font.
