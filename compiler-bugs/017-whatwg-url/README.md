# 017 — WHATWG URL semantics are not RFC 3986

Upstream: [silk-lang/silk#2578](https://github.com/silk-lang/silk/issues/2578).
Pinned toolchain: `0.1.0-dev.27+323ceb59e7ee`.

Observed on macOS arm64 with the pinned toolchain, from the repository root:

```sh
silk check --manifest-path compiler-bugs/017-whatwg-url/silk.toml
/Users/juliaortiz/.silk/bin/silk build compiler-bugs/017-whatwg-url/src/main.silk -o build/svg/stdlib-url-probe --clang /opt/homebrew/opt/llvm@22/bin/clang
build/svg/stdlib-url-probe
```

This calls the real `silk.uri.uri.Uri` API, not a guessed URL namespace.
The WHATWG acceptance condition is exit 0: Unicode hostname `bücher.example`
serializes as `xn--bcher-kva.example`. Parse rejection returns 1; successful
parsing without the required serialization returns 2.

Source evidence: `silk/uri/reference.silk:21-24` explicitly rejects raw non-ASCII
under RFC 3986, and `silk/uri/uri.silk:1-14` excludes scheme normalization.
`silk/net/address.silk:415-416,897-931` validates ASCII/Punycode but leaves Unicode
mapping and IDNA context/bidi checks to callers. This is a missing distinct API,
not a defect in the documented RFC 3986 contract.

Actual results: check exit 0; build exit 0 (275 symbols); executable exit 1,
without stdout/stderr. In this source, exit 1 identifies `Uri.parse` rejecting
the Unicode-host URL, consistent with its documented RFC 3986 contract.

`svg_core/src/url*.silk` owns WHATWG parsing/resolution/serialization and IDNA,
reusing `ucd` normalization/properties. Replace these parts together when released
semantics and bounds match; SVG resource authorization remains local. There is
no working stdlib WHATWG path for a runtime A/B measurement.
