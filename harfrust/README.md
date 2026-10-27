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
pin `0.1.0-dev.20+10a8c67813a1`.

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
`0.1.0-dev.20+10a8c67813a1` with Clang 18 against Rust 1.99.1, both release
builds. Lower is better.

| Font / text | Silk Ir | Rust Ir | Silk / Rust |
| --- | ---: | ---: | ---: |
| Roboto / English Little Prince | 460M | 65.3M | 7.04× |
| Roboto / English words | 610M | 87.9M | 6.94× |
| Noto Nastaliq Urdu / Persian Little Prince | 2,391M | 789M | 3.03× |
| Noto Nastaliq Urdu / Persian words | 2,389M | 847M | 2.82× |
| Noto Sans Devanagari / Hindi words | 933M | 225M | 4.14× |
| Amiri / Persian Little Prince | 1,277M | 374M | 3.42× |
| Source Serif Variable / react-dom | 5,044M | 1,004M | 5.02× |

The geometric mean is **4.35×**, down from 11.25× for the initial port. Plans
cache each lookup's subtables with per-subtable digests and expand class
definitions into per-glyph tables; ligature sets reject candidates by their
second component; shapers reuse default-instance metrics across calls; 16-bit
coverage tables are searched directly and value records are applied field by
field; contextual rule sets reject rules on their second input value without
walking the buffer, and format 3 rules check their first input coverage before
any other setup; ligature sets skip candidates the same way; plans keep a digest
of each contextual rule set's second input values, so a rule set none of whose
rules can match is skipped whole. The remaining gap is mostly per-glyph table walking that harfrust
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
[`compiler-bugs/007`](../compiler-bugs/007-bounded-self-result/README.md)
(interface bounds on consuming methods, [silk-lang/silk#2397](https://github.com/silk-lang/silk/issues/2397)) and
[`compiler-bugs/009`](../compiler-bugs/009-specialized-alias/README.md)
(explicit nominal constructors, [silk-lang/silk#2412](https://github.com/silk-lang/silk/issues/2412)).
`ShaperData.shaper` avoids the latter in normal use. Neither the compiler nor
its standard library is patched or vendored.

## License

The shaping port preserves harfrust's [MIT license](LICENSE), including the
HarfBuzz and rustybuzz notices. `read_fonts` and `font_types` retain their existing
MIT/Apache-2.0 licensing. Pinned fonts and Unicode data retain their upstream
notices and licenses.
