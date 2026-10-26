# read-fonts for Silk

A port of Google's [read-fonts and font-types](https://github.com/googlefonts/fontations)
to Silk, intended to support a later HarfRust port. The requested Phase 1 and
Phase 2 APIs are implemented: scalar types; borrowed sfnt/TTC parsing; generated
core, layout, variation, AAT and Phase 2 tables; CFF/CFF2 names and bounds; integer
sets; and the requested font model, including bitmap, COLR and VARC extents.
The repository includes a byte-exact Rust/Silk harness, deterministic corruption
checks, a release benchmark, and compiler/stdlib reports for the pinned Silk release.
See [PROGRESS.md](PROGRESS.md), [porting decisions](PORTING.md), and the original
[porting plan](docs/PORTING-PLAN.md).

## Set up

```sh
git clone --recurse-submodules https://github.com/julia-script/read-fonts.git
cd read-fonts
export PATH="$(scripts/install-silk):$PATH"   # the Silk release pinned in silk.toml
```

Install Python 3.11+, a current stable Rust toolchain (with rustfmt and Clippy for
checks), and Clang 18+. If needed, set `SILK_CLANG` to an **absolute executable
path**, for example `/usr/bin/clang-18`; this release does not search `PATH` for
the value of that variable.
No Silk compiler or standard-library sources are built, modified, or vendored here.
If cloning without `--recurse-submodules`, run `git submodule update --init --recursive`.

## Checks

Pull request CI ([ci.yml](.github/workflows/ci.yml)) has a hard 15 minute budget
and runs three jobs in parallel:

```sh
# Silk tests
silk test --manifest-path font_types/silk.toml --root src/tests.silk
silk test --manifest-path read_fonts/silk.toml --root src/tests.silk
# Generated code and tools
scripts/generate --check
python3 -m unittest discover -s scripts/tests
# Corpus and corrupted fonts: every corpus font plus 4 seeded corruptions of
# each must dump without a trap, crash, hang or incomplete output
(cd font_dump && silk build --release)
READ_FONTS_PROFILE=release scripts/check-robustness
```

The differential checks against the Rust read-fonts the port started from are
slower and run weekly or by hand ([baseline.yml](.github/workflows/baseline.yml)):

```sh
scripts/build --release
export READ_FONTS_PROFILE=release   # check against the release dumpers
scripts/verify-reference --timeout 600
scripts/compare --timeout 600
scripts/check-{core,table,layout,variation,aat,cff,model,phase2}-fixtures
scripts/check-malformed --report build/malformed-report.json.gz
```

Comparisons use every core; set `READ_FONTS_JOBS` to change that.

`verify-reference` runs the Rust dumper on **every font** in the four configured
corpus directories, including unsupported containers. It reports parse errors as
oracle observations and fails for process errors, timeouts, or malformed dumper
output. Its JSON report records each input and output SHA-256, face counts, errors,
and all excluded non-font files. The checked-in [report](reports/milestone-0.json)
is the result for the pinned snapshots.

```sh
scripts/compare --timeout 600 --fonts build/fonts.txt
```

`compare` runs both binaries and prints the first differing line. Core, layout,
variation, AAT, CFF, model and set-intersection dumps match on all **566 corpus
files**, plus **9,146 CFF fixtures**, **362 model fixtures** and **3,550 Phase 2
fixtures**, in debug and release. The expanded debug protocol also passes
**426 container edge cases**, **500 core-table fixtures**, **2,650 layout fixtures**,
**2,894 variation fixtures** and **8,551 AAT fixtures**. CFF and model metrics, names and bounds are compared at four normalized locations.
The model gate also compares character maps and exact scaled-metric bits.
Detailed reports retain input/output hashes; large reports in `reports/` are
gzip-compressed. The complete Phase 2 corpus evidence is available for
[debug](reports/milestone-9-corpus-debug.json.gz) and
[release](reports/milestone-9-corpus-release.json.gz).
Repeated table views use explicit references to their preceding complete field dumps.
Matching dumps return 0, different dumps return 1, and harness/process failures
return 2. The optional JSON report records input/output hashes and errors.
The comparison is byte-exact, including the final newline; no fields are ignored.
Both dumpers receive one absolute font filename as one argument. No shell is used.

Run the Silk CLI directly:

```sh
cd font_dump
silk run -- --help
silk run -- /absolute/path/to/font.ttf
silk build --release
```

`--fonts` accepts a UTF-8 file with one filename per line. Relative font paths are
resolved against this repository; blank lines and lines beginning with `#` are
ignored. Omitting `--fonts` discovers the complete pinned corpus. `--timeout` sets
the per-process limit (30 seconds by default; the table/model gate uses 600 for large or deliberately malformed fonts). Override compiled binaries with
`--reference PATH` and `--silk-dumper PATH`. After `scripts/build --release`, pass
`build/rust/release/rust-font-dump` and `build/llvm/<target>/release/font_dump`.
`CARGO` and `SILK` can override build-tool executable paths.

