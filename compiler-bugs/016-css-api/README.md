# 016 — missing reusable CSS APIs

Upstream: [silk-lang/silk#2577](https://github.com/silk-lang/silk/issues/2577).
Pinned toolchain: `0.1.0-dev.27+323ceb59e7ee`.

Observed on macOS arm64 with the pinned toolchain, from the repository root:

```sh
silk check --manifest-path compiler-bugs/016-css-api/silk.toml
```

`silk.css` is an illustrative import, not an existing/promised namespace.
Expected capability: CSS Syntax tokenization and component-value/rule/declaration
parsing, selector matching/specificity, and property-independent cascade.
An unknown-module diagnostic alone would not establish that capability gap.
The installed stdlib source/module inventory contains JSON/TOML scanners and
UTF-8/Unicode primitives, but none of those CSS operations. See
[stdlib gaps](../../docs/stdlib-gaps.md#011--reusable-css-syntax-selectors-and-cascade).

Actual exit: 1.

```text
src/main.silk:2:8: error[MOD0001] Unknown module silk.css
```

`svg_css` temporarily owns the general-purpose implementation; SVG property
semantics and computed-value projection remain local after migration. There is
no working stdlib alternative for a runtime A/B measurement.
