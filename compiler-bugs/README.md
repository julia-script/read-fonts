# Compiler bugs

Minimal reproducers for compiler bugs and missing standard-library capabilities.
Each directory has a pinned `silk.toml`, a minimal `src/main.silk`, and a README with the exact
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
- [013 — signed byte-load combining](013-signed-byte-load/README.md): widening a byte-assembled signed word prevents AArch64 load/reversal combining; mirror deltas use modular `u32` arithmetic instead. Reported as silk-lang/silk#2474.
- [014 — missing Unicode 17 combining classes](014-unicode17-ccc/README.md): stdlib normalization claims Unicode 17 but omits 34 nonzero classes; shaping uses `ucd`'s correct properties and raw pairs. Reported as silk-lang/silk#2487.
- [015 — empty borrowed Option diagnostic](015-option-reference-none/README.md): an omitted reference lifetime in `Option<&Value>.None` reports SEM0099 at the stdlib declaration; qualify the empty variant's lifetime. Reported as silk-lang/silk#2580.
- [016 — CSS APIs](016-css-api/README.md): no reusable CSS syntax, selector or cascade APIs. Reported as silk-lang/silk#2577.
- [017 — WHATWG URLs](017-whatwg-url/README.md): existing RFC3986 URI APIs do not supply WHATWG URL/IDNA behavior. Reported as silk-lang/silk#2578.
- [018 — legacy stylesheet encodings](018-legacy-encoding/README.md): no WHATWG label registry or legacy replacement decoders. Reported as silk-lang/silk#2579.
