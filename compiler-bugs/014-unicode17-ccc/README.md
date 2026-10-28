# 014 — Unicode 17 combining classes missing from normalization

Reported as [silk-lang/silk#2487](https://github.com/silk-lang/silk/issues/2487).
Reproduced with Silk `0.1.0-dev.23+538c9053f62a` on aarch64-apple-darwin.

From this directory:

```sh
silk build src/main.silk -o /tmp/unicode17-ccc --optimization speed
/tmp/unicode17-ccc
```

Expected exit status: **0**. Actual: **7**. Bits 1, 2 and 4 report incorrect
CCC, NFD and NFC respectively. Unicode 17 assigns CCC 230 to U+1ACF COMBINING
DOUBLE CARON; the stdlib returns zero. U+0316 has CCC 220 and must sort before
it in both canonical normalization forms.

The full-domain comparison in `scripts/check-normalization-gap` identifies
34 missing nonzero classes already present in the stdlib's claimed Unicode 17,
separate from 34 new Unicode 18 classes. The comparison pins Unicode 17's
`UnicodeData.txt` by SHA256 and executes all ten canonical invariants per row
of Unicode 18's `NormalizationTest.txt`: 20,171 rows, 134 NFC and 134 NFD
mismatches. Non-Hangul raw decomposition and composition maps agree.

`ucd` owns the correct Unicode 18 combining classes and raw pairs; harfrust
uses those APIs and never delegates shaping normalization to `silk.unicode`.
No compiler or stdlib patch is included.
