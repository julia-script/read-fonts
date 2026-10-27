import {
  Array,
  Data,
  Duration,
  Effect,
  Match,
  Number,
  Option,
  Order,
  Record,
  Schema,
  Stream,
  pipe,
} from 'effect'
import {
  Command,
  File,
  ManagedResource,
  Runtime,
  Subscription,
  type Update,
} from 'foldkit'
import { Document, Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'
import { ShapingError } from 'harfrust-wasm/effect'

import {
  EngineResource,
  type EngineService,
  FontInfo,
  type PositionedGlyph,
  type ShapedLine,
  ShapedText,
  fontFamily,
  loadEngine,
} from './engine'
import { bundledFonts } from './fonts'

const WASM_URL = './harfrust.wasm'
const ANIMATION_FRAME_MS = 16
const ANIMATION_PERIOD_TICKS = 180

// MODEL

export const LoadedFont = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  sample: Schema.String,
  note: Schema.String,
  info: FontInfo,
})
export type LoadedFont = typeof LoadedFont.Type

export const EngineState = defineTaggedUnion({
  Loading: {},
  Ready: {},
  Failed: { reason: Schema.String },
})
export type EngineState = typeof EngineState.Type

export const ShapingState = defineTaggedUnion({
  Waiting: {},
  Shaped: { shaped: ShapedText },
  Failed: { reason: Schema.String },
})
export type ShapingState = typeof ShapingState.Type

export const FeatureSetting = Schema.Literals(['On', 'Off'])
export type FeatureSetting = typeof FeatureSetting.Type

export const Direction = Schema.Literals(['auto', 'ltr', 'rtl'])
export type Direction = typeof Direction.Type

export const GlyphRef = Schema.Struct({
  line: Schema.Number,
  index: Schema.Number,
})
export type GlyphRef = typeof GlyphRef.Type

export const Model = Schema.Struct({
  engine: EngineState,
  fonts: Schema.Array(LoadedFont),
  maybeFontId: Schema.Option(Schema.String),
  maybeFontError: Schema.Option(Schema.String),
  text: Schema.String,
  features: Schema.Record(Schema.String, FeatureSetting),
  customFeatures: Schema.String,
  variations: Schema.Record(Schema.String, Schema.Number),
  isAnimating: Schema.Boolean,
  animationTick: Schema.Number,
  direction: Direction,
  fontSize: Schema.Number,
  isShowingMetrics: Schema.Boolean,
  isColoringClusters: Schema.Boolean,
  requestId: Schema.Number,
  shaping: ShapingState,
  maybeHovered: Schema.Option(GlyphRef),
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  CompletedLoadEngine: {},
  FailedLoadEngine: { reason: Schema.String },
  ReleasedEngine: {},
  CompletedLoadFont: { font: LoadedFont },
  FailedLoadFont: { name: Schema.String, reason: Schema.String },
  ClickedFont: { id: Schema.String },
  ClickedOpenFont: {},
  CompletedSelectFontFile: { file: File.File },
  CancelledSelectFontFile: {},
  UpdatedText: { text: Schema.String },
  ClickedSample: {},
  ClickedFeature: { tag: Schema.String },
  UpdatedCustomFeatures: { value: Schema.String },
  UpdatedAxis: { tag: Schema.String, value: Schema.Number },
  ClickedAnimate: {},
  TickedAnimation: {},
  UpdatedDirection: { direction: Direction },
  UpdatedFontSize: { size: Schema.Number },
  ClickedShowMetrics: {},
  ClickedColorClusters: {},
  CompletedShapeText: { requestId: Schema.Number, shaped: ShapedText },
  FailedShapeText: { requestId: Schema.Number, reason: Schema.String },
  HoveredGlyph: { glyph: GlyphRef },
  LeftGlyph: {},
})
export type Message = typeof Message.Type

type UpdateReturn = Update.Return<Model, Message, EngineService>

// COMMAND

class FontReadError extends Data.TaggedError('FontReadError')<{
  readonly reason: string
}> {}

const readFont = (
  id: string,
  name: string,
  sample: string,
  note: string,
  bytes: Effect.Effect<Uint8Array, FontReadError>,
) =>
  Effect.gen(function* () {
    const engine = yield* EngineResource.get
    const data = yield* bytes
    const info = yield* engine.addFont(id, data)
    return Message.CompletedLoadFont({ font: { id, name, sample, note, info } })
  }).pipe(
    Effect.catch(error =>
      Effect.succeed(
        Message.FailedLoadFont({ name, reason: describeError(error) }),
      ),
    ),
  )

