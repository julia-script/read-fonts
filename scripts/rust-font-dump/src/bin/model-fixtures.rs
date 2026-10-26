// Copyright 2026 the Fontations Authors. Licensed under Apache-2.0 or MIT.
//! Independent drawn-outline expectations for the upstream model unit tests.
use read_fonts::{
    model::{glyph::outline::ControlBoundsSink, Font, NormalizedCoord},
    ps::cff::CffFontRef,
    tables::glyf::outline::{Outline, OutlineTables, PathContourStart, ScaleF32},
    types::{F48Dot16, GlyphId, Tag},
    FontRef,
};
use std::io::{self, Write};

fn main() {
    let kind = std::env::args().nth(1).expect("fixture kind");
    let relative = match kind.as_str() {
        "bitmap-largest" | "bitmap-12" | "bitmap-64" => "cbdt.ttf",
        "varc-cjk" => "varc-6868.ttf",
        "varc-static" => "varc-static-gvar.ttf",
        "varc-conditionals" => "varc-ac01-conditional.ttf",
        "varc-precision" => "varc-delta-precision.ttf",
        "glyf" => "vazirmatn_var_trimmed.ttf",
        "cff" => "NotoSansJP-Regular.subset.otf",
        "cff2" => "NotoSansJP-VF.subset.otf",
        _ => panic!("unknown fixture"),
    };
    let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../upstream/font-test-data/test_data/ttf")
        .join(relative);
    let bytes = std::fs::read(path).unwrap();
    let font = Font::new(bytes.clone(), 0).unwrap();
    let mut output = io::stdout().lock();
    if kind.starts_with("varc-") {
        let outlines = font.outline_glyphs();
        for gid in 0..font.num_glyphs() {
            let e = outlines.get(GlyphId::new(gid)).unwrap().extents().unwrap();
            emit(
                &mut output,
                gid,
                [e.x_bearing, e.y_bearing, e.width, e.height].map(|v| F48Dot16::from_f64(v as f64)),
            );
        }
    } else if kind.starts_with("bitmap-") {
        let ppem = match kind.as_str() {
            "bitmap-12" => Some(12.0),
            "bitmap-64" => Some(64.0),
            _ => None,
        };
        let glyph = GlyphId::new(2);
        let bitmap = font
            .bitmap_strikes()
            .select(ppem)
            .unwrap()
            .get(glyph)
            .unwrap();
        let e = bitmap.extents();
        emit(
            &mut output,
            2,
            [e.x_bearing, e.y_bearing, e.width, e.height].map(|v| F48Dot16::from_f64(v as f64)),
        );
    } else if kind == "glyf" {
        let coords = [NormalizedCoord::from_f32(-1.0)];
        let direct = FontRef::new(&bytes).unwrap();
        let tables = OutlineTables::new(&direct).unwrap().at(&coords, &[]);
        let mut outline = Outline::<ScaleF32>::new();
        for gid in 0..font.num_glyphs() {
            let loaded = outline.load(&tables, GlyphId::new(gid), None).unwrap();
            let mut sink = ControlBoundsSink::new();
            let _ = loaded.to_path(PathContourStart::ScanBackward, &mut sink);
            let values = sink
                .bounding_box()
                .map(|b| {
                    let x = F48Dot16::from_f64(b.x_min as f64);
                    let y = F48Dot16::from_f64(b.y_max as f64);
                    [
                        x,
                        y,
                        F48Dot16::from_f64(b.x_max as f64) - x,
                        y - F48Dot16::from_f64(b.y_min as f64),
                    ]
                })
                .unwrap_or([F48Dot16::ZERO; 4]);
            emit(&mut output, gid, values);
        }
    } else {
        let direct = FontRef::new(&bytes).unwrap();
        let data = direct
            .table_data(Tag::new(b"CFF2"))
            .or_else(|| direct.table_data(Tag::new(b"CFF ")))
            .unwrap();
        let cff = CffFontRef::new(data.as_bytes(), 0, Some(font.units_per_em() as i32)).unwrap();
        for gid in 0..font.num_glyphs() {
            let glyph = GlyphId::new(gid);
            let subfont = cff.subfont(cff.subfont_index(glyph).unwrap(), &[]).unwrap();
            let mut sink = ControlBoundsSink::new();
            cff.draw(&subfont, glyph, &[], None, &mut sink).unwrap();
            let values = sink
                .bounding_box()
                .map(|b| {
                    [
                        F48Dot16::from_f64(b.x_min as f64),
                        F48Dot16::from_f64(b.y_max as f64),
                        F48Dot16::from_f64((b.x_max - b.x_min) as f64),
                        F48Dot16::from_f64((b.y_max - b.y_min) as f64),
                    ]
                })
                .unwrap_or([F48Dot16::ZERO; 4]);
            emit(&mut output, gid, values);
        }
    }
}
fn emit(out: &mut impl Write, gid: u32, values: [F48Dot16; 4]) {
    out.write_all(&gid.to_be_bytes()).unwrap();
    for value in values {
        out.write_all(&value.to_bits().to_be_bytes()).unwrap();
    }
}
