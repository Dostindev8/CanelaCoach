import { SupplementCatalog } from './models/SupplementCatalog.js';

const SEED = [
  {
    sku: 'vitalage-collagen',
    name: 'VitalAge Collagen',
    brand: 'VitalHealth / Black Diamonds',
    benefits: [
      'Huesos sanos',
      'Piel radiante',
      'Mejora el sueño',
      'Cabello brillante',
      'Articulaciones',
      'Absorción de nutrientes',
      'Alivio de dolor articular',
      'Sistema inmunológico',
      'Movilidad y flexibilidad',
      'Antioxidante',
      'Fortalece huesos y cartílagos',
      'Digestión saludable',
    ],
    usage: '1 a 2 porciones al día, de preferencia en ayuno.',
    indications: [
      'Enfermedades',
      'Mala salud intestinal',
      'Baja calidad de sueño',
      'Actividad física intensa',
      'Inflamación',
      'Signos de envejecimiento',
    ],
    ingredients:
      'Péptidos bioactivos de colágeno hidrolizado bovino I, II, III; colágeno hidrolizado marino; sabor natural de frambuesa; betabel; caldo de hueso; vitaminas C, E, B7; NAD; resveratrol; stevia; ácido hialurónico; astaxantina; pimienta negra (peperina 95%).',
  },
  {
    sku: 'v-daily',
    name: 'V-Daily',
    brand: 'VitalHealth / Black Diamonds',
    benefits: [
      'Multivitamínico',
      'Energía',
      'Concentración',
      'Sistema inmune',
      'Antioxidante',
      'Huesos y músculos',
      'Alta biodisponibilidad',
      'Metabolismo y digestión',
      'Equilibrio nervioso y hormonal',
    ],
    usage: '1 porción al día, de preferencia en la mañana.',
    indications: [
      'Diabetes',
      'Falta de energía',
      'Dolores articulares',
      'Problemas digestivos',
      'Desequilibrio hormonal',
      'Mala calidad de sueño',
    ],
    ingredients:
      'Vitaminas A, C, D3, E, K, B, B2, B3, B5, B6, B7, B9, B12; inositol; probióticos; prebióticos; shiitake; maitake; reishi; cordyceps; aminoácidos; MSM; calcio; hierro; zinc; magnesio; espirulina; frutas y verduras; pulpa de limón; esteviol.',
    flavor: 'Natural Lemon',
    netWeight: '5.29 oz (150 g)',
  },
  {
    sku: 'v-omega-3',
    name: 'V-Omega 3',
    brand: 'VitalHealth / Black Diamonds',
    benefits: [
      'Prevención de infartos',
      'Capacidad cognitiva',
      'Antiinflamatorio',
      'Fortalece neuronas y cerebro',
      'Protección celular',
      'Previene arritmias',
      'Nivela colesterol, triglicéridos y azúcar en sangre',
    ],
    usage: '3 cápsulas al día, 1 con cada alimento.',
    indications: [
      'TDA',
      'Tinnitus',
      'Diabetes',
      'Parkinson',
      'Demencia',
      'Inflamación',
      'Neuropatías',
      'Colesterolemia',
      'Enfermedad arterial',
    ],
    ingredients:
      'Aceite de salmón salvaje de Alaska; aceite de annato; delta y gamma tocotrienoles; vitamina A, D3; astaxantina; gelatina de pescado; glicerina; agua purificada.',
    netContent: '90 cápsulas de 700 mg',
  },
];

export async function ensureSupplementCatalogSeed(): Promise<void> {
  for (const item of SEED) {
    await SupplementCatalog.updateOne(
      { sku: item.sku },
      { $setOnInsert: { ...item, active: true } },
      { upsert: true }
    );
  }
}
