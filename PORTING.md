# Porting decisions and deviations

## Milestone 0

- The destination is `julia-script/read-fonts`, as supplied by the user, rather than
  the working repository name `fontations-silk` in the plan.
- Fontations and the HarfRust corpus are vendored as pinned Git submodules. They
  are read-only reference snapshots. Their licenses and copyright notices remain
  intact. Initialize them recursively; never update implicitly to a branch tip.
- The root manifest also defines an empty `fontations_silk` library so **every**
  `silk.toml`, including the workspace root, has an effective `[package].silk-version`
  pin. The three requested packages retain their separate identities and path dependencies.
- The current reference dump covers directory fields and lookup availability.
  No table parser, scalar port, generated Silk, model API, or parity gate is claimed.
  Generator copying and `silk-parse` start at milestone 2, after the core gate.
- At the pinned fontations revision, `test_data/extracted` contains 19 glyph
  expectation `.txt` files and no font containers. They remain in the snapshot and
  are listed as excluded inputs; later glyph/model checks can consume them.
- HarfRust's `DFONT.dfont` is included. Upstream `FileRef` reports
  `InvalidSfnt(0x00000100)`. This is a recorded oracle result, not a successful face.
- Upstream's `experimental_traverse` feature is now an empty compatibility feature
  (traversal was removed). The reference dumper calls concrete upstream accessors.
  Later generated dumping must not assume a reflection/traversal API exists.
- No deliberate change to parser error semantics or public font APIs has been made.

## Silk observations for the next gate

Reference source: `silk-lang/silk` at `1120049495d3b59f2524a0094430fb3aed83fd66`,
read outside this repository. The bundled release compiler/stdlib remain unchanged.

- `effect fn` constructs a deferred computation. `run` executes it and propagates
  typed failures; traps are separate and cannot be caught as `ReadError`.
- The hosted entry supplies `HostInput`, but allocation and output still need
  explicit providers. The skeleton provides its allocator and stdout/stderr writers.
- Packages export modules explicitly. A path dependency alone does not expose its
  modules; library manifests initially export `lib`.
- `Result` uses `Success { value }` and `Failure { error }`, not Rust's `Ok`/`Err`.
  Borrowed bytes and UTF-8 `string` are separate types; flags are decoded, while font
  paths can remain bytes.
- Root/library builds check source but do not emit a binary. Build `font_dump` from
  its member directory. The output tree is a real directory, with no symlink.
- `SILK_CLANG` must name an absolute executable path. The first CI run used a bare
  `clang-18` value and failed during linking with `cannot resolve path: invalid path`;
  the workflow now uses `/usr/bin/clang-18`, matching the local absolute-path setup.
- Keep borrowed table data lifetimes explicit; use finite generic specialization
  (GEN-006), eager offsets, checked arithmetic, and nominal unions for format groups.
  No `mod.silk` barrels are used.
