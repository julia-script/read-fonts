# read-fonts for Silk

A port of Google's [read-fonts and font-types](https://github.com/googlefonts/fontations)
to Silk, intended to support a later HarfRust port. **Milestone 1 implements scalar
types and the borrowed sfnt/TTC parser core.** Table payload parsing starts at
milestone 2. See [PROGRESS.md](PROGRESS.md) and the original
[porting plan](docs/PORTING-PLAN.md).

## Set up

```sh
git clone --recurse-submodules https://github.com/julia-script/read-fonts.git
cd read-fonts
curl -fsSL https://raw.githubusercontent.com/silk-lang/silk/main/install.sh | SILK_RELEASE='v0.1.0-dev.17+1120049495d3' sh
export PATH="$HOME/.silk/bin:$PATH"
```

Install Python 3.11+, a current stable Rust toolchain (with rustfmt and Clippy for
checks), and Clang 18+. If needed, set `SILK_CLANG` to an **absolute executable
path**, for example `/usr/bin/clang-18`; this release does not search `PATH` for
the value of that variable.
No Silk compiler or standard-library sources are built, modified, or vendored here.
If cloning without `--recurse-submodules`, run `git submodule update --init --recursive`.

## Run the core gate

```sh
scripts/build
scripts/font-list --output build/fonts.txt --report build/corpus-inventory.json
scripts/verify-reference --report build/reference-report.json
silk test --manifest-path packages/font_types/silk.toml --root src/tests.silk
silk test --manifest-path packages/read_fonts/silk.toml --root src/tests.silk
scripts/compare --report build/parity-report.json
scripts/check-core-fixtures
python3 -m unittest discover -s scripts/tests -v
cargo test --locked --manifest-path scripts/rust-font-dump/Cargo.toml --target-dir build/rust
cargo clippy --locked --manifest-path scripts/rust-font-dump/Cargo.toml --target-dir build/rust --all-targets -- -D warnings
```

`verify-reference` runs the Rust dumper on **every font** in the four configured
corpus directories, including unsupported containers. It reports parse errors as
oracle observations and fails for process errors, timeouts, or malformed dumper
output. Its JSON report records each input and output SHA-256, face counts, errors,
and all excluded non-font files. The checked-in [report](reports/milestone-0.json)
is the result for the pinned snapshots.

```sh
scripts/compare --fonts build/fonts.txt
```

`compare` runs both binaries and prints the first differing line. Directory dumps
match on all **566 corpus files** and **426 synthetic container edge cases**.
Matching dumps return 0, different dumps return 1, and harness/process failures
return 2. The optional JSON report records input/output hashes and errors.
The comparison is byte-exact, including the final newline; no fields are ignored.
Both dumpers receive one absolute font filename as one argument. No shell is used.

Run the Silk CLI directly:

```sh
cd packages/font_dump
silk run -- --help
silk run -- /absolute/path/to/font.ttf
silk build --release
```

`--fonts` accepts a UTF-8 file with one filename per line. Relative font paths are
resolved against this repository; blank lines and lines beginning with `#` are
ignored. Omitting `--fonts` discovers the complete pinned corpus. `--timeout` sets
the per-process limit (30 seconds by default). Override compiled binaries with
`--reference PATH` and `--silk-dumper PATH`. After `scripts/build --release`, pass
`build/rust/release/rust-font-dump` and `build/llvm/<target>/release/font_dump`.
`CARGO` and `SILK` can override build-tool executable paths.

## Layout

- `packages/font_types`: endian scalars, tags, identifiers, fixed-point numbers and geometry.
- `packages/read_fonts`: borrowed reads, checked offsets, arrays and sfnt/TTC directories.
- `packages/font_dump`: CLI producing the stable directory dump.
- `scripts/rust-font-dump`: Rust reference binary linked to the vendored read-fonts.
- `scripts/`: corpus listing, reference gate, comparison, and harness tests.
- `upstream/`: read-only fontations submodule, pinned to `cf5676b29faa8c7787abe003c5dfb85fd81e8a7c`.
- `test-data/harfrust/`: read-only HarfRust submodule, pinned to `1503ff054384cc1d6a701b5ffbdc2f24118a2790`.
- `tools/font-codegen-silk/`: reserved for the generator fork at milestone 2.

Every Silk manifest pins `0.1.0-dev.17+1120049495d3`. The small root library makes
that pin meaningful at the workspace root; `silk build` there checks the library
graph. `scripts/build` additionally builds the executable. Library dependencies
are paths; future consumers can use this repository as a submodule.

## Contract and license

The initial [dump format](docs/DUMP-FORMAT.md) covers font/container directories.
Table fields, variation values, and model results will be added at their gates.
Deliberate decisions are recorded in [PORTING.md](PORTING.md), compiler findings in
[COMPILER-BUGS.md](COMPILER-BUGS.md), and missing library APIs in
[STDLIB-GAPS.md](STDLIB-GAPS.md).

Code is available under either [MIT](LICENSE-MIT) or [Apache-2.0](LICENSE-APACHE),
following fontations. The submodules retain upstream notices and individual font
licenses; the root licenses do not replace those licenses.
