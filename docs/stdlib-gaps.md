# Standard-library gaps

No new missing API blocked milestone 0.

## 001 — truncating and signed bit reinterpretation integer conversions

Big-endian signed font fields and fixed-point arithmetic need signed/unsigned
reinterpretation and truncation. The release's `toI16`/`toU32` conversions trap
outside their numeric ranges; `checkedTo…` correctly returns None but does not
reinterpret bits. `font_types/src/cast.silk` implements these operations using
bounded arithmetic and masks, including signed minimum values. It is covered by
`signedCastBoundaries`; no compiler or stdlib changes are required.

## 002 — reusable buffered stdout writer

`silk.os_writer.StdoutWriter` is deliberately unbuffered and the pinned standard
library has no generic buffered writer. Field-by-field differential output can
make millions of small writes. The CLI's `buffered_stdout.silk` implements Writer
with a fixed 64 KiB buffer and explicit fallible flush. The standard library is
unchanged; output bytes and parse behavior are unchanged.

## 003 — mutable slice subviews

The pinned `silk.slice.Slice` exposes only `view(&[T], offset, length) -> &[T]`.
It cannot supply a mutable subrange of an existing `&mut [T]` (and has no
`viewMut` operation). Axis normalization passes checked lengths alongside whole
scratch slices to private helpers, avoiding pointer conversions or an allocation
for each subview. Shared snapshots still use `Slice.view`. The stdlib is unchanged.

## 004 — integer population and leading/trailing bit counts

The pinned `silk.u64` module has bitwise operations and shifts but no equivalent
of Rust's `count_ones`, `leading_zeros` or `trailing_zeros`. Sparse integer-set
pages need all three. `collections/int_set/bitpage.silk` supplies bounded SWAR
population counting and binary-search bit scans, including the zero-input result
of 64. The 27 original page tests cover full/empty words, bit 63, page boundaries,
forward/reverse iteration and set counts. The stdlib remains unchanged.

## 005 — platform f32 tangent and trigonometric parity

The pinned f32 module has deterministic sin/cos approximations (documented to
within four ULP), and no tangent function. VARC transform matrices must agree with
upstream's platform f32 trigonometry. `tables/varc_impl.silk` and COLR metric
transforms call the platform `sinf`, `cosf` and `tanf` through the C ABI, as the glyph
loader already does for `hypotf`. The stdlib and compiler remain unchanged. The seven upstream matrix
tests and bitwise differential matrix observations cover this adaptation.

## 006 — `Option<T>` is not `Copy`

`Option<T>` has no `Copy` impl even when `T` is `Copy`, and a struct with an
`Option` field cannot be declared `Copy` (SEM0083). Copyable model snapshots
therefore use `model/optional.silk`'s `Maybe<T>`, and `CffFontRef` keeps its
optional top dict fields as `Maybe` so `GlyphMetrics` can hold a parsed font
instead of re-parsing it per glyph. Filed as
[silk-lang/silk#2434](https://github.com/silk-lang/silk/issues/2434).

## 007 — Unicode normalization data version and missing combining classes

The pinned stdlib reports Unicode 17.0.0, while `ucd` owns Unicode 18.0.0.
The difference is not solely a version upgrade: 34 nonzero combining classes
already assigned in Unicode 17 are missing from stdlib data. Another 34 are
genuine Unicode 18 additions. Full-domain raw canonical pair maps agree;
all 20,171 Unicode 18 normalization rows expose 134 NFC and 134 NFD mismatches.
`scripts/check-normalization-gap` reproduces and classifies these differences.
The minimal CCC/NFC/NFD reproducer is
[`compiler-bugs/014-unicode17-ccc`](../compiler-bugs/014-unicode17-ccc/README.md),
reported as [silk-lang/silk#2487](https://github.com/silk-lang/silk/issues/2487).
Harfrust uses `ucd`'s Unicode 18 classes and raw pairs, not stdlib string
normalization. No compiler or stdlib data is patched or vendored.
