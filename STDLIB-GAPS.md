# Standard-library gaps

No new missing API blocked milestone 0.

## Planned verification at milestone 1: signed bit reinterpretation

The porting brief identifies the lack of truncating/same-width signed-to-unsigned
reinterpretation in the pinned release. Verify the exact scalar APIs when porting
big-endian signed reads. Implement the required conversions in one
`packages/font_types/src/cast.silk` module with boundary tests, then record the
minimal example and workaround here. No cast helper or signed-read implementation
exists yet; this is a carried-forward requirement, not a newly reproduced finding.

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
