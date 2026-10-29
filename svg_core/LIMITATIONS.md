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

## Geometry and math availability

The installed dev.29 stdlib has no geometry module. The handoff explicitly permits
local `svg_geometry` types until it ships; they are contained in one exported
module. No duplicate geometry-proposal issue was filed: this is the handoff's
chosen API boundary, not a compiler correctness workaround.

The broader numeric API request is already
[silk-lang/silk#2539](https://github.com/silk-lang/silk/issues/2539). Phase-1
geometry uses available f64 operations and introduces no local transcendental
implementation. Arc conversion, filters and color-space conversion must revisit
that issue when their phases start.

The upstream vector roadmap documents approximation limits, including source
curvature for `arcs` joins. Pinning and testing that library does not establish
SVG conformance for those behaviors. Resolve required gaps upstream when the
corresponding SVG phase exercises them; do not implement a second rasterizer here.
