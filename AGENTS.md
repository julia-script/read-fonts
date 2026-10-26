# read-fonts for Silk

Setup and checks are in `README.md`.

- Pull request CI must finish within 15 minutes, worst case. Slow or
  exhaustive checks belong in `.github/workflows/baseline.yml`, not `ci.yml`.
- Rust read-fonts is the baseline this port started from, not a parity target.
  Test features with Silk tests; differences from Rust found by the baseline
  workflow are prompts to look, not automatically bugs.
- Every Silk manifest pins the same release. Never patch or vendor the Silk
  compiler or stdlib. Record minimal compiler reproducers in `compiler-bugs/`
  and missing library APIs in `docs/stdlib-gaps.md`.
- `upstream/` and `test-data/harfrust/` are read-only pinned submodules.
- Table accessors are generated from the upstream codegen grammar by
  `scripts/generate`. Never edit `generated_*.silk` files by hand.
- Parsing must not trap on malformed input: use checked arithmetic for offsets
  and lengths.
- Dumps of the test corpus total several GB. Scripts must not process them line
  by line in Python.
- Make small topical commits. Author and committer must be
  `julia-script <94128293+julia-script@users.noreply.github.com>`.
  No Co-Authored-By trailers.
