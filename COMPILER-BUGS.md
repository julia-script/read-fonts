# Compiler bugs

No new compiler bug was encountered in milestone 0. The CLI skeleton builds in
debug and release with the unmodified `0.1.0-dev.17+1120049495d3` release.

For a new finding, add `compiler-bugs/NNN-short-name/` with a pinned `silk.toml`,
minimal `src/main.silk`, and README containing the exact command, expected and
actual behavior, and compiler output. Link it here and at every workaround. Never
modify or rebuild the compiler or standard library.

The plan's known `mod.silk` and symlinked-output limitations were avoided, not
rediscovered or reported as new bugs.

- [001 — inferred owner lifetime after Format.format](compiler-bugs/001-inferred-owner-after-format/README.md): valid Result arms rejected with SEM0042; explicit owner lifetime works around it.
- [002 — explicit generic Self in a conformance](compiler-bugs/002-explicit-generic-self/README.md): the provider spelling is rejected as unsupported; using `Self` works.
- [003 — generic operator conformances](compiler-bugs/003-generic-operators/README.md): arithmetic on a generic struct is rejected at use; concrete operator providers delegate to generic named functions.

- [004 — generic default interface operation](compiler-bugs/004-generic-interface-default/README.md): native compilation reports an unsupported construct at a legal generic default operation call; use a free generic helper or concrete-owner method.
- [005 — bounded type application in an impl argument](compiler-bugs/005-bounded-impl-argument/README.md): an acyclic `Read<Args<Flag, Flag>>` conformance reports SEM0223; keep argument-product Copy bounds on its conformance instead of its declaration.
- [006 — applying an interface with a bounded type parameter](compiler-bugs/006-dependent-interface-bound/README.md): native compilation rejects the dependent bound; keep the target bound on consuming types and functions.
- [007 — bounded Self in an interface result](compiler-bugs/007-bounded-self-result/README.md): `Values<Self>` is rejected when Values requires the provider's interface; keep the bound on consuming cursor methods.
- [008 — dropping a generic unsafe operation](compiler-bugs/008-drop-generic-unsafe/README.md): directly dropping Atomic.fetchAdd with its static ordering is rejected; bind the result before dropping it.
