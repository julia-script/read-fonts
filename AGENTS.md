# read-fonts for Silk

Setup and checks are in `README.md`.

## Layout

- Workspace packages live at the repo root (`font_types/`, `read_fonts/`,
  `font_dump/`, `font_bench/`), never under `packages/`. A new package (for
  example a shaping port) is a new root directory with its own `silk.toml`
  pinning the same Silk release. Add it to `members` in the root `silk.toml`
  and to `packages` in `scripts/generate` so it is formatted and checked.
- Keep the root clean: no progress logs, plans, reports or generated output in
  git. Notes worth keeping go in `docs/`.

## CI

- Pull request CI must finish within 15 minutes, worst case, on a cold runner.
  Jobs in `.github/workflows/ci.yml` run in parallel, each with a
  `timeout-minutes`. A new package gets its tests added as a step or job there
  only if that keeps the budget. Slow or exhaustive checks (corpus diffs
  against Rust, fuzzing campaigns, benchmarks) belong in
  `.github/workflows/baseline.yml`, which runs weekly or by hand.
- All Silk sources are formatted with `silk format`; CI fails on unformatted or
  stale generated files (`scripts/generate --check`).

## Code

- Rust read-fonts is the baseline this port started from, not a parity target.
  Test features with Silk tests; differences from Rust found by the baseline
  workflow are prompts to look, not automatically bugs.
- Every Silk manifest pins the same release. Never patch or vendor the Silk
  compiler or stdlib. Record minimal compiler reproducers in `compiler-bugs/`
  and missing library APIs in `docs/stdlib-gaps.md`.
- `upstream/` and `test-data/harfrust/` are read-only pinned submodules.
- Table accessors are generated from the upstream codegen grammar by
  `scripts/generate`. Never edit `generated_*.silk` files by hand. Run
  `scripts/generate` before committing: it also formats all Silk sources.
- Parsing must not trap on malformed input: use checked arithmetic for offsets
  and lengths.
- Performance: match unions by reference (`match &self.* { ... }`), since
  `match self.*` copies the whole union (silk-lang/silk#2404). Keep
  `silk.format` out of per-item hot paths. Small hot helpers can take
  `with Intrinsic.inline()` / `inlineAlways()`. Measure with callgrind and
  `scripts/bench-library` before and after.
- Compiler or stdlib limitations that block or slow the code get a minimal
  repro and an issue on silk-lang/silk (search for duplicates first).
- Dumps of the test corpus total several GB. Scripts must not process them line
  by line in Python.

## Commits

- Make small topical commits, one concern per pull request, rebased on `main`.
- Author and committer must be
  `julia-script <94128293+julia-script@users.noreply.github.com>`.
  No Co-Authored-By trailers.
