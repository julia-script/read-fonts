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
