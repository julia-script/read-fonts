# ucd

`ucd` is the font-independent Unicode data package, imported as `ucd.lib`.
It exposes typed character properties and raw canonical composition queries.
It has no dependency on `font_types` or `read_fonts` and performs no allocation
in property queries.

## Data and regeneration

The data is Unicode **18.0.0**, generated directly from the final files at
<https://www.unicode.org/Public/18.0.0/ucd/>. Every property and conformance input
is SHA256-pinned in `scripts/unicode-18.0.0.sha256`; `scripts/fetch-unicode`
populates and verifies `build/ucd/18.0.0/`, preserving upstream relative paths.
A checksum mismatch fails rather than silently refreshing a cached source.
The generator honors property `@missing` defaults, including bidi defaults
for unassigned right-to-left characters.

`scripts/generate-unicode` needs no Harfrust checkout. It chooses the smallest
total byte representation among two- and three-stage tables, searching leaf
blocks of 4–512 entries and middle blocks of 4–256 entries. Index widths are
chosen independently (1, 2, or 4 bytes); trailing default entries are omitted.
Tables and script-extension sets remain static byte literals. Lookup helpers
inline and have one explicit code-point range check.

```sh
scripts/fetch-unicode            # download or verify every pinned input
scripts/generate-unicode         # properties only, no Harfrust source dependency
scripts/generate                 # all data and Silk formatting
scripts/generate --check         # committed output must be current
silk test --manifest-path ucd/silk.toml --root src/tests.silk
silk test --release --manifest-path ucd/silk.toml --root src/sweep.silk
scripts/check-unicode-equivalence # full-domain source/table comparison, outside PR CI
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
The hot property entrypoints inline explicitly. Canonical composition searches
packed triples; Hangul composition/decomposition remains algorithmic.

## API

```silk
import ucd.lib as Unicode
import ucd.lib { Script }

