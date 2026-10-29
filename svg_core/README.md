# SVG for Silk

An original SVG 1.1 Second Edition and SVG 2 implementation, under MIT or
Apache-2.0. The specifications define behavior; browsers and resvg are diagnostic
references. See [authority, scope and coverage](SPECIFICATIONS.md).

## Current status

The renderer computes CSS before resolving outermost `svg`, `g`, paths and basic
shapes: selectors, cascade/custom properties, presentation attributes, inline and
external stylesheets, media/supports conditions, typed geometry and transforms.
Solid fills/strokes, `viewBox`/`preserveAspectRatio`, inherited paint, visibility
and isolated opacity produce premultiplied RGBA8 through the shared CPU `vector`
backend. `svg_cli` writes PNG; the XML/computed-style tree and display list are public.

Integration checks exercise CSS precedence, reference geometry, projective
transforms, nested positive-w clipping, backface visibility and resource limits.
The actual CLI's CSS fixture matches its literal reference. A 256×64 projective
CLI smoke also matches an independent affine/polygon control with zero differing
pixels, including parent perspective and nested flattening boundaries. The CLI's
512×512 stylesheet workload (2,048 rules and rectangles) matches an independent
pixel control exactly; its benchmark checksum also agrees with resvg.
The integrated phase-3 SVG gate passes on macOS arm64 and Ubuntu 24.04 arm64.
These checks do not establish conformance for the full viewer.

References, paint servers, clipping/masking, image decoding, filters, text,
animation and ICC remain required work, not exclusions from scope. Parsing their
CSS properties does not implement their rendering.

## Packages

All are root workspace packages with the `svg_` prefix:

| Package | Responsibility |
| --- | --- |
| `svg_geometry` | f64 geometry, SVG path/points parsing, arcs, shape construction and transforms |
| `svg_xml` | Namespace-aware nonvalidating XML, UTF-8/UTF-16, bounded DTD/entity processing |
| `svg_css` | Tokenization, selectors, cascade/custom properties, typed computed values, conditions and stylesheet decoding |
| `svg_image` | Checked premultiplied RGBA storage and PNG encoding; decoding pending |
| `svg_core` | Document styling, exact source geometry and reference-box resolution; specification and limitation records |
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

The phase-3 macOS arm64 offline SVG gate completed in 128.16 seconds. The Linux
arm64 offline SVG gate plus `scripts/generate --check` completed in 176.05 seconds
in an isolated Ubuntu workspace. Both used populated toolchain/reference caches
and ran concurrently on the same host; these are not cold CI measurements.
GitHub Actions has not supplied a cold-run result: the phase-1 jobs were refused
before execution because of account billing/spending limits. That budget check
remains unverified.

## Specifications and suites

