import { Html, HtmlBuilder } from 'foldkit/html'

/**
 * The "Built with Silk" badge: the Silk mark (three threads twisting into an S) beside the label.
 * It has no styling dependencies: colors derive from `currentColor` and the font is inherited,
 * so it can be dropped into any Foldkit app and follows that app's theme.
 */

/** The mark's thread paths in a 48x48 box: one main thread and two lighter ones beside it. */
const threads: ReadonlyArray<{
  readonly d: string
  readonly width: string
  readonly opacity: string
}> = [
  {
    d: 'M38 9 C27 3 9 6 10 15 C11 24 38 21 38 32 C38 43 18 45 9 39',
    width: '3.4',
    opacity: '1',
  },
  {
    d: 'M38 9 C29 6 14 9 15 16 C16 23 33 23 33 32 C33 40 19 42 9 39',
    width: '1.9',
    opacity: '0.75',
  },
  {
    d: 'M38 9 C24 1 5 4 6 15 C7 26 42 20 42 32 C42 46 16 47 9 39',
    width: '1.9',
    opacity: '0.75',
  },
]

const gradientStops = [
  ['0', '#f0a35e'],
  ['0.5', '#d9467a'],
  ['1', '#6b4bd8'],
] as const

/** The Silk mark alone, `size` pixels square. */
export const silkMark = <Message>(h: HtmlBuilder<Message>, size = 24): Html =>
  h.svg(
    [
      h.ViewBox('0 0 48 48'),
      h.Width(String(size)),
      h.Height(String(size)),
      h.AriaHidden(true),
      h.Style({ flex: 'none' }),
    ],
    [
      h.defs(
        [],
        [
          h.linearGradient(
            [
              h.Id('silk-mark-gradient'),
              h.X1('0'),
              h.Y1('0'),
              h.X2('1'),
              h.Y2('1'),
            ],
            gradientStops.map(([offset, color]) =>
              h.stop([h.Offset(offset), h.StopColor(color)]),
            ),
          ),
        ],
      ),
      h.g(
        [
          h.Fill('none'),
          h.Stroke('url(#silk-mark-gradient)'),
          h.StrokeLinecap('round'),
        ],
        threads.map(thread =>
          h.path([
            h.D(thread.d),
            h.StrokeWidth(thread.width),
            h.Opacity(thread.opacity),
          ]),
        ),
      ),
    ],
  )

/** A pill linking to `href` that reads "Built with Silk". */
export const builtWithSilk = <Message>(
  h: HtmlBuilder<Message>,
  href = 'https://github.com/julia-script/read-fonts',
): Html =>
  h.a(
    [
      h.Href(href),
      h.Target('_blank'),
      h.Rel('noopener'),
      h.AriaLabel('Built with Silk'),
      h.Style({
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5em',
        padding: '0.35em 0.9em 0.35em 0.55em',
        borderRadius: '999px',
        border: '1px solid color-mix(in oklab, currentColor 16%, transparent)',
        background: 'color-mix(in oklab, currentColor 4%, transparent)',
        color: 'inherit',
        fontSize: '0.875rem',
        lineHeight: '1',
        textDecoration: 'none',
        whiteSpace: 'nowrap',
      }),
    ],
    [
      silkMark(h, 20),
      h.span(
        [],
        [
          h.span([h.Style({ opacity: '0.7' })], ['Built with ']),
          h.span([h.Style({ fontWeight: '650' })], ['Silk']),
        ],
      ),
    ],
  )