const describeError = (error: unknown): string =>
  Match.value(error).pipe(
    Match.when(Match.instanceOf(ShapingError), ({ code }) =>
      describeCode(code),
    ),
    Match.when(Match.instanceOf(FontReadError), ({ reason }) => reason),
    Match.when(
      { _tag: 'ResourceNotAvailable' },
      () => 'the shaper is not ready',
    ),
    Match.orElse(() => String(error)),
  )

const describeCode = (code: ShapingError['code']): string =>
  Match.value(code).pipe(
    Match.when('InvalidFont', () => 'not a font this shaper can read'),
    Match.when('InvalidText', () => 'the text is not valid UTF-8'),
    Match.when('InvalidOption', () => 'a feature setting could not be parsed'),
    Match.orElse(() => code),
  )

export const LoadBundledFont = Command.define('LoadBundledFont', {
  args: {
    id: Schema.String,
    name: Schema.String,
    file: Schema.String,
    sample: Schema.String,
    note: Schema.String,
  },
  messages: [Message.CompletedLoadFont, Message.FailedLoadFont],
  execute: ({ id, name, file, sample, note }) =>
    readFont(
      id,
      name,
      sample,
      note,
      Effect.tryPromise({
        try: () =>
          fetch(`./fonts/${file}`).then(async response => {
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`)
            }
            return new Uint8Array(await response.arrayBuffer())
          }),
        catch: cause => new FontReadError({ reason: String(cause) }),
      }),
    ),
})

export const SelectFontFile = Command.define('SelectFontFile', {
  messages: [Message.CompletedSelectFontFile, Message.CancelledSelectFontFile],
  execute: File.select(['.ttf', '.otf', '.ttc', '.otc']).pipe(
    Effect.map(
      Option.match({
        onNone: () => Message.CancelledSelectFontFile(),
        onSome: file => Message.CompletedSelectFontFile({ file }),
      }),
    ),
  ),
})

export const ReadFontFile = Command.define('ReadFontFile', {
  args: { id: Schema.String, file: File.File },
  messages: [Message.CompletedLoadFont, Message.FailedLoadFont],
  execute: ({ id, file }) =>
    readFont(
      id,
      File.name(file),
      'Hello, Silk',
      `${(File.size(file) / 1024).toFixed(0)} KB, opened from your computer`,
      File.readAsArrayBuffer(file).pipe(
        Effect.map(buffer => new Uint8Array(buffer)),
        Effect.mapError(error => new FontReadError({ reason: error.reason })),
      ),
    ),
})

export const ShapeText = Command.define('ShapeText', {
  args: {
    requestId: Schema.Number,
    fontId: Schema.String,
    text: Schema.String,
    features: Schema.Array(Schema.String),
    variations: Schema.Record(Schema.String, Schema.Number),
    direction: Direction,
  },
  messages: [Message.CompletedShapeText, Message.FailedShapeText],
  execute: ({ requestId, fontId, text, features, variations, direction }) =>
    Effect.gen(function* () {
      const engine = yield* EngineResource.get
      const shaped = yield* engine.shape(fontId, text, {
        features,
        variations,
        ...(direction === 'auto' ? {} : { direction }),
      })
      return Message.CompletedShapeText({ requestId, shaped })
    }).pipe(
      Effect.catch(error =>
        Effect.succeed(
          Message.FailedShapeText({ requestId, reason: describeError(error) }),
        ),
      ),
    ),
})

// UPDATE

const featureStrings = (model: Model): ReadonlyArray<string> => [
  ...pipe(
    Record.toEntries(model.features),
    Array.map(([tag, setting]) => (setting === 'On' ? tag : `-${tag}`)),
  ),
  ...pipe(
    model.customFeatures.split(/[\s,]+/),
    Array.filter(feature => feature.length > 0),
  ),
]

const findFont = (model: Model): Option.Option<LoadedFont> =>
  Option.flatMap(model.maybeFontId, id =>
    Array.findFirst(model.fonts, font => font.id === id),
  )

/** Asks for the current text to be shaped again; older results are dropped when they arrive. */
const reshape = (model: Model): UpdateReturn =>
  Option.match(model.maybeFontId, {
    onNone: () => ({ model }),
    onSome: fontId => {
      const nextRequestId = Number.increment(model.requestId)
      return {
        model: modifyFields(model, { requestId: () => nextRequestId }),
        commands: [
          ShapeText({
            requestId: nextRequestId,
            fontId,
            text: model.text,
            features: featureStrings(model),
            variations: model.variations,
            direction: model.direction,
          }),
        ],
      }
    },
  })

const selectFont = (model: Model, font: LoadedFont): UpdateReturn =>
  reshape(
    modifyFields(model, {
      maybeFontId: () => Option.some(font.id),
      text: () => font.sample,
      variations: () =>
        Record.fromEntries(
          Array.map(font.info.axes, axis => [axis.tag, axis.default]),
        ),
      isAnimating: () => false,
      maybeHovered: () => Option.none(),
    }),
  )

const cycleFeature = (
  maybeSetting: Option.Option<FeatureSetting>,
): Option.Option<FeatureSetting> =>
  Option.match(maybeSetting, {
    onNone: () => Option.some('On'),
    onSome: setting => (setting === 'On' ? Option.some('Off') : Option.none()),
  })

const animatedVariations = (model: Model, font: LoadedFont) => {
  const phase = (model.animationTick / ANIMATION_PERIOD_TICKS) * 2 * Math.PI
  return Record.fromEntries(
    Array.map(font.info.axes, (axis, index) => {
      const wave = 0.5 - 0.5 * Math.cos(phase + index * 1.3)
      return [axis.tag, axis.min + (axis.max - axis.min) * wave]
    }),
  )
}

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    CompletedLoadEngine: () => ({
      model: modifyFields(model, { engine: () => EngineState.Ready() }),
      commands: Array.map(bundledFonts, font => LoadBundledFont(font)),
    }),

    FailedLoadEngine: ({ reason }) => ({
      model: modifyFields(model, {
        engine: () => EngineState.Failed({ reason }),
      }),
    }),

    ReleasedEngine: () => ({ model }),

    CompletedLoadFont: ({ font }) => {
      const nextFonts = [
        ...Array.filter(model.fonts, existing => existing.id !== font.id),
        font,
      ]
      const withFont = modifyFields(model, {
        fonts: () =>
          Array.sort(
            nextFonts,
            Order.mapInput(Number.Order, (entry: LoadedFont) =>
              fontRank(entry.id),
            ),
          ),
        maybeFontError: () => Option.none(),
      })
      // Start on the first bundled font; an opened file takes over the page.
      const isFirstOrUploaded =
        (Option.isNone(model.maybeFontId) && fontRank(font.id) === 0) ||
        font.id.startsWith('file-')
      return isFirstOrUploaded
        ? selectFont(withFont, font)
        : { model: withFont }
    },

    FailedLoadFont: ({ name, reason }) => ({
      model: modifyFields(model, {
        maybeFontError: () => Option.some(`${name}: ${reason}`),
      }),
    }),

    ClickedFont: ({ id }) =>
      Option.match(
        Array.findFirst(model.fonts, font => font.id === id),
        {
          onNone: () => ({ model }),
          onSome: font => selectFont(model, font),
        },
      ),

    ClickedOpenFont: () => ({ model, commands: [SelectFontFile()] }),

    CompletedSelectFontFile: ({ file }) => ({
      model,
      commands: [
        ReadFontFile({
          id: `file-${model.fonts.length}-${File.name(file)}`,
          file,
        }),
      ],
    }),

    CancelledSelectFontFile: () => ({ model }),

    UpdatedText: ({ text }) =>
      reshape(modifyFields(model, { text: () => text })),

    ClickedSample: () =>
      Option.match(findFont(model), {
        onNone: () => ({ model }),
        onSome: font =>
          reshape(modifyFields(model, { text: () => font.sample })),
      }),

    ClickedFeature: ({ tag }) =>
      reshape(
        modifyFields(model, {
          features: features =>
            Option.match(cycleFeature(Record.get(features, tag)), {
              onNone: () => Record.remove(features, tag),
              onSome: setting => Record.set(features, tag, setting),
            }),
        }),
      ),

    UpdatedCustomFeatures: ({ value }) =>
      reshape(modifyFields(model, { customFeatures: () => value })),

    UpdatedAxis: ({ tag, value }) =>
      reshape(
        modifyFields(model, {
          variations: variations => Record.set(variations, tag, value),
          isAnimating: () => false,
        }),
      ),

    ClickedAnimate: () => ({
      model: modifyFields(model, { isAnimating: isAnimating => !isAnimating }),
    }),

    TickedAnimation: () =>
      Option.match(findFont(model), {
        onNone: () => ({ model }),
        onSome: font => {
          const ticked = modifyFields(model, {
            animationTick: Number.increment,
          })
          return reshape(
            modifyFields(ticked, {
              variations: () => animatedVariations(ticked, font),
            }),
          )
        },
      }),

    UpdatedDirection: ({ direction }) =>
      reshape(modifyFields(model, { direction: () => direction })),

    UpdatedFontSize: ({ size }) => ({
      model: modifyFields(model, { fontSize: () => size }),
    }),

    ClickedShowMetrics: () => ({
      model: modifyFields(model, { isShowingMetrics: isShowing => !isShowing }),
    }),

    ClickedColorClusters: () => ({
      model: modifyFields(model, {
        isColoringClusters: isColoring => !isColoring,
      }),
    }),

    CompletedShapeText: ({ requestId, shaped }) =>
      requestId === model.requestId
        ? {
            model: modifyFields(model, {
              shaping: () => ShapingState.Shaped({ shaped }),
            }),
          }
        : { model },

    FailedShapeText: ({ requestId, reason }) =>
      requestId === model.requestId
        ? {
            model: modifyFields(model, {
              shaping: () => ShapingState.Failed({ reason }),
            }),
          }
        : { model },

    HoveredGlyph: ({ glyph }) => ({
      model: modifyFields(model, { maybeHovered: () => Option.some(glyph) }),
    }),

    LeftGlyph: () => ({
      model: modifyFields(model, { maybeHovered: () => Option.none() }),
    }),
  })

const fontRank = (id: string): number =>
  Option.getOrElse(
    Array.findFirstIndex(bundledFonts, font => font.id === id),
    () => bundledFonts.length,
  )

// INIT

export const init: Runtime.ApplicationInit<Model, Message> = () => ({
  model: {
    engine: EngineState.Loading(),
    fonts: [],
    maybeFontId: Option.none(),
    maybeFontError: Option.none(),
    text: '',
    features: {},
    customFeatures: '',
    variations: {},
    isAnimating: false,
    animationTick: 0,
    direction: 'auto',
    fontSize: 72,
    isShowingMetrics: true,
    isColoringClusters: true,
    requestId: 0,
    shaping: ShapingState.Waiting(),
    maybeHovered: Option.none(),
  },
})

// MANAGED RESOURCE

export const managedResources = ManagedResource.make<Model, Message>()(
  entry => ({
    engine: entry(Schema.Option(Schema.Null), {
      resource: EngineResource,
      modelToMaybeRequirements: model =>
        EngineState.match(model.engine, {
          Loading: () => Option.some(null),
          Ready: () => Option.some(null),
          Failed: () => Option.none(),
        }),
      acquire: () => loadEngine(WASM_URL),
      release: () => Effect.void,
      onAcquired: () => Message.CompletedLoadEngine(),
      onReleased: () => Message.ReleasedEngine(),
      onAcquireError: error =>
        Message.FailedLoadEngine({ reason: String(error) }),
    }),
  }),
)

// SUBSCRIPTION

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  animation: entry(
    { isAnimating: Schema.Boolean },
    {
      modelToDependencies: model => ({ isAnimating: model.isAnimating }),
      dependenciesToStream: ({ isAnimating }) =>
        Stream.when(
          Stream.tick(Duration.millis(ANIMATION_FRAME_MS)).pipe(
            Stream.drop(1),
            Stream.map(Message.TickedAnimation),
          ),
          Effect.sync(() => isAnimating),
        ),
    },
  ),
}))

// VIEW

const FEATURES: ReadonlyArray<{ tag: string; label: string }> = [
  { tag: 'liga', label: 'Ligatures' },
  { tag: 'kern', label: 'Kerning' },
  { tag: 'calt', label: 'Contextual' },
  { tag: 'dlig', label: 'Discretionary' },
  { tag: 'frac', label: 'Fractions' },
  { tag: 'smcp', label: 'Small caps' },
  { tag: 'onum', label: 'Old-style nums' },
  { tag: 'ss01', label: 'Stylistic set 1' },
]

// Mid-lightness hues that read on both the light and the dark surface.
const CLUSTER_COLORS: ReadonlyArray<string> = [
  'oklch(60% 0.16 262)',
  'oklch(60% 0.16 350)',
  'oklch(60% 0.16 160)',
  'oklch(60% 0.16 60)',
  'oklch(60% 0.16 300)',
  'oklch(60% 0.16 200)',
  'oklch(60% 0.16 25)',
  'oklch(60% 0.16 120)',
]

const panel = (
  title: string,
  children: ReadonlyArray<Html>,
  h: HtmlBuilder<Message>,
): Html =>
  h.section(
    [h.Class('flex flex-col gap-3')],
    [
      h.h2(
        [h.Class('text-xs font-semibold uppercase tracking-wider text-muted')],
        [title],
      ),
      ...children,
    ],
  )

const fontButton = (
  font: LoadedFont,
  isSelected: boolean,
  h: HtmlBuilder<Message>,
): Html =>
  h.button(
    [
      h.Type('button'),
      h.OnClick(Message.ClickedFont({ id: font.id })),
      h.AriaPressed(isSelected ? 'true' : 'false'),
      h.Class(
        isSelected
          ? 'w-full rounded-lg border border-ink bg-ink px-3 py-2 text-left text-on-ink'
          : 'w-full rounded-lg border border-line bg-surface px-3 py-2 text-left hover:border-line-strong',
      ),
    ],
    [
      h.div([h.Class('text-sm font-medium')], [font.name]),
      h.div(
        [
          h.Class(
            isSelected ? 'text-xs text-on-ink-muted' : 'text-xs text-muted',
          ),
        ],
        [font.note],
      ),
    ],
  )

const fontsPanel = (model: Model, h: HtmlBuilder<Message>): Html =>
  panel(
    'Font',
    [
      h.div(
        [h.Class('flex flex-col gap-2')],
        Array.map(model.fonts, font =>
          fontButton(font, Option.contains(model.maybeFontId, font.id), h),
        ),
      ),
      h.button(
        [
          h.Type('button'),
          h.OnClick(Message.ClickedOpenFont()),
          h.Class(
            'rounded-lg border border-dashed border-line-strong px-3 py-2 text-sm text-soft hover:border-line-strong hover:text-ink',
          ),
        ],
        ['Open a font file…'],
      ),
      Option.match(model.maybeFontError, {
        onNone: () => h.empty,
        onSome: error => h.p([h.Class('text-sm text-danger')], [error]),
      }),
    ],
    h,
  )

const featureButton = (
  feature: { tag: string; label: string },
  maybeSetting: Option.Option<FeatureSetting>,
  h: HtmlBuilder<Message>,
): Html => {
  const state = Option.match(maybeSetting, {
    onNone: () => ({
      className: 'border-line bg-surface text-soft',
      suffix: '',
    }),
    onSome: setting =>
      setting === 'On'
        ? {
            className: 'border-on-line bg-on-bg text-on-fg',
            suffix: ' on',
          }
        : {
            className: 'border-off-line bg-off-bg text-off-fg line-through',
            suffix: ' off',
          },
  })
  return h.button(
    [
      h.Type('button'),
      h.OnClick(Message.ClickedFeature({ tag: feature.tag })),
      h.Title(
        `${feature.label}: click to force on, off, or back to the default`,
      ),
      h.Class(
        `rounded-full border px-3 py-1 font-mono text-xs ${state.className}`,
      ),
    ],
    [`${feature.tag}${state.suffix}`],
  )
}

const featuresPanel = (model: Model, h: HtmlBuilder<Message>): Html =>
  panel(
    'OpenType features',
    [
      h.div(
        [h.Class('flex flex-wrap gap-2')],
        Array.map(FEATURES, feature =>
          featureButton(feature, Record.get(model.features, feature.tag), h),
        ),
      ),
      h.input([
        h.Type('text'),
        h.Value(model.customFeatures),
        h.Placeholder('More features, e.g. ss02 cv01 kern[0:3]=0'),
        h.AriaLabel('More features'),
        h.OnInput(value => Message.UpdatedCustomFeatures({ value })),
        h.Class(
          'rounded-lg border border-line px-3 py-2 font-mono text-xs focus:border-line-strong focus:outline-none',
        ),
      ]),
    ],
    h,
  )

const formatAxisValue = (value: number): string =>
  Math.abs(value) >= 10 ? value.toFixed(0) : value.toFixed(2)

const axesPanel = (
  model: Model,
  font: LoadedFont,
  h: HtmlBuilder<Message>,
): Html =>
  Array.match(font.info.axes, {
    onEmpty: () => h.empty,
    onNonEmpty: axes =>
      panel(
        'Variations',
        [
          ...Array.map(axes, axis => {
            const value = Option.getOrElse(
              Record.get(model.variations, axis.tag),
              () => axis.default,
            )
            return h.label(
              [h.Class('flex flex-col gap-1 text-sm')],
              [
                h.span(
                  [h.Class('flex justify-between font-mono text-xs text-soft')],
                  [
                    h.span([], [axis.tag]),
                    h.span([], [formatAxisValue(value)]),
                  ],
                ),
                h.input([
                  h.Type('range'),
                  h.Min(String(axis.min)),
                  h.Max(String(axis.max)),
                  h.Step('any'),
                  h.Value(String(value)),
                  h.OnInput(raw =>
                    Message.UpdatedAxis({
                      tag: axis.tag,
                      value: globalThis.Number(raw),
                    }),
                  ),
                  h.Class('accent-ink'),
                ]),
              ],
            )
          }),
          h.button(
            [
              h.Type('button'),
              h.OnClick(Message.ClickedAnimate()),
              h.Class(
                model.isAnimating
                  ? 'rounded-lg bg-ink px-3 py-2 text-sm text-on-ink'
                  : 'rounded-lg border border-line-strong px-3 py-2 text-sm hover:border-line-strong',
              ),
            ],
            [
              model.isAnimating
                ? 'Stop animation'
                : 'Animate axes (reshapes every frame)',
            ],
          ),
        ],
        h,
      ),
  })

const layoutPanel = (model: Model, h: HtmlBuilder<Message>): Html =>
  panel(
    'Layout',
    [
      h.div(
        [h.Class('flex gap-2')],
        Array.map(
          ['auto', 'ltr', 'rtl'] satisfies ReadonlyArray<Direction>,
          direction =>
            h.button(
              [
                h.Type('button'),
                h.OnClick(Message.UpdatedDirection({ direction })),
                h.Class(
                  model.direction === direction
                    ? 'rounded-full bg-ink px-3 py-1 font-mono text-xs text-on-ink'
                    : 'rounded-full border border-line px-3 py-1 font-mono text-xs hover:border-line-strong',
                ),
              ],
              [direction],
            ),
        ),
      ),
      h.label(
        [h.Class('flex flex-col gap-1')],
        [
          h.span(
            [h.Class('flex justify-between font-mono text-xs text-soft')],
            [h.span([], ['size']), h.span([], [`${model.fontSize}px`])],
          ),
          h.input([
            h.Type('range'),
            h.Min('16'),
            h.Max('200'),
            h.Value(String(model.fontSize)),
            h.OnInput(raw =>
              Message.UpdatedFontSize({ size: globalThis.Number(raw) }),
            ),
            h.Class('accent-ink'),
          ]),
        ],
      ),
      h.div(
        [h.Class('flex flex-wrap gap-4 text-sm')],
        [
          checkbox(
            'Metrics',
            model.isShowingMetrics,
            Message.ClickedShowMetrics(),
            h,
          ),
          checkbox(
            'Color clusters',
            model.isColoringClusters,
            Message.ClickedColorClusters(),
            h,
          ),
        ],
      ),
    ],
    h,
  )

const checkbox = (
  label: string,
  isChecked: boolean,
  message: Message,
  h: HtmlBuilder<Message>,
): Html =>
  h.label(
    [h.Class('flex items-center gap-2')],
    [
      h.input([
        h.Type('checkbox'),
        h.Checked(isChecked),
        h.OnChange(() => message),
        h.Class('accent-ink'),
      ]),
      label,
    ],
  )

interface PlacedGlyph {
  readonly glyph: PositionedGlyph
  readonly index: number
  readonly penX: number
  readonly penY: number
}

const placeGlyphs = (line: ShapedLine): ReadonlyArray<PlacedGlyph> =>
  Array.mapAccum(line.glyphs, { penX: 0, penY: 0 }, (pen, glyph, index) => [
    { penX: pen.penX + glyph.xAdvance, penY: pen.penY + glyph.yAdvance },
    { glyph, index, penX: pen.penX, penY: pen.penY },
  ])[1]

const lineWidth = (line: ShapedLine): number =>
  Array.reduce(line.glyphs, 0, (width, glyph) => width + glyph.xAdvance)

const clusterColor = (line: ShapedLine, cluster: number): string => {
  const clusters = pipe(
    line.glyphs,
    Array.map(glyph => glyph.cluster),
    Array.dedupe,
    Array.sort(Number.Order),
  )
  const index = Option.getOrElse(
    Array.findFirstIndex(clusters, value => value === cluster),
    () => 0,
  )
  return Option.getOrElse(
    Array.get(CLUSTER_COLORS, index % CLUSTER_COLORS.length),
    () => 'var(--color-ink)',
  )
}

const isHovered = (model: Model, line: number, index: number): boolean =>
  Option.exists(
    model.maybeHovered,
    hovered => hovered.line === line && hovered.index === index,
  )

const lineView = (
  model: Model,
  font: LoadedFont,
  shaped: ShapedText,
  line: ShapedLine,
  lineIndex: number,
  h: HtmlBuilder<Message>,
): Html => {
  const { ascender, descender, unitsPerEm } = font.info
  const padding = unitsPerEm * 0.2
  const width = Math.max(lineWidth(line), unitsPerEm * 0.5)
  const height = ascender - descender
  const scale = model.fontSize / unitsPerEm
  const placed = placeGlyphs(line)
  const metrics = model.isShowingMetrics
    ? [
        h.line([
          h.X1(String(-padding)),
          h.X2(String(width + padding)),
          h.Y1('0'),
          h.Y2('0'),
          h.Style({ stroke: 'var(--color-faint)' }),
          h.StrokeWidth(String(unitsPerEm / 200)),
        ]),
        ...Array.map(placed, ({ glyph, index, penX, penY }) =>
          h.rect([
            h.X(String(penX)),
            h.Y(String(penY + descender)),
            h.Width(String(Math.max(glyph.xAdvance, 0))),
            h.Height(String(height)),
            h.Style({
              fill: isHovered(model, lineIndex, index)
                ? 'var(--color-highlight)'
                : 'none',
              stroke: 'var(--color-line-strong)',
            }),
            h.StrokeWidth(String(unitsPerEm / 400)),
          ]),
        ),
      ]
    : []
  return h.svg(
    [
      h.ViewBox(
        `${-padding} ${-ascender - padding} ${width + padding * 2} ${height + padding * 2}`,
      ),
      h.Width(String((width + padding * 2) * scale)),
      h.Height(String((height + padding * 2) * scale)),
      h.Role('img'),
      h.AriaLabel(line.text),
      h.Class('block h-auto max-w-full'),
    ],
    [
      h.g(
        [h.Transform('scale(1,-1)')],
        [
          ...metrics,
          ...Array.map(placed, ({ glyph, index, penX, penY }) =>
            h.path([
              h.D(
                Option.getOrElse(
                  Record.get(shaped.outlines, String(glyph.glyphId)),
                  () => '',
                ),
              ),
              h.Transform(
                `translate(${penX + glyph.xOffset},${penY + glyph.yOffset})`,
              ),
              h.Style({
                fill: isHovered(model, lineIndex, index)
                  ? 'var(--color-accent)'
                  : model.isColoringClusters
                    ? clusterColor(line, glyph.cluster)
                    : 'var(--color-ink)',
              }),
              h.OnMouseEnter(
                Message.HoveredGlyph({ glyph: { line: lineIndex, index } }),
              ),
              h.OnMouseLeave(Message.LeftGlyph()),
            ]),
          ),
        ],
      ),
    ],
  )
}

const glyphTable = (
  model: Model,
  shaped: ShapedText,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [
      h.Class(
        'max-h-80 overflow-auto rounded-lg border border-line bg-surface',
      ),
    ],
    [
      h.table(
        [h.Class('w-full text-left font-mono text-xs')],
        [
          h.thead(
            [h.Class('sticky top-0 bg-subtle text-muted')],
            [
              h.tr(
                [],
                Array.map(
                  ['#', 'glyph', 'id', 'cluster', 'advance', 'offset'],
                  heading =>
                    h.th([h.Class('px-3 py-2 font-medium')], [heading]),
                ),
              ),
            ],
          ),
          h.tbody(
            [],
            Array.flatMap(shaped.lines, (line, lineIndex) =>
              Array.map(line.glyphs, (glyph, index) =>
                h.tr(
                  [
                    h.OnMouseEnter(
                      Message.HoveredGlyph({
                        glyph: { line: lineIndex, index },
                      }),
                    ),
                    h.OnMouseLeave(Message.LeftGlyph()),
                    h.Class(
                      isHovered(model, lineIndex, index)
                        ? 'bg-highlight'
                        : 'border-t border-line hover:bg-subtle',
                    ),
                  ],
                  [
                    h.td([h.Class('px-3 py-1 text-faint')], [String(index)]),
                    h.td(
                      [h.Class('px-3 py-1')],
                      [
                        h.span(
                          [
                            h.Style({
                              color: model.isColoringClusters
                                ? clusterColor(line, glyph.cluster)
                                : 'inherit',
                            }),
                          ],
                          [glyph.name],
                        ),
                      ],
                    ),
                    h.td([h.Class('px-3 py-1')], [String(glyph.glyphId)]),
                    h.td([h.Class('px-3 py-1')], [String(glyph.cluster)]),
                    h.td([h.Class('px-3 py-1')], [String(glyph.xAdvance)]),
                    h.td(
                      [h.Class('px-3 py-1')],
                      [
                        glyph.xOffset || glyph.yOffset
                          ? `${glyph.xOffset}, ${glyph.yOffset}`
                          : '',
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    ],
  )

const glyphCount = (shaped: ShapedText): number =>
  Array.reduce(shaped.lines, 0, (count, line) => count + line.glyphs.length)

const resultView = (
  model: Model,
  font: LoadedFont,
  h: HtmlBuilder<Message>,
): Html =>
  ShapingState.match(model.shaping, {
    Waiting: () => h.p([h.Class('text-muted')], ['Shaping…']),
    Failed: ({ reason }) =>
      h.p([h.Class('text-danger')], [`Shaping failed: ${reason}`]),
    Shaped: ({ shaped }) =>
      h.div(
        [h.Class('flex flex-col gap-6')],
        [
          h.div(
            [
              h.Class(
                'flex flex-wrap gap-x-6 gap-y-1 font-mono text-xs text-muted',
              ),
            ],
            [
              h.span([], [`${glyphCount(shaped)} glyphs`]),
              h.span(
                [],
                [`shaped and drawn in ${shaped.elapsedMs.toFixed(2)} ms`],
              ),
              h.span(
                [],
                [
                  pipe(
                    Array.head(shaped.lines),
                    Option.match({
                      onNone: () => '',
                      onSome: line => `${line.script} · ${line.direction}`,
                    }),
                  ),
                ],
              ),
            ],
          ),
          h.div(
            [
              h.Class(
                'flex flex-col gap-2 overflow-x-auto rounded-xl bg-surface p-6 shadow-sm ring-1 ring-line',
              ),
            ],
            Array.map(shaped.lines, (line, lineIndex) =>
              lineView(model, font, shaped, line, lineIndex, h),
            ),
          ),
          glyphTable(model, shaped, h),
        ],
      ),
  })

const editorView = (
  model: Model,
  font: LoadedFont,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [h.Class('flex flex-col gap-2')],
    [
      h.textarea([
        h.Value(model.text),
        h.Rows(2),
        h.Dir('auto'),
        h.AriaLabel('Text to shape'),
        h.Style({ fontFamily: `"${fontFamily(font.id)}", sans-serif` }),
        h.OnInput(text => Message.UpdatedText({ text })),
        h.Class(
          'w-full resize-y rounded-xl border border-line bg-surface px-4 py-3 text-xl shadow-sm focus:border-line-strong focus:outline-none',
        ),
      ]),
      h.div(
        [h.Class('flex justify-end')],
        [
          h.button(
            [
              h.Type('button'),
              h.OnClick(Message.ClickedSample()),
              h.Class('text-xs text-muted underline hover:text-ink'),
            ],
            ['Reset to the sample'],
          ),
        ],
      ),
    ],
  )

const headerView = (h: HtmlBuilder<Message>): Html =>
  h.header(
    [h.Class('flex flex-col gap-2')],
    [
      h.h1(
        [h.Class('font-display text-4xl font-medium tracking-tight')],
        ['Text shaping in Silk'],
      ),
      h.p(
        [h.Class('max-w-3xl text-soft')],
        [
          'This page runs harfrust, ported to the Silk language and compiled to WebAssembly. ',
          'Every glyph below was chosen, positioned and drawn by Silk code in your browser: ',
          'shaping by harfrust, outlines by read_fonts. Type, switch fonts, toggle features, or open your own font.',
        ],
      ),
    ],
  )

const mainView = (model: Model, h: HtmlBuilder<Message>): Html =>
  EngineState.match(model.engine, {
    Loading: () => h.p([h.Class('text-muted')], ['Loading the shaper…']),
    Failed: ({ reason }) => h.p([h.Class('text-danger')], [reason]),
    Ready: () =>
      Option.match(findFont(model), {
        onNone: () => h.p([h.Class('text-muted')], ['Loading fonts…']),
        onSome: font =>
          h.div(
            [h.Class('grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]')],
            [
              h.aside(
                [h.Class('order-last flex flex-col gap-8 lg:order-first')],
                [
                  fontsPanel(model, h),
                  axesPanel(model, font, h),
                  featuresPanel(model, h),
                  layoutPanel(model, h),
                ],
              ),
              h.div(
                [h.Class('flex min-w-0 flex-col gap-6')],
                [editorView(model, font, h), resultView(model, font, h)],
              ),
            ],
          ),
      }),
  })

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Text shaping in Silk',
  body: h.div(
    [h.Class('min-h-screen bg-page text-ink')],
    [
      h.div(
        [h.Class('page-gutter mx-auto flex max-w-7xl flex-col gap-8 py-10')],
        [
          headerView(h),
          mainView(model, h),
          h.footer(
            [h.Class('text-xs text-muted')],
            [
              'harfrust and read_fonts are Silk ports of the Rust crates of the same names. ',
              'Fonts: Noto (OFL), Amiri (OFL), Source Serif (OFL), Roboto (Apache 2.0). UI built with Foldkit and Effect.',
            ],
          ),
        ],
      ),
    ],
  ),
})