## Malformed-input campaign

After building release binaries, run the deterministic corpus campaign:

```sh
scripts/check-malformed --reference build/rust/release/rust-font-dump \
  --silk-dumper build/llvm/x86_64-unknown-linux-gnu/release/font_dump \
  --report build/malformed-report.json.gz
```

The complete Phase 2 gate passes all **23,188 corruptions** of the **566 corpus files**
in release: **18,660 truncations** (31–33 lengths per font) and **4,528 byte-flip variants**. The checked-in
[final Phase 2 report](reports/milestone-9-malformed.json.gz) records that complete
campaign with dump format 9, including the full bitmap/COLR/VARC model chain.
There are zero differences and zero process failures. The baseline workflow repeats the campaign.
Every discovered font receives header-edge, 1/16-length and final-byte
truncations, plus eight seeded mutations with one to eight nonzero byte XORs.
Mutation recipes and input/output hashes are recorded. Full dump equality also
requires identical table errors. Crashes, timeouts, malformed output and traversal
limits fail the gate, even when both processes fail the same way.

One worker process per core runs by default (`--jobs` overrides this). `--seed` defaults
to 20261026 and `--timeout` to 600 seconds per process. Completed matches can resume
from `build/malformed-cache`; source hashes, binary hashes and campaign settings
must match. Each run executes immutable binary snapshots so concurrent rebuilds
cannot mix results. A failure stops that source's remaining mutations, keeps testing other
fonts, and is retried on the next run. A passing report requires every expected
mutation. Failing bytes, both dumps and the observation are retained under
`build/malformed-failures/<input-sha256>/`. Reports ending in `.gz` are compressed
without dropping observations. `--fonts` can select a reproduction list.

## Speed comparison

The recorded release run takes **54.27 s for Silk** and **11.99 s for Rust** over
the full corpus: **4.52× Rust’s wall time**. See the [measurement and method](docs/PERFORMANCE.md).

```sh
scripts/build --release
scripts/benchmark --report build/benchmark-report.json
```

The benchmark runs the fixed 566-file corpus serially, with one subprocess per
font and stdout discarded. It warms each binary once, then measures three rounds
in alternating Rust/Silk order. The reported ratio is median Silk wall time
divided by median Rust wall time. This measures the complete CLI, including
startup, parsing, model evaluation and formatting. It is not an isolated parser
microbenchmark. The report retains per-font samples, corpus and binary hashes,
program versions, and machine information. The baseline workflow uploads the
same report with its parity observations. `--fonts`, `--reference`, `--silk-dumper`, `--rounds` and
`--timeout` select repeatable alternatives.

## Layout

- `font_types`: endian scalars, tags, identifiers, fixed-point numbers and geometry.
- `read_fonts`: borrowed parsing, generated tables, integer collections and font model APIs.
- `font_dump`: CLI producing stable directory, table and extension observations.
- `scripts/rust-font-dump`: Rust reference binary linked to the vendored read-fonts.
- `scripts/`: corpus listing, reference gate, comparison, and harness tests.
- `upstream/`: read-only fontations submodule, pinned to `cf5676b29faa8c7787abe003c5dfb85fd81e8a7c`.
- `test-data/harfrust/`: read-only HarfRust submodule, pinned to `1503ff054384cc1d6a701b5ffbdc2f24118a2790`.
- `tools/font-codegen-silk/`: copied upstream grammar parser with Silk and differential dump backends.

Every Silk manifest pins `0.1.0-dev.17+1120049495d3`. The small root library makes
that pin meaningful at the workspace root; `silk build` there checks the library
graph. `scripts/build` additionally builds the executable. Library dependencies
are paths; future consumers can use this repository as a submodule.

## Contract and license

The active [dump format](docs/DUMP-FORMAT.md) covers directories, core and layout
tables, variations, vertical metrics, TrueType glyphs, AAT, CFF/CFF2, Phase 2 tables
and model APIs. The default metric source chain includes bitmap, COLR and VARC;
explicit source orders and bitmap strike sizes are also compared.
The Silk suites contain **64 font_types** and **875 read_fonts** tests; **909**
upstream tests are ported overall. Out-of-scope APIs and platform adaptations are
listed in the porting plan and decisions.
Deliberate decisions are recorded in [PORTING.md](PORTING.md), compiler findings in
[COMPILER-BUGS.md](COMPILER-BUGS.md), and missing library APIs in
[STDLIB-GAPS.md](STDLIB-GAPS.md).

Code is available under either [MIT](LICENSE-MIT) or [Apache-2.0](LICENSE-APACHE),
following fontations. The submodules retain upstream notices and individual font
licenses; the root licenses do not replace those licenses.

Regenerate with `scripts/generate`; do not edit generated files. The plan's
`extensions` entries concatenate handwritten `tables/*_impl.silk` into their
nominal type's module. Those templates are source files, not standalone modules.
`generate-static` packs immutable upstream lookup tables and runs automatically.
