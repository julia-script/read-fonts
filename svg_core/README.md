# SVG for Silk

An original SVG 1.1 Second Edition and SVG 2 implementation, under MIT or
Apache-2.0. The specifications define behavior; browsers and resvg are diagnostic
references. See [authority, scope and coverage](SPECIFICATIONS.md).

## Current status

Phase 1 provides f64 geometry, registered package boundaries, pinned specifications
and test suites, an executable reftest adapter, and a CPU-only dependency/check gate.
**There is no SVG parser, renderer or `svg_cli` executable yet.** The other package
compilation roots deliberately export no API. Fetching a corpus or validating its
expectations does not mean its SVGs passed. All 12 curated cases remain explicitly
unevaluated; no viewer-conformance or renderer-performance claim is made.

The handoff requires Julia's merge decision before the next phase changes the same
area. Phase 2 adds XML, presentation attributes, paths/shapes, fills/strokes, PNG
output, the rendering CLI and the first measured resvg baseline. CSS, references,
paint servers, clipping/masking, images, filters, text, animation and ICC remain
required subsequent phases, not exclusions from the scope.

## Packages

All are root workspace packages with the `svg_` prefix:

| Package | Responsibility |
| --- | --- |
| `svg_geometry` | Implemented: points, vectors, sizes, bounds, affine transforms and owned path segments |
| `svg_xml`, `svg_css`, `svg_image` | Independent syntax and image layers; no SVG-specific public types |
| `svg_core` | Document/style/resolve/text/animation layer; owns project specification and limitation records |
| `svg_render` | Render tree to backend-neutral retained display list and public rendering entry point |
| `svg_raster` | Thin CPU executor over `vector`, not a second rasterizer |
| `svg_filters` | SVG filter evaluation |
| `svg_cli` | Rendering command-line package |
| `svg_tests` | Conformance inputs, suite pins and reviewed expectations |
| `svg_bench` | Renderer workloads and measured baselines |

Except geometry, these are package/dependency boundaries for the following phases,
not implemented services. Nothing in the existing font/shaping/Unicode stack depends
on an SVG package. Font dependencies remain `font_types`, `read_fonts`, `harfrust`
and `ucd`. There is no silk-layout dependency.

`vendor/silk-gpu` is a pinned submodule. Only its pure-Silk `vector` package is built:
no WebGPU, Dawn, GPU driver or GPU backend is required. Its upstream geometry,
flattening, coverage, stroking, paints and layers remain upstream-owned. Bump the
submodule in a reviewed change; never copy its implementation into `svg_raster`.

## Setup and checks

