# Release CLI performance

On 2026-10-26, Silk `font_dump` took **4.36× Rust's wall time** for the
complete 566-file corpus: **54.61 s** versus **12.52 s**,
using the median of three timed rounds. Both release binaries first passed the
complete byte-exact format-9 corpus and focused fixture gates.

| Timed round | Rust seconds | Silk seconds |
| --- | ---: | ---: |
| 1 | 12.523 | 54.829 |
| 2 | 12.132 | 54.609 |
| 3 | 12.555 | 54.371 |
| **Median** | **12.523** | **54.609** |

Each program received one whole-corpus warmup. Timed rounds alternated program
order, kept font order fixed, used one subprocess per font, and discarded stdout.
No other local builds or test campaigns ran during measurement. This measures
startup, file reads, parsing, model evaluation and output formatting together;
it does not isolate parser throughput. These timings describe this host and run.

The [complete report](../reports/milestone-9-benchmark.json) contains all per-font
samples, input and executable hashes, program versions and machine information.
The host was AMD EPYC 9V74 80-Core Processor, Linux-6.18.55-x86_64-with-glibc2.41.
Builds used the unmodified Silk `0.1.0-dev.17+1120049495d3`, Clang `19.1.7`, and
Rust `1.99.1` with the release defaults from `scripts/build --release`.

```sh
scripts/build --release
scripts/benchmark --report build/benchmark-report.json
```

CI runs the same benchmark and uploads `benchmark-report.json` with its parity
observations. Compare ratios from the same corpus, build mode and machine when
tracking changes; the report records those inputs rather than imposing a speed
threshold.
