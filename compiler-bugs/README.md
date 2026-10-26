# Compiler bugs

Minimal reproducers for Silk compiler bugs found while porting. Each directory
has a pinned `silk.toml`, a minimal `src/main.silk`, and a README with the exact
command, expected and actual behavior, and compiler output. Code that works
around one cites it as `compiler-bugs/NNN`.

To add one, create `compiler-bugs/NNN-short-name/`, link it below and at every
workaround, and report it upstream. Never patch or vendor the compiler.

- [001 — inferred owner lifetime after Format.format](001-inferred-owner-after-format/README.md): valid Result arms rejected with SEM0042; explicit owner lifetime works around it.
- [002 — explicit generic Self in a conformance](002-explicit-generic-self/README.md): the provider spelling is rejected as unsupported; using `Self` works.
- [003 — generic operator conformances](003-generic-operators/README.md): arithmetic on a generic struct is rejected at use; concrete operator providers delegate to generic named functions.

- [004 — generic default interface operation](004-generic-interface-default/README.md): native compilation reports an unsupported construct at a legal generic default operation call; use a free generic helper or concrete-owner method.
- [005 — bounded type application in an impl argument](005-bounded-impl-argument/README.md): an acyclic `Read<Args<Flag, Flag>>` conformance reports SEM0223; keep argument-product Copy bounds on its conformance instead of its declaration.
- [006 — applying an interface with a bounded type parameter](006-dependent-interface-bound/README.md): native compilation rejects the dependent bound; keep the target bound on consuming types and functions.
- [007 — bounded Self in an interface result](007-bounded-self-result/README.md): `Values<Self>` is rejected when Values requires the provider's interface; keep the bound on consuming cursor methods.
- [008 — dropping a generic unsafe operation](008-drop-generic-unsafe/README.md): directly dropping Atomic.fetchAdd with its static ordering is rejected; bind the result before dropping it.

All eight still reproduce, with the same output, on `0.1.0-dev.20+10a8c67813a1`
(checked 2026-10-26).
