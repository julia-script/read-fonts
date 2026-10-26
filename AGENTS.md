# read-fonts Silk port

Read `docs/PORTING-PLAN.md`, `PROGRESS.md`, and `PORTING.md` before changing code.
Finish each milestone's gate before starting the next. Milestone 0 establishes
only the harness: do not report parser parity from a reference-only run.

- Learn Silk from the read-only `silk-lang/silk` reference at the pinned release.
- Every Silk manifest pins `0.1.0-dev.20+10a8c67813a1`. Never build, patch, or vendor
  the Silk compiler or stdlib. Record minimal compiler reproducers and stdlib gaps.
- `upstream/` and `test-data/harfrust/` are read-only pinned submodules.
- Generate table accessors from the upstream codegen input grammar. Never edit
  generated files. Keep camelCase names and upstream error behavior.
- Parser offsets/lengths need checked arithmetic; malformed input must not trap.
- No `mod.silk` barrels or symlinked output directories on this compiler release.
- Keep both upstream license files and all copyright notices.
- Record test counts and honest gate status in `PROGRESS.md` after each session.
- Make small topical commits. Author AND committer must be
  `julia-script <94128293+julia-script@users.noreply.github.com>`.
  No Co-Authored-By trailers.

Harness checks and setup are in `README.md`. Build before running a corpus check;
`cargo run` inside the per-font loop would contaminate output and repeat builds.