// Code points are u32; scripts hold big-endian ISO 15924 tags.
let latin = Unicode.script(0x41)             // Script { value: 0x4c61746e }
let category = Unicode.generalCategory(0x41) // GeneralCategory.Lu
let acute = Unicode.combiningClass(0x301)    // CanonicalCombiningClass.Above
let order = acute.number()                  // 230
let composed = Unicode.composeRaw(0x41, 0x301) // U+00C1
```

- `generalCategory(cp) -> GeneralCategory` uses the Unicode aliases (`Lu`,
  `Mn`, etc.). `combiningClass(cp) -> CanonicalCombiningClass` uses UCD named
  values (`Not_Reordered`, `Above`, `CCC10`, etc.); `.number() -> u8` gives the
  canonical ordering value.
- `script(cp) -> Script` returns the ISO tag. `scriptExtensions(cp) -> ScriptSet`
  returns an immutable packed set with `length`, `get(index) -> Option<Script>`,
  and `contains(Script)`. Its default is the singleton primary script.
- `bidiClass`, `bidiPairedBracketType`, `joiningType`, `joiningGroup`,
  `lineBreak`, `eastAsianWidth`, `graphemeBreak`, `wordBreak`, `sentenceBreak`,
  `indicConjunctBreak`, and `verticalOrientation` return their corresponding
  typed enums. Joining groups remain separate from joining types.
- `mirror(cp)`, `bidiPairedBracket(cp)`, and `vertical(cp)` return a mapped code
  point or the input. `vertical` preserves presentation-form mappings; it is
  **not** UAX #50 orientation.
- `isMark`, `isVariationSelector`, `isDefaultIgnorable`, `isEmoji`,
  `isEmojiPresentation`, `isEmojiModifier`, `isEmojiModifierBase`,
  `isEmojiComponent`, `isRegionalIndicator`, and `isExtendedPictographic`
  are normative Boolean queries. Default ignorables are generated from UCD.
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

`harfrust.unicode` converts typed properties to its existing shaping encodings
and retains `modifiedCombiningClass`, `isRtl`, and the explicit policies below.
`harfrust.lib.Script` re-exports the same
`ucd.Script` type. Font-specific operations now live in `harfrust.script`:
`tag`, `horizontalDirection`, `tags`, and `tagsForLanguage` are module functions,
not `Script` methods. Its `parse` function returns the shaping API's
`Result<Script, ParseError>`; `ucd.Script.parse` returns `Option<Script>`.
Silk requires inherent implementations in the type's declaring module
(SEM0194), so font-specific methods cannot remain attached to `ucd.Script`.

### Source equivalence and explicit shaping policies

The pre-cutover baseline is read-only Harfrust commit
`1503ff054384cc1d6a701b5ffbdc2f24118a2790`. Its
`harfrust/src/unicode/ucd_table.rs:1–7` says its XML source is Unicode 18.0.0;
`unicode/emoji_table.rs:10–16` independently identifies Emoji 18.0.0.
The checker decodes the emitted byte tables, independently parses pinned UCD,
and compares every code point (including surrogate slots) for all properties.
It separately compares the preserved Harfrust view against the old tables and
predicates, plus the complete decomposition and composition maps. Unexplained
differences fail; there is no version-difference allowlist.

These are **shaping-policy differences, not Unicode version changes**:

- Normative `Default_Ignorable_Code_Point` is true for U+115F, U+1160, U+3164,
  U+FFA0, U+1BCA0, U+1BCA1, U+1BCA2, and U+1BCA3. The Harfrust shim excludes
  exactly those eight characters so existing fonts retain visible Hangul
  fillers and shorthand controls. Evidence:
  `harfrust/src/unicode/mod.rs:549–555,586–614` at the pinned source revision
  (also [HarfBuzz #503](https://github.com/harfbuzz/harfbuzz/issues/503)).
- Normative `Variation_Selector` includes U+180B, U+180C, U+180D, and U+180F.
  The Harfrust shim excludes exactly those four Mongolian selectors because
  the Arabic shaper handles them. Evidence: upstream `unicode/mod.rs:617–621`.
- The preserved `vertical` presentation map is not a normative UCD property.
  It joins single-character `<vertical>` decompositions with `<wide>`
  decompositions so ASCII punctuation maps from its fullwidth counterpart,
  not from ASCII. U+FE33 is the straight low line; the duplicate decomposition
  U+FE34 is selected for the wavy low line U+FE4F. Multi-character vertical
  digraph decompositions are not single-code-point mappings. The complete
  source domain is U+2013, U+2014, U+2025, U+2026, U+3001, U+3002,
  U+3008–U+3011, U+3014–U+3017, U+FE4F, U+FF01, U+FF08, U+FF09, U+FF0C,
  U+FF1A, U+FF1B, U+FF1F, U+FF3B, U+FF3D, U+FF3F, U+FF5B, and U+FF5D.
  Evidence: upstream `unicode/mod.rs:624–671`; the checker requires the
  complete mapping to match, not merely this domain.
- Joining_Type `C` maps to Harfrust's dual/join-causing state 3; Joining_Group
  `Alaph` and `Dalath_Rish` override its state to 4 and 5. Those shaping states
  are intentionally absent from the typed UCD property enums.


### Normalization version gap

Silk dev.22's `silk.unicode` NFC/NFD implementation uses Unicode **17.0.0**.
`ucd` deliberately does not call it: shaping consumes raw Unicode 18 pairs.
These versions must not be assumed interchangeable. The repository's separate
normalization comparison must characterize the Unicode 17/18 gap; the property
generator and its equivalence checker do not claim stdlib normalization parity.

## Text algorithms

Algorithms accept UTF-8 `&[u8]` and append to caller-cleared lists. Offsets refer
to the original bytes. Invalid UTF-8 consumes one byte as U+FFFD, so malformed
input cannot stall a scan. Reuse output capacity between calls.

| Module | Entry point | Result |
|---|---|---|
| `ucd.bidi` | `analyze(text, direction, &mut workspace, &mut analysis)` | Layout-compatible `TextAnalysis` |
| `ucd.line_break` | `breaks(text, options, &mut output)` | `List<TextBreak>` |
| `ucd.segmentation` | `graphemes`, `words`, `sentences` | `List<usize>` byte boundaries |
| `ucd.itemization` | `scripts(text, &mut output)` | `List<ScriptRun>` with ISO script tags |
| `ucd.vertical` | `orientations(text, &mut output)` | `List<OrientationRun>` |

`BidiWorkspace.make()` retains scratch capacity. `ParagraphDirection` is `Auto`,
`Ltr`, or `Rtl`; automatic direction is resolved separately for each paragraph.
The complete UAX #9 implementation includes explicit embeddings, isolates,
overflow handling, canonical bracket pairs, N0, and X9 removal affinity.
`TextAnalysis` preserves pre-L1 levels for shaping, whole-paragraph L1
`unwrappedLevel` values, removed-source ranges, and paragraph metadata.
`reorder(levels, &mut indices)` performs L2 after the caller applies L1 for an
actual wrapped line and excludes X9 characters. `ucd.text` uses layout's
cursor semantics: this slice is unit 0; canonical EOF is `{ unit: 1, offset: 0 }`.

`LineOptions.make()` selects untailored UAX #14 with manual soft hyphens.
`LineBreakMode` supports `Auto`, `Loose`, `Normal`, `Strict`, and `Anywhere`;
`WordBreakMode` supports `Normal`, `BreakAll`, and `KeepAll`. Set
`LineLanguage.Japanese` or `.Chinese` for CSS CJK punctuation tailoring.
Mandatory breaks take precedence; `Anywhere` preserves extended graphemes and
overrides `word-break`. `Hyphens.Manual` marks U+00AD opportunities as
`TextBreakKind.Hyphenated`; `.None` suppresses them. No automatic hyphenation
patterns are included. The default SA behavior needs the optional dictionary
provider for language-specific word opportunities.

Segmentation implements extended graphemes, default UAX #29 words, and default
sentences, not locale-specific word tailoring. Boundary lists contain zero and
the input length exactly once, including the single zero for empty input.
`GraphemeCursor` also exposes streaming cluster iteration without an output list.
The Unicode 18 GB9c linker rule is used rather than an older Unicode rule set.

Script itemization intersects `Script_Extensions`, resolves surrounding
Common/Inherited characters, retains combining marks with their base, and
inherits a closing bracket's script from its opener. Ambiguous isolated sets
prefer an available primary script, then the lowest ISO tag.

Vertical orientation applies UAX #50 to whole grapheme clusters, with enclosing
marks forcing upright orientation. `U`/`Tu` fall back upright and `R`/`Tr`
rotated clockwise. This is not glyph substitution: a font consumer must still
distinguish `Tu`/`Tr` through `verticalOrientation(cp)` and apply available
vertical alternates before choosing fallback orientation.

## Conformance

```sh
scripts/fetch-unicode
silk test --release --manifest-path ucd/silk.toml --root src/bidi_conformance.silk
silk test --release --manifest-path ucd/silk.toml --root src/line_break_conformance.silk
silk test --release --manifest-path ucd/silk.toml --root src/segmentation_conformance.silk
```

The runners consume every data row of both bidi files and all four break-test
files, without code-point filters or skipped cases. Clear the compiler caches
before each release invocation as noted above. PR CI runs these suites in
parallel bounded jobs; full-domain equivalence and performance references stay
in the scheduled/manual workflow.

## Licenses

The inherited implementation retains the MIT notice in `ucd/LICENSE`.
Unicode source data retains `ucd/LICENSE-UNICODE` (Unicode License v3).
