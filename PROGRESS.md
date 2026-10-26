# Progress

## Current status

Milestones **0–9 are implemented**, and their local gates are complete. The final
Phase 2 corpus and fixture comparisons pass in debug and release. The release
CLI benchmark reports **4.36× Rust's wall time** (54.61 s versus 12.52 s median).
The suites pass **862 read_fonts** and **64 font_types** tests, including **897
upstream ports** overall. Current evidence is in Session 53 below.

Milestones 0–8 are merged. Final CI, the repeated complete malformed campaign,
and merge status for milestone 9 are tracked in [PR #10](https://github.com/julia-script/read-fonts/pull/10).
The dated sessions below preserve the state of each checkpoint.

## Session 1 — 2026-10-25 — milestone 0 complete

The harness gate passes. The Rust reference dumper completed **566 / 566 font
files**, with **0 process failures**, **567 successfully parsed faces**, and
**1 explicitly recorded upstream parse error**. The Silk parser has not started.

### Delivered

- Workspace initialized with `silk init --workspace`; libraries initialized with
  `silk init ... --lib`. Every manifest pins `0.1.0-dev.17+1120049495d3`.
- Read-only fontations and HarfRust submodules at fixed commits; both fontations
  licenses retained at the root as well as in the snapshot.
- Rust reference dumper using the vendored read-fonts, covering sfnt/TTC directory
  fields, every face, table records, table lookup availability, and parse errors.
- Runnable Silk `font_dump` skeleton; path dependencies between the libraries.
- Font inventory, corpus runner, byte-exact first-line comparison, per-font timeout,
  process-failure detection, JSON evidence, and CI for this milestone.
- Original plan, dump protocol, porting decisions, and compiler/stdlib report indexes.

### Corpus

| Root | Font files | Excluded non-font files |
| --- | ---: | ---: |
| fontations `test_data/ttf` | 66 | 0 |
| fontations `test_data/ttc` | 1 | 1 |
| fontations `test_data/extracted` | 0 | 19 |
| HarfRust `harfrust/tests/fonts` | 499 | 9 |
| **Total** | **566** | **29** |

`extracted` contains glyph expectation text at this revision. It is preserved for
later model tests. HarfRust's `in-house/DFONT.dfont` is run, not skipped; read-fonts
reports `InvalidSfnt(0x00000100)`. The other 565 files yield 567 faces. No table
lookup was missing. This verifies the oracle process and directory observations,
not parsing of the table payloads.

Full evidence: [reports/milestone-0.json](reports/milestone-0.json), with input and
output SHA-256 for every font, plus errors and the full exclusion inventory.

### Validation

| Check | Result |
| --- | --- |
| Rust reference regression tests | 6 passed, 0 failed |
| Python harness regression tests | 11 passed, 0 failed |
| Upstream tests ported to Silk | **0** (starts at milestone 1) |
| Root and both Silk library builds | Passed |
| Silk CLI debug and release builds | Passed |
| Silk CLI help/version/usage/unimplemented status checks | 5 passed |
| Rust release build | Passed |
| Rust formatting and Clippy with warnings denied | Passed |
| Full Rust corpus gate | 566 completed, 0 process failures |
| Rust/Silk comparison | **Pending**, intentionally fails on the skeleton |

The expected comparison failure is line 3: Rust emits `file.length=6020`; Silk
emits `dump.status=unimplemented`, then exits 3. The harness exits 2. It does not
count this as a match or as an implemented directory parser.

Local tools: Silk `0.1.0-dev.17+1120049495d3`, Rust `1.99.1`, Clang `19.1.7`,
Python 3.12.14. No compiler or standard-library patch was needed. CI is configured;
its remote status is tracked on the pull request, separately from these local checks.

### Gates

- **0: passed** — harness and complete Rust corpus run.
- **1: next** — font_types, checked FontData/reads/offsets/arrays, FontRef and sfnt/TTC
  directories; port upstream core tests and make directory dumps match all inputs.
- **2–9: not started** — Silk codegen, layout, variation, AAT, CFF, model/int_set,
  malformed-input parity, Phase 2, and speed comparison.

Silk observations and upstream changes that affect the next gate are recorded in
[PORTING.md](PORTING.md). No new compiler bug was found in this session.

## Session 2 — 2026-10-26 — milestone 1 complete

The Silk scalar library and borrowed parser core are implemented. Directory dumps
match Rust byte for byte on **566 / 566 corpus files** in debug and release, with
**0 process failures or differences**. A separate set of **426 synthetic container
fixtures** also matches, including truncations, overflowing counts, null/out-of-range
records, unsorted/duplicate tags, and legacy/extended TTC directory lists.

| Check | Result |
| --- | --- |
| font_types Silk tests | **64 passed, 0 failed** (60 upstream ports, 4 additional) |
| read_fonts core Silk tests | **17 passed, 0 failed** (11 upstream ports, 6 additional) |
| Total upstream tests ported | **71** |
| Python harness regression tests | 12 passed, 0 failed |
| Rust reference regression tests | 6 passed, 0 failed |
| Rust formatting and Clippy with warnings denied | Passed |
| Root/libraries/CLI debug and release builds | Passed |
| Corpus directory parity, debug and release | 566 matches each |
| Synthetic container parity | 426 matches |
| Remote CI | Passed: run 40268463073, job 121395891939 |

The 60 font-types ports comprise fixed arithmetic (24), fixed formatting (11),
integer types (6), versions (2), tags (3), geometry (10), FWord (1), and borrowed
headers (3). Serde-only tests are outside the requested scope. The 11 core ports
comprise file/container tests (6), FontData (1), arrays (3), and variable reads (1).
The original variable-array fixture is retained alongside a three-item fixture.

Evidence: [debug report](reports/milestone-1-directory.json) and
[release report](reports/milestone-1-release-directory.json), including every input
and output hash. Tests and corpus comparison are now required CI steps.

Three standalone compiler reproducers and source-level workarounds are recorded in
[COMPILER-BUGS.md](COMPILER-BUGS.md). The pinned compiler and stdlib are unchanged.
API adaptations are recorded in [PORTING.md](PORTING.md).

Milestones 0 and 1 are merged as PRs #1 and #2. Milestone 2 is in progress;
milestones 3–9 are pending. Directory parity does not yet establish table payload
or model parity.

## Session 3 — 2026-10-26 — milestone 2 prototype gate passed

The copied upstream generator now has a `silk-parse` backend over its existing
parser and semantic analysis. The first generated shapes cover `head`, `maxp`, and
all `cmap` formats in the pinned grammar (including 14 and 15), plus its uppercase
MAXP and DMAP additions. Generated Rust and Silk traversal code compares every
exposed grammar field, reserved scalar fields, arrays and resolved offset targets.

**566 / 566 corpus dumps match**, with no process failures or differences:
[prototype evidence](reports/milestone-2-prototype.json). This exposed and fixed an
odd-tail array bug in the generator: remainder arrays round down to whole elements.

The current suites pass **64 font_types tests** and **22 read_fonts tests**;
**73 upstream tests** are ported in total (the prior 71 plus both head tests).
Three new tests cover generated minimum sizes/lazy optional fields, odd tails, and
unknown format payloads. The copied generator's 10 Rust tests, the reference's 6
Rust tests, and the harness's 12 Python tests also pass.

The prototype shapes are settled. Milestone 2 remains **in progress**: generate
hhea/hmtx/post/name/OS2, port handwritten extensions and their tests, then complete
the full milestone gate before merging. Milestones 3–9 remain pending.

## Session 4 — 2026-10-26 — milestone 2 core tables and name/metric extensions

All eight milestone tables now have generated borrowed views and concrete Rust/Silk
field traversal. The handwritten name, metrics, and post-name APIs are ported,
including UTF-16/Mac Roman decoding, language tags, extended-table selection, and
the bounded checkpoint cache for Pascal strings.

**566 / 566 dumps match**, including decoded names, post iterator results and direct
lookup probes, and horizontal metric lookups. The suites pass **64 font_types** and
**40 read_fonts tests**; **91 upstream tests** are ported in total. The ten post
ports include all three 2,000-name orders, checkpoint overflow, unreadable names,
and 65,535 glyphs referring mostly beyond the string data (68 ms in the debug run).

Milestone 2 is still **in progress**: cmap mapping/iteration and their upstream tests
remain, followed by the complete debug/release gate. Milestones 3–9 remain pending.

## Session 5 — 2026-10-26 — milestone 2 local gate complete

The full core-table gate passes in **debug and release: 566 / 566 files match**,
with no differences, process failures or traps. The scope includes every generated
field and resolved target in head/maxp/hhea/hmtx/post/name/OS2/cmap (including the
pinned uppercase extensions), plus decoded names, metrics, post glyph names,
cmap selection, nominal mappings, and format 14/15 variation sequences.

| Check | Result |
| --- | --- |
| font_types Silk tests | **64 passed** (60 upstream, 4 additional) |
| read_fonts Silk tests | **81 passed** (71 upstream, 10 additional) |
| Total upstream tests ported | **131** |
| Full corpus, debug and release | **566 matches each** |
| Focused table fixtures, debug and release | **500 matches each** |
| Container fixtures | **426 matches** |
| Generator tests / reference tests / Python tests | **10 / 6 / 12 passed** |
| Generated-file drift, Rust formatting, Clippy with warnings denied | Passed |
| Root, library, CLI debug/release builds and CLI help/version | Passed |
| Remote CI / merge | Pending PR |

New upstream ports in this session: 37 cmap tests (the closure test is explicitly
out of scope), plus three table-provider tests. Four provider tests involving
vertical metrics or extended outlines remain with those implementation areas;
they are not counted as ported. The extra default-view regression verifies the
upstream null backing pool and static format/tag contracts.

Evidence: [debug corpus](reports/milestone-2-core-tables.json),
[release corpus](reports/milestone-2-release-core-tables.json),
[debug table fixtures](reports/milestone-2-table-fixtures.json), and
[release table fixtures](reports/milestone-2-release-table-fixtures.json).
The focused fixtures include all known language IDs and neighboring holes,
malformed UTF-16, wide metrics, Pascal-string failures, cmap overlaps and UVS,
and every prefix of representative core-table payloads.

Compiler report 004 records unsupported generic interface defaults and the free
helper workaround. No compiler/stdlib changes were made. The large-dump deadline,
explicit codepoint conversions, and one malformed cmap10 wrapping case are
recorded in PORTING.md. Milestones 3–9 are still pending; the local milestone 2
gate is ready for remote CI and merge.

## Session 6 — 2026-10-26 — milestone 2 merged; layout implementation underway

Milestone 2 passed remote CI (run **40274115950**, job **121413083655**) and PR #3
is merged at **f425245**. Milestones 0–2 are complete.

Milestone 3 now generates borrowed layout/GDEF/GSUB/GPOS views, parameterized
records and lookup groups, typed offset arrays, flag-dependent fields, and the
GDEF ItemVariationStore dependency. Header precedence, value-record reads,
coverage/class lookup and iteration, and packed device deltas are implemented.

The current suites pass **64 font_types** and **115 read_fonts tests**. The
**165 upstream ports** include 34 new layout tests: five GDEF specification tests,
six GSUB tests, three ValueRecord tests, three header selection tests, three
script/feature specification tests, and fourteen coverage/class/device tests.
Ten additional read_fonts and four font_types regressions remain separate.

**Milestone 3 is incomplete:** remaining extensions/tests and generated differential
traversal are pending; no layout corpus-parity claim is made. The active corpus
protocol still covers milestone 2. Milestones 4–9 remain pending. Compiler report
005 has a reduced reproducer and a source workaround; the toolchain is unchanged.

## Session 7 — 2026-10-26 — layout helpers and condition evaluation

The current suites pass **64 font_types** and **158 read_fonts tests**, including
**208 upstream ports** in total. The 43 new read_fonts ports cover all 16 GPOS
specification tests, five GPOS record/search tests, nine script/feature tests,
seven condition-evaluation tests, and six lookup-variation tests. Condition
evaluation preserves errors under negation, limits recursion/work, and handles
unknown/null conditions. Lookup variations deduplicate shared lists.

The generic lookup/subtable helpers, script selection, language/feature helpers,
and GSUB/GPOS/GDEF provider methods are implemented. Compiler report 006 has a
reduced reproducer and a source workaround. No toolchain modifications were made.

**Milestone 3 is still incomplete:** differential traversal and the full gate
remain. Variation-store-dependent condition/selection helpers and tests need the
shared variation evaluation dependency; IntSet intersections remain with M7.
The active dump protocol still covers M2, and no layout parity is claimed.
Milestones 4–9 remain pending.

## Session 8 — 2026-10-26 — milestone 3 local gate complete

The layout field gate passes in **debug and release: 566 / 566 corpus files match**,
with no differences, process failures or traversal limits. The generated traversal
includes every layout/GDEF/GSUB/GPOS grammar field, typed offset array and nested
record, plus the ItemVariationStore dependency and ValueRecord scalar/device data.

| Check | Result |
| --- | --- |
| font_types Silk tests | **64 passed** (60 upstream, 4 additional) |
| read_fonts Silk tests | **159 passed** (149 upstream, 10 additional) |
| Total upstream tests ported | **209** |
| Full corpus, debug and release | **566 matches each** |
| Layout fixtures, debug and release | **2,650 matches each** |
| Core-table fixtures, debug and release | **500 matches each** |
| Container fixtures | **426 matches** |
| Generator / reference / Python tests | **10 / 6 / 15 passed** |
| Generated drift, Rust formatting, Clippy with warnings denied | Passed |
| Root/libraries/CLI debug and release | Passed |
| Remote CI / merge | Pending PR |

The layout fixtures include every prefix of the original GSUB/GPOS specimens,
extension lookups, GDEF and script/feature examples, extended-header precedence,
shared feature data read with different tags, and lookup variations.

Dump format 3 represents repeated table views with explicit node references. This
keeps malformed alias graphs finite without discarding fields. The harness now
streams output and rejects limit markers, dangling references and duplicate node
IDs; exact comparison includes every byte and final newline.

Evidence: [debug corpus](reports/milestone-3-layout.json),
[release corpus](reports/milestone-3-release-layout.json),
[debug layout fixtures](reports/milestone-3-layout-fixtures.json), and
[release layout fixtures](reports/milestone-3-release-layout-fixtures.json).

Dependency follow-ups remain explicit: variation-store delta callbacks and the
font-level SelectedFeatureVariations helper/tests are with M4; set intersection
methods/tests are with IntSet in M7. They are not counted as ported. Milestone 3
is ready for CI; milestones 4–9 remain pending.

## Session 9 — 2026-10-26 — milestone 3 merged; variation evaluation underway

Milestone 3 passed remote CI (run **40280884968**, job **121433687333**), including
the complete debug and release corpus gates. PR #4 is merged at **ccd61be**.
Milestones 0–3 are complete. Milestone 4 starts with shared variation-store
evaluation; milestones 5–9 remain pending. Test counts remain **64 font_types**
and **165 read_fonts**, including **215 upstream ports**, after five variation-store
tests and the fractional layout-condition test. Shared index mapping, region scalar
evaluation, cached scalars, and exact 48.16 deltas pass those tests. The M4 corpus
gate is pending.

## Session 10 — 2026-10-26 — axis normalization and feature selection

The suites now pass **64 font_types** and **185 read_fonts tests**, including
**235 upstream ports** in total. The 20 added ports cover all eleven fvar tests,
all six avar tests, and the three deferred coordinate-dependent layout selection
tests. Original font payloads cover Vazirmatn, the avar2 checker, Amstelvar, Material
Symbols, and the names-only font. Large-axis tests also exercise heap scratch.

The generator now handles records whose variable length is encoded in their own
prefix. fvar instances retain optional PostScript IDs; axis normalization keeps
the upstream indexed search and 16.16 avar2 precision. Feature selection resolves
GDEF deltas when needed. M4 remains incomplete: metric/glyph variation parsing,
outlines, and differential dumps are next. Milestones 5–9 remain pending.

## Session 11 — 2026-10-26 — metric variation evaluation

The suites pass **64 font_types** and **201 read_fonts tests** (**251 upstream
ports**). The 16 new ports cover all seven HVAR, three VVAR, and four MVAR tests,
plus variation-region contents and the fixed/float delta test over all rows of
the original variable COLR fixture at 21 locations. HVAR/VVAR preserve fractional
advances and partial scalar caches; MVAR preserves both rounded metric lookups
and exact instance values. The generated readers and provider methods compile.

Milestone 4 remains in progress: packed tuple/glyph variations, glyph outlines,
vertical metrics, and the full differential gate remain. These unit results do
not claim M4 corpus parity. Milestones 5–9 remain pending.

## Session 12 — 2026-10-26 — packed variation streams

The suites pass **64 font_types** and **218 read_fonts tests**, including **268
upstream ports**. Seventeen new ports cover packed point numbers, all four delta
run widths, bounded and unbounded iteration, fast skipping, scaled fetches,
coordinate-boundary splits, generated streams, and overflow regression cases.
Both scalar precisions preserve the upstream arithmetic, including the f64
residual test. M4's tuple/glyph variation layer and differential gate remain.

## Session 13 — 2026-10-26 — tuple variations and TrueType outlines

The read_fonts suite passes **248 tests**; font_types remains at **64**, for **298
upstream ports**. The 30 new ports cover the invalid intermediate-region scalar
case, all thirteen gvar tests, dense/sparse tuple accumulation, all thirteen glyf
tests, and loca ordering. Extended gvar cases exercise 65,537 glyphs, both offset
widths, 24-bit serialized-data offsets, malformed headers, and selection precedence.

Tuple iteration, fixed/float interpolation, shared scalar caches, phantom-point
deltas, simple point decoding, composite components/instructions, and loca lookup
are implemented. Original Skia, Vazirmatn, cubic outline and metric-inheritance
fixtures are preserved. The generator now handles gvar's computed offset entries,
glyf's signed format dispatch, and signed counts without trapping.

The generator's ten tests, Clippy with warnings denied, generated-file drift, and
library build pass. M4 remains incomplete: full glyph-delta interpolation helpers,
vertical metric dependencies, and differential traversal/gates remain. The active
corpus protocol still covers M3; these unit results do not claim M4 corpus parity.

## Session 14 — 2026-10-26 — complete glyph delta interpolation

The full read_fonts suite passes **271 tests**; with the unchanged **64 font_types**
tests this includes **321 upstream ports**. All 23 gvar/deltas tests pass: contour
interpolation and wraparound, equal-coordinate references, malformed contour ends,
real-font variation, output clearing between calls, short-buffer validation, and
agreement between table-level and glyph-data entry points.

`DeltaBuffers`, simple/composite delta evaluation, cached-scalar variants, and
inferred deltas for unreferenced points are implemented without parser allocation.
The generated-file drift check and library build pass. Milestone 4 still needs the
vertical metrics dependencies and the full differential dump gate; later milestones
remain pending.

## Session 15 — 2026-10-26 — vertical metrics and extended provider completion

The full suite passes **276 read_fonts tests**, with **64 font_types tests** and
**326 upstream ports** in total. The five new ports cover VORG origins and all four
provider tests deferred from M2: independent horizontal/vertical metric selection,
truncated/extreme metric counts, paired GLYF/LOCA selection, and rejection of missing
or malformed LOCA without using legacy offsets.

vhea/VHEA, vmtx/VMTX and VORG are generated, with their provider, selected-header,
metric lookup and origin helpers. Extended fixtures retain 70,002-glyph metric
counts and 65,537-glyph outline counts. The generator's ten tests, Clippy, library
build and drift check pass (**49 generated files**). M4's implementation tests are
ready; its expanded differential dumper, fixtures, corpus comparison and CI remain.

## Session 16 — 2026-10-26 — variation differential traversal

The full suite passes **277 read_fonts tests**, with the unchanged **64 font_types**
tests and **326 upstream ports**. The additional regression covers avar's suffix
accessor: its declared map count positions following fields, while the public
variable-record array retains the full suffix. The Amstelvar avar2 differential
smoke test exposed and verified this generator correction.

Both dumpers now cover all M4 grammar tables, original/extended vertical metrics,
loca/glyph payloads, tuple deltas, exact item-store/metric deltas, and four fixed
coordinate locations. Glyph graph scopes prevent equal-sized payload aliases.
The **12-font smoke gate** and **2,882 focused variation fixtures** pass. Rust's
**7 reference tests**, **15 harness tests**, generator's **10 tests**, Clippy and
**69-file generation drift** checks pass. The full debug/release corpus gates,
remaining fixture checks and CI are still running or pending; M4 is not yet complete.

## Session 17 — 2026-10-26 — milestone 4 local gate complete

The expanded format 4 dumps match **566 / 566 corpus files in both debug and
release**, with **0 differences and 0 process failures**. All **2,882 variation
fixtures** also match in both profiles. The new protocol additionally passes the
previous **426 container**, **500 core-table**, and **2,650 layout fixtures**.

The M4 implementation and upstream test ports are complete: axis normalization,
item/tuple variations, metric and glyph deltas including contour interpolation,
glyf/loca views, and vertical metrics/extended selection. The suites pass **64
font_types** and **277 read_fonts** tests (**326 upstream ports**). Seven Rust
reference tests, fifteen Python tests, ten generator tests, formatting, Clippy,
69-file generation drift, and both CLI builds pass.

Evidence: [debug corpus](reports/milestone-4-variations.json),
[release corpus](reports/milestone-4-release-variations.json),
[debug variation fixtures](reports/milestone-4-variation-fixtures.json), and
[release variation fixtures](reports/milestone-4-release-variation-fixtures.json).
The full outputs are compared byte for byte and hashed; tuple-delta evaluation
and glyph scope semantics are specified in `docs/DUMP-FORMAT.md`.

PR #5 is ready for CI and merge. Milestones 5–9 remain pending.

## Session 18 — 2026-10-26 — milestone 4 merged; AAT common tables

Milestone 4 merged as **PR #5** at `65c3bde` after every CI step passed
([run 40293432786](https://github.com/julia-script/read-fonts/actions/runs/40293432786)).
This includes the reference run, debug/release corpus comparisons, focused
fixtures, pinned compiler builds, unit tests, formatting and generated drift.

On the milestone 5 branch, all six AAT lookup formats and legacy/extended state
tables are implemented. All eight upstream aat tests pass, including the original
state transitions and typed payloads; cached-parts reconstruction is also checked.
The full suite passes **285 read_fonts tests**, with **64 font_types tests** and
**334 upstream ports** in total. The **70-file** drift check passes. Remaining
AAT tables, their extension tests, and the M5 differential gate are pending.

## Session 19 — 2026-10-26 — AAT table extensions and upstream tests

The complete suite passes **315 read_fonts tests**, with **64 font_types tests**
and **364 upstream ports**. Thirty new ports cover all seven morx tests, nine kerx
tests, four kern tests, six trak tests, two feat tests, and the ankr/ltag tests.
The original MORX and legacy kerning payloads are regenerated from the pinned
snapshot. The **78-file** drift check and generator formatting check pass.

All nine M5 table areas now have generated views and handwritten APIs: legacy and
extended metamorphosis state machines, cached parts, kerning format dispatch and
pair/class/vector lookups, tracking arrays, anchor points, feature settings and
language tags. Parser builds pass. The differential dumper still has M4 scope;
**M5 parity, debug/release corpus gates, CI and merge remain pending**.

## Session 20 — 2026-10-26 — AAT differential traversal and malformed searches

The suites pass **316 read_fonts tests**, **64 font_types tests**, and **364
upstream ports**. The additional regression checks Rust's binary-search candidate
on unsorted kerning pairs, features and all three searched AAT lookup formats.
The focused differential run exposed this distinction: an upper-bound search
agreed on sorted inputs but returned a different candidate on malformed records.
The parser now follows Rust's exact search steps.

Both dumpers implement format 5, covering all AAT grammar fields, decoded kinds,
state/lookup/action data and documented helper probes. The five original MORX
fonts and 42 seed fixtures match. The initial full debug corpus passed **566/566**,
and the previous **426/500/2,650/2,882** focused fixtures passed the expanded
protocol. The corrected search implementation still needs its complete AAT
fixture and final debug/release corpus gates. Generator/reference/harness tests
(**10/7/15**), Clippy, formatting, the **96-file** drift check and debug CLI build
pass. M5 is still in progress; no final parity report or merge is claimed yet.

## Session 21 — 2026-10-26 — milestone 5 local gate complete

Format 5 matches **566/566 corpus fonts** and **8,551 AAT fixtures** in both debug
and release, with **zero differences, process failures or traversal limits**.
All reports verify the final binary hashes. The previous **426 container**,
**500 core-table**, **2,650 layout** and **2,882 variation** fixtures also pass the
expanded debug protocol.

The suites pass **64 font_types** and **316 read_fonts** tests (**364 upstream
ports**). Generator/reference/harness tests pass **10/7/15**; formatting, Clippy
with warnings denied, **96-file** drift checks, and debug/release CLI builds pass.
AAT includes all requested table extensions and their upstream tests; mort has
no upstream unit tests at this revision and receives focused differential cases.

Evidence: [debug corpus](reports/milestone-5-aat.json),
[release corpus](reports/milestone-5-release-aat.json),
[debug fixtures](reports/milestone-5-aat-fixtures.json), and
[release fixtures](reports/milestone-5-release-aat-fixtures.json).
The fixtures preserve original examples, all compact prefixes, header mutations,
legacy state/substitution formats, unsorted search candidates, invalid UTF-8 and
independent equal-sized chains/subtables. Full helper observation rules are in
`docs/DUMP-FORMAT.md`.

PR #6 is open; remote CI and merge are pending. Milestones 6–9 remain pending.

## Session 22 — 2026-10-26 — milestone 5 merged; CFF foundations

Milestone 5 merged as **PR #6** at `b0d6ac3` after every CI step passed
([run 40301296730](https://github.com/julia-script/read-fonts/actions/runs/40301296730)).
Remote validation includes debug/release corpus and AAT fixture comparisons,
previous focused fixtures, unit tests, generation drift, formatting and Clippy.

The milestone 6 branch generates CFF/CFF2 headers, INDEX objects, charsets and
FDSelect tables from the pinned grammar. Handwritten code adds both INDEX
versions, checked object offsets, all charset mappings and iterators, all
predefined/custom encodings, font-DICT selection and packed standard strings.
All **31 upstream tests** in these areas pass. The complete suite passes **347
read_fonts tests**; font_types remains at **64**, for **395 upstream ports**.
The **98-file** generation drift and library build checks pass.

CFF/CFF2 top-level wrappers, numeric/DICT decoding, charstring evaluation, names
and bounds differential dumps are still pending. This is an implementation
checkpoint, not an M6 parity claim. Milestones 7–9 remain pending.

## Session 23 — 2026-10-26 — CFF numeric evaluation and blending

All **16 numeric/transform** and **11 stack/blend** upstream tests pass. The full
suite passes **374 read_fonts tests**, with **64 font_types tests** and **422
upstream ports** in total. These cover decimal precision, dynamic matrix scaling,
exponent-overflow consumption, metric transforms, degenerate matrices, operand
coercion and permissive stack reads, delta prefix sums, and region blending at
seven coordinates using the original CFF2 example.

The implementation keeps the 513-operand stack and 16-scalar cache without parser
allocation. The existing generic-operator compiler workaround is reused; no new
compiler issue or toolchain modification was needed. Library and **98-file**
drift checks pass. DICT decoding, top-level CFF/CFF2 access, charstring evaluation
and the M6 differential gate are still pending.

## Session 24 — 2026-10-26 — CFF DICTs and table access

All **15 DICT and CFF/CFF2 table-access upstream tests** pass. The complete suite
passes **389 read_fonts tests**, with **64 font_types tests** and **437 upstream
ports**. Validation covers token errors, variable private dictionaries, matrix
precision and degeneracy, malformed ranges, font names and glyph-name lookup.
The library build and **98-file** generation drift check pass.

Top-level Cff/Cff2 types and table-provider methods now expose parsed indexes and
metadata inputs. Unified CFF font/subfont access, charstring evaluation and the
names/bounds differential gate remain in progress; no M6 parity is claimed.

## Session 25 — 2026-10-26 — unified CFF font access

The unified font layer passes **18 additional upstream tests**, covering CFF
version selection, metadata, charsets, encodings, subfont selection, private
widths and hinting values, empty private dictionaries, checked variation/subr
range arithmetic and nested font matrices. The complete suite passes **407
read_fonts tests**, with **64 font_types tests** and **455 upstream ports**.
The library build passes. Seven font tests that require charstring evaluation
remain pending along with the evaluator and M6 differential gate.

## Session 26 — 2026-10-26 — CFF charstrings and glyph measurements

All **32 charstring tests** and the remaining **7 CFF font tests** pass. The full
suite passes **446 read_fonts tests**, with **64 font_types tests** and **494
upstream ports**. The interpreter covers path construction, hint callbacks,
subroutines, accent components, CFF2 blends, legacy shared arithmetic and flex,
transient storage, multiple-master operators and the one-million-operation limit.
The BuildChar test also exercises the transition beyond its 32 inline entries.

CFF glyph APIs now provide full and quick widths, scaled advances, drawing and
control-point bounds. Tests compare every glyph in the original Noto and icon
fixtures, prove that a sheared outline is tighter than its transformed box, and
check moving CFF2 bounds at three variation locations. Library builds pass.
The M6 names/bounds differential dump and corpus/fixture gates are next; M6 is
not complete and milestones 7–9 have not started.

## Session 27 — 2026-10-26 — CFF differential traversal

Format 6 adds generated CFF/CFF2 field dumps, complete decoded DICT operands,
FDArray/FDSelect and private/local-subroutine links, custom encoding records,
font metadata, names, widths and bounds at four normalized locations. All **78
focused seed fixtures** match after this expansion. The earlier measurement-only
protocol passed 253 CFF corpus fonts and 9,146 CFF fixtures; those observations
are preliminary and do not substitute for the expanded protocol's final gate.

The public PostScript facades and fixture runner are added, and CI now includes
CFF fixtures in debug and release. Unit counts remain **446 read_fonts**, **64
font_types**, and **494 upstream ports**. Full expanded corpus, mutation and
release checks are running; M6 remains in progress until those finish.

## Session 28 — 2026-10-26 — milestone 6 gate complete

CFF/CFF2 names, widths, transformed bounds and table fields match Rust byte for
byte on **566 / 566 corpus fonts** and **9,146 / 9,146 CFF fixtures** in both debug
and release. There are **0 differences and 0 process failures**. The final
format-6 debug protocol also passes **426 container**, **500 core-table**, **2,650
layout**, **2,882 variation** and **8,551 AAT** fixtures. The largest FDArray fixture
now emits **8,136,793 lines**, all compared without suppressing fields.

All **130 upstream tests** in this milestone are ported. Totals remain **446
read_fonts tests**, **64 font_types tests**, and **494 upstream ports**. The
**102-file generation drift**, **10 generator tests**, **7 reference tests**, **15
harness tests**, library/debug/release builds, CLI checks, Rust formatting and
Clippy with warnings denied pass. No new compiler bug or toolchain patch was
needed. CI and merge status are tracked on PR #7 separately from these local gates.

Complete per-font observations and matching binary hashes are saved in
[debug corpus](reports/milestone-6-cff.json),
[release corpus](reports/milestone-6-release-cff.json),
[debug fixtures](reports/milestone-6-cff-fixtures.json.gz) and
[release fixtures](reports/milestone-6-release-cff-fixtures.json.gz).
Compressed reports retain every observation, including malformed dictionary errors.
Milestones **0–6 pass**; **7 is next**, followed by malformed-input parity and
Phase 2/speed comparison. The full port remains in progress.

## Session 29 — 2026-10-26 — sparse-set bit pages

All **27 upstream BitPage tests** pass, including bit scans, forward/reverse
iteration, insertion/removal across word boundaries, range coalescing, set
operations, hashing and cached lengths. Totals are **473 read_fonts tests**, **64
font_types tests**, and **521 upstream ports**. Stdlib gap 004 records the missing
integer bit counts and local workaround. U32Set, invertible IntSet and the model
subset remain in progress; the M7 gate has not been claimed. M6's final CI is
running on PR #7 while this work proceeds from its passing local gate.

## Session 30 — 2026-10-26 — U32Set

All **36 upstream U32Set tests** pass. The complete suite passes **509 read_fonts
tests**, with **64 font_types tests** and **557 upstream ports**. The library
build passes. Tests cover ordered and mixed-direction iteration, coalesced ranges,
full-u32 boundaries, set operations, emptied pages, insertion order, lookup order,
hashing, subset checks and intersection counts. Invertible IntSet, sparse encoding,
deferred layout intersections and model APIs remain pending for M7.

## Session 31 — 2026-10-26 — invertible integer sets

All **45 IntSet tests** independent of sparse decoding pass, including normal and
inverted membership, domain boundaries, mixed-direction iteration, ranges, set
operations, subset checks, ordering, equality and hashing. Totals are **554
read_fonts tests**, **64 font_types tests**, and **602 upstream ports**. The last
IntSet test awaits sparse decoding. Compiler bug 007 has a minimal reproducer;
putting the domain bound on cursor methods avoids the unsupported interface
result without modifying the compiler. M6 PR #7 is merged after successful CI.
The M7 sparse encoding, deferred layout intersections and model gate remain.

## Session 32 — 2026-10-26 — complete integer-set serialization

All **10 input-stream**, **6 output-stream**, **22 sparse-set**, and the final
**1 IntSet sparse-decoding** tests pass. Totals are **593 read_fonts tests**,
**64 font_types tests**, and **641 upstream ports**. The entire integer-set test
suite is ported, including exact encoded bytes, all four branch factors, filled
nodes, bias, bounds, remaining input, size limits and values beyond u32. The M7
layout intersections and model unit/differential gate remain pending.

## Session 33 — 2026-10-26 — deferred layout intersections

All **7 IntSet-dependent layout tests** deferred from M3 pass. Coverage and class
intersections are generated with the handwritten extensions, including narrow
and wide formats, empty tables and truncated class arrays. Totals are **600
read_fonts tests**, **64 font_types tests**, and **648 upstream ports**. Library
build and 102-file regeneration pass. M7's model subset and differential gate
are next; this is not yet a completed M7 gate.

## Session 34 — 2026-10-26 — model byte ownership and table access

Blob, TableFunction, Tables and Variation build with **604 read_fonts tests** and
**64 font_types tests** passing. Two complete upstream model table tests cover
unsorted directories and callback byte parity, bringing the upstream-port count
to **650**. Two additional checks cover raw missing tables and repeated validation
errors. The upstream missing-tables test's CBDT/DSIG typed assertions remain for
Phase 2; its CFF assertion already passes. Model table forwarding covers all
**64 catalog tags** and the **48 currently supported typed methods**.

PR #8 is a draft. Charmap, glyph names, glyph/scaled metrics and the M7 differential
gate remain in progress. Eager callback snapshots, copied owned blobs and repeated
validation are documented ownership adaptations; no compiler change was needed.

## Session 35 — 2026-10-26 — model glyph names

All **10 in-scope upstream glyph-name tests** pass. Totals are **614 read_fonts
tests**, **64 font_types tests**, and **660 upstream ports**. Tests cover post/CFF
lookup and iteration, partial/bad post entries, CID synthesis, character-boundary
truncation, full-name reverse lookup and absent name tables. The separate Type 1
test and Type 1 branch of a mixed test are outside scope. A fixture generator bug
that skipped a one-digit hex literal was fixed in the generator; no parser change
was needed. Library build passes. Charmap and glyph/scaled metrics remain for M7.

## Session 36 — 2026-10-26 — model charmap

All **16 in-scope charmap tests** pass, including the callback-cache test adapted
to the documented eager snapshot ownership model. Totals are **630 read_fonts
tests**, **64 font_types tests**, and **676 upstream ports**. Tests cover scalar
and cached batches, large forward/reverse inputs, individual encoding identity,
DMAP overrides, format 14/15 variants, symbol fallback, Mac Roman conversion,
format-0 iteration and standalone/CID CFF without AGL. The two Type 1-only tests
are excluded. Compiler bug 008 records a minimal rejected generic unsafe drop;
an intermediate binding works. Glyph/scaled metrics and the differential model
gate remain for M7; M8–M9 have not started.

## Session 37 — 2026-10-26 — glyph metrics and scaling foundation

The complete suite passes **650 read_fonts tests** and **64 font_types tests**.
The new tests comprise all **16 in-scope global-metrics tests**, **2 glyph-metrics
tests**, and **2 scaled-metrics tests**, bringing the upstream-port count to
**696**. Global tests cover line choice, signs, missing tables, em normalization
and MVAR precision; initial glyph checks cover out-of-range advances, moving
variable ink, scaled advances and halving. The Type 1 global test is excluded.

Glyph/scaled metrics, explicit static conversion callbacks and an unhinted glyf
loader now build. The loader reuses gvar interpolation, preserves composite
metrics/transforms and bounds its traversal. Floating-point interpolation no
longer incorrectly requires a total ordering. Data and coordinate lifetimes are
separate. Generator drift passes. Remaining glyph/scaled unit tests, the M7
model/intersection dump protocol and differential corpus gate are still pending;
bitmap/color/VARC model coverage follows their Phase 2 parsers. M8–M9 have not
started, and no completion of M7 is claimed.

## Session 38 — 2026-10-26 — Phase 1 model metrics unit gate

The complete suite passes **719 read_fonts tests** and **64 font_types tests**,
with **765 upstream ports**. This checkpoint adds **39 glyph-metrics tests**,
**25 scaled-metrics tests** and **5 glyph-source-order tests**. The totals for
those areas are now 41 glyph tests and 27 scaled tests. All in-scope Phase 1
model unit tests are ported; the six lazy-cache tests assert the corresponding
eager-snapshot behavior documented in PORTING.md.

Tests cover extended glyph IDs, long-metric tails, missing metrics, HVAR/VVAR
versus gvar phantom deltas, negative/fractional advances, altered/truncated side
bearings, empty and absent ink, all outline-source batches, custom scales and
extents providers, VORG precedence, vertical phantoms and line centering. The
public metric constructor now collapses all-zero coordinates to the default
location. Three generated expectation blobs run the pinned Rust drawing paths
for the varied-glyf and CFF/CFF2 bounds tests; every fixture glyph is compared.
Generator drift and Rust all-target clippy pass; 33 model fixtures are generated.

Five Type 1 glyph tests and two tests of the unrequested ScaledMetrics/style
facade are outside scope. Ten bitmap/color/VARC glyph tests, one bitmap-scale
test and one narrow-source conversion test follow their Phase 2 dependencies.
The M7 format-7 model/intersection dump and corpus comparisons remain pending;
PR 8 stays a draft. M8–M9 have not started, and the overall port is not complete.

## Session 39 — 2026-10-26 — milestone 7 local gate complete

Format 7 compares public Tables, Charmap, glyph names and reverse lookup, global
and glyph metrics, F32/26.6 scales, extents at four normalized locations, and
Coverage/ClassDef integer-set intersections. Debug and release both match all
**566 corpus fonts** and **154 focused model fixtures**, with no differing lines.
The complete unit suite remains **719 read_fonts tests**, **64 font_types tests**,
and **765 upstream ports**.

All prior focused debug gates pass: 426 containers, 500 core tables, 2,650 layout,
2,882 variations, 8,551 AAT and 9,146 CFF fixtures. Release AAT and CFF gates also
pass. Generation drift (102 outputs and 33 model fixtures), Rust formatting,
10 generator tests, 7 reference tests, all-target Clippy and 15 Python tests pass.

The initial debug corpus run matched 429 fonts before the 65,535-glyph FDArray
font exceeded its 120-second process limit. The remaining 137 matched with a
600-second limit. The combined debug report verifies every input/binary hash and
records that provenance; the release run completed all 566 uninterrupted. CI
will rerun the full corpus from the beginning with the longer timeout.

Evidence: reports/milestone-7-model.json, milestone-7-release-model.json,
milestone-7-model-fixtures.json and milestone-7-release-model-fixtures.json.
PR #8 is ready for CI review. M8 malformed-input campaigns and M9 Phase 2 tables
and performance remain; the overall port is not yet complete.

## Session 40 — 2026-10-26 — deterministic malformed-input campaign

M7 PR #8 is in CI. M8 adds a reproducible whole-corpus campaign with dozens of
truncation boundaries and eight seeded byte-flip variants per font. Each case
compares the complete dump, validates graph references and records exact hashes
and error counts. Both crashes and timeouts fail; identical failures never count
as matches. Per-source receipts only reuse successful observations when source,
binary and campaign hashes/settings agree. Failure artifacts remain reproducible.

The Python suite now passes **19 tests**, including crash/timeout rejection and
resume invalidation. Library counts remain **719 read_fonts**, **64 font_types**,
**765 upstream ports**. The full release campaign is running; M8 is not yet
complete, and M9 has not started.

## Session 41 — 2026-10-26 — malformed gvar range parity

The initial corruption run found a raw gvar-data difference on a mutated HarfRust
font: Rust treats a reversed range as empty, while Silk returned OutOfBounds. The
shared narrow/extended implementation now matches Rust's Range::is_empty. One
new regression test covers both table formats, both offset widths, reversed
bounds inside/outside the table, and equal out-of-bounds offsets. Twelve focused
differential fixtures cover the same cases.

The focused gvar root passes **50 tests** (including its 34 imported PostScript
tests). The full suite passes **720 read_fonts tests**, with unchanged
**64 font_types** and **765 upstream ports**. The
Python suite passes **20 tests**, now also proving binary snapshot isolation.
The initial campaign was stopped to rebuild and rerun every mutation against
the corrected binary; no final M8 gate is claimed yet.

The repaired font now matches in both debug and release. All **2,894 variation
fixtures** pass in debug, including the twelve new reversed/equal-range cases.
The generator drift check passes for all 102 outputs and 33 model fixtures.
The corrected whole-corpus campaign is still running with no further difference
observed at this checkpoint.

## Session 42 — 2026-10-26 — milestone 8 local gate complete

The corrected release campaign matches **23,188 / 23,188 corrupted inputs** from
all **566 corpus files**: **18,660 truncations** (31–33 lengths per font) and
**4,528 byte-flip variants**. There are **0 differing dumps**, **0 process/harness
failures**, and **0 Silk traps** in this campaign. The complete matching dumps
include **2,311,472 table/container error observations**. Every recipe, source
hash, mutated-input hash and binary hash was revalidated before publishing the
compressed report; no partial initial-run observation was reused after the fix.

All **720 read_fonts tests**, **20 Python harness tests**, generation drift checks
and **2,894 focused debug variation fixtures** pass. The previously failing
whole-font mutation also matches in debug. font_types remains at **64 tests**,
and the upstream-port count remains **765**; the new range test is a regression.
Evidence: reports/milestone-8-malformed.json.gz and
reports/milestone-8-variation-fixtures.json.gz.

M7 CI run **40341358973**, job **121636615554**, passed all debug/release corpus
and focused gates, and PR #8 is merged. PR #9 contains M8, with the corruption
campaign required in CI. Its final CI gate remains before merging. M9 Phase 2
tables, their dependent model tests, and the speed ratio are next; the complete
port is not yet finished.

## Session 43 — 2026-10-26 — Phase 2 foundation

BASE, gasp, hdmx, STAT, meta, cvar, CPAL, SVG and DSIG have generated borrowed
parsers, public provider/model forwarding, and their handwritten extensions.
The complete suite passes **741 read_fonts tests** (21 new), including **20 new
upstream test ports**, for **785 upstream ports** overall. The additional test
covers CPAL v1 typed scalar-array offset counts. The focused root passes 55 tests,
including its 34 imported PostScript tests. font_types remains at 64 tests.

The nine table families are being added to format-8 differential traversal.
The remaining bitmap/color/math/VARC families, dependent model behavior, complete
Phase 2 parity gates and performance ratio remain pending. M9 is not complete.

The foundation dump now builds and **504 focused Phase 2 fixtures match** Rust,
including per-table prefixes, invalid counts/offsets, CPAL v1 typed arrays, metadata
UTF-8 errors and DSIG length validation. All 129 generated outputs pass the drift
check, and the generator's 10 tests pass. A stale local compiler semantic cache
caused invalid symbol-resolution diagnostics; a clean cache builds successfully.
A reduced cache reproducer is still being investigated. The full debug corpus
comparison is running against immutable copies of the foundation binaries.

## Session 44 — 2026-10-26 — Phase 2 bitmap tables

The shared bitmap grammar and sbix, CBDT/CBLC and EBDT/EBLC are implemented,
including all five location formats and all supported image formats. Their nine
upstream tests pass; the full parser suite passes **750 read_fonts tests**, and
**794 upstream tests** are ported overall. font_types remains at 64 tests.

**1,850 / 1,850 Phase 2 fixtures match** in debug, with zero differences/process
failures. They include all location/image-format combinations, sparse glyphs,
truncated paired tables, corrupt location offsets/counts and sbix equal-sized,
empty, reversed and out-of-range glyph slices. Both dumpers include each bitmap's
metrics and complete content. Generated model forwarding now has 62 typed methods.
Evidence: reports/milestone-9-bitmap-fixtures.json.gz.

The foundation corpus run initially hit the harness's default 30-second limit on
AdobeBlank2; it was restarted with the established 600-second corpus limit and is
still running against fixed binary copies. COLR, MATH, VARC, dependent model
behavior/tests, the final parity gate and performance measurement remain pending.

All 147 generated outputs pass the drift check. Rust Clippy passes with warnings
as errors after the dump generator learned that fixed-size embedded record getters
already return a reference. This changes borrowing syntax, not dump observations.

## Session 45 — 2026-10-26 — COLR and shared format accessors

All 33 COLR paint formats, clip boxes and color records are generated. Handwritten
v0/v1 glyph, layer and clip lookups preserve upstream error/absence behavior.
The two COLR upstream tests plus two helper/paint-identity regressions pass.
The complete suite passes **754 read_fonts tests**, and the upstream-port count
is **796**. Generator tests (10) and Rust Clippy with warnings denied pass.

**2,349 / 2,349 focused Phase 2 fixtures match** in debug, including all 33 paint
headers at every prefix, short/invalid paint targets, unknown formats and real
static/variable COLR fonts. Evidence: reports/milestone-9-colr-fixtures.json.gz.
The generator also supplies shared format-group field getters and MinByteRange,
replacing the handwritten BASE coordinate wrapper and covering the COLR group API.

The earlier foundation binaries completed the full corpus: **566 / 566 matches**,
zero differences/process failures (reports/milestone-9-foundation-corpus.json.gz).
That report covers the first nine Phase 2 families, before bitmap/COLR landed.
The final complete Phase 2 debug/release corpus gate remains pending.

CI now requires focused Phase 2 comparisons in debug and release. MATH, VARC,
the dependent model implementations/tests and the speed ratio remain. M8 CI has
passed all debug/release fixture checks and is running the corruption campaign;
M9 remains draft PR #10.

All 150 generated outputs, 13 Phase 2 packed fixtures and 33 model fixtures pass
the drift check. The 20 Python harness tests also pass at this checkpoint.

## Session 46 — 2026-10-26 — MATH

MATH's generated tables and handwritten helpers are complete, including all 56
constant selectors, device adjustments, glyph corrections, kerning bands and
stretch constructions. Its 12 upstream tests and one positive-coverage regression
pass; the full suite passes **767 read_fonts tests**, with **808 upstream ports**
overall. font_types remains at 64 tests.

**2,738 / 2,738 focused Phase 2 fixtures match** in debug. MATH is tested at every
byte prefix, and the dumps compare all constants at six pixel sizes plus kerning
band queries and per-entry adjustments. Evidence:
reports/milestone-9-math-fixtures.json.gz. All 153 generated outputs, 14 packed
Phase 2 fixtures and 33 model fixtures pass the drift check. Both dumpers build,
Rust Clippy passes with warnings denied, and generator formatting passes.

VARC, the dependent model work, final debug/release corpus comparisons and the
speed ratio remain pending. M8 CI is still running its malformed-input campaign.

## Session 47 — 2026-10-26 — VARC table gate

VARC is generated and exposed through providers and model Tables. All **45
upstream VARC tests** pass, covering sparse region offsets/counts/scalars, all
condition formats, component flags and reserved payloads, 24-bit glyph IDs,
packed axis values, randomized varints/delta runs, transforms and multivar data.
The complete suite passes **812 read_fonts tests**; **853 upstream ports** are
complete overall. font_types remains at 64 tests.

**3,550 / 3,550 focused Phase 2 fixtures match** in debug, including every prefix
of constructed VARC component streams, all 32 flag bits, subsequent components,
varint boundaries, packed-run truncations and degenerate sparse regions. Dumps
include component fields, bitwise transform matrices, decoded delta sets and
region scalars at four coordinates. Evidence:
reports/milestone-9-varc-fixtures.json.gz. The 156 generated outputs, 18 Phase 2
fixtures and 33 model fixtures pass drift checks. All 10 generator tests, Rust
formatting and Clippy with warnings denied pass; root, library and CLI builds pass.

All requested Phase 2 table families are now implemented. A complete debug
corpus run is starting against immutable binary copies. Bitmap/COLR/VARC model
extents and deferred tests, the final debug/release gates and speed comparison
remain before M9 can be marked complete. M8 CI is still on its malformed campaign.

## Session 48 — 2026-10-26 — bitmap model metrics

GlyphMetrics now measures sbix, CBDT and EBDT according to its source order. It
selects one strike for the requested size, falls through if that strike lacks
the glyph, resolves bounded sbix dupe chains and PNG dimensions, and preserves
upstream bitmap pixel validation and whole-font-unit rounding. Scaled metrics
pass the scale's requested ppem through the existing selection hook.

The two deferred bitmap glyph tests, the bitmap-scale test and the narrow-source
round-trip test pass. The missing-tables test now checks typed CBDT and DSIG
errors, completing that upstream port. Totals: **816 read_fonts tests**,
**64 font_types tests**, and **858 upstream ports**. Three generated expectations
come from upstream's independent bitmap-selection API; a generated font removes
glyph 2 specifically from its 16 ppem strike. The focused root passes 82 tests
(including its 79 imported VARC/PostScript tests).

Generator drift passes for 156 outputs, 36 model fixtures and 19 Phase 2 fixtures.
Rust all-target Clippy and formatting pass. COLR/VARC model extents, the remaining
eight deferred glyph tests, final parity gates and the speed comparison remain.
The immutable full-table debug corpus run is still in progress.

## Session 49 — 2026-10-26 — VARC model bounds and M8 merge

M8's final CI run 40347108464 passed all gates, including the complete malformed
corpus. PR #9 is merged as 12d7fdf381f1090ed68aded9275315708a03a13b, and the M9
PR now targets main. The immutable complete Phase 2 table run also finished:
**566 / 566 debug corpus files match**, with no differences or process failures.
Evidence: reports/milestone-9-tables-corpus.json.gz (this snapshot still uses
base-outline-only model dumps).

GlyphMetrics now measures VARC composites through their drawn control points,
with component coordinates, reset semantics, sparse tuple deltas, conditions,
transforms, cycles and full-graph validation. Static internal gvar axes are
retained even when the root font has no variation coordinates. Four independent
upstream drawing fixtures cover CJK, conditionals, static gvar and delta precision.

The deferred VARC glyph-metrics test and **14 upstream VARC model tests** pass,
plus three regressions for additional fixture coverage, repeated axes and hidden
malformed/deep graphs. The full suite passes **834 read_fonts tests** and the
focused Phase 2 model root passes 100. **873 upstream ports** are complete
overall; font_types remains at 64 tests. Generator drift passes for 156 outputs,
40 model fixtures and 45 Phase 2 fixtures. Rust formatting and all-target Clippy
with warnings denied pass.

COLR model bounds and seven deferred glyph tests, the full-source model dump,
final debug/release and malformed comparisons, and the speed ratio remain before
M9 is complete. The allocator-backed traversal's scratch/cache adaptations are
recorded in PORTING.md.


## Session 50 — 2026-10-26 — COLR bounds and complete model observations

COLR model bounds now cover every paint format, variable clip boxes, v0 layers,
outline clips, transform peeling, gradients, compositing and bounded graph walks.
All seven remaining deferred glyph-metrics tests pass, including source orders,
color-only clips and mixed sources. Fourteen upstream COLR dependency tests and
three bounds tests are also ported, with two additional regression tests.
The complete suite passes **860 read_fonts tests**, with **897 upstream ports**
overall; font_types remains at 64 tests. No requested Phase 2 model tests remain
deferred. Scratch/cache and drawing-only adaptations are documented in PORTING.md.

Dump format 9 measures the complete default bitmap/COLR/VARC/base-outline chain,
with six explicit source orders and bitmap strike selection at 12 and 64 ppem.
Independent Rust expectations now cover seven source orders and the real color
fixtures. The focused model corpus expands from 154 to **356 cases**; the Phase 2
corpus remains 3,550. All 156 generated outputs, 54 model fixtures and 47 Phase 2
fixtures pass regeneration checks. Rust formatting and all-target Clippy pass,
as do all 20 Python harness tests. The updated debug CLI builds successfully.

Full-source debug/release parity, the final malformed-input campaign and speed
comparison are in progress. These gates must pass before M9 can be completed.
A temporary workspace connection outage recovered with the changes intact.


## Session 51 — 2026-10-26 — source-order boundary regressions

The complete Phase 2 fixture corpus passes **3,550 / 3,550** comparisons with
format 9. An additional mixed bitmap/outline font with a shortened maxp count
exposed upstream's distinction between one-source and mixed-source glyph bounds.
The port now preserves that distinction and continues to layered sources after
a selected base cannot measure a glyph. Two new regression tests pass, bringing
the suite to **862 read_fonts tests**; upstream ports remain **897**.

The model corpus now has **360 fixtures**, adding explicit maxp boundaries and
short-loca fallbacks. Its 4,096-deep condition fixture is tested directly by the
ported model test, not passed to a field dumper whose graph bound it exceeds.
The first expanded run correctly rejected that incomplete dump after 336 matches;
that run is not a completed parity gate. A corrected full run is underway.
Generator drift, all 10 generator tests and all 7 Rust reference tests pass.
Release builds and remaining complete-corpus gates are in progress.

## Session 52 — 2026-10-26 — complete release parity and reproducible timing

The complete format-9 release gate passes: **566 / 566 corpus files**, **360
model fixtures**, **3,550 Phase 2 fixtures**, **8,551 AAT fixtures** and **9,146
CFF fixtures** match, with no differences or process failures. A focused corruption
run passes **530 / 530 mutations** of 13 real bitmap, COLR and VARC fonts.
The final-source debug model, core, layout, variation and AAT gates also pass;
the complete debug corpus and remaining focused checks are still running.

Counts remain **862 read_fonts tests**, **64 font_types tests**, and **897
upstream ports**. All 10 generator tests, 7 reference tests, 20 harness tests,
formatting, Clippy, regeneration and debug/release builds pass. The unreproduced
incremental-cache incident is documented without claiming a ninth compiler bug.

`scripts/benchmark` now measures complete release CLI runs over the fixed corpus:
one warmup per program, three timed rounds in alternating program order, and the
ratio of median Silk to Rust wall time. Reports retain binary/input hashes,
per-font samples and machine metadata. CI runs and uploads the same benchmark.
The speed result is pending; no ratio is claimed at this checkpoint.

Workspace restarts interrupted long local comparisons. A local recovery wrapper
now delegates each case to the production harness and retains completed receipts
bound to the input and both executable hashes. Incomplete or failed cases never
count as matches. The final reports identify this recovery method; CI runs the
ordinary complete commands independently. All production code is pushed in PR #10.


## Session 53 — 2026-10-26 — milestone 9 local gates complete

All requested Phase 2 tables and dependent model APIs are implemented. Full-source
format-9 dumps match on **566 / 566 corpus files** in both debug and release.
Both modes also pass **9,146 CFF**, **360 model**, **3,550 Phase 2**, and **8,551
AAT fixtures**. The remaining debug gates pass **426 container**, **500 core-table**,
**2,650 layout**, and **2,894 variation** fixtures. There are zero differences or
process failures in these completed comparisons. The compressed
reports/milestone-9-*-final-*.json.gz and corpus-debug/corpus-release reports retain
all observations and exact input/binary hashes.

The complete suites pass **862 read_fonts tests**, **64 font_types tests**,
**10 generator tests**, **7 Rust reference tests** and **20 Python harness tests**.
There are **897 upstream test ports** overall. Regeneration, formatting, Clippy,
CLI help/version, and debug/release builds pass. All requested model tests deferred
from Phase 1 are now covered; deliberate scope and runtime adaptations are recorded
in PORTING.md. No compiler or standard-library source was modified.

The speed gate is complete: three timed full-corpus release runs yield medians of
**12.522919 s Rust** and **54.608527 s Silk**, a **4.360687× Silk/Rust wall-time ratio**.
One whole-corpus warmup per binary preceded the measurements; program order
alternated, stdout was discarded, and other local builds/tests were idle. This is
whole-CLI timing, including formatting and process startup. The exact samples and
hashes are in reports/milestone-9-benchmark.json, with methods and toolchain details
in docs/PERFORMANCE.md.

M8 already passed its complete 23,188-case malformed gate. With the final Phase 2
sources, the 530-case bitmap/color/VARC campaign passes, and the repeated complete
campaign is running. PR #10 requires final green CI, including that full campaign,
before merge. Local milestone work is complete; CI and merge status are tracked
on the PR rather than inferred from these local checks.
