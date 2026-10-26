# 006: native compiler cannot apply an interface with a bounded type parameter

Toolchain: `0.1.0-dev.17+1120049495d3` (unmodified release).

Run from the repository root:

```sh
silk build --manifest-path compiler-bugs/006-dependent-interface-bound/silk.toml
```

Expected: build succeeds. `T: Read<'a>` on `Subs` satisfies the bound required by
`Extension<'a, T>`; the interfaces and types are not recursive.

Actual (exit 2):

```text
src/main.silk:3:48: unsupported: this construct is not supported by the native compiler yet
```

The diagnostic points to `Extension<'a, T>` in `E`'s bound. Removing the `T` bound
from the interface declaration makes the program compile. The port uses that
workaround: `ExtensionLookup<'a, T>` exposes the operation, and each consuming
type/function independently requires `T: FontRead<'a, ()>`. No compiler or stdlib
change is required.
