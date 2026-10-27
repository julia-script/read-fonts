# Compiler bugs

Minimal reproducers for Silk compiler bugs found while porting. Each directory
has a pinned `silk.toml`, a minimal `src/main.silk`, and a README with the exact
command, expected and actual behavior, and compiler output. Code that works
around one cites it as `compiler-bugs/NNN`.

To add one, create `compiler-bugs/NNN-short-name/`, link it below and at every
workaround, and report it upstream. Never patch or vendor the compiler.

001 to 009 were fixed in `0.1.0-dev.22+5cd5bc433c4e`, and their reproducers and
workarounds are removed (inferred owner after Format.format, explicit generic Self,
generic operators, generic default interface operations, bounded impl arguments,
dependent interface bounds, bounded Self in an interface result, dropping a generic
unsafe call, specialized alias constructors).
The 003 fix covers arithmetic but not `==` on a generic Equal conformance
(silk-lang/silk#2448), so ps_numeric_tests keeps its bounded `equal` helper.

- [010 — list of lifetime-carrying values in a struct](010-list-of-lifetime-struct/README.md): appending such a struct to a `List` with an elided lifetime reports SEM0012; store offsets instead of views. Reported as silk-lang/silk#2425.
- [011 — static empty slice](011-static-empty-slice/README.md): `&[]` or an empty `const` array cannot be returned as `&'static [T]` (SEM0212); slice zero elements from an owned array instead. Reported as silk-lang/silk#2428.
- [012 — list shifts](012-list-shift/README.md): `List.insert` and `List.remove` move the tail one element at a time instead of with a memmove; no workaround. Reported as silk-lang/silk#2431.
