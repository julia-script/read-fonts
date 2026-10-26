# 005: bounded type application in an interface impl argument reports a cycle

Toolchain: `0.1.0-dev.20+10a8c67813a1` (unmodified release).

Run from the repository root:

```sh
silk build --manifest-path compiler-bugs/005-bounded-impl-argument/silk.toml
```

Expected: build succeeds. `Flag` conforms to `Copy`; `Args<Flag, Flag>` satisfies
both declared parameter bounds. Neither the types nor their conformances recurse.

Actual:

```text
src/main.silk:8:19: error[SEM0223] Cannot resolve a non-alias dependency cycle
```

The diagnostic points to the `Read<'a, Args<Flag, Flag>>` impl head. Removing the
`Copy` bounds from `struct Args<A, B>`, while retaining the conditional
`impl<A: Copy, B: Copy> Copy for Args<A, B>`, makes the same program compile.
The port uses that workaround for argument products; users of those products
still require `Copy` wherever they copy them. No compiler or stdlib change.