```sh
python3 scripts/svg/fetch-specs.py             # verify/fetch all 152 locked documents
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
| `parse(data, &options, &environment)` | XML bytes → owned `RenderTree` including document/computed styles, without rasterizing |
| `record(move tree)` | Moves geometry into a backend-neutral `DisplayList` |
| `renderDisplayList(&list)` | Reusable retained input → owned `vector.pixmap.Pixmap` |
| `render(data, &options, &environment)` | Combined path → premultiplied sRGB RGBA8 pixmap |

All entry points require an allocator; `parse` and `render` also require the
`svg_core.resources.Resolver` effect. Errors are typed `RenderError` or
`OutOfMemoryError`. `Environment` supplies the base URL, embedding viewport,
measured font metrics, system colors, concrete system-font values and CSS limits.
`NativeHost` measures a selected installed serif at 16 CSS px; all six system-font
keywords alias that face. The headless palette is explicit light sRGB, not the
operating system's appearance. Linux CI installs `fonts-dejavu-core`.

The CLI permits `data:` stylesheets and files confined to the input directory;
it does not fetch network resources. Its 300×150 embedding viewport is independent
of output-resolution overrides. Portable hosts can provide measured font bytes
through `NativeHost.fromFontBytes`, or configure `Environment` directly.
URL normalization byte/scalar/work exhaustion remains a resource error:
`UrlError.InputLimit` propagates through stylesheet loading to `RenderError.TooLarge`.
Both processing instructions and `@import` stop the render rather than treating
exhaustion as an ignorable malformed URL; allocation failure remains distinct.

`Catalog.matching` mutably borrows its catalog to build and reuse a conservative
ID/class/local-name selector index. Complete matching still determines specificity;
unkeyed arms and fingerprint collisions remain candidates, never false negatives.
Adding stylesheet rules invalidates the index. Candidate discovery and matching
share a 64,000,000-step document budget; exhaustion remains `CssError.MatchLimit`
(`RenderError.TooLarge` at the rendering boundary), not a selector nonmatch.

`RenderTree.document` retains XML metadata and `RenderTree.styles` retains
computed values and stylesheet source bases. CSS path handles resolve in
`RenderTree.paths` after resolution; the CSS store's path arena is moved there
without copying. `record` consumes this tree and retains only drawing data.
`DisplayList.projectionClips` contains plain homogeneous halfplane chains for
nested flattening. Parents must precede their children; execution validates this
ordering and command indices before traversing the chains.
`svg_image.png.encodePixels(width, height, pixels)` borrows premultiplied pixels;
no intermediate owned image copy is required.

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
viewBox construction, `svg_geometry.arcs` for exact center-parameter normalization
and optional allocation-free cubic iteration, and `svg_geometry.transforms` for
the distinct SVG/CSS grammars. The backend receives exact ellipse primitives,
preserving source tangents and curvature. Coverage has a 0.25-device-pixel budget;
stroke-reference bounds use a tighter 1e-7 target-coordinate budget. Numeric or
subdivision limits fail explicitly rather than returning under-resolved geometry.

## Limitations and performance

[Limitations](LIMITATIONS.md) records dependency/toolchain and backend constraints.
No compiler or stdlib is patched. The phase-3 Ubuntu 24.04 arm64 baseline in
[`svg_bench/baseline.json`](../svg_bench/baseline.json) uses three native samples,
one iteration and no warmup, plus a separate Valgrind 3.22.0 Callgrind pass.
The isolated VM has four CPUs and 8 GiB RAM; binaries use Silk dev.27, LLVM
22.1.8 and Rust 1.96.0. Ratios are Silk/resvg; greater than 1 is slower.

| Workload | Parse + record time | Render time | End-to-end time | Render-process Ir |
|---|---:|---:|---:|---:|
| 128 original icons | 11.082× | 1.893× | 5.153× | 4.242× |
| Tiger | 5.653× | 2.052× | 2.356× | 2.835× |
| Large map/CAD | 10.899× | 1.371× | 2.747× | 2.402× |
| Mixed curves | 7.315× | 3.708× | 4.550× | 4.168× |
| 2,048 stylesheet rules/rectangles | 0.567× | 0.563× | 0.538× | 0.427× |

This is **not performance parity**. Only the stylesheet workload's pixel
checksums agree with resvg; timing does not certify rendering correctness.
The stylesheet workload also passed an independent exact pixel control.

A separate `scripts/svg/ab` run used the preserved phase-2 binary and the
phase-3 binary on identical shape inputs, with the same sampling configuration.
These are full render-process instruction counts, including untimed parsing:

| Workload | Phase 2 Ir | Phase 3 Ir |
|---|---:|---:|
| 128 original icons | 124,368,260 | 399,588,398 |
| Tiger | 602,295,029 | 370,790,626 |
| Large map/CAD | 2,534,800,659 | 684,205,904 |
| Mixed curves | 132,520,054 | 360,197,270 |

The comparison includes the new CSS pipeline and changed vector geometry, not
an isolated optimization: old/new pixel checksums differ. Tiger and map costs
fell; icons and mixed curves regressed. Closing every remaining performance
gap is still required.

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
