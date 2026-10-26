# 008 — dropping a generic unsafe operation with a static argument

Toolchain: unmodified Silk `0.1.0-dev.17+1120049495d3` on x86_64 Linux.

Reproduce from the repository root:

```sh
silk build --manifest-path compiler-bugs/008-drop-generic-unsafe/silk.toml
```

Expected: the valid unsafe atomic operation compiles; its previous value is
explicitly discarded. The operation is documented in `stdlib/silk/atomic.silk`.

Actual:

```text
src/main.silk:6:15: unsupported: this construct is not supported by the native compiler yet
```

Replacing the drop statement with these two statements builds successfully:

```silk
let previous=unsafe Atomic.fetchAdd<u32>(counter,1,MemoryOrder.Relaxed)
drop previous
```

A non-generic user-defined unsafe function works directly under `drop unsafe`.
The model callback-count test uses the explicit intermediate binding. No compiler
or standard-library change is required.
