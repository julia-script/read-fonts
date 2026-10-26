# Standard-library gaps

No new missing API blocked milestone 0.

## Planned verification at milestone 1: signed bit reinterpretation

The porting brief identifies the lack of truncating/same-width signed-to-unsigned
reinterpretation in the pinned release. Verify the exact scalar APIs when porting
big-endian signed reads. Implement the required conversions in one
`packages/font_types/src/cast.silk` module with boundary tests, then record the
minimal example and workaround here. No cast helper or signed-read implementation
exists yet; this is a carried-forward requirement, not a newly reproduced finding.
