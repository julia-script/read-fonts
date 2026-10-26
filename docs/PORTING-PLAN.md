You are porting read-fonts (https://github.com/googlefonts/fontations/tree/main/read-fonts, with its dependency font-types) to Silk, a new systems language. read-fonts is Google's zero-copy, bounds-checked OpenType font parser. You know Rust; you do not know Silk yet. Learn it from its repository before writing code.

This port comes first. A later session will port HarfRust (the HarfBuzz shaper in Rust) on top of it, so the API should stay close to read-fonts: same table types, same field and method names (in Silk's camelCase), same error behaviour.

## Goal

Silk packages `font_types` and `read_fonts` that parse the same fonts the same way read-fonts does, proven by an identical text dump of every table field on fontations' test fonts and on HarfRust's test fonts.

## Repository layout

Create a new repo (working name `fontations-silk`) as a Silk workspace (`silk init --workspace`, then `silk init packages/<name> --lib`):

- `font_types`: port of `font-types` (GlyphId, GlyphId16, Tag, Fixed, F2Dot14, F26Dot6, Uint24, Offset16/24/32, MajorMinor, LongDateTime, BigEndian reads, BoundingBox, Point, etc.).
- `read_fonts`: the parser.
- `font_dump`: a binary that prints every field of every supported table of a font in a stable text format.
- `tools/font-codegen-silk/`: fontations' `font-codegen` crate, copied, with a new mode that emits Silk (see below).
- `upstream/`: fontations vendored at a fixed commit, read only.
- `scripts/`: harness tools, including a small Rust dumper built against upstream read-fonts that prints the same format as `font_dump`.

Package names must be identifiers (underscores, not hyphens). Path dependencies are the only kind supported, so HarfRust's port will add this repo as a git submodule.

## Toolchain

Install exactly this release and pin it in every `silk.toml` (`silk-version = "0.1.0-dev.17+1120049495d3"`):

    curl -fsSL https://raw.githubusercontent.com/silk-lang/silk/main/install.sh | SILK_RELEASE='v0.1.0-dev.17+1120049495d3' sh

Commands: `silk build`, `silk run -- <args>`, `silk test --root src/tests.silk`, `silk build --release`.

Never build, patch, or vendor the Silk compiler or standard library.

## Learn Silk first

Clone https://github.com/silk-lang/silk read only. Read `reference/index.md`, then `values-and-types.md`, `ownership-and-borrowing.md`, `lifetimes.md`, `generics-interfaces-and-specialization.md`, `typed-failures.md`, `functions-callables-and-control-flow.md`, `expressions-and-operators.md`, `patterns-and-destructuring.md`, `modules-names-and-visibility.md`, `testing.md`, and `lexical-form.md`. Read stdlib sources for idiom: `stdlib/silk/list.silk`, `option.silk`, `result.silk`, `u32.silk`, `unicode_tables.silk`, `inflate.silk`. `reference/stdlib/*.md` documents every module. When unsure whether something is valid, check the reference instead of guessing.

## The core design: generate, do not hand-translate

About 62,000 lines of read-fonts are generated (`read-fonts/generated/*.rs`) by `font-codegen` from compact table descriptions in `resources/codegen_inputs/*.rs`, driven by `resources/codegen_plan.toml`. Port the generator, not its output:

1. Copy `font-codegen` into `tools/font-codegen-silk/` and add a `silk-parse` mode next to the existing `parse` mode. It reuses the existing input parser and emits Silk: one table struct per table holding the borrowed bytes plus precomputed offsets of variable-length fields, accessor functions per field, offset resolution returning typed tables, format groups as nominal unions, flags and enums as Silk equivalents, records and arrays as zero-copy views.
2. Generate `read_fonts/src/generated_*.silk` with it. Never edit generated files; fix the generator.
3. Hand-port the hand-written parts of read-fonts: `font_data.rs`, `read.rs`, `offset.rs`, `array.rs`, `table_provider.rs`, `table_ref.rs`, the extension code in `src/tables/*.rs`, `collections/int_set`, and (later) `model/` and `ps/`.

Settle the generated shape on three tables first (head, maxp, cmap), review it against the reference, then generate the rest.

## Scope, in order

Phase 1, what HarfRust needs (do these first):

- font_types; FontData, FontRef (sfnt and `.ttc`), TableProvider, ReadError.
- Tables: head, maxp, hhea, hmtx, vhea, vmtx, VORG, OS/2, post, name, cmap (all formats including 14), loca, glyf (headers and bounding boxes), gvar, fvar, avar, variations (ItemVariationStore, DeltaSetIndexMap, TupleVariationStore), HVAR, VVAR, MVAR, GDEF, GSUB, GPOS, layout (ScriptList, FeatureList, LookupList, Coverage, ClassDef, contexts, FeatureVariations, devices), kern, kerx, morx, mort, aat (state tables, lookups), trak, ankr, feat, ltag, CFF, CFF2 (index, charset, charstrings enough for glyph bounds and glyph names).
- `collections/int_set` (HarfRust uses `U32Set`).
- `model/`: font/tables, charmap, metrics (glyph and scaled metrics, glyph extents), name/glyph names, variation. Only the parts HarfRust imports: `read_fonts::model::{Tables, Blob, TableFunction, Variation, charmap::Charmap, metrics::{GlyphMetrics, ScaledGlyphMetrics, GlyphExtents, Scale}, name::GlyphName}`.

Phase 2, after Phase 1 passes: base, gasp, hdmx, stat, meta, cvar, cpal, colr, sbix, cbdt/cblc, ebdt/eblc, svg, math, varc, dsig.

Out of scope: `ift`, the `closure` modules (subsetting support), `serde`, `experimental_font_api`, `agl`, write-fonts, skrifa, `no_std`/`libm` concerns, thread safety.

## Rust to Silk notes (verify each against the reference)

- Struct fields end with a comma, always: `struct S { a: u32, b: u16, }`.
- Borrowing structs carry a lifetime: `struct Head<'a> { data: FontData<'a>, }`. No self-referential structs, no `yoke`, no `once_cell`: compute eagerly or store offsets.
- C-like enums are scalar `enum`; data-carrying enums (format groups like `CoverageTable::Format1/Format2`) are nominal `union`. `Option`/`Result` come from `silk.option`/`silk.result`. `if let` and `while let` exist. Matching through a reference is `match &x.* { ... }`.
- Traits (`FontRead`, `FontReadWithArgs`, `TableProvider`, `ReadArgs`, `FixedSize`, `Scalar`) become `interface` + `impl`, static only. There is no `dyn`; use generics or unions. Read GEN-006 (recursive generic calls cannot grow type arguments) and the static-evaluation reference before designing generic offset resolution.
- Errors: `ReadError` stays a value. Pure accessors return `Result`/`Option`; use typed failures (`effect fn ... ! ReadError`, `fail`, `run`) only where it reads better. Only effect bodies may `fail`.
- Closures need a full contract: `fn(x: i32) -> i32 { return x + 1 }`.
- No iterator `for` loops and no macros: write `while` loops with a `usize` index. Iterator types in read-fonts become small cursor structs with a `next` function returning `Option`.
- No compound assignment: `x = x + 1`.
- Integer arithmetic traps on overflow. A parser must never trap on a malformed font: use checked arithmetic (`u32.checkedAdd`, `usize.checkedMultiply`) for every offset and length computation and return `ReadError.OutOfBounds`.
- No `as` casts. `u32.toU16(x)` traps when out of range, `u32.checkedToU16(x)` returns `Option`. There is no truncating or same-width signed/unsigned reinterpretation (needed for i16/i8 fields read from bytes), so write one `cast.silk` helper module in font_types and record it as a stdlib gap.
- `Vec<T>` is `silk.list` `List<T>`; growing it is an effect (`run List<T>.append(&mut list, value)` in an `effect fn ... ! OutOfMemoryError ? &mut Allocator`). Parsing itself is zero copy and should not allocate; only model caches and int_set do.
- No `bytemuck`: read big-endian scalars from byte slices by hand in font_types.
- Large static tables (Mac glyph names in post, CFF standard strings) are generated as packed byte strings decoded by index, the way `stdlib/silk/unicode_tables.silk` does. No giant `match` chains.
- Keywords that appear as Rust identifiers must be renamed: `run`, `move`, `drop`, `match`, `once`, `role`, `service`, `effect`, `fail` (full list in `reference/lexical-form.md`, LEXICAL-002).
- This release lacks two merged fixes: do not use `mod.silk` barrel modules, and do not write build output through a symlinked directory.

## Milestones (finish each gate before starting the next)

0. Harness: workspace, vendored upstream, the Rust reference dumper in `scripts/`, `font_dump` skeleton, a `scripts/compare` that runs both dumpers over a font list and prints the first differing line. Fonts: `upstream/font-test-data/test_data/ttf`, `.../ttc`, `.../extracted`, plus HarfRust's `harfrust/tests/fonts` (clone https://github.com/harfbuzz/harfrust). Gate: the Rust dumper runs on every font.
1. font_types and the hand-written core (FontData, reads, offsets, arrays, FontRef, table directory). Gate: unit tests ported from font-types and read-fonts core pass; directory dumps match.
2. The Silk codegen mode, proven on head, maxp, hhea, hmtx, post, name, OS/2, cmap. Gate: those tables dump identically on all fonts.
3. Generate GDEF, GSUB, GPOS, layout and their hand-written extensions. Gate: identical dumps on all fonts.
4. Variations: fvar, avar, variations, HVAR, VVAR, MVAR, gvar, glyf/loca headers. Gate: identical dumps, including delta values at a few fixed coordinates.
5. AAT: aat, morx, mort, kerx, kern, trak, ankr, feat, ltag. Gate: identical dumps.
6. CFF and CFF2 plus enough of `ps/` for charsets, glyph names and charstring bounds. Gate: identical names and bounds.
7. int_set and the `model/` subset listed above. Gate: ported model unit tests pass; charmap, metrics, extents and glyph names dump identically.
8. Malformed input: run every font truncated at many lengths and with random byte flips through both dumpers. Gate: no Silk trap anywhere, and the same tables report errors as upstream.
9. Phase 2 tables, then a speed comparison of `font_dump` against the Rust dumper (report the ratio).

Port read-fonts' own `#[test]` functions for each area as `test fn` (about 1,250 exist). Record pass counts after each working session in `PROGRESS.md`, and every deliberate deviation from read-fonts in `PORTING.md`.

## Compiler and stdlib problems: report, do not patch

Silk is pre-release and you will hit compiler bugs, especially around generics, lifetimes and specialization. A previous port (QuickJS) found five. When the compiler crashes, rejects code the reference says is valid, accepts code it says is invalid, or produces wrong results:

1. Reduce it to the smallest project that shows it: `compiler-bugs/NNN-short-name/` with `silk.toml`, `src/main.silk`, and a README giving the exact command, expected result, actual result and compiler output.
2. Add one line to `COMPILER-BUGS.md`.
3. Work around it with a `// compiler-bugs/NNN` comment, and keep going.

Missing standard library pieces go into `STDLIB-GAPS.md` the same way. Never modify the compiler or stdlib, and never pin a patched toolchain. These reports go back to the Silk maintainers, so make each one self-contained.

## Commits

Small commits with one topic each. Author and committer: `julia-script <94128293+julia-script@users.noreply.github.com>`. No Co-Authored-By trailers. fontations is dual MIT/Apache-2.0: keep both license files and the copyright notices.

Start with milestone 0, then report what you built and anything that surprised you about Silk.