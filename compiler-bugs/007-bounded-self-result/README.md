# 007: interface result with a bounded Self type application is unsupported

Toolchain: `0.1.0-dev.17+1120049495d3` (unmodified release).

Run from the repository root:

```sh
silk build --manifest-path compiler-bugs/007-bounded-self-result/silk.toml
```

Expected: build succeeds. The interface provider `Self` conforms to `Domain`,
which satisfies the declared bound of `Values<Self>`. `Concrete` supplies the
operation, and the free generic function selects that conformance.

Actual (exit 2):

```text
src/main.silk:1:35: unsupported: this construct is not supported by the native compiler yet
```

Removing the bound from `struct Values<T: Domain>` makes this exact program
compile. The port keeps the DomainValues storage type unconstrained and places
`T: Domain` on its consuming cursor methods. This is a result-type counterpart
to report 006's dependent interface argument. No compiler or stdlib changes.
