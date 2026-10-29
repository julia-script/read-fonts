# SVG for Silk

An original SVG 1.1 Second Edition and SVG 2 implementation, under MIT or
Apache-2.0. The specifications define behavior; browsers and resvg are diagnostic
references. See [authority, scope and coverage](SPECIFICATIONS.md).

## Current status

The phase-2 implementation parses XML and renders presentation-attribute SVG:
outermost `svg`, `g`, paths and basic shapes, solid fills/strokes, transforms,
`viewBox`/`preserveAspectRatio`, inherited paint, visibility and isolated opacity.
It produces premultiplied RGBA8 through the pinned CPU `vector` backend and writes
PNG through `svg_cli`. The retained render tree and display list are public.

Local verification: 69 SVG native tests, 33 upstream vector tests, 47 Python
tooling tests, 15 own rendering cases and six malformed-input cases pass.
The curated resvg set has six exact RGBA passes and six explicitly recorded
circle-edge pixel non-passes. Two own round-stroke comparisons have narrowly
documented antialias allowances. These results do **not** establish full viewer
conformance. The full W3C/resvg/WPT sweep and performance parity remain open.

CSS, references, paint servers, clipping/masking, image decoding, filters, text,
animation and ICC remain required subsequent phases, not exclusions from scope.

## Packages

All are root workspace packages with the `svg_` prefix:

| Package | Responsibility |
| --- | --- |
| `svg_geometry` | f64 geometry, SVG path/points parsing, arcs, shape construction and transforms |
| `svg_xml` | Namespace-aware nonvalidating XML, UTF-8/UTF-16, bounded DTD/entity processing |
| `svg_css` | CSS syntax/cascade boundary; implementation pending |
| `svg_image` | Checked premultiplied RGBA storage and PNG encoding; decoding pending |
| `svg_core` | Presentation values and geometry resolution; specification and limitation records |
| `svg_render` | Render tree to backend-neutral retained display list and public rendering entry point |
| `svg_raster` | Thin CPU executor over `vector`, not a second rasterizer |
| `svg_filters` | Filter evaluation boundary; implementation pending |
| `svg_cli` | Rendering command-line package |
| `svg_tests` | Conformance inputs, suite pins and reviewed expectations |
| `svg_bench` | Renderer workloads and measured baselines |

Nothing in the existing font/shaping/Unicode stack depends on an SVG package.
Font dependencies remain `font_types`, `read_fonts`, `harfrust` and `ucd`.
There is no silk-layout dependency.

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
format checks, SVG/vector native tests, tooling tests and a release CLI build.
It executes the CLI on own fixtures, malformed inputs and the curated resvg
subset, checking reviewed expectations rather than treating known pixel
non-passes as successes. Reports go under ignored `build/svg/`. Compiles are
sequential. Its CI job runs alongside the existing jobs with a 15-minute timeout,
version-keyed toolchain caching and hash-keyed reference caching.
`scripts/generate --check` remains the separate workspace freshness gate and
requires source changes to have been committed.

Use `scripts/svg/check --offline` after populating the caches. `--skip-fetch`
skips pinned-reference checks and the external corpus, not native/tooling tests
or the actual own/malformed rendering runs. Formatting uses one manifest per
package; a directory argument is outside its own `src/` selection in dev.27.

The macOS arm64 offline gate completed in 28.03 seconds with warm caches.
The Linux arm64 offline SVG gate and `scripts/generate --check` also pass in an
isolated Ubuntu workspace, with the same own/curated rendering outcomes.
GitHub Actions has not supplied a cold-run result: the phase-1 jobs were refused
before execution because of account billing/spending limits. Local timings are
not a substitute for that CI budget verification.

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
and differing-pixel limits plus a reason. `antialias_channel` applies only when
both samples have partial alpha; it does not forgive opaque/transparent changes.
It is opt-in per case, not a global tolerance for translucent artwork.
Missing/stale expectations, unexpected passes/failures, renderer crashes and
missing output fail the runner. `failed_cases` includes known pixel non-passes;
`gate_failures` counts unexpected results and untriaged cases. Remaining full-suite
cases are untriaged, not implicitly passing or added to the conformance skip list.

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

## Rendering API and CLI

```sh
silk build --release --manifest-path svg_cli/silk.toml
build/llvm/aarch64-apple-darwin/release/svg_cli input.svg -o output.png
build/llvm/aarch64-apple-darwin/release/svg_cli input.svg -o output.png --width 300 --zoom 2
```

Use `aarch64-unknown-linux-gnu` or `x86_64-unknown-linux-gnu` for the corresponding
Linux build directory. The CLI requires an input path and `-o`; it creates no
output before parsing, rendering and encoding succeed. Invalid invocation exits
2; I/O/rendering/encoding failures exit 1.

