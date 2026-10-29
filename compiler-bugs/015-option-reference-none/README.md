# Empty borrowed Option diagnostic

Reported as [silk-lang/silk#2580](https://github.com/silk-lang/silk/issues/2580).
Silk `0.1.0-dev.27+323ceb59e7ee`, macOS arm64.

From the repository root:

```sh
silk check --manifest-path compiler-bugs/015-option-reference-none/silk.toml
```

Observed exit 1:

```text
.../stdlib/silk/option.silk:134:18: error[SEM0099] One named type parameter left undetermined by an explicit prefix and the arguments
src/main.silk:23:13: error[SEM0099] One named type parameter left undetermined by an explicit prefix and the arguments
```

`Option<&Value>.None` is on line 19, but the primary diagnostic points to `T`
in the standard library's `Option<T>` declaration. The report requests a useful
constructor/lifetime diagnostic; it does not assume that unconstrained lifetime
inference must succeed. Related inference-policy issues are #959 and #960.

Changing only that construction to `Option<&'static Value>.None` in a separate
pinned control package compiled successfully and its executable exited 0.
`svg_core/src/url.silk` uses this qualification for an absent base URL. An empty
variant carries no live borrow; `Some` still retains the actual base lifetime.
This adds no allocation or runtime operation, so an Ir A/B delta is inapplicable.
