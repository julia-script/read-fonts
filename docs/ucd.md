# ucd

`ucd` is the font-independent Unicode data package, imported as `ucd.lib`.
It currently exposes the Unicode properties and canonical composition queries
used by harfrust. It has no dependency on `font_types` or `read_fonts` and performs
no allocation in property queries.

## Data and regeneration

The data is Unicode **18.0.0**, extracted from the pinned harfrust revision
`1503ff054384cc1d6a701b5ffbdc2f24118a2790`. The upstream `unicode/ucd_table.rs`,
`unicode/emoji_table.rs` and `ot/shaper/arabic_table.rs` headers independently
identify version 18.0.0. This initial extraction preserves harfrust's packed
lookup layout and byte literals; it does not yet regenerate directly from UCD.

```sh
git submodule update --init --recursive
scripts/generate                 # all data and Silk formatting
scripts/generate --check         # committed output must be current
silk test --manifest-path ucd/silk.toml --root src/tests.silk
silk test --release --manifest-path ucd/silk.toml --root src/sweep.silk
```

`scripts/generate-unicode` owns the Unicode tables. The separate
`scripts/generate-shaping-unicode` owns modified combining classes, RTL-script
policy, Arabic/Thai state machines and fallback forms, and AAT features.
OpenType script tags remain in harfrust. No property table is generated twice.
Focused package tests run in their own bounded PR CI job; the full code-point
sweep runs in the scheduled/manual baseline workflow.

Shaping extraction is gated with the full harfrust suite, regressions, Rust
comparison, tracing, malformed-font campaign and all seven callgrind workloads.
Clear `build/llvm` and `build/cache` before release builds (Silk #2468).
For before/after instruction counts, use identical executable and corpus paths:
process startup and path handling are included in callgrind's totals.

## API

```silk
import ucd.lib as Unicode
import ucd.lib { Script }

// Code points are u32; scripts are big-endian ISO 15924 tags.
let latin = Unicode.script(0x41)       // 0x4c61746e (Latn)
let category = Unicode.generalCategory(0x41) // 9 (uppercase letter)
let acute = Unicode.combiningClass(0x301)    // 230
let composed = Unicode.composeRaw(0x41, 0x301) // U+00C1
```

- `generalCategory(cp) -> u8`, `combiningClass(cp) -> u8`, and
  `script(cp) -> u32` preserve harfrust's existing numeric encoding.
- `mirror(cp)` and `vertical(cp)` return a mapped code point or the input.
  `vertical` maps presentation forms; it is **not** UAX #50 orientation.
- `isMark`, `isVariationSelector`, `isDefaultIgnorable`, and
  `isExtendedPictographic` are Boolean queries. Default-ignorable ranges are
  still the original hand-coded ranges.
- `joining(cp) -> usize` preserves shaping-state values: U=0, L=1, R=2,
  D/join-causing=3, Syriac ALAPH=4, DALATH_RISH=5, T=6.
- `decomposeRaw(cp) -> Decomposition { first, second }` returns one canonical
  decomposition step, including Hangul. Both fields zero mean absent; a zero
  `second` denotes a singleton. It does not recursively normalize strings.
- `composeRaw(first, second) -> u32` returns zero for an absent composition.
  `compose` and `decompose` expose equivalent `Option` results, with the latter
  using `Decomposed.Singleton` or `Decomposed.Pair`.
- `composesAsSecond(cp)` is the packed composition-table filter, excluding
  algorithmic Hangul; `composeRaw` handles Hangul before consulting it.
- `Script { value: u32 }` is the ISO value type.
  `Script.fromIso15924Tag(u32)` normalizes case and historical script aliases;
  zero returns `None`. `Script.parse(string)` reads up to four UTF-8 bytes,
  pads short inputs with spaces, and returns `Option<Script>`.

Out-of-range `u32` inputs are safe: unassigned category, zero combining class,
unknown script (`Zzzz`), no decomposition/composition, false Boolean queries,
and identity mappings. Surrogates retain their Unicode category.

### Harfrust migration

`harfrust.unicode` forwards Unicode queries and retains
`modifiedCombiningClass` and `isRtl`. `harfrust.lib.Script` re-exports the same
`ucd.Script` type. Font-specific operations now live in `harfrust.script`:
`tag`, `horizontalDirection`, `tags`, and `tagsForLanguage` are module functions,
not `Script` methods. Its `parse` function returns the shaping API's
`Result<Script, ParseError>`; `ucd.Script.parse` returns `Option<Script>`.
Silk requires inherent implementations in the type's declaring module
(SEM0194), so font-specific methods cannot remain attached to `ucd.Script`.

### Normalization version gap

Silk dev.22's `silk.unicode` NFC/NFD implementation uses Unicode **17.0.0**.
`ucd` deliberately does not call it: shaping consumes raw Unicode 18 pairs.
These versions must not be assumed interchangeable; a full cross-version
normalization comparison belongs with the direct-UCD generator migration.

## Licenses

The extracted implementation and HarfBuzz tables retain the MIT notice in
`ucd/LICENSE`; Unicode data retains `ucd/LICENSE-UNICODE` (Unicode License v3).
