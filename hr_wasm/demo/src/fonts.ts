/** Fonts that ship with the demo, each with a sample that shows off its shaping. */
export interface BundledFont {
  readonly id: string
  readonly name: string
  readonly file: string
  readonly sample: string
  readonly note: string
}

export const bundledFonts: ReadonlyArray<BundledFont> = [
  {
    id: 'nastaliq',
    name: 'Noto Nastaliq Urdu',
    file: 'NotoNastaliqUrdu-Regular.ttf',
    sample: 'اردو زبان کی خوبصورتی نستعلیق میں ہے',
    note: 'Urdu in Nastaliq: cascading contextual forms and cursive attachment',
  },
  {
    id: 'amiri',
    name: 'Amiri',
    file: 'Amiri-Regular.ttf',
    sample: 'بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ',
    note: 'Arabic Naskh: ligatures and stacked marks',
  },
  {
    id: 'devanagari',
    name: 'Noto Sans Devanagari',
    file: 'NotoSansDevanagari-Regular.ttf',
    sample: 'हिन्दी में क्षत्रिय और श्रद्धा',
    note: 'Hindi: conjuncts, reordered vowel signs and half forms',
  },
  {
    id: 'source-serif',
    name: 'Source Serif Variable',
    file: 'SourceSerifVariable-Roman.ttf',
    sample: 'Variable fonts, shaped live',
    note: 'A variable font: drag the weight axis',
  },
  {
    id: 'roboto',
    name: 'Roboto',
    file: 'Roboto-Regular.ttf',
    sample: 'Official affine office ½ fi fl ffi',
    note: 'Latin: ligatures, kerning and fractions',
  },
]
