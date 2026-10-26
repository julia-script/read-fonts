# Explicit generic Self spelling rejected in a conformance

Toolchain: unmodified `silk v0.1.0-dev.17+1120049495d3`, Linux x86_64.

Run `silk build` in this directory. The porting host's exact command is:

```sh
LD_LIBRARY_PATH=/workspace/read-fonts-tools/usr/lib/x86_64-linux-gnu SILK_CLANG=/workspace/read-fonts-tools/usr/bin/clang-19 /home/agent/.silk/bin/silk build
```

Expected: builds and exits 0. In `impl<T: Read> Read for Wrapper<T>`, the spelled
provider `Wrapper<T>` is exactly `Self` and satisfies the interface return type.

Actual: exits 2:

```text
src/main.silk:6:35: unsupported: this construct is not supported by the native compiler yet
```

Workaround: spell the return type `Option<Self>` instead of `Option<Wrapper<T>>`.
That version builds with the same release. The same issue affected a by-value
`Nullable<T>` parameter in the `Scalar` conformance; spelling it `Self` worked.
