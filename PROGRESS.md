# Progress

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
