//! Rust counterpart of font_bench/src/workloads.silk: `font-bench WORKLOAD FONT` prints the
//! same checksum the Silk program prints.
use read_fonts::{
    tables::{glyf::Glyph, loca::LocaGlyph},
    types::GlyphId,
    FontRef, TableProvider,
};

fn cmap(font: &FontRef) -> u64 {
    let Ok(table) = font.cmap() else { return 0 };
    let Some((_, _, subtable)) = table.best_subtable() else {
        return 0;
    };
    let mut sum = 0u64;
    for cp in 0..0x110000u32 {
        if let Some(gid) = subtable.map_codepoint(cp) {
            sum = sum.wrapping_add(gid.to_u32() as u64);
        }
    }
    sum
}

fn unsigned(value: i16) -> u64 {
    (value as i32 + 32768) as u64
}

fn glyf(font: &FontRef) -> u64 {
    let (Ok(loca), Ok(glyf)) = (font.loca(None), font.glyf()) else {
        return 0;
    };
    let mut sum = 0u64;
    for gid in 0..loca.len() {
        let Some(LocaGlyph::Glyph(glyph)) = loca.get(GlyphId::new(gid as u32), &glyf) else {
            continue;
        };
        match glyph {
            Glyph::Simple(simple) => {
                for point in simple.points() {
                    sum = sum.wrapping_add(unsigned(point.x) + unsigned(point.y));
                    if point.on_curve {
                        sum = sum.wrapping_add(1);
                    }
                }
            }
            Glyph::Composite(composite) => {
                for component in composite.components() {
                    sum = sum.wrapping_add(component.glyph.to_u32() as u64);
                }
            }
        }
    }
    sum
}

fn hmtx(font: &FontRef) -> u64 {
    let Ok(table) = font.hmtx() else { return 0 };
    let mut sum = 0u64;
    for gid in 0..65536u32 {
        if let Some(advance) = table.advance(GlyphId::new(gid)) {
            sum = sum.wrapping_add(advance as u64);
        }
    }
    sum
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.len() != 3 {
        eprintln!("usage: font-bench cmap|glyf|hmtx FONT");
        std::process::exit(2);
    }
    let data = std::fs::read(&args[2]).unwrap_or_else(|_| {
        eprintln!("font-bench: unable to read input");
        std::process::exit(2)
    });
    let checksum = match FontRef::new(&data) {
        Ok(font) => match args[1].as_str() {
            "cmap" => cmap(&font),
            "glyf" => glyf(&font),
            "hmtx" => hmtx(&font),
            _ => {
                eprintln!("font-bench: unknown workload");
                std::process::exit(2);
            }
        },
        Err(_) => 0,
    };
    println!("{checksum}");
}