Import `svg_render.lib`:

| Entry point | Ownership and result |
|---|---|
| `parse(data, &options)` | XML bytes → owned `RenderTree`, without rasterizing |
| `record(move tree)` | Moves geometry into a backend-neutral `DisplayList` |
| `renderDisplayList(&list)` | Reusable retained input → owned `vector.pixmap.Pixmap` |
| `render(data, &options)` | Combined path → premultiplied sRGB RGBA8 pixmap |

These are allocator effects with typed `RenderError`/`OutOfMemoryError`.
`svg_image.png.encodePixels(width, height, pixels)` borrows premultiplied pixels;
no intermediate owned image copy is required. Use `svg_xml.xml` directly for
the retained XML arena, metadata and detailed XML error offsets.

`RenderOptions.make()` uses intrinsic/default object sizing, zoom 1 and a
16M-pixel output budget. A viewBox supplies an aspect ratio, not intrinsic pixel
dimensions: a viewBox-only square occupies 150×150 in the 300×150 default object
size. CLI width/height select output resolution without rewriting the logical
viewport. The executor also caps aggregate output/isolated surfaces at 64M
pixels; excessively nested opacity groups fail before allocating their surfaces.

## Geometry API

Import `svg_geometry.geometry`. `Transform.multiply(left, right)` applies right
first; rotations use radians, while stored endpoint-arc rotations use SVG degrees.
Singular/nonfinite/unrepresentable inverses return `None`, never identity.
`Rect.united` and `Rect.intersection` preserve zero-area locations; disjoint bounds
are `None`. A transformed rectangle bounds all four corners, not the exact curve.

`Path` owns stdlib `List` storage. Borrow its segments; append rejects nonfinite
segments or a missing initial move without changing the path. Close restores the
subpath start. Import `svg_geometry.svg` for SVG path/points parsing and shape/
viewBox construction, `svg_geometry.arcs` for allocation-free adaptive arc
iteration, and `svg_geometry.transforms` for the distinct SVG/CSS grammars.
Arc conversion uses a 0.25-device-pixel tolerance; exceeding its subdivision
limit is an error, not a silently truncated path.

## Limitations and performance

[Limitations](LIMITATIONS.md) records dependency/toolchain and backend constraints.
No compiler or stdlib is patched. The measured Ubuntu 24.04 arm64 baseline in
[`svg_bench/baseline.json`](../svg_bench/baseline.json) uses three native samples,
one iteration and no warmup, plus a separate Valgrind 3.22.0 Callgrind pass.
The isolated VM has four CPUs and 8 GiB RAM; binaries use Silk dev.27, LLVM
22.1.8 and Rust 1.96.0. Ratios are Silk/resvg; greater than 1 is slower.

| Workload | Parse + record time | Render time | End-to-end time | Render-process Ir |
|---|---:|---:|---:|---:|
| 128 original icons | 1.008× | 1.540× | 1.364× | 1.320× |
| Tiger | 1.094× | 3.617× | 3.352× | 4.605× |
| Large map/CAD | 1.437× | 9.147× | 7.963× | 8.900× |
| Mixed curves | 1.112× | 1.481× | 1.351× | 1.533× |

This is a baseline, **not performance parity**. Pixel checksums differ; timing
does not certify rendering correctness. Native Tiger and large-map PNGs were
visually inspected; librsvg supplied an independent Tiger diagnostic, not the
definition of correct SVG.

```sh
silk build --release --manifest-path svg_bench/silk.toml
scripts/svg/rust-bench/build
scripts/svg/bench --silk /path/to/release/svg_bench --fetch-workloads --output build/svg/bench.json
scripts/svg/ab /path/to/old/svg_bench /path/to/new/svg_bench --output build/svg/ab.json
```

The explicit Rust build pins resvg/usvg/tiny-skia to the corpus revision and
verifies registry packages against its upstream lock. It is not a production
dependency or a PR-CI step. `--record-baseline` is the only intentional baseline
replacement path. Tiger is an explicitly downloaded AGPL-3.0-or-later benchmark
input, never a runtime dependency; the original is preserved and both engines
receive the same hash-recorded 900×900 sizing adaptation.

Stage timers exclude file I/O, PNG encoding, checksums and destination
destruction; end-to-end includes intermediate-tree destruction. Render includes
a fresh zeroed pixmap in both engines. `--callgrind` on Linux separately records
**full-process Ir**, including startup, setup, warmups, checksums and the untimed
parse-result rasterization; it is not stage-only instruction accounting.
