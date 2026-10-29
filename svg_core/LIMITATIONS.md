# SVG implementation limitations

Toolchain: Silk `0.1.0-dev.29+94cf9559bf47`. No compiler or stdlib patches.
This file records implementation workarounds, not the unimplemented SVG coverage
listed in [SPECIFICATIONS.md](SPECIFICATIONS.md).

## LIMITATION-1 — git dependency sources are unavailable

- Status: filed [silk-lang/silk#2558](https://github.com/silk-lang/silk/issues/2558).
- Reproduced on macOS arm64: a library manifest with a `git`/`rev` dependency
  exits 2 before checking source, with
  `dependencies.vector.git is not supported yet`.
- Workaround: pinned `vendor/silk-gpu` submodule and a path dependency in
  `svg_raster/silk.toml`. The SVG project can move independently, but its font,
  shaping and Unicode path dependencies must be relocated at that time too.
- Cost: repository/deployment management only; no runtime instructions are added,
  so an Ir A/B comparison is not applicable. The issue includes a self-contained
  manifest/source reproducer and the expected package-selection requirement.
- Removal: migrate to pinned git dependencies when their released syntax and
  reproducibility contract are available. Do not patch the current compiler.

## Local geometry types

The installed dev.29 stdlib has no geometry module. The handoff explicitly permits
local `svg_geometry` types until it ships; they are contained in one exported
module. No duplicate geometry-proposal issue was filed: this is the handoff's
chosen API boundary, not a compiler correctness workaround.

## LIMITATION-2 — missing floating-point math

[silk-lang/silk#2539](https://github.com/silk-lang/silk/issues/2539) already covers
the missing `atan2`, `hypot`, trigonometric and color/filter math APIs. A minimal
dev.27 manifest/source reproduction was added to that issue; `f64.atan2`
produces `SEM0014`. `svg_geometry/src/math.silk` supplies finite-input,
range-reduced `atan2`, scaled `hypot` and bounded degree reduction in pure Silk,
without libc or per-target imports. Arc/transform tests exercise these paths.
Replace the helpers when released stdlib equivalents are available.

## LIMITATION-3 — no DEFLATE output-capacity API

Filed [silk-lang/silk#2565](https://github.com/silk-lang/silk/issues/2565).
`Deflate.encode` requires a caller-owned slice but exposes no checked capacity
bound. For the pinned single fixed-Huffman block, PNG reserves
`n + ceil(n / 8) + 8` bytes for zlib, where `n` includes scanline filter bytes.
Dimension validation bounds every arithmetic operation. Compression writes
directly into the final IDAT payload, without copying a compressed buffer.
The bound depends on the documented dev.27 algorithm and must be reconsidered
when upgrading; replace it with a checked stdlib API when available.

## LIMITATION-4 — no stdlib XML parser

Filed [silk-lang/silk#2563](https://github.com/silk-lang/silk/issues/2563).
`svg_xml` owns the bounded, nonvalidating XML/namespace implementation. It uses
stdlib collections and UTF-8 support, not a C parser. Resource and error policies
are in [SPECIFICATIONS.md](SPECIFICATIONS.md#xml-error-and-resource-policy).

## LIMITATION-5 — no stdlib PNG codec

Filed [silk-lang/silk#2564](https://github.com/silk-lang/silk/issues/2564).
`svg_image` owns PNG framing and premultiplied-to-straight sample conversion;
DEFLATE/zlib and checksums remain stdlib-owned. PNG/JPEG decoding is not yet
implemented. The image package boundary allows later codec replacement without
changing display-list consumers.

These missing-API reports contain self-contained manifests/sources and observed
compiler diagnostics. There is no working pre-workaround stdlib path, so no
before/after Ir saving is claimed. The renderer baseline measures the current
implementation; its full-process counts do not isolate these API gaps.

## Vector integration limits

The upstream vector roadmap documents approximation limits, including source
curvature for `arcs` joins. Pinning and testing that library does not establish
SVG conformance for those behaviors. Resolve required gaps upstream when the
corresponding SVG phase exercises them; do not implement a second rasterizer here.

- The executor validates finite path/transform intermediates before vector's
  f32 coverage boundary. Unrepresentable geometry returns `InvalidGeometry`
  rather than reaching an unchecked conversion.
- `fillPolylines` copies the checked flattened lines into vector's scratch.
  Removing this extra list/copy requires a checked borrowed-line upstream API.
- Isolated surfaces currently cover the full viewport. The aggregate 64M-pixel
  ceiling prevents nested opacity from multiplying allocations without bound;
  tighter, offset layers require the later clipping/compositing integration.
- `crispEdges` remains a rendering hint: the pinned vector backend has no AA
  toggle. It is not implemented by thresholding alpha after compositing.
- Full perspective requires upstream projective geometry and inverse paints.
  No local rasterizer or silent affine approximation is introduced.
