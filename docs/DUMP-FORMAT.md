# Font dump protocols

Milestone 0 defines **directory scope**, not complete table-field coverage. Both
implementations must produce this same protocol as their support reaches each gate.
Never call a directory-only comparison a full parser comparison.

The output is UTF-8, one `key=value` record per line, with LF after every line,
including the last. It contains no paths, timestamps, addresses, or locale-dependent
text. Array indices and counts are decimal. Tags are exactly eight lowercase hex
digits representing the four original bytes (including spaces and non-ASCII
bytes). Sfnt versions and checksums are `0x` plus eight lowercase hex digits.
Absent optional header fields are `none`.

Order is fixed: format/scope, file byte length, container kind/count, TTC header
if present, then each face in collection order. A standalone sfnt has face index
0. Directory records retain upstream array order; they are not sorted by the dumper.

```text
font-dump.version=1
dump.scope=directory
file.length=12
file.kind=sfnt
file.fonts=1
font[0].sfntVersion=0x00010000
font[0].numTables=0
font[0].searchRange=0
font[0].entrySelector=0
font[0].rangeShift=0
font[0].tableRecords.length=0
```

For each table record `font[N].tableRecords[M]`, emit `tag`, `checksum`, `offset`,
`length`, and `lookup`, in that order. `lookup` is `available` or `missing` according
to `FontRef::table_data(tag)`, including its null-offset and duplicate-tag semantics.
It is not an assertion about table structure, checksum validity, or successful
parsing. `numTables` and `tableRecords.length` are separate observations: upstream
can accept a directory header while returning an empty truncated record array.

For TTCs, `file.fonts` is `CollectionRef::len()`. The header records, in order, are:

```text
ttc.ttcTag=74746366
ttc.version.major=<decimal>
ttc.version.minor=<decimal>
ttc.numFonts=<decimal>
ttc.tableDirectoryOffsets.length=<decimal>
ttc.tableDirectoryOffsets[0]=<decimal>
...
ttc.dsigTag=<decimal or none>
ttc.dsigLength=<decimal or none>
ttc.dsigOffset=<decimal or none>
```

These are the public `TTCHeader` fields. In extended TTC versions, `file.fonts`
and the actual enumerated faces reflect `CollectionRef`'s extended-list selection;
the header's legacy `numFonts` and offsets remain the public header observations.

If `FileRef::new` fails, emit `file.error=<ReadError>` immediately after
`file.length`, with no kind or faces. A failed collection face emits only
`font[N].error=<ReadError>` in its position and does not prevent later faces from
being visited. Follow `FileRef`'s own collection-to-sfnt fallback behavior.

Errors preserve variant identity and payload. Unit variants use their names;
`InvalidFormat` and `InvalidCollectionIndex` use decimal payloads in parentheses;
`InvalidSfnt` uses a fixed-width `0x` payload; `InvalidTtc` and `TableIsMissing` use
eight-digit tags; `MalformedData` uses a Rust-debug-escaped quoted string. An
upstream enum change makes the exhaustive serializer fail to compile until mapped.

## Exit statuses

- Reference: 0 for a complete dump, **including a font parse error**; 2 for usage,
  unreadable input, or output I/O failure. A panic is always a harness failure.
- Silk: 0 for a complete dump (including a parse error) or help/version, 2 for
  usage, unreadable input, or output failure. A trap is always a harness failure.
- Comparison: 0 for complete matching valid dumps, 1 for a textual difference,
  2 for setup/process/timeout/protocol failure (even if both outputs match).

The historical milestone-0 skeleton emitted `dump.status=unimplemented`, which
was deliberately **not** a valid parsed dump.
New table scopes will be specified before comparison gates use them; no supported
field may be suppressed to make two implementations agree.

## Format 2: generated table fields

The active header is `font-dump.version=2` and `dump.scope=core-tables`.
Directory fields retain format 1's order and encoding. After each face's directory,
dump `head`, `maxp`, `MAXP`, `cmap`, `DMAP`, `hhea`, `HHEA`, `hmtx`, `HMTX`,
`name`, `OS/2`, and `post`, in that order. A missing or unreadable table emits `font[N].TAG.error=VARIANT`.

Table fields follow the input grammar's order with camelCase keys. Numbers are
exact decimal values: fixed-point fields use their signed storage bits, versions
use their raw unsigned bits, and flags use the decoded bits (unknown bits are
masked as upstream specifies). MajorMinor emits `.major` and `.minor`. Other
scalar wrappers emit their numeric value; optional absence is `none`. Reserved
scalars with suppressed getters are read through their public byte ranges.

Arrays emit `.length` followed by every indexed value or record. Offset fields
emit their raw number, followed by the resolved target under the name without
`Offset`. Null optional targets emit `none`; resolution failures emit `.error`.
Format groups emit `.kind=FormatN`, followed by that variant's fields. This includes
all bytes represented by the grammar. No output fields are removed before comparing.

Handwritten observations follow each table's generated fields:

- Names: raw storage bytes, Unicode classification, BCP-47 language (ASCII hex),
  decoded Unicode scalar sequences and language-tag sequences. Mac Roman and
  malformed UTF-16 follow upstream decoding. String errors retain ReadError.
- Metrics: advance and side bearing for every stored long/bare record and two
  extra glyph IDs, exposing repeated final advances and absent bearings.
- Post: numNames, every readable `(glyph, name)` from the cached iterator, and
  eight direct lookup probes including IDs 65534/65535. Names use ASCII hex.
- Cmap subtables: language and every mapping within `CmapIterLimits::default()`.
  `.mappings[i]=codepoint,glyph,lookup` records both iteration and direct lookup;
  `lookup=-1` means None. Unicode variation observations use
  `.variants[i]=codepoint,selector,mapping,lookup`, where -2 means UseDefault,
  -1 means None and nonnegative values are glyph IDs. Counts follow the sequence.
  Cmap/DMAP also emit best/UVS selection and 15 fixed codepoint probes.

The iteration limits are upstream's maxChar=1114111 and glyphCount=65535, with
upstream format-specific semantics; all encoded groups and records are still
fully dumped. Format 14/15 limits are aggregate budgets, not value filters.
The expanded debug gate allows 120 seconds per process for full-repertoire fonts;
FDArrayTest257 produces 2.49 million lines. Output buffering changes no bytes.
