# Generic default interface operations are unsupported by the native compiler

Toolchain: `silk 0.1.0-dev.17+1120049495d3`, Linux x86_64, Clang 19.1.7.
No compiler or standard-library modifications.

Run from this directory:

```sh
silk build
```

Expected: the interface's default generic `echo<T>` specializes for Concrete and
i32, and the executable returns 7. Reference INTF-002 permits generic ordinary
operation contracts and default bodies; the conformance may omit the operation.

Actual: compilation exits 2:

```text
src/main.silk:8:10: unsupported: this construct is not supported by the native compiler yet
```

This is a native compiler implementation limitation, not an invalid-interface
source diagnostic. The port's non-generic TableProvider default operations work.
The generic `expectTable<T, P>` operation is a free helper instead; FontRef also
keeps a concrete-owner generic method. This preserves static dispatch and errors.
