# List.insert and List.remove shift one element at a time

Upstream: https://github.com/silk-lang/silk/issues/2431

Run `silk build --release --manifest-path compiler-bugs/012-list-shift/silk.toml` and
profile the binary with callgrind. On `0.1.0-dev.20+10a8c67813a1`, 1000 insert/remove
pairs at index 0 of a 200-element list of 80-byte values take 9.6M instructions,
about 21 per element moved by insert and 16 by remove. A memmove of the tail would
take a few hundred instructions per call.

Harfrust's multiple and ligature substitutions insert into and remove from the glyph
list, which costs about 250M instructions (8%) on the Noto Nastaliq benchmark. There is
no workaround without a bulk copy, so the calls stay as they are.
