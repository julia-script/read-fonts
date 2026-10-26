# Font dump format 1

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
- Silk skeleton: 0 for `--help`/`--version`, 2 for incorrect argument count, 3 for
  unimplemented parsing. Unhandled service failures use Silk's status 1.
- Comparison: 0 for complete matching valid dumps, 1 for a textual difference,
  2 for setup/process/timeout/protocol failure (even if both outputs match).

The skeleton emits the first two protocol records followed by
`dump.status=unimplemented`. This is deliberately **not** a valid parsed dump.
New table scopes will be specified before comparison gates use them; no supported
field may be suppressed to make two implementations agree.
