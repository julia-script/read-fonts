# 013 — signed byte-load combining

Reported as [silk-lang/silk#2474](https://github.com/silk-lang/silk/issues/2474).
Silk `0.1.0-dev.22+5cd5bc433c4e`, AArch64 Linux target, clang 22.1.8.

From this directory:

```sh
silk build src/main.silk -o /tmp/signed-load.s --emit assembly --optimization speed --target aarch64-unknown-linux-gnu
silk build src/main.silk -o /tmp/signed-load --optimization speed
/tmp/signed-load
```

The numerical smoke exits zero. Both exports assemble the same four big-endian
bytes. `unsignedRead` returns a `u32`; `signedRead` interprets it as `i32` and
widens it to `i64`.

Expected: one word load and byte reversal in both, followed by sign extension
for the signed result. Actual optimized `unsignedRead` uses `ldr w` and `rev w`;
`signedRead` uses four `ldrb`s, a left shift, sign extension and three ORs.
The sign extension is distributed into the byte assembly before load combining.

In `ucd.lib.mirror`, widening a signed palette delta added roughly 0.5 million
instructions to the Amiri/Persian workload. The caller needs only a code point,
so it now adds the two's-complement delta with `u32.wrappingAdd`, avoiding the
widening. Every generated mapped result is a Unicode code point. There is no
native-memory reinterpretation or unchecked offset arithmetic.
