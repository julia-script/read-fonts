# Harfrust for Silk

Native Silk text shaping, ported from [harfrust at `1503ff0`](https://github.com/harfbuzz/harfrust/tree/1503ff054384cc1d6a701b5ffbdc2f24118a2790)
using this repository's `read_fonts` and `font_types` packages. The pinned source
and fonts remain in `test-data/harfrust/`. No Rust library, C shaper, subprocess,
or FFI is used by the Silk library or CLI.

The port implements OpenType GSUB/GPOS, contextual and variation lookups,
GDEF attachment classes, Arabic and Syriac joining, Hebrew, Hangul, Indic,
Khmer, Myanmar, Thai/Lao, USE, AAT `morx`/`mort`, `kerx`, `kern`, `trak`,
normalization, fallback substitutions and positioning. It includes extended
24-bit glyph/offset formats, Unicode data and syllable machines generated from
the pinned source, feature ranges, variation coordinates, all four directions
and cluster levels, custom font callbacks, reusable plans, and tracing.

## Library

Add a path dependency on `harfrust` and import `harfrust.lib`. All manifests
pin `0.1.0-dev.22+5cd5bc433c4e`.

```silk
import harfrust.lib { Buffer, ShaperData, shape, ShapeOptions }

// font is a read_fonts.lib.FontRef borrowing the application's font bytes.
let data = ShaperData.new(&font)
let shaper = ShaperData.shaper(&data)
let mut buffer = Buffer.new()
run Buffer.pushStr(&mut buffer, "office")
Buffer.guessSegmentProperties(&mut buffer)
let result = run shape(&shaper, &mut buffer, ShapeOptions.new())
// Match result, then read Buffer.glyphInfos and Buffer.glyphPositions.
// Buffer.clear retains capacity and configuration for the next run.
```

Allocation uses `OutOfMemoryError` and the `Allocator` effect. `shape` returns
`Result<(), ShapeError>` for invalid buffer/plan use. Malformed layout tables
are ignored or stop the affected operation. `Buffer.allocationSuccessful`
reports shaping work/size limits; system allocation failure remains an effect.
`Buffer.reset` also restores configuration defaults. Text appended with
`pushStr` uses UTF-8 byte clusters; `pushText(..., false)` uses character indices.

`ConfiguredShaper.setVariations` accepts `Variation` values. `setScale` accepts
separate signed X/Y scales in units per em; callback metrics are already scaled.
`ShapeOptions` accepts features, a borrowed `ShapePlan`, and point size.
Build a plan after setting segment properties and variations, then use
`ShapePlanKey.matches` in an application-owned cache. Keep caches per font.
Direction and script mismatches are rejected; the caller is responsible for
selecting a plan with matching font, features, language and variation coordinates.

`ConfiguredShaper.withFuncs` accepts a native `FontFuncs` implementation for
nominal/variation mapping, scalar/batch advances, origins and extents. Batch
views provide checked construction and indexed access, and preserve full
32-bit glyph IDs, including zero. Callbacks can query the font's default
implementations. For tracing, implement `tracing` and `message`; returning false
from a start message skips that operation. End/recursion messages are
informational. `Buffer.setTracing` toggles delivery across buffer reuse.

`serialize`, `serializeOptional`, `serializeWithoutFont`, and `serializeUnicode`
produce HarfBuzz text formats. `SerializeFlags`, `BufferFlags`, `GlyphFlags`,
`Feature`, `Language`, `Script`, and the `harfrust.unicode` module provide the
corresponding public options and queries. See the ordinary tests for complete
examples, including custom callbacks and plan reuse.

## CLI

From the repository root:

```sh
silk build --release --manifest-path hr_shape/silk.toml
build/llvm/x86_64-unknown-linux-gnu/release/hr_shape font.ttf 'office' --features=-liga
build/llvm/x86_64-unknown-linux-gnu/release/hr_shape font.ttf --text-file=text.txt --direction=rtl --script=Arab
```

The runner accepts the shaping and serialization options used by the pinned
suite, including `--variations`, `--font-size`, `--font-ptem`, `--face-index`,
context, buffer flags and `--trace`. Text files must be UTF-8. Each invocation
shapes one paragraph, including embedded newlines, as upstream's test helper
does. Tracing prints messages and snapshots followed by the final glyph string.
This CLI does not reproduce upstream's stdin, JSON, output-file, or paragraph
splitting frontend. The native shaping API supplies the underlying operations.

## Validation

Run `scripts/check-shaping` for the shaping PR gate, or these individual commands
from the repository root with recursive submodules present:

```sh
silk test --release --manifest-path harfrust/silk.toml --root src/tests.silk
silk build --release --manifest-path hr_shape/silk.toml
build/llvm/x86_64-unknown-linux-gnu/release/hr_shape --suite harfrust/tests/shaping.bin
build/llvm/x86_64-unknown-linux-gnu/release/hr_shape --regressions
scripts/check-shaping-trace
scripts/check-shaping-malformed
```

There are **6,090 non-macOS data-driven cases** at this pin, all passing with
**no skip list**. The issue's approximate 12,400 count does not describe this
revision. The 129 tests in `macos.rs` and `macos_lazy_tables.rs` require Apple
system fonts and are excluded. Four additional long-input regressions exercise
attachment limits; six work-limit checks assert buffer length and success state. Ordinary tests cover public buffer operations, callbacks,
advances/scaling, Unicode, language/script mappings, feature parsing, reusable
plans, serialization, digests, AAT actions, extended lookups and variations.
Rust-specific ownership, raw-pointer batch ABI, lazy-cache internals and
Send/Sync assertions are replaced by native ownership and interface behavior.

`scripts/generate-shaping-tests` extracts upstream expectations into one binary
fixture. The seven upstream smoke cases also have exact differential assertions
in `tests/differential.json`; repeated strings are compressed there and expanded
by the generator. In particular these preserve work-limit results and malformed
AAT ligature behavior. The runner compares every byte, including long results.
Font bytes are read directly from the submodule, including in library tests.

PR CI uses a fourth parallel job with sequential compilation and reuses its
release runner for the suite, long inputs, tracing and malformed-input smoke
checks. No Rust harfrust build is required in PR CI. The weekly/manual baseline
builds the pinned Rust twin, compares all 6,090 inputs, mutates every corpus
font, and runs checksum-verified benchmarks:

```sh
cargo build --locked --release --manifest-path scripts/rust-hr-shape/Cargo.toml --target-dir build/harfrust-rust
scripts/compare-shaping
scripts/check-shaping-malformed --all-fonts --mutations-per-font 16
scripts/bench-shaping
scripts/bench-shaping --filter en-thelittleprince --iterations 1 --samples 1 --callgrind
```

On 2026-10-27 the differential check had **zero differences**, and the broad
smoke campaign passed **11,546 malformed fonts** and nine invalid CLI options.
These are deterministic regressions and bounded mutation checks, not a proof
that all possible malformed inputs are harmless. Failed mutations are saved
under `build/shaping-malformed-failures/` and uploaded by CI.

## Performance

`scripts/bench-shaping` mirrors harfrust's `benches/shaping.rs` workloads. Both
twins reuse fonts, buffers and shape plans, process the same pinned text, and
check identical glyph/cluster/position checksums. Wall times for the Rust twin
are tens of milliseconds and too noisy to compare, so the ratios below are
callgrind instruction counts for one iteration
(`scripts/bench-shaping --callgrind --iterations 1 --samples 1`), Silk
`0.1.0-dev.22+5cd5bc433c4e` with Clang 22.1.8 against Rust 1.99.1, both release
builds. Lower is better.

| Font / text | Silk Ir | Rust Ir | Silk / Rust |
| --- | ---: | ---: | ---: |
| Roboto / English Little Prince | 77.5M | 65.3M | 1.19× |
| Roboto / English words | 111M | 87.9M | 1.26× |
| Noto Nastaliq Urdu / Persian Little Prince | 1.12G | 789M | 1.42× |
| Noto Nastaliq Urdu / Persian words | 957M | 847M | 1.13× |
| Noto Sans Devanagari / Hindi words | 278M | 225M | 1.23× |
| Amiri / Persian Little Prince | 488M | 374M | 1.31× |
| Source Serif Variable / react-dom | 1.03G | 1,004M | 1.02× |

The geometric mean is **1.22×**, down from 11.25× for the initial port. Plans
cache each lookup's subtables with per-subtable digests and expand class
definitions into per-glyph tables; ligature sets reject candidates by their
second component; shapers reuse default-instance metrics across calls; 16-bit
coverage tables are searched directly and value records are applied field by
field; contextual rule sets reject rules on their second input value without
walking the buffer, and format 3 rules check their first input coverage before
any other setup; ligature sets skip candidates the same way; plans keep a digest
of each contextual rule set's second input values, so a rule set none of whose
rules can match is skipped whole; each subtable's starting coverage is expanded
in the plan, so lookups skip uncovered subtables without a call and pass the
coverage index to the ones they apply; each subtable's class definitions are
resolved once in the plan instead of per glyph; plans keep a digest of each
ligature set's second components, so a set none of whose ligatures can match is
rejected without walking it; pair sets keep a digest of their second glyphs, and
kerning-only pair subtables adjust the advance directly; steps whose features
have no per-glyph conditions skip those checks; context matching compares each
glyph with its expected value once, and the common GDEF class checks for skipped
glyphs are inlined into every glyph walk; normalization keeps glyphs mapped in
place instead of copying them to a new list, and GDEF classes are assigned in one
pass; device and variation records are skipped without variation coordinates,
and single-glyph cluster merges are skipped; the default character mapping caches
recent codepoints within each batch; lookups that cover no glyph in the buffer
are skipped before any setup, and AAT tables are found once per font; multiple
and ligature substitutions move the rest of the buffer once instead of once per
glyph, and contextual rules reuse the second input glyph found for the quick
reject instead of walking to it again; plans keep each rule's second input value, or a
stop mark for rules that must be looked at, so rules are skipped without reading
them; format 3 rules are checked before the
general rule setup; shapers keep their default-instance metrics scaled, so a
shaping call borrows them instead of copying them; lookups that contextual
rules apply are cached in the plan too, once per lookup, so nested lookups skip
uncovered subtables the same way; a ligature set whose first glyph ends the
buffer skips its longer ligatures without trying to match them, and fonts map
U+0000 to U+2FFF to glyphs once, straight from sorted cmap ranges, instead of on every call; Indic consonant
position probes check a digest of each probed feature's lookups before setting
up a lookup, and vowel constraints are checked only against the script's own
pairs; per-call scratch lists are sized once instead of grown glyph by glyph; text is decoded and added to the buffer in one pass, and
the right-to-left script check is a generated match. Format 4 character maps
are searched through arrays located once per font. Normalization maps a code point
that stays one glyph in place, so Indic text is not copied to a new list. Composition first checks
that the mark is the second half of some composition. Text entirely below U+0300 skips
the mark scans in normalization, and flag propagation skips flagless single-glyph
clusters; ASCII text fills the buffer in a plain loop, and horizontal advances are
read straight from the hmtx bytes; glyph properties are set in place, and normalization
maps single glyphs without copying them and composes only marks that can be the second
half of a composition. Kerning-only 16-bit pair subtables
(including advance devices without variation coordinates) take a dedicated path,
and a lookup's subtables share one search for the second glyph; a format 1 pair set whose digest lacks that glyph is
rejected before the kerning path is called, and a step group that every glyph enables skips the per-glyph
feature check. Plans keep a digest of the glyphs that can follow the first one in each lookup's
ligatures and pairs, so a lookup none of whose second glyphs is in the buffer is skipped
whole unless the buffer records unsafe-to-concat flags; format 3 contextual subtables add
their second input or first lookahead coverage to that digest, and format 1 and 2
subtables add their rules' second inputs or first lookaheads, through the class
definitions for format 2. Plans also keep each rule's first backtrack value, so a
rule whose glyph before the match cannot fit is rejected before the backtrack walk, and
each single-input rule's first lookahead value, checked against the glyph after the match;
both checks run in the loop that skips rules by their second input, so a rejected rule is
never read. Subtables a glyph cannot start a match in are skipped in a loop of their own,
bounded by the slice length so it needs no index checks. Plans record where each group of
steps sharing a lookup ends, and the buffer's glyph digest is kept across shaper pauses that
only reorder glyphs.
Format 3 rules keep digests of their second input, first backtrack and first lookahead
coverages, so most failing rules are ruled out from the glyphs on either side of the first
one before the rest of the rule is read or any coverage is searched. A covered format 3 rule that fails
this way is rejected inside the lookup's subtable loop, without the contextual call and its setup. That check borrows the lookup and finds the rule's
digests by index, so its call copies little. Plans find the GDEF class definitions once,
so a shaping call does not look them up again, and keep the digests Indic consonant position
probes check. Shaper pauses run only at the stages where the shaper has
work to do. Multiple and ligature substitutions move the buffer's tail through a slice
starting at the edit, so the moves need no index checks. Lookups whose subtables all kern
pairs take a dedicated path without the branches for other subtable kinds and check an expanded coverage without
the subtable's digest, and lookups are
passed by reference instead of copied for every glyph. Kerning reads expanded pair
classes straight from the plan, and plans fill expanded coverages and class ranges in bulk. The remaining gap is mostly per-glyph table walking that harfrust
precomputes and per-call setup.

## Known differences

No glyph-result differences are known in the pinned non-macOS suite. The port
retains upstream's observable work-limit output, including partial results,
and the insertion driver's ignored Kashida-like setting.

The native API borrows `FontRef` bytes through `ShaperData` instead of duplicating
Rust's owning font/instance wrappers. `UnicodeBuffer` and `GlyphBuffer` name the
same checked `Buffer` type. Glyph views project from combined internal storage;
they are not Rust-layout slices or raw HarfBuzz strided pointers. Static
`FontFuncs` implementations replace Rust trait objects and closures; tracing
callbacks live in those implementations. Optional ICU and libm Rust dependency
switches have no Silk equivalent; the pinned Unicode tables are used directly.
Plan keys conservatively compare all variation coordinates. CLI differences
are described above.

Silk workarounds are documented and reproduced in
[`compiler-bugs/010`](../compiler-bugs/010-list-of-lifetime-struct/README.md)
(plans store table offsets instead of views, [silk-lang/silk#2425](https://github.com/silk-lang/silk/issues/2425)),
[`compiler-bugs/011`](../compiler-bugs/011-static-empty-slice/README.md)
(an owned one-element coordinate array, [silk-lang/silk#2428](https://github.com/silk-lang/silk/issues/2428)) and
[`compiler-bugs/012`](../compiler-bugs/012-list-shift/README.md)
(glyph insertion and removal, [silk-lang/silk#2431](https://github.com/silk-lang/silk/issues/2431)).
Neither the compiler nor its standard library is patched or vendored.

## License

The shaping port preserves harfrust's [MIT license](LICENSE), including the
HarfBuzz and rustybuzz notices. `read_fonts` and `font_types` retain their existing
MIT/Apache-2.0 licensing. Pinned fonts and Unicode data retain their upstream
notices and licenses.
