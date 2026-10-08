// Indicative market prices, mid-2025. Rounded, for play only.
// unit: how the price is quoted. cat: materials | finishes | mep | plant | labour

export const MARKETS = {
  eg: { name: 'Egypt', currency: 'EGP', flag: '🇪🇬' },
  ae: { name: 'UAE', currency: 'AED', flag: '🇦🇪' },
  sa: { name: 'KSA', currency: 'SAR', flag: '🇸🇦' },
};

// name, unit, cat, [eg, ae, sa]
const ROWS = [
  ['High-tensile rebar B500', 'tonne', 'materials', 36000, 2500, 2850],
  ['OPC cement 42.5N', 'tonne', 'materials', 3600, 310, 315],
  ['Ready-mix concrete C30', 'm³', 'materials', 3100, 250, 220],
  ['Ready-mix concrete C40', 'm³', 'materials', 3400, 265, 235],
  ['Washed sand', 'm³', 'materials', 350, 45, 40],
  ['Crushed aggregate 20 mm', 'm³', 'materials', 450, 60, 55],
  ['Hollow concrete block 20 cm', 'no.', 'materials', 18, 3.2, 1.9],
  ['Thermal insulated block 20 cm', 'no.', 'materials', 45, 6.5, 4.5],
  ['Red clay brick', '1000 no.', 'materials', 2400, 450, 400],
  ['Welded mesh A142 sheet 2×6 m', 'sheet', 'materials', 1600, 160, 150],
  ['Binding wire', 'kg', 'materials', 60, 5, 5],
  ['Structural steel, fabricated', 'tonne', 'materials', 65000, 9500, 9000],
  ['Plywood 18 mm sheet', 'sheet', 'materials', 1100, 90, 85],
  ['Form plywood 12 mm film-faced', 'sheet', 'materials', 750, 70, 65],
  ['Bitumen membrane 4 mm roll (10 m²)', 'roll', 'materials', 800, 140, 130],
  ['XPS insulation 50 mm', 'm²', 'materials', 180, 28, 25],
  ['Gypsum board 12.5 mm sheet', 'sheet', 'finishes', 250, 32, 28],
  ['Emulsion paint 20 L drum', 'drum', 'finishes', 1600, 220, 200],
  ['Ceramic floor tile 60×60', 'm²', 'finishes', 450, 55, 45],
  ['Porcelain tile 60×120', 'm²', 'finishes', 1200, 140, 120],
  ['Marble 2 cm slab', 'm²', 'finishes', 900, 350, 300],
  ['Granite 2 cm slab', 'm²', 'finishes', 1400, 280, 250],
  ['Epoxy floor coating', 'm²', 'finishes', 450, 75, 70],
  ['Interlock paving 6 cm', 'm²', 'finishes', 300, 45, 40],
  ['Precast kerb stone', 'm', 'finishes', 180, 35, 30],
  ['Clear float glass 6 mm', 'm²', 'finishes', 450, 60, 55],
  ['Aluminium window, glazed', 'm²', 'finishes', 4500, 1100, 950],
  ['Fire-rated steel door', 'no.', 'finishes', 18000, 2800, 2500],
  ['Precast boundary wall', 'm', 'materials', 2200, 350, 320],
  ['Asphalt wearing course', 'tonne', 'materials', 3500, 300, 280],
  ['uPVC drain pipe 110 mm, 6 m', 'length', 'mep', 650, 95, 85],
  ['PPR pipe 25 mm', 'm', 'mep', 55, 9, 8],
  ['Copper cable 2.5 mm², 100 m', 'coil', 'mep', 2800, 230, 220],
  ['LED downlight 18 W', 'no.', 'mep', 250, 35, 30],
  ['Split AC 1.5 ton', 'no.', 'mep', 32000, 2200, 2000],
  ['WC suite', 'no.', 'mep', 7000, 900, 800],
  ['Wash basin', 'no.', 'mep', 3000, 400, 350],
  ['GRP water tank 1000 L', 'no.', 'mep', 9000, 1100, 1000],
  ['Manhole cover D400', 'no.', 'mep', 4500, 650, 600],
  ['Diesel', 'litre', 'plant', 17.5, 2.9, 1.66],
  ['Excavator hire', 'day', 'plant', 7000, 1200, 1100],
  ['Concrete pump hire', 'day', 'plant', 12000, 1800, 1600],
  ['Tower crane rental', 'month', 'plant', 450000, 45000, 40000],
  ['Scaffolding rental', 'm²/month', 'plant', 80, 12, 10],
  ['Skilled mason', 'day', 'labour', 700, 180, 170],
  ['Labourer', 'day', 'labour', 400, 110, 100],
];

const IDX = { eg: 3, ae: 4, sa: 5 };

export function itemsFor(market) {
  const i = IDX[market];
  return ROWS.map((r, id) => ({ id, name: r[0], unit: r[1], cat: r[2], price: r[i] }));
}
