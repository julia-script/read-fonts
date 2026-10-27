# A list of lifetime-carrying values inside a struct breaks appending it to a list

Upstream: https://github.com/silk-lang/silk/issues/2425

Run `silk check --manifest-path compiler-bugs/010-list-of-lifetime-struct/silk.toml`.
On `0.1.0-dev.20+10a8c67813a1` this reports SEM0012 at
`List<Plan>.append(&mut plans, move plan)`; the expected result is success.
Removing the `items: List<Item<'a>>` field from `Plan` makes it check.

Harfrust's `OtPlan` caches lookup subtables as `LookupSubtable` values that keep
their offset in the layout table instead of a `View<'a>`, and rebuilds the view
with `View.tail` where a subtable is applied.
