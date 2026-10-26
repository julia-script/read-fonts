# Generic operator conformance is rejected when used

Toolchain: unmodified `silk v0.1.0-dev.17+1120049495d3`, Linux x86_64.

Run `silk build` in this directory. The exact command on the porting host was:

```sh
LD_LIBRARY_PATH=/workspace/read-fonts-tools/usr/lib/x86_64-linux-gnu SILK_CLANG=/workspace/read-fonts-tools/usr/bin/clang-19 /home/agent/.silk/bin/silk build
```

Expected: builds; the program adds two `Value<i32>` values and exits 0.
GEN-005/GEN-006 and the conditional conformance rules permit the finite
specialization. The inner `i32` satisfies `Add<i32, i32>`.

Actual: exits 2:

```text
src/main.silk:9:38: unsupported: this construct is not supported by the native compiler yet
```

Moving the operation body into a bounded generic function and mapping it from
the generic conformance still fails. A concrete conformance for `Value<i32>`
works. The port keeps generic named arithmetic functions and supplies concrete
operator conformances for the built-in numeric coordinate types. Concrete inline
wrappers call generic helpers with explicit type arguments when a mapped helper
with multiple bounds is also rejected. No compiler/stdlib changes were made.
