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

## Milestone 1

- `Scalar` exposes `rawByteLen`, exact-width `read`, and prefix-writing `write`.
  Associated Rust types become explicit interface parameters (`FontRead<'a, Args>`,
  `FontReadAt<'a, Args>`, `ComputeSize<Args>`); `ReadArgs::Args` has no separate Silk
  type projection. `FixedSize` has a `rawByteLen` operation.
- `BigEndian<T>` owns eight bytes and exposes only the scalar's encoded prefix.
  Its native layout is not a packed font record. Borrowed scalar/record arrays
  retain the original byte slice and decode one item at a time, with no allocation
  or unaligned casts. Rust's `bytemuck` layout and raw reference APIs are represented
  by these views. The parser never uses `sizeof(BigEndian<T>)` as a disk stride.
- Associated constants use camelCase factory functions (`Fixed.one()`,
  `GlyphId.notdef()`, `NameId.familyName()`, etc.). The release admits functions,
  not associated constant declarations, in inherent impls. Root sfnt constants
  remain module constants. Struct constructors cannot run in a constant initializer
  unless declared static; no compiler modification was made to bypass this rule.
- `FontData.slice(start, end)` uses explicit endpoints instead of Rust RangeBounds.
  Reads retain Result/Option errors and the checked bounds order. Offsets have
  generic `resolve`/`resolveWithArgs` helpers; zero and out-of-range remain distinct.
- Generic geometry operations whose bounds vary by operation use a method type
  parameter, e.g. `Matrix.identity<f32>()`. `Matrix.transform` returns the nominal
  `Coordinates<T>` tuple because Silk has no anonymous tuple types in signatures.
- Compiler reports 001 and 002 document explicit-lifetime and `Self` spelling
  workarounds. Report 003 requires concrete arithmetic operator conformances for
  built-in numeric Point/Matrix types; generic named operations remain available
  for custom coordinate types.
- `VarLenArray.get` skips repeated iterations after a zero-size item: every later
  index would otherwise revisit the identical offset. It returns the same read of
  the empty extent; `iter` terminates on zero length, as upstream does.
- Core container unit tests use compact synthetic sfnt/TTC data instead of embedding
  whole AHEM/TTC binaries. Full original files are separately included in the
  566-file differential directory gate.
- `TableDataRef` uses `HeaderRead` to construct a borrowed header view instead of
  casting the buffer to a native packed structure. Unaligned headers are supported.
  `BigEndian.new` takes an exact-width slice and returns `Option`, replacing Rust's
  associated fixed-size raw array parameter. `Version16Dot16.toMajorMinor` returns
  the existing `MajorMinor` record instead of an anonymous tuple.
- The CLI uses Silk's rooted filesystem provider, which rejects symlink traversal.
  Corpus paths are ordinary files. This differs from Rust `std::fs::read`, which
  follows symlinks; parser APIs themselves take byte slices and are unaffected.

## Milestone 2 (in progress)

- The generator is a standalone copy of the pinned font-codegen crate, with its
  original Rust modes retained. `silk-parse` reuses its parsed/resolved AST. Two
  traversal modes (`silk-dump`, `rust-dump`) call the respective public accessors;
  the Rust oracle still parses only with the unchanged upstream library.
- Table views store borrowed FontData and precomputed saturating byte ranges.
  They validate the same minimum size as upstream and preserve lazy defaults for
  malformed tails. Fixed records are borrowed positioned views, not native packed
  structs. Byte range saturation is followed by checked reads; it never permits
  unchecked indexing. Remainder arrays discard an incomplete final element.
- Public facades live in `tables/<name>.silk`, with explicit manifest exports and
  selective publication. This permits `read_fonts.tables.head` imports without
  exposing generated filenames or relying on unsupported namespace re-exports.
- Flag constants are camelCase factories. The reserved keyword `union` is exposed
  as `unionValue`; bitwise operators preserve the upstream behavior. Private view
  fields use an internal prefix to avoid collisions with public accessor names.
- Prototype dump paths use a fixed stack of 32 segments. The current generated
  table graph is acyclic and requires at most eight; font bytes cannot increase
  the depth. Recursive grammar groups will need explicit traversal handling.

- Silk inherent impls must share their nominal type's module. Handwritten
  `tables/*_impl.silk` extension templates are therefore appended by `scripts/generate`
  to the relevant generated module, like upstream's `include!` arrangement. Edit
  the template, never the generated copy. Selected-table wrappers are ordinary
  separate modules.
- `scripts/generate-static` packs post names, Mac Roman, and language-ID strings
  directly from the immutable upstream sources, and retains the OS/2 range data.
  The language map contains duplicate IDs; rightmost-equal binary search preserves
  the pinned Rust library's choice. Packed byte slices are returned by functions,
  as in Silk's Unicode tables, because slice-valued constants are unsupported.
- Iterator tuples use named records (`GlyphNameEntry` with `glyph` and `name`).
  The post iterator keeps upstream's 16 checkpoints, monotonic fast path, and
  first-unreachable-string bound. Tests use fixed stack buffers instead of Vec.
- The metrics fixture tests retain the original CBDT table and the four tested
  Vazirmatn long metrics. Full original fonts are covered by corpus comparison.
