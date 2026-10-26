# Inferred owner lifetime fails after Format.format

Toolchain: unmodified `silk v0.1.0-dev.20+10a8c67813a1`, Linux x86_64.

From this directory, run:

```sh
silk build
```

The exact command on the porting host (only to locate its installed Clang) was:

```sh
LD_LIBRARY_PATH=/workspace/read-fonts-tools/usr/lib/x86_64-linux-gnu SILK_CLANG=/workspace/read-fonts-tools/usr/bin/clang-19 /home/agent/.silk/bin/silk build
```

Expected: builds; running prints `length=4` and exits 0. `View.parse(data)` has
result `Result<View<'a>, i32>` and both arms are valid. GEN-008 permits inference
of owner parameters from arguments; LIFE-003 connects the argument to the result.

Actual: exits 1 with:

```text
src/main.silk:16:5: error[SEM0042] A match arm naming a member its scrutinee type does not have
src/main.silk:17:5: error[SEM0042] A match arm naming a member its scrutinee type does not have
```

Workaround: replace `View.parse(data)` with `View<'a>.parse(data)`. This builds
and runs on the same release. Using a static byte literal at the call to `show`,
or removing the preceding `Format.format` call, also avoided the failure in the
reduction. The parser and dumper use explicit owner lifetimes at affected calls.