Use the workspace's pinned Silk **0.1.0-dev.29+94cf9559bf47**, Python 3.11+, and
Clang 22 or newer. The [workspace setup](../README.md#set-up) installs the Linux
CI toolchain. `SILK_CLANG` must be an absolute path; on macOS an LLVM 22 Homebrew
installation can supply `/opt/homebrew/opt/llvm@22/bin/clang`.

From the workspace root:

```sh
git submodule update --init vendor/silk-gpu
python3 -m venv svg_tests/.cache/venv
. svg_tests/.cache/venv/bin/activate
python3 -m pip install -r scripts/svg/requirements.txt
export SILK_CLANG=/absolute/path/to/clang
scripts/svg/check
scripts/generate --check
```

The SVG gate runs workspace type checking, the vector library build, package
format checks, geometry and vector native tests, Python tooling tests, three
geometry/conformance specification-cache checks, the curated resvg download and
expectation validation. Compiles are sequential. Its CI job runs alongside the
existing jobs with a 15-minute timeout, version-keyed toolchain caching and
hash-keyed reference caching. `scripts/generate --check` remains the separate
workspace freshness gate and requires the source changes to have been committed.

Use `scripts/svg/check --offline` after populating the caches. `--skip-fetch` is a
local source-only shortcut, not the complete CI gate. It skips cache/expectation
validation, not native or tooling tests. Formatting uses a manifest per package;
a package directory is outside its own `src/` selection in the pinned compiler.

## Specifications and suites

```sh
python3 scripts/svg/fetch-specs.py             # verify/fetch all 141 locked documents
python3 scripts/svg/fetch-specs.py --offline   # verify all cached original bytes
python3 scripts/svg/fetch-suites              # only 12 curated SVG/PNG pairs
python3 scripts/svg/reftests --validate       # schema, cache integrity and coverage; renders nothing
python3 scripts/svg/fetch-suites --suite resvg --full
python3 scripts/svg/fetch-suites --suite w3c-svg11 --full
python3 scripts/svg/fetch-suites --suite wpt --full
```

Caches live inside `svg_core/.cache/` and `svg_tests/.cache/`, never in source
control. Explicit `--update` refreshes pins; review changed hashes and upstream
revisions rather than accepting changed bytes during a normal build. Git suite
updates additionally require `--revision` with a full reviewed commit SHA.
Full suites, reference renderers, browser diffs, fuzzing and benchmarks do not
belong in PR CI; their scheduled rendering jobs arrive with the renderer.

`svg_tests/expectations/*.txt` contains JSON with `version`, `suite`, and a `cases`
array. Every case names `id`, `status`, `reason`, and an HTTPS normative `spec`
anchor. Status is `pass`, `fail`, `spec-difference` or `skip`; differences also
record `spec_result` and `reference_result`. Optional `tolerance` records channel
and differing-pixel limits plus a reason. Missing/stale expectations, unexpected
passes/failures, renderer crashes and missing output fail the runner. W3C browser
exclusions are named individually. Remaining full-suite cases are untriaged, not
implicitly passing. Phase-1 resvg skips are temporary unevaluated cases, not
additions to the conformance skip list.

The adapter executes an explicitly supplied renderer without a shell:

```sh
python3 scripts/svg/reftests \
  --renderer '["/path/to/renderer", "{input}", "--width", "300", "-o", "{output}"]' \
  --expectations /path/to/reviewed-expectations.json \
  --report svg_tests/.cache/report.json
```

The resvg normal corpus scales to 300 pixels wide, preserving aspect ratio
([pinned upstream harness](https://github.com/linebender/resvg/blob/91455ee06d08ac2bfeab2b035ed2cfbfd0a68614/crates/resvg/tests/integration/main.rs)).
Supply that width in the renderer command; the adapter does not resize the PNG
after rendering or silently infer a different viewport. Other suites need their
own matching host viewport/font configuration.

It compares decoded RGBA samples, including alpha and dimensions. Multiple WPT
matching references are alternatives; every mismatch reference must differ.
`--diff-dir svg_tests/.cache/diffs` writes images only on unexpected failures.
WPT cases needing HTML/script or manual extraction are reported explicitly.
The Python Pillow dependency belongs only to this tooling, not the Silk runtime.

## Geometry API

Import `svg_geometry.geometry`. `Transform.multiply(left, right)` applies right
first; rotations use radians, while stored endpoint-arc rotations use SVG degrees.
Singular/nonfinite/unrepresentable inverses return `None`, never identity.
`Rect.united` and `Rect.intersection` preserve zero-area locations; disjoint bounds
are `None`. A transformed rectangle bounds all four corners, not the exact curve.

`Path` owns stdlib `List` storage. Borrow its segments; append rejects nonfinite
segments or a missing initial move without changing the path. Close restores the
subpath start. Arc conversion, path-string parsing and curve bounds are not part
of this storage API. These operations will use the pinned SVG algorithms in the
rendering phases.

## Limitations and performance

[Limitations](LIMITATIONS.md) records dependency/toolchain constraints. No compiler
or stdlib is patched. There is no renderer benchmark yet, so no resvg ratio is
reported. Geometry/native coverage and a geometry-to-vector pixel smoke check do
not establish SVG document conformance or performance parity.
