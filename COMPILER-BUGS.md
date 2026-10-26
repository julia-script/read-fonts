# Compiler bugs

No new compiler bug was encountered in milestone 0. The CLI skeleton builds in
debug and release with the unmodified `0.1.0-dev.17+1120049495d3` release.

For a new finding, add `compiler-bugs/NNN-short-name/` with a pinned `silk.toml`,
minimal `src/main.silk`, and README containing the exact command, expected and
actual behavior, and compiler output. Link it here and at every workaround. Never
modify or rebuild the compiler or standard library.

The plan's known `mod.silk` and symlinked-output limitations were avoided, not
rediscovered or reported as new bugs.
