import { Clock, Effect, Schema } from 'effect'
import { ManagedResource } from 'foldkit'
import { type Font, type ShapeOptions } from 'harfrust-wasm'
import { type ShaperApi, ShapingError, makeShaper } from 'harfrust-wasm/effect'

// FONT INFO

export const Axis = Schema.Struct({
  tag: Schema.String,
  min: Schema.Number,
  default: Schema.Number,
  max: Schema.Number,
})
export type Axis = typeof Axis.Type

export const FontInfo = Schema.Struct({
  unitsPerEm: Schema.Number,
  ascender: Schema.Number,
  descender: Schema.Number,
  glyphCount: Schema.Number,
  axes: Schema.Array(Axis),
})
export type FontInfo = typeof FontInfo.Type

// SHAPED TEXT

export const PositionedGlyph = Schema.Struct({
  glyphId: Schema.Number,
  name: Schema.String,
  cluster: Schema.Number,
  xAdvance: Schema.Number,
  yAdvance: Schema.Number,
  xOffset: Schema.Number,
  yOffset: Schema.Number,
})
export type PositionedGlyph = typeof PositionedGlyph.Type

export const ShapedLine = Schema.Struct({
  text: Schema.String,
  direction: Schema.String,
  script: Schema.String,
  glyphs: Schema.Array(PositionedGlyph),
})
export type ShapedLine = typeof ShapedLine.Type

export const ShapedText = Schema.Struct({
  lines: Schema.Array(ShapedLine),
  outlines: Schema.Record(Schema.String, Schema.String),
  elapsedMs: Schema.Number,
})
export type ShapedText = typeof ShapedText.Type

// ENGINE

/** The CSS font family the browser knows a demo font by. */
export const fontFamily = (id: string): string => `silk-demo-${id}`

/** The wasm shaper plus the fonts it has read, keyed by the demo's font ids. */
export interface Engine {
  readonly addFont: (
    id: string,
    bytes: Uint8Array,
  ) => Effect.Effect<FontInfo, ShapingError>
  readonly shape: (
    id: string,
    text: string,
    options: ShapeOptions,
  ) => Effect.Effect<ShapedText, ShapingError>
}

export const makeEngine = (shaper: ShaperApi): Engine => {
  const fonts = new Map<string, Font>()
  return {
    addFont: (id, bytes) =>
      Effect.gen(function* () {
        const font = yield* shaper.loadFont(bytes)
        fonts.set(id, font)
        // Also give the font to the browser, so the text box uses it.
        yield* Effect.ignore(
          Effect.tryPromise(async () => {
            const face = await new FontFace(
              fontFamily(id),
              bytes.slice(),
            ).load()
            document.fonts.add(face)
          }),
        )
        return {
          unitsPerEm: font.info.unitsPerEm,
          ascender: font.info.ascender,
          descender: font.info.descender,
          glyphCount: font.info.glyphCount,
          axes: font.info.axes,
        }
      }),
    shape: (id, text, options) =>
      Effect.gen(function* () {
        const font = fonts.get(id)
        if (font === undefined) {
          return yield* new ShapingError({ code: 'InvalidFont' })
        }
        const outlines: Record<string, string> = {}
        const lines: Array<ShapedLine> = []
        const started = yield* Clock.currentTimeNanos
        for (const line of text.split('\n')) {
          const result = yield* shaper.shape(font, line, {
            ...options,
            outlines: true,
            glyphNames: true,
          })
          for (const [glyphId, path] of result.outlines) {
            outlines[glyphId] = path
          }
          lines.push({
            text: line,
            direction: result.direction,
            script: result.script,
            glyphs: result.glyphs.map(glyph => ({
              glyphId: glyph.glyphId,
              name: glyph.name ?? `gid${glyph.glyphId}`,
              cluster: glyph.cluster,
              xAdvance: glyph.xAdvance,
              yAdvance: glyph.yAdvance,
              xOffset: glyph.xOffset,
              yOffset: glyph.yOffset,
            })),
          })
        }
        const finished = yield* Clock.currentTimeNanos
        return { lines, outlines, elapsedMs: Number(finished - started) / 1e6 }
      }),
  }
}

export const loadEngine = (wasmUrl: string): Effect.Effect<Engine, string> =>
  makeShaper(wasmUrl).pipe(
    Effect.map(makeEngine),
    Effect.mapError(
      error => `Could not load the shaper: ${String(error.cause)}`,
    ),
  )

export const EngineResource = ManagedResource.tag<Engine>()('Engine')
export type EngineService = ManagedResource.ServiceOf<typeof EngineResource>
