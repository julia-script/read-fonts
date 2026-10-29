# 018 — missing WHATWG legacy encoding decoders

Upstream: [silk-lang/silk#2579](https://github.com/silk-lang/silk/issues/2579).
Pinned toolchain: `0.1.0-dev.27+323ceb59e7ee`.

Observed on macOS arm64 with the pinned toolchain, from the repository root:

```sh
silk check --manifest-path compiler-bugs/018-legacy-encoding/silk.toml
```

`silk.text.encoding` is an illustrative import, not an existing/promised API.
The needed capability includes Encoding Standard label lookup, legacy single-
and multibyte tables/state machines and replacement decoding. For example,
`latin1` selects windows-1252, whose byte `0x80` decodes to U+20AC.

Inventory evidence, independent of that import spelling: `silk/text` supplies
strict UTF-8 and Unicode normalization; `silk/encoding` supplies Base64/UUID.
The installed stdlib has no legacy decoder/label suite. `Utf8Decoder`'s invalid
byte result is not windows-1252 decoding or a general replacement-decoding API.
The existing XML issue #2563 does not cover this web legacy decoder suite.

Actual exit: 1.

```text
src/main.silk:3:8: error[MOD0001] Unknown module silk.text.encoding
```

`svg_css/src/encoding*.silk` owns the generic decoders, pinned tables and labels.
Replace these when released semantics and output bounds match; stylesheet
protocol/`@charset`/environment fallback stays CSS-owned. There is no working
stdlib alternative for a runtime A/B measurement.
