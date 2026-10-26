# read-fonts for Silk

Font parsing for [Silk](https://github.com/silk-lang/silk), ported from Google's
[read-fonts and font-types](https://github.com/googlefonts/fontations). It parses
sfnt and TTC files, core, layout, variation, AAT, bitmap, COLR and CFF/CFF2
tables, and provides a font model for metrics, character maps, names, glyph
outlines and bounds.

## Layout

- `font_types/`: endian scalars, tags, identifiers, fixed-point numbers and geometry.
- `read_fonts/`: borrowed parsing, generated tables, integer sets and the font model.
- `font_dump/`: CLI that prints every parsed field of a font as text.
- `tools/font-codegen-silk/`: the upstream codegen grammar parser with Silk backends.
- `scripts/`: code generation, the test corpus harness, and the Rust baseline dumper.
- `upstream/`, `test-data/harfrust/`: read-only submodules with the pinned
  fontations source and the font corpus (566 fonts).

## Set up

```sh
git clone --recurse-submodules https://github.com/julia-script/read-fonts.git
cd read-fonts
export PATH="$(scripts/install-silk):$PATH"   # the Silk release pinned in the manifests
export SILK_CLANG=/usr/bin/clang-18            # absolute path to Clang 18 or newer
```

The scripts need Python 3.11+. Code generation and the Rust baseline need a
stable Rust toolchain.

## Checks

Pull request CI ([ci.yml](.github/workflows/ci.yml)) has a hard 15 minute budget
and runs three jobs in parallel:

```sh
# Silk tests
silk test --manifest-path font_types/silk.toml --root src/tests.silk
silk test --manifest-path read_fonts/silk.toml --root src/tests.silk
# Generated code, formatting and tools
scripts/generate --check   # regenerates and runs silk format; fails on any change
python3 -m unittest discover -s scripts/tests
# Corpus and corrupted fonts: every corpus font plus 4 seeded corruptions of
# each must dump without a trap, crash, hang or incomplete output
scripts/build --release
READ_FONTS_PROFILE=release scripts/check-robustness
```

The comparisons against the Rust read-fonts the port started from are slower
and run weekly or by hand ([baseline.yml](.github/workflows/baseline.yml)).
They dump the corpus, generated fixtures and a malformed-input campaign with both
implementations and report the first differing line:

```sh
scripts/build --release
export READ_FONTS_PROFILE=release
scripts/compare
scripts/check-{core,table,layout,variation,aat,cff,model,misc-table}-fixtures
scripts/check-malformed --report build/malformed-report.json.gz
scripts/benchmark --report build/benchmark-report.json
```

Checks run on every core; set `READ_FONTS_JOBS` to change that. `--fonts FILE`
limits a check to the fonts listed in FILE, one per line.

## Use the CLI

```sh
scripts/build --release
build/llvm/x86_64-unknown-linux-gnu/release/font_dump path/to/font.ttf
```

The output format is described in [docs/dump-format.md](docs/dump-format.md).

## Generated code

`scripts/generate` regenerates table accessors from the upstream codegen grammar
and the test fixtures, then runs `silk format` on every package. Do not edit `generated_*.silk` files. The plan in
`tools/codegen-plan.toml` lists each generated file; its `extensions` entries
append handwritten `tables/*_impl.silk` files to their table's module.

## Notes

- [Porting decisions](docs/porting-decisions.md)
- [Compiler bugs](compiler-bugs/README.md) with minimal reproducers
- [Standard library gaps](docs/stdlib-gaps.md)

## License

Available under either [MIT](LICENSE-MIT) or [Apache-2.0](LICENSE-APACHE),
following fontations. The submodules keep their own notices and font licenses.
