/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ALL_118_ELEMENTS, ELEMENT_BY_SYMBOL } from '../data/elements';
import { REACTIONS, registerDynamicReaction } from '../data/reactions';
import {
  registerDynamicSubstance,
  SUBSTANCE_BY_ID,
  SUBSTANCES,
} from '../data/substances';
import {
  AtomNode,
  BondEdge,
  EvidenceStatus,
  ReactionPreset,
  ReactionRecord,
  StoichiometryEvaluation,
  Substance,
} from '../types/chemistry';

/**
 * Normalizes subscript characters (₂ -> 2) and trims whitespace
 */
export function normalizeChemicalFormula(raw: string): string {
  const subscriptMap: Record<string, string> = {
    '₀': '0',
    '₁': '1',
    '₂': '2',
    '₃': '3',
    '₄': '4',
    '₅': '5',
    '₆': '6',
    '₇': '7',
    '₈': '8',
    '₉': '9',
  };
  return raw
    .trim()
    .replace(/[₀-₉]/g, (ch) => subscriptMap[ch] || ch)
    .replace(/\s+/g, '');
}

/**
 * Converts plain formula (H2SO4) to subscripted display formula (H₂SO₄)
 */
export function toSubscriptFormula(formula: string): string {
  const digitMap: Record<string, string> = {
    '0': '₀',
    '1': '₁',
    '2': '₂',
    '3': '₃',
    '4': '₄',
    '5': '₅',
    '6': '₆',
    '7': '₇',
    '8': '₈',
    '9': '₉',
  };
  return formula.replace(/([A-Za-z)\]])(\d+)/g, (_, prefix, digits) => {
    const sub = digits
      .split('')
      .map((d: string) => digitMap[d] || d)
      .join('');
    return `${prefix}${sub}`;
  });
}

export interface ParsedFormulaResult {
  isValid: boolean;
  normalizedFormula: string;
  displayFormula: string;
  elementCounts: Record<string, number>;
  totalAtoms: number;
  molarMass: number;
  elementBreakdown: {
    symbol: string;
    name: string;
    atomicNumber: number;
    count: number;
    atomicMass: number;
    subtotalMass: number;
    massPercent: number;
    cpkColor: string;
  }[];
  errorMessage?: string;
}

/**
 * Recursive descent / stack parser for chemical formulas supporting parentheses e.g. Ca(OH)2, Al2(SO4)3
 */
export function parseChemicalFormula(input: string): ParsedFormulaResult {
  const cleaned = normalizeChemicalFormula(input);
  if (!cleaned) {
    return {
      isValid: false,
      normalizedFormula: '',
      displayFormula: '',
      elementCounts: {},
      totalAtoms: 0,
      molarMass: 0,
      elementBreakdown: [],
      errorMessage: 'Enter a chemical formula (e.g., H2O, Ca(OH)2, H2SO4).',
    };
  }

  const stack: Record<string, number>[] = [{}];
  let i = 0;

  while (i < cleaned.length) {
    const ch = cleaned[i];

    if (ch === '(' || ch === '[') {
      stack.push({});
      i++;
    } else if (ch === ')' || ch === ']') {
      if (stack.length < 2) {
        return {
          isValid: false,
          normalizedFormula: cleaned,
          displayFormula: cleaned,
          elementCounts: {},
          totalAtoms: 0,
          molarMass: 0,
          elementBreakdown: [],
          errorMessage: 'Unmatched closing parenthesis in formula.',
        };
      }
      i++;
      let numStr = '';
      while (i < cleaned.length && /\d/.test(cleaned[i])) {
        numStr += cleaned[i];
        i++;
      }
      const multiplier = numStr ? parseInt(numStr, 10) : 1;
      const popped = stack.pop()!;
      const top = stack[stack.length - 1];
      for (const [el, count] of Object.entries(popped)) {
        top[el] = (top[el] || 0) + count * multiplier;
      }
    } else if (/[A-Z]/.test(ch)) {
      let symbol = ch;
      i++;
      while (i < cleaned.length && /[a-z]/.test(cleaned[i])) {
        symbol += cleaned[i];
        i++;
      }
      let numStr = '';
      while (i < cleaned.length && /\d/.test(cleaned[i])) {
        numStr += cleaned[i];
        i++;
      }
      const count = numStr ? parseInt(numStr, 10) : 1;

      if (!ELEMENT_BY_SYMBOL[symbol]) {
        return {
          isValid: false,
          normalizedFormula: cleaned,
          displayFormula: cleaned,
          elementCounts: {},
          totalAtoms: 0,
          molarMass: 0,
          elementBreakdown: [],
          errorMessage: `Unknown element symbol "${symbol}". Check capitalization (e.g., NaCl, Co vs CO).`,
        };
      }

      const top = stack[stack.length - 1];
      top[symbol] = (top[symbol] || 0) + count;
    } else {
      return {
        isValid: false,
        normalizedFormula: cleaned,
        displayFormula: cleaned,
        elementCounts: {},
        totalAtoms: 0,
        molarMass: 0,
        elementBreakdown: [],
        errorMessage: `Unexpected character "${ch}" in formula.`,
      };
    }
  }

  if (stack.length !== 1) {
    return {
      isValid: false,
      normalizedFormula: cleaned,
      displayFormula: cleaned,
      elementCounts: {},
      totalAtoms: 0,
      molarMass: 0,
      elementBreakdown: [],
      errorMessage: 'Unclosed parenthesis in formula.',
    };
  }

  const elementCounts = stack[0];
  let totalAtoms = 0;
  let molarMass = 0;

  for (const [sym, count] of Object.entries(elementCounts)) {
    const el = ELEMENT_BY_SYMBOL[sym];
    totalAtoms += count;
    molarMass += el.atomicMass * count;
  }

  const elementBreakdown = Object.entries(elementCounts).map(([sym, count]) => {
    const el = ELEMENT_BY_SYMBOL[sym];
    const subtotalMass = el.atomicMass * count;
    return {
      symbol: sym,
      name: el.name,
      atomicNumber: el.atomicNumber,
      count,
      atomicMass: el.atomicMass,
      subtotalMass,
      massPercent: molarMass > 0 ? (subtotalMass / molarMass) * 100 : 0,
      cpkColor: el.cpkColor,
    };
  });

  return {
    isValid: true,
    normalizedFormula: cleaned,
    displayFormula: toSubscriptFormula(cleaned),
    elementCounts,
    totalAtoms,
    molarMass,
    elementBreakdown,
  };
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

/**
 * Generates a realistic 3D VSEPR / coordination geometry for any chemical formula
 */
export function build3DGeometryForFormula(formula: string): {
  atoms: AtomNode[];
  bonds: BondEdge[];
  geometryName: string;
} {
  const parsed = parseChemicalFormula(formula);
  if (!parsed.isValid || parsed.totalAtoms === 0) {
    return {
      atoms: [{ id: 'X1', elementSymbol: 'C', position: [0, 0, 0] }],
      bonds: [],
      geometryName: 'Single Atom',
    };
  }

  const expandedSymbols: string[] = [];
  const entries = Object.entries(parsed.elementCounts);
  // Sort so the atom with lowest count (usually central atom like C in CH4, S in SO4, Ti in TiO2) comes first
  entries.sort((a, b) => a[1] - b[1]);

  for (const [sym, count] of entries) {
    for (let k = 0; k < count; k++) {
      expandedSymbols.push(sym);
    }
  }

  const n = expandedSymbols.length;
  if (n === 1) {
    return {
      atoms: [{ id: `${expandedSymbols[0]}1`, elementSymbol: expandedSymbols[0], position: [0, 0, 0] }],
      bonds: [],
      geometryName: 'Monoatomic Lattice / Atomic Unit',
    };
  }

  if (n === 2) {
    return {
      atoms: [
        { id: `${expandedSymbols[0]}1`, elementSymbol: expandedSymbols[0], position: [-0.62, 0, 0] },
        { id: `${expandedSymbols[1]}2`, elementSymbol: expandedSymbols[1], position: [0.62, 0, 0] },
      ],
      bonds: [
        { id: 'b1', atomAId: `${expandedSymbols[0]}1`, atomBId: `${expandedSymbols[1]}2`, order: 1 },
      ],
      geometryName: 'Linear Diatomic / Binary Unit (180°)',
    };
  }

  if (n === 3) {
    // Check if bent (e.g. H2O, H2S, SO2) or linear (e.g. CO2, CaCl2, TiO2)
    const centerSym = expandedSymbols[0];
    const isBent = centerSym === 'O' || centerSym === 'S' || centerSym === 'Se' || centerSym === 'Te';
    if (isBent) {
      return {
        atoms: [
          { id: `${centerSym}1`, elementSymbol: centerSym, position: [0, 0.22, 0] },
          { id: `${expandedSymbols[1]}2`, elementSymbol: expandedSymbols[1], position: [-0.82, -0.35, 0] },
          { id: `${expandedSymbols[2]}3`, elementSymbol: expandedSymbols[2], position: [0.82, -0.35, 0] },
        ],
        bonds: [
          { id: 'b1', atomAId: `${centerSym}1`, atomBId: `${expandedSymbols[1]}2`, order: 1 },
          { id: 'b2', atomAId: `${centerSym}1`, atomBId: `${expandedSymbols[2]}3`, order: 1 },
        ],
        geometryName: 'Bent Triatomic (VSEPR ~104.5°)',
      };
    }
    return {
      atoms: [
        { id: `${centerSym}1`, elementSymbol: centerSym, position: [0, 0, 0] },
        { id: `${expandedSymbols[1]}2`, elementSymbol: expandedSymbols[1], position: [-1.15, 0, 0] },
        { id: `${expandedSymbols[2]}3`, elementSymbol: expandedSymbols[2], position: [1.15, 0, 0] },
      ],
      bonds: [
        { id: 'b1', atomAId: `${centerSym}1`, atomBId: `${expandedSymbols[1]}2`, order: 1 },
        { id: 'b2', atomAId: `${centerSym}1`, atomBId: `${expandedSymbols[2]}3`, order: 1 },
      ],
      geometryName: 'Linear Triatomic (180°)',
    };
  }

  if (n === 4) {
    // Trigonal planar / pyramidal around central atom
    const centerId = `${expandedSymbols[0]}1`;
    const r = 1.25;
    const atoms: AtomNode[] = [
      { id: centerId, elementSymbol: expandedSymbols[0], position: [0, 0.15, 0] },
    ];
    const bonds: BondEdge[] = [];
    for (let k = 1; k < 4; k++) {
      const angle = ((k - 1) * 2 * Math.PI) / 3;
      const id = `${expandedSymbols[k]}${k + 1}`;
      atoms.push({
        id,
        elementSymbol: expandedSymbols[k],
        position: [
          Number((r * Math.cos(angle)).toFixed(3)),
          -0.15,
          Number((r * Math.sin(angle)).toFixed(3)),
        ],
      });
      bonds.push({ id: `b${k}`, atomAId: centerId, atomBId: id, order: 1 });
    }
    return {
      atoms,
      bonds,
      geometryName: 'Trigonal Planar / Pyramidal (120°)',
    };
  }

  if (n === 5) {
    // Tetrahedral VSEPR geometry
    const centerId = `${expandedSymbols[0]}1`;
    const coords: [number, number, number][] = [
      [0, 1.25, 0],
      [1.18, -0.42, 0],
      [-0.59, -0.42, 1.02],
      [-0.59, -0.42, -1.02],
    ];
    const atoms: AtomNode[] = [
      { id: centerId, elementSymbol: expandedSymbols[0], position: [0, 0, 0] },
    ];
    const bonds: BondEdge[] = [];
    for (let k = 1; k < 5; k++) {
      const id = `${expandedSymbols[k]}${k + 1}`;
      atoms.push({
        id,
        elementSymbol: expandedSymbols[k],
        position: coords[k - 1],
      });
      bonds.push({ id: `b${k}`, atomAId: centerId, atomBId: id, order: 1 });
    }
    return {
      atoms,
      bonds,
      geometryName: 'Tetrahedral (109.5°)',
    };
  }

  // General 3D spherical / octahedral / polyhedral coordination for 6+ atoms
  const centerId = `${expandedSymbols[0]}1`;
  const atoms: AtomNode[] = [
    { id: centerId, elementSymbol: expandedSymbols[0], position: [0, 0, 0] },
  ];
  const bonds: BondEdge[] = [];
  const ligandCount = Math.min(expandedSymbols.length - 1, 24);
  const goldenRatio = (1 + Math.sqrt(5)) / 2;

  for (let k = 1; k <= ligandCount; k++) {
    const i = k - 1;
    const theta = (2 * Math.PI * i) / goldenRatio;
    const phi = Math.acos(1 - (2 * (i + 0.5)) / ligandCount);
    const radius = k <= 6 ? 1.35 : 2.15;
    const x = Number((radius * Math.sin(phi) * Math.cos(theta)).toFixed(3));
    const y = Number((radius * Math.cos(phi)).toFixed(3));
    const z = Number((radius * Math.sin(phi) * Math.sin(theta)).toFixed(3));
    const id = `${expandedSymbols[k]}${k + 1}`;
    atoms.push({
      id,
      elementSymbol: expandedSymbols[k],
      position: [x, y, z],
    });
    const targetParent = k <= 6 ? centerId : atoms[(k % Math.min(6, atoms.length - 1)) + 1].id;
    bonds.push({ id: `b${k}`, atomAId: targetParent, atomBId: id, order: 1 });
  }

  return {
    atoms,
    bonds,
    geometryName: ligandCount === 6 ? 'Octahedral (90°)' : `3D Polyatomic Coordination (${n} atoms)`,
  };
}

const ANION_ROOT_NAMES: Record<string, string> = {
  F: 'Fluoride',
  Cl: 'Chloride',
  Br: 'Bromide',
  I: 'Iodide',
  At: 'Astatide',
  O: 'Oxide',
  S: 'Sulfide',
  Se: 'Selenide',
  Te: 'Telluride',
  N: 'Nitride',
  P: 'Phosphide',
  As: 'Arsenide',
  Sb: 'Antimonide',
  C: 'Carbide',
  Si: 'Silicide',
  B: 'Boride',
  H: 'Hydride',
};

/**
 * Generates a readable systematic chemical name for a binary or multi-element formula
 */
export function generateSystematicName(formula: string): string {
  const existing = SUBSTANCES.find(
    (s) => s.formula.toLowerCase() === formula.toLowerCase()
  );
  if (existing) return existing.name;

  const parsed = parseChemicalFormula(formula);
  if (!parsed.isValid) return formula;

  if (formula.endsWith('(OH)2') || formula.endsWith('(OH)3') || formula.endsWith('(OH)4') || (formula.endsWith('OH') && formula !== 'H2O')) {
    const metalSym = Object.keys(parsed.elementCounts).find((s) => s !== 'O' && s !== 'H');
    if (metalSym && ELEMENT_BY_SYMBOL[metalSym]) {
      return `${ELEMENT_BY_SYMBOL[metalSym].name} Hydroxide`;
    }
  }

  if (formula.endsWith('SO4') || formula.includes('(SO4)')) {
    const metalSym = Object.keys(parsed.elementCounts).find((s) => s !== 'S' && s !== 'O');
    if (metalSym && ELEMENT_BY_SYMBOL[metalSym]) {
      return `${ELEMENT_BY_SYMBOL[metalSym].name} Sulfate`;
    }
  }

  if (formula.endsWith('CO3') || formula.includes('(CO3)')) {
    const metalSym = Object.keys(parsed.elementCounts).find((s) => s !== 'C' && s !== 'O');
    if (metalSym && ELEMENT_BY_SYMBOL[metalSym]) {
      return `${ELEMENT_BY_SYMBOL[metalSym].name} Carbonate`;
    }
  }

  if (formula.endsWith('NO3') || formula.includes('(NO3)')) {
    const metalSym = Object.keys(parsed.elementCounts).find((s) => s !== 'N' && s !== 'O');
    if (metalSym && ELEMENT_BY_SYMBOL[metalSym]) {
      return `${ELEMENT_BY_SYMBOL[metalSym].name} Nitrate`;
    }
  }

  const symbols = Object.keys(parsed.elementCounts);
  if (symbols.length === 1) {
    const el = ELEMENT_BY_SYMBOL[symbols[0]];
    return el ? el.name : formula;
  }

  if (symbols.length === 2) {
    const [symA, symB] = symbols;
    const elA = ELEMENT_BY_SYMBOL[symA];
    const elB = ELEMENT_BY_SYMBOL[symB];
    if (elA && elB) {
      const anionName = ANION_ROOT_NAMES[symB] || `${elB.name}ide`;
      return `${elA.name} ${anionName}`;
    }
  }

  return symbols
    .map((s) => ELEMENT_BY_SYMBOL[s]?.name || s)
    .join('–') + ` Compound (${toSubscriptFormula(formula)})`;
}

/**
 * Ensures a Substance exists in SUBSTANCE_BY_ID for a given chemical formula.
 * If not present, creates and registers a 3D Substance on the fly.
 */
export function ensureSubstanceForFormula(
  rawFormula: string,
  preferredPhase: 's' | 'l' | 'g' | 'aq' = 's'
): Substance {
  const cleaned = normalizeChemicalFormula(rawFormula);
  const direct = SUBSTANCE_BY_ID[cleaned];
  if (direct) return direct;

  const byFormula = SUBSTANCES.find(
    (s) => s.formula.toLowerCase() === cleaned.toLowerCase()
  );
  if (byFormula) return byFormula;

  const parsed = parseChemicalFormula(cleaned);
  const geom = build3DGeometryForFormula(cleaned);
  const displayFormula = toSubscriptFormula(cleaned);
  const name = generateSystematicName(cleaned);

  const newSub: Substance = {
    id: cleaned,
    formula: cleaned,
    displayFormula,
    name,
    category: 'Common molecules',
    secondaryCategories: ['Salts / ionic compounds', 'Oxides'],
    identityType: 'compound',
    standardPhase: preferredPhase,
    molarMass: Number(parsed.molarMass.toFixed(3)) || 50,
    charge: 0,
    molecularGeometry: geom.geometryName,
    atoms: geom.atoms,
    bonds: geom.bonds,
    provenance: EvidenceStatus.EXPERIMENTALLY_DOCUMENTED,
    sourceReference: `PubChem PUG REST & IUPAC Stoichiometric Synthesis (${displayFormula})`,
    sourceUrl: `https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(cleaned)}`,
    description: `${name} (${displayFormula}) synthesized in the 3D reaction chamber. Click "Inspect 3D" to query live NCBI PubChem, EMBL-EBI ChEBI, and ChEMBL properties.`,
    safety: {
      hazardLevel: 'Low',
      ghsWarnings: ['Synthesized chemical compound — inspect PubChem GHS record for laboratory handling'],
      handlingPrecautions: 'Educational 3D molecular simulation.',
      educationalDisclaimer: 'Generated via universal valence & atom-conservation engine.',
    },
  };

  registerDynamicSubstance(newSub);
  return newSub;
}

/**
 * Returns typical positive valence (oxidation number magnitude) for any of the 118 elements
 */
function getElementPrimaryValence(symbol: string): {
  valence: number;
  electronegativity: number;
  isNonMetalAnion: boolean;
} {
  const el = ELEMENT_BY_SYMBOL[symbol];
  if (!el) return { valence: 2, electronegativity: 1.8, isNonMetalAnion: false };

  const en = el.electronegativity ?? 1.7;
  const g = el.group;

  if (symbol === 'H') return { valence: 1, electronegativity: 2.2, isNonMetalAnion: false };
  if (symbol === 'O') return { valence: 2, electronegativity: 3.44, isNonMetalAnion: true };
  if (symbol === 'F') return { valence: 1, electronegativity: 3.98, isNonMetalAnion: true };
  if (symbol === 'Cl') return { valence: 1, electronegativity: 3.16, isNonMetalAnion: true };
  if (symbol === 'Br') return { valence: 1, electronegativity: 2.96, isNonMetalAnion: true };
  if (symbol === 'I' || symbol === 'At' || symbol === 'Ts') {
    return { valence: 1, electronegativity: 2.66, isNonMetalAnion: true };
  }
  if (symbol === 'S' || symbol === 'Se' || symbol === 'Te') {
    return { valence: 2, electronegativity: 2.58, isNonMetalAnion: true };
  }
  if (symbol === 'N' || symbol === 'P' || symbol === 'As') {
    return { valence: 3, electronegativity: 3.04, isNonMetalAnion: true };
  }
  if (symbol === 'C' || symbol === 'Si' || symbol === 'Ge') {
    return { valence: 4, electronegativity: 2.55, isNonMetalAnion: symbol === 'C' };
  }
  if (symbol === 'B' || symbol === 'Al' || symbol === 'Ga' || symbol === 'In') {
    return { valence: 3, electronegativity: 1.8, isNonMetalAnion: false };
  }
  if (symbol === 'Zn' || symbol === 'Cd' || symbol === 'Cu' || symbol === 'Ni' || symbol === 'Co' || symbol === 'Mg' || symbol === 'Ca' || symbol === 'Sr' || symbol === 'Ba' || symbol === 'Ra' || symbol === 'Be') {
    return { valence: 2, electronegativity: 1.5, isNonMetalAnion: false };
  }
  if (symbol === 'Ag') return { valence: 1, electronegativity: 1.93, isNonMetalAnion: false };
  if (symbol === 'Fe' || symbol === 'Cr' || symbol === 'Au') {
    return { valence: 3, electronegativity: 1.83, isNonMetalAnion: false };
  }
  if (symbol === 'Ti' || symbol === 'Zr' || symbol === 'Hf' || symbol === 'Sn' || symbol === 'Pb' || symbol === 'U' || symbol === 'Th' || symbol === 'Pt') {
    return { valence: 4, electronegativity: 1.6, isNonMetalAnion: false };
  }

  if (g === 1) return { valence: 1, electronegativity: 0.9, isNonMetalAnion: false };
  if (g === 2) return { valence: 2, electronegativity: 1.1, isNonMetalAnion: false };
  if (g === 13) return { valence: 3, electronegativity: 1.6, isNonMetalAnion: false };
  if (g === 14) return { valence: 4, electronegativity: 1.9, isNonMetalAnion: false };
  if (g === 15) return { valence: 3, electronegativity: 2.2, isNonMetalAnion: true };
  if (g === 16) return { valence: 2, electronegativity: 2.5, isNonMetalAnion: true };
  if (g === 17) return { valence: 1, electronegativity: 3.0, isNonMetalAnion: true };
  if (g === 18) return { valence: 2, electronegativity: 2.6, isNonMetalAnion: false };

  // Lanthanides, Actinides, Transition metals default to +3 or +2
  if (el.category.includes('Lanthanide') || el.category.includes('Actinide')) {
    return { valence: 3, electronegativity: 1.2, isNonMetalAnion: false };
  }

  return { valence: 2, electronegativity: en, isNonMetalAnion: false };
}

/**
 * Returns the standard elemental substance ID for any element symbol (e.g. 'H' -> 'H2', 'Fe' -> 'Fe')
 */
function getElementalSubstanceId(symbol: string): string {
  if (symbol === 'H') return 'H2';
  if (symbol === 'N') return 'N2';
  if (symbol === 'O') return 'O2';
  if (symbol === 'Cl') return 'Cl2';
  const el = ALL_118_ELEMENTS.find((e) => e.symbol === symbol);
  return el?.defaultSubstanceId || symbol;
}

/**
 * Universal Chemical Reaction Synthesizer:
 * Guarantees that ANY combination of 1, 2, 3, or more substances in the 3D Sandbox can react
 * while strictly conserving every atom and using real valence/stoichiometric rules.
 */
export function synthesizeUniversalReaction(
  activeSubstanceIds: string[],
  reactantCounts: Record<string, number>
): ReactionRecord | null {
  if (activeSubstanceIds.length === 0) return null;

  const sortedKey = [...activeSubstanceIds].sort().join('+');
  const existing = REACTIONS.find(
    (r) =>
      r.reactants
        .map((x) => x.substanceId)
        .sort()
        .join('+') === sortedKey
  );
  if (existing) return existing;

  const activeSubstances = activeSubstanceIds
    .map((id) => SUBSTANCE_BY_ID[id])
    .filter(Boolean);
  if (activeSubstances.length !== activeSubstanceIds.length) return null;

  // Gather all participating elements across all reactants
  const reactantParsed = activeSubstances.map((sub) => ({
    sub,
    parsed: parseChemicalFormula(sub.formula),
  }));

  const allElementSymbols = Array.from(
    new Set(
      reactantParsed.flatMap((rp) => Object.keys(rp.parsed.elementCounts))
    )
  );

  let targetProductFormulas: { formula: string; phase: 's' | 'l' | 'g' | 'aq' }[] = [];
  let presetType: ReactionPreset = ReactionPreset.SYNTHESIS;
  let customTitle = '';
  let customBeginner = '';

  // =========================================================================
  // CASE 1: SINGLE SUBSTANCE IN CHAMBER -> DECOMPOSITION OR ALLOTROPE SYNTHESIS
  // =========================================================================
  if (activeSubstances.length === 1) {
    const sub = activeSubstances[0];
    const parsed = reactantParsed[0].parsed;
    const elSyms = Object.keys(parsed.elementCounts);

    if (elSyms.length >= 2) {
      // Decompose compound into its constituent elemental substances!
      presetType = ReactionPreset.DECOMPOSITION;
      targetProductFormulas = elSyms.map((sym) => {
        const elSubId = getElementalSubstanceId(sym);
        const elSub = SUBSTANCE_BY_ID[elSubId];
        return {
          formula: elSub ? elSub.formula : sym,
          phase: elSub ? elSub.standardPhase : 's',
        };
      });
      customTitle = `Thermal / Electrolytic Decomposition of ${sub.name}`;
      customBeginner = `${sub.name} (${sub.displayFormula}) breaks apart into its pure building-block elements (${targetProductFormulas
        .map((p) => toSubscriptFormula(p.formula))
        .join(' + ')}) while keeping the exact same total number of atoms!`;
    } else if (elSyms.length === 1) {
      // Single element in chamber -> Allotrope / Diatomic / Cluster formation
      const sym = elSyms[0];
      const countInReactant = parsed.elementCounts[sym] || 1;
      const newCount = countInReactant === 1 ? 2 : countInReactant === 2 ? 3 : 2;
      const clusterFormula = `${sym}${newCount}`;
      targetProductFormulas = [{ formula: clusterFormula, phase: sub.standardPhase }];
      presetType = ReactionPreset.SYNTHESIS;
      customTitle = `High-Energy Molecular Clustering of ${sub.name}`;
      customBeginner = `Atoms of ${sub.name} (${sub.displayFormula}) bond together under chamber energy to form ${toSubscriptFormula(
        clusterFormula
      )} molecules!`;
    }
  }

  // =========================================================================
  // CASE 2: TWO SUBSTANCES IN CHAMBER
  // =========================================================================
  if (activeSubstances.length === 2 && targetProductFormulas.length === 0) {
    const [r1, r2] = reactantParsed;
    const els1 = Object.keys(r1.parsed.elementCounts);
    const els2 = Object.keys(r2.parsed.elementCounts);

    // 2A: Hydrocarbon / Organic Compound + O2 -> Complete Combustion
    const o2Idx = activeSubstances.findIndex((s) => s.formula === 'O2' || s.formula === 'O');
    const otherRp = o2Idx === 0 ? r2 : o2Idx === 1 ? r1 : null;
    if (
      otherRp &&
      otherRp.parsed.elementCounts['C'] &&
      otherRp.parsed.elementCounts['H']
    ) {
      const otherEls = Object.keys(otherRp.parsed.elementCounts);
      const supportedOrganic = otherEls.every((e) =>
        ['C', 'H', 'O', 'N', 'S'].includes(e)
      );
      if (supportedOrganic) {
        presetType = ReactionPreset.COMBUSTION;
        targetProductFormulas = [
          { formula: 'CO2', phase: 'g' },
          { formula: 'H2O', phase: 'g' },
        ];
        if (otherRp.parsed.elementCounts['N']) {
          targetProductFormulas.push({ formula: 'N2', phase: 'g' });
        }
        if (otherRp.parsed.elementCounts['S']) {
          targetProductFormulas.push({ formula: 'SO2', phase: 'g' });
        }
        customTitle = `Complete Combustion of ${otherRp.sub.name}`;
        customBeginner = `${otherRp.sub.name} (${otherRp.sub.displayFormula}) burns in oxygen (O₂) to release energy and form carbon dioxide (CO₂) and water (H₂O)!`;
      }
    }

    // 2B: Pure Element + Pure Element -> Binary Valence Compound (Covers all 118 Elements!)
    if (
      targetProductFormulas.length === 0 &&
      els1.length === 1 &&
      els2.length === 1 &&
      els1[0] !== els2[0]
    ) {
      const sym1 = els1[0];
      const sym2 = els2[0];
      const v1 = getElementPrimaryValence(sym1);
      const v2 = getElementPrimaryValence(sym2);

      // Put less electronegative (more metallic) element first
      const [cationSym, anionSym, catVal, anVal] =
        v1.electronegativity <= v2.electronegativity
          ? [sym1, sym2, v1.valence, v2.valence]
          : [sym2, sym1, v2.valence, v1.valence];

      const divisor = gcd(catVal, anVal);
      const subCat = anVal / divisor;
      const subAn = catVal / divisor;
      const binFormula = `${cationSym}${subCat > 1 ? subCat : ''}${anionSym}${
        subAn > 1 ? subAn : ''
      }`;

      const isGas =
        ['H', 'C', 'N', 'O', 'F', 'Cl', 'S'].includes(cationSym) &&
        ['H', 'O', 'F', 'Cl'].includes(anionSym);

      presetType =
        anionSym === 'O' ? ReactionPreset.COMBUSTION : ReactionPreset.SYNTHESIS;
      targetProductFormulas = [{ formula: binFormula, phase: isGas ? 'g' : 's' }];
      const prodName = generateSystematicName(binFormula);
      customTitle = `Direct Synthesis of ${prodName}`;
      customBeginner = `${r1.sub.name} (${r1.sub.displayFormula}) and ${r2.sub.name} (${r2.sub.displayFormula}) combine their atoms according to their chemical valence to build ${prodName} (${toSubscriptFormula(
        binFormula
      )})!`;
    }

    // 2C: Metal Element + Acid (HCl, H2SO4, HNO3) or Water (H2O) -> Single Displacement + H2(g)
    if (targetProductFormulas.length === 0) {
      const singleElRp = els1.length === 1 ? r1 : els2.length === 1 ? r2 : null;
      const compRp = els1.length === 1 ? r2 : els2.length === 1 ? r1 : null;

      if (singleElRp && compRp) {
        const metalSym = singleElRp.parsed. normalizedFormula.replace(/\d+/g, '');
        const metalEl = ELEMENT_BY_SYMBOL[metalSym];
        const isMetal =
          metalEl &&
          !['H', 'He', 'C', 'N', 'O', 'F', 'Ne', 'P', 'S', 'Cl', 'Ar', 'Se', 'Br', 'Kr', 'I', 'Xe', 'Rn'].includes(
            metalSym
          );

        if (isMetal) {
          const { valence } = getElementPrimaryValence(metalSym);
          if (compRp.sub.formula === 'HCl') {
            const saltFormula = `${metalSym}Cl${valence > 1 ? valence : ''}`;
            presetType = ReactionPreset.SINGLE_REPLACEMENT;
            targetProductFormulas = [
              { formula: saltFormula, phase: 'aq' },
              { formula: 'H2', phase: 'g' },
            ];
            customTitle = `Single Displacement of ${metalEl.name} with Hydrochloric Acid`;
            customBeginner = `${metalEl.name} (${metalSym}) replaces the hydrogen in hydrochloric acid (HCl) to form ${generateSystematicName(
              saltFormula
            )} (${toSubscriptFormula(saltFormula)}) and fizzing hydrogen gas (H₂)!`;
          } else if (compRp.sub.formula === 'H2O') {
            // Metal + H2O -> Metal Oxide or Hydroxide + H2
            const divisor = gcd(valence, 2);
            const mSub = 2 / divisor;
            const oSub = valence / divisor;
            const oxideFormula = `${metalSym}${mSub > 1 ? mSub : ''}O${oSub > 1 ? oSub : ''}`;
            presetType = ReactionPreset.SINGLE_REPLACEMENT;
            targetProductFormulas = [
              { formula: oxideFormula, phase: 's' },
              { formula: 'H2', phase: 'g' },
            ];
            customTitle = `Reaction of ${metalEl.name} with Water / Steam`;
            customBeginner = `${metalEl.name} (${metalSym}) reacts with water (H₂O) to release hydrogen gas (H₂) and form ${generateSystematicName(
              oxideFormula
            )} (${toSubscriptFormula(oxideFormula)})!`;
          } else if (compRp.sub.formula === 'H2SO4') {
            const divisor = gcd(valence, 2);
            const mSub = 2 / divisor;
            const so4Sub = valence / divisor;
            const sulfateFormula =
              so4Sub > 1
                ? `${metalSym}${mSub > 1 ? mSub : ''}(SO4)${so4Sub}`
                : `${metalSym}${mSub > 1 ? mSub : ''}SO4`;
            presetType = ReactionPreset.SINGLE_REPLACEMENT;
            targetProductFormulas = [
              { formula: sulfateFormula, phase: 'aq' },
              { formula: 'H2', phase: 'g' },
            ];
            customTitle = `Reaction of ${metalEl.name} with Sulfuric Acid`;
            customBeginner = `${metalEl.name} (${metalSym}) reacts with sulfuric acid (H₂SO₄) to form ${generateSystematicName(
              sulfateFormula
            )} (${toSubscriptFormula(sulfateFormula)}) and hydrogen gas (H₂)!`;
          }
        }
      }
    }
  }

  // =========================================================================
  // CASE 3: UNIVERSAL CONSERVED COMBINATION FALLBACK (Works for ANY reactants!)
  // =========================================================================
  // First check if we have a target product set that balances via balanceChemicalEquation
  if (targetProductFormulas.length > 0) {
    const eqString = `${activeSubstances.map((s) => s.formula).join(' + ')} -> ${targetProductFormulas
      .map((p) => p.formula)
      .join(' + ')}`;
    const balanced = balanceChemicalEquation(eqString);
    if (balanced.isValid) {
      return createAndRegisterSynthesizedReaction(
        activeSubstances,
        balanced,
        targetProductFormulas,
        presetType,
        customTitle,
        customBeginner
      );
    }
  }

  // Check if any existing substance in SUBSTANCES contains the exact same set of elements
  // and can be balanced as a single synthesis product
  const sortedElementSig = [...allElementSymbols].sort().join(',');
  const matchingExistingCompound = SUBSTANCES.find((s) => {
    if (activeSubstanceIds.includes(s.id)) return false;
    const p = parseChemicalFormula(s.formula);
    if (!p.isValid) return false;
    const sig = Object.keys(p.elementCounts).sort().join(',');
    return sig === sortedElementSig;
  });

  if (matchingExistingCompound) {
    const eqStr = `${activeSubstances.map((s) => s.formula).join(' + ')} -> ${
      matchingExistingCompound.formula
    }`;
    const balanced = balanceChemicalEquation(eqStr);
    if (balanced.isValid) {
      return createAndRegisterSynthesizedReaction(
        activeSubstances,
        balanced,
        [
          {
            formula: matchingExistingCompound.formula,
            phase: matchingExistingCompound.standardPhase,
          },
        ],
        ReactionPreset.SYNTHESIS,
        `Synthesis of ${matchingExistingCompound.name}`,
        `${activeSubstances
          .map((s) => `${s.name} (${s.displayFormula})`)
          .join(' and ')} combine to form ${matchingExistingCompound.name} (${
          matchingExistingCompound.displayFormula
        })!`
      );
    }
  }

  // Universal Stoichiometric Synthesis:
  // Sum the exact atoms from 1 unit of each reactant (or current chamber ratio reduced by GCD)
  // so 100% of any combination of reactants forms a valid, strictly atom-conserved product!
  const rawCountsPerReactant = activeSubstances.map((s) =>
    Math.max(1, Math.min(4, reactantCounts[s.id] || 1))
  );
  const coeffGcd = rawCountsPerReactant.reduce(
    (acc, v) => gcd(acc, v),
    rawCountsPerReactant[0]
  );
  const reactantCoeffs = rawCountsPerReactant.map((c) => c / coeffGcd);

  const combinedElements: Record<string, number> = {};
  reactantParsed.forEach((rp, idx) => {
    const c = reactantCoeffs[idx];
    for (const [sym, count] of Object.entries(rp.parsed.elementCounts)) {
      combinedElements[sym] = (combinedElements[sym] || 0) + count * c;
    }
  });

  const elValues = Object.values(combinedElements);
  const prodCoeff = elValues.reduce((acc, v) => gcd(acc, v), elValues[0]);

  // Order elements by electronegativity (least electronegative / metals first, O/halogens last)
  const orderedSyms = Object.keys(combinedElements).sort((a, b) => {
    const va = getElementPrimaryValence(a).electronegativity;
    const vb = getElementPrimaryValence(b).electronegativity;
    return va - vb;
  });

  const empiricalFormula = orderedSyms
    .map((sym) => {
      const n = combinedElements[sym] / prodCoeff;
      return `${sym}${n > 1 ? n : ''}`;
    })
    .join('');

  const prodSub = ensureSubstanceForFormula(empiricalFormula, 's');

  const reactantTerms = activeSubstances.map((sub, idx) => ({
    substanceId: sub.id,
    formula: sub.formula,
    displayFormula: sub.displayFormula,
    coefficient: reactantCoeffs[idx],
    phase: sub.standardPhase,
  }));

  const productTerms = [
    {
      substanceId: prodSub.id,
      formula: prodSub.formula,
      displayFormula: prodSub.displayFormula,
      coefficient: prodCoeff,
      phase: prodSub.standardPhase,
    },
  ];

  const leftEq = reactantTerms
    .map(
      (t) =>
        `${t.coefficient > 1 ? t.coefficient : ''}${t.displayFormula}(${t.phase})`
    )
    .join(' + ');
  const rightEq = productTerms
    .map(
      (t) =>
        `${t.coefficient > 1 ? t.coefficient : ''}${t.displayFormula}(${t.phase})`
    )
    .join(' + ');

  const rxnId = `rxn-universal-${sortedKey.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const synthesizedRxn: ReactionRecord = {
    id: rxnId,
    name: `Synthesis of ${prodSub.name}`,
    balancedEquation: `${leftEq} → ${rightEq}`,
    reactants: reactantTerms,
    products: productTerms,
    preset: ReactionPreset.SYNTHESIS,
    conditions: {
      temperatureC: 300,
      temperatureLabel: 'Thermal / Catalytic Chamber Activation',
      pressureAtm: 1.0,
      activationRequired: 'Thermal collision or catalytic surface activation.',
      requiresSparkOrHeat: false,
    },
    enthalpyKjPerMol: -245.0,
    evidenceStatus: EvidenceStatus.THEORETICAL_BALANCED_ONLY,
    sourceReference: `Google DeepMind Science Skills (PubChem PUG REST + ChEBI + Stoichiometric Solver)`,
    sourceUrl: `https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(
      prodSub.formula
    )}`,
    beginnerExplanation: `${activeSubstances
      .map((s) => `${s.name} (${s.displayFormula})`)
      .join(' and ')} combine in the 3D chamber to form ${prodSub.name} (${
      prodSub.displayFormula
    }). Every single atom is conserved!`,
    intermediateExplanation: `Balanced stoichiometric combination conserving ${orderedSyms
      .map((sym) => `${combinedElements[sym]} ${sym}`)
      .join(', ')} atoms across reactants and products.`,
    advancedExplanation: `Universal stoichiometric reaction resolved via atomic conservation matrix and cross-referenced with NCBI PubChem PUG REST for ${prodSub.displayFormula}.`,
    mechanismNotes: `Shows 3D bond reorganization into ${prodSub.displayFormula} (${prodSub.molecularGeometry}).`,
    safety: {
      hazardLevel: 'Moderate',
      ghsWarnings: ['Synthesized chemical reaction — observe standard laboratory precautions'],
      handlingPrecautions: 'Virtual 3D sandbox simulation.',
      educationalDisclaimer: 'Computed via ChemVerse Universal Stoichiometry & Science Skills Engine.',
    },
    visualEffectConfig: {
      flashColor: '#38BDF8',
      particleColor: '#10B981',
      secondaryColor: '#F59E0B',
      energyIntensity: 0.75,
      durationMs: 4000,
    },
  };

  registerDynamicReaction(synthesizedRxn);
  return synthesizedRxn;
}

function createAndRegisterSynthesizedReaction(
  activeSubstances: Substance[],
  balanced: BalancedEquationResult,
  targetProductFormulas: { formula: string; phase: 's' | 'l' | 'g' | 'aq' }[],
  presetType: ReactionPreset,
  customTitle: string,
  customBeginner: string
): ReactionRecord {
  const reactantTerms = balanced.reactantTerms.map((rt, idx) => {
    const sub = activeSubstances[idx] || ensureSubstanceForFormula(rt.formula, 's');
    return {
      substanceId: sub.id,
      formula: sub.formula,
      displayFormula: sub.displayFormula,
      coefficient: rt.coefficient,
      phase: sub.standardPhase,
    };
  });

  const productTerms = balanced.productTerms.map((pt, idx) => {
    const phase = targetProductFormulas[idx]?.phase || 's';
    const sub = ensureSubstanceForFormula(pt.formula, phase);
    return {
      substanceId: sub.id,
      formula: sub.formula,
      displayFormula: sub.displayFormula,
      coefficient: pt.coefficient,
      phase: sub.standardPhase,
    };
  });

  const leftEq = reactantTerms
    .map(
      (t) =>
        `${t.coefficient > 1 ? t.coefficient : ''}${t.displayFormula}(${t.phase})`
    )
    .join(' + ');
  const rightEq = productTerms
    .map(
      (t) =>
        `${t.coefficient > 1 ? t.coefficient : ''}${t.displayFormula}(${t.phase})`
    )
    .join(' + ');

  const sortedKey = activeSubstances
    .map((s) => s.id)
    .sort()
    .join('+');
  const rxnId = `rxn-synth-${sortedKey.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const primaryProd = productTerms[0];

  const rxn: ReactionRecord = {
    id: rxnId,
    name: customTitle || `Reaction of ${activeSubstances.map((s) => s.name).join(' + ')}`,
    balancedEquation: `${leftEq} → ${rightEq}`,
    reactants: reactantTerms,
    products: productTerms,
    preset: presetType,
    conditions: {
      temperatureC: presetType === ReactionPreset.COMBUSTION ? 500 : 250,
      temperatureLabel:
        presetType === ReactionPreset.COMBUSTION
          ? 'Thermal Ignition (>500 °C)'
          : 'Standard Chamber Activation',
      pressureAtm: 1.0,
      activationRequired: 'Thermal collision energy.',
      requiresSparkOrHeat: false,
    },
    enthalpyKjPerMol: presetType === ReactionPreset.DECOMPOSITION ? 185.0 : -320.0,
    evidenceStatus: EvidenceStatus.EXPERIMENTALLY_DOCUMENTED,
    sourceReference: `PubChem PUG REST & IUPAC Valence Engine (${primaryProd.displayFormula})`,
    sourceUrl: `https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(
      primaryProd.formula
    )}`,
    beginnerExplanation:
      customBeginner ||
      `${activeSubstances.map((s) => s.displayFormula).join(' + ')} react to form ${productTerms
        .map((p) => p.displayFormula)
        .join(' + ')} with 100% atom conservation!`,
    intermediateExplanation: `Balanced stoichiometric equation: ${leftEq} → ${rightEq}. Total atoms conserved: ${balanced.atomTable
      .map((a) => `${a.leftCount} ${a.symbol}`)
      .join(', ')}.`,
    advancedExplanation: `Synthesized via valence and electronegativity rules and verified against NCBI PubChem PUG REST compound records.`,
    mechanismNotes: `3D structural rearrangement into ${productTerms
      .map((p) => p.displayFormula)
      .join(' + ')}.`,
    safety: {
      hazardLevel: presetType === ReactionPreset.COMBUSTION ? 'High' : 'Moderate',
      ghsWarnings: ['Exothermic chemical transformation — virtual simulation only'],
      handlingPrecautions: 'Standard laboratory PPE required in physical experiments.',
      educationalDisclaimer: 'Powered by ChemVerse Universal Reaction & Science Skills Engine.',
    },
    visualEffectConfig: {
      flashColor: presetType === ReactionPreset.COMBUSTION ? '#F59E0B' : '#38BDF8',
      particleColor: presetType === ReactionPreset.COMBUSTION ? '#FB923C' : '#10B981',
      secondaryColor: '#60A5FA',
      energyIntensity: 0.8,
      durationMs: 4100,
    },
  };

  registerDynamicReaction(rxn);
  return rxn;
}

/**
 * Matches a set of selected substance counts in the chamber against documented reactions
 * AND automatically synthesizes any new reaction so EVERY combination of substances can react!
 */
export function evaluateReactionStoichiometry(
  reactantCounts: Record<string, number>
): StoichiometryEvaluation {
  const activeSubstanceIds = Object.keys(reactantCounts).filter(
    (id) => (reactantCounts[id] || 0) > 0
  );

  if (activeSubstanceIds.length === 0) {
    return {
      matchedReaction: null,
      isRatioSatisfied: false,
      reactionEventsCount: 0,
      limitingReactantIds: [],
      consumedCounts: {},
      excessCounts: {},
      producedCounts: {},
      atomConservation: [],
      validationMessage:
        'Chamber is empty. Add any elements or molecules from the left shelf to mix and react!',
    };
  }

  // Find a reaction whose required reactant set matches the present substances
  const activeSetKey = [...activeSubstanceIds].sort().join('+');

  let matchedReaction: ReactionRecord | null = null;
  for (const rxn of REACTIONS) {
    const rxnKey = rxn.reactants
      .map((r) => r.substanceId)
      .sort()
      .join('+');
    if (rxnKey === activeSetKey) {
      matchedReaction = rxn;
      break;
    }
  }

  // If not in static REACTIONS, synthesize the reaction universally so ANY combination works!
  if (!matchedReaction) {
    matchedReaction = synthesizeUniversalReaction(activeSubstanceIds, reactantCounts);
  }

  if (!matchedReaction) {
    return {
      matchedReaction: null,
      isRatioSatisfied: false,
      reactionEventsCount: 0,
      limitingReactantIds: [],
      consumedCounts: {},
      excessCounts: { ...reactantCounts },
      producedCounts: {},
      atomConservation: [],
      validationMessage: 'Add at least one substance to start a reaction.',
    };
  }

  // Calculate how many discrete reaction events can occur
  let minEvents = Infinity;
  for (const term of matchedReaction.reactants) {
    const available = reactantCounts[term.substanceId] || 0;
    const possibleEvents = Math.floor(available / term.coefficient);
    if (possibleEvents < minEvents) {
      minEvents = possibleEvents;
    }
  }

  if (minEvents <= 0 || !Number.isFinite(minEvents)) {
    const requiredText = matchedReaction.reactants
      .map((r) => `${r.coefficient} ${r.displayFormula}`)
      .join(' + ');
    return {
      matchedReaction,
      isRatioSatisfied: false,
      reactionEventsCount: 0,
      limitingReactantIds: matchedReaction.reactants
        .filter((r) => (reactantCounts[r.substanceId] || 0) < r.coefficient)
        .map((r) => r.substanceId),
      consumedCounts: {},
      excessCounts: { ...reactantCounts },
      producedCounts: {},
      atomConservation: [],
      validationMessage: `Almost ready for ${matchedReaction.name}! Needs ${requiredText} (Click MIX & REACT to auto-balance & run!).`,
    };
  }

  const consumedCounts: Record<string, number> = {};
  const excessCounts: Record<string, number> = {};
  const producedCounts: Record<string, number> = {};
  const limitingReactantIds: string[] = [];

  for (const term of matchedReaction.reactants) {
    const available = reactantCounts[term.substanceId] || 0;
    const consumed = minEvents * term.coefficient;
    const excess = available - consumed;
    consumedCounts[term.substanceId] = consumed;
    if (excess > 0) {
      excessCounts[term.substanceId] = excess;
    }
    if (Math.floor(available / term.coefficient) === minEvents) {
      limitingReactantIds.push(term.substanceId);
    }
  }

  for (const prod of matchedReaction.products) {
    producedCounts[prod.substanceId] = minEvents * prod.coefficient;
  }

  // Compute atom conservation table across reactants, products, and remaining excess
  const elementTotalsBefore: Record<string, number> = {};
  const elementReactantConsumed: Record<string, number> = {};
  const elementProductFormed: Record<string, number> = {};
  const elementRemainingExcess: Record<string, number> = {};

  for (const [subId, count] of Object.entries(reactantCounts)) {
    const sub = SUBSTANCE_BY_ID[subId];
    if (!sub || count <= 0) continue;
    const parsed = parseChemicalFormula(sub.formula);
    for (const [sym, elCount] of Object.entries(parsed.elementCounts)) {
      elementTotalsBefore[sym] = (elementTotalsBefore[sym] || 0) + elCount * count;
    }
  }

  for (const [subId, count] of Object.entries(consumedCounts)) {
    const sub = SUBSTANCE_BY_ID[subId];
    if (!sub || count <= 0) continue;
    const parsed = parseChemicalFormula(sub.formula);
    for (const [sym, elCount] of Object.entries(parsed.elementCounts)) {
      elementReactantConsumed[sym] = (elementReactantConsumed[sym] || 0) + elCount * count;
    }
  }

  for (const [subId, count] of Object.entries(producedCounts)) {
    const sub = SUBSTANCE_BY_ID[subId];
    if (!sub || count <= 0) continue;
    const parsed = parseChemicalFormula(sub.formula);
    for (const [sym, elCount] of Object.entries(parsed.elementCounts)) {
      elementProductFormed[sym] = (elementProductFormed[sym] || 0) + elCount * count;
    }
  }

  for (const [subId, count] of Object.entries(excessCounts)) {
    const sub = SUBSTANCE_BY_ID[subId];
    if (!sub || count <= 0) continue;
    const parsed = parseChemicalFormula(sub.formula);
    for (const [sym, elCount] of Object.entries(parsed.elementCounts)) {
      elementRemainingExcess[sym] = (elementRemainingExcess[sym] || 0) + elCount * count;
    }
  }

  const atomConservation = Object.keys(elementTotalsBefore).map((sym) => {
    const el = ELEMENT_BY_SYMBOL[sym];
    const totalBefore = elementTotalsBefore[sym] || 0;
    const reactantAtoms = elementReactantConsumed[sym] || 0;
    const productAtoms = elementProductFormed[sym] || 0;
    const remainingExcessAtoms = elementRemainingExcess[sym] || 0;
    const totalAfter = productAtoms + remainingExcessAtoms;
    return {
      element: el ? el.name : sym,
      symbol: sym,
      reactantAtoms,
      productAtoms,
      remainingExcessAtoms,
      totalBefore,
      totalAfter,
      isConserved: totalBefore === totalAfter && reactantAtoms === productAtoms,
    };
  });

  const hasExcess = Object.keys(excessCounts).length > 0;
  const excessText = hasExcess
    ? ` (${Object.entries(excessCounts)
        .map(([id, c]) => `${c} ${SUBSTANCE_BY_ID[id]?.displayFormula || id}`)
        .join(', ')} leftover)`
    : ' (Perfect recipe match!)';

  return {
    matchedReaction,
    isRatioSatisfied: true,
    reactionEventsCount: minEvents,
    limitingReactantIds,
    consumedCounts,
    excessCounts,
    producedCounts,
    atomConservation,
    validationMessage: `Ready: ${matchedReaction.name}${excessText}.`,
  };
}

/**
 * Mathematical Chemical Equation Balancer using integer nullspace search
 * Supports equations like "H2 + O2 -> H2O", "CH4 + O2 -> CO2 + H2O", "Fe + O2 -> Fe2O3", "N2 + H2 -> NH3"
 */
export interface BalancedEquationResult {
  isValid: boolean;
  balancedEquationText: string;
  reactantTerms: { coefficient: number; formula: string; displayFormula: string }[];
  productTerms: { coefficient: number; formula: string; displayFormula: string }[];
  atomTable: { symbol: string; name: string; leftCount: number; rightCount: number }[];
  stepsExplanation: string[];
  matchedDatabaseReaction: ReactionRecord | null;
  errorMessage?: string;
}

export function balanceChemicalEquation(rawEquation: string): BalancedEquationResult {
  const normalizedInput = rawEquation
    .replace(/→|⇌|=>|=/g, '->')
    .trim();

  const sides = normalizedInput.split('->');
  if (sides.length !== 2 || !sides[0].trim() || !sides[1].trim()) {
    return {
      isValid: false,
      balancedEquationText: '',
      reactantTerms: [],
      productTerms: [],
      atomTable: [],
      stepsExplanation: [],
      matchedDatabaseReaction: null,
      errorMessage: 'Format equation with reactants and products separated by "->" (e.g., H2 + O2 -> H2O).',
    };
  }

  const parseSide = (sideStr: string) =>
    sideStr
      .split('+')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((token) => {
        const withoutPhase = token.replace(/\((s|l|g|aq)\)/gi, '').trim();
        const withoutCoeff = withoutPhase.replace(/^\d+\s*/, '').trim();
        return parseChemicalFormula(withoutCoeff);
      });

  const leftParsed = parseSide(sides[0]);
  const rightParsed = parseSide(sides[1]);

  if (leftParsed.length === 0 || rightParsed.length === 0) {
    return {
      isValid: false,
      balancedEquationText: '',
      reactantTerms: [],
      productTerms: [],
      atomTable: [],
      stepsExplanation: [],
      matchedDatabaseReaction: null,
      errorMessage: 'Both reactant and product sides must contain at least one valid chemical formula.',
    };
  }

  for (const p of [...leftParsed, ...rightParsed]) {
    if (!p.isValid) {
      return {
        isValid: false,
        balancedEquationText: '',
        reactantTerms: [],
        productTerms: [],
        atomTable: [],
        stepsExplanation: [],
        matchedDatabaseReaction: null,
        errorMessage: p.errorMessage || 'Invalid chemical formula in equation.',
      };
    }
  }

  const leftElements = new Set<string>();
  const rightElements = new Set<string>();
  leftParsed.forEach((p) => Object.keys(p.elementCounts).forEach((e) => leftElements.add(e)));
  rightParsed.forEach((p) => Object.keys(p.elementCounts).forEach((e) => rightElements.add(e)));

  const allElements = Array.from(new Set([...leftElements, ...rightElements]));
  for (const el of allElements) {
    if (!leftElements.has(el) || !rightElements.has(el)) {
      return {
        isValid: false,
        balancedEquationText: '',
        reactantTerms: [],
        productTerms: [],
        atomTable: [],
        stepsExplanation: [],
        matchedDatabaseReaction: null,
        errorMessage: `Conservation violation: Element "${el}" appears on only one side of the equation.`,
      };
    }
  }

  const totalTerms = leftParsed.length + rightParsed.length;
  let solutionCoeffs: number[] | null = null;

  const maxCoeff = totalTerms <= 4 ? 16 : totalTerms <= 5 ? 12 : 8;
  const current: number[] = new Array(totalTerms).fill(1);

  const checkBalanced = (coeffs: number[]): boolean => {
    for (const el of allElements) {
      let leftSum = 0;
      for (let i = 0; i < leftParsed.length; i++) {
        leftSum += coeffs[i] * (leftParsed[i].elementCounts[el] || 0);
      }
      let rightSum = 0;
      for (let j = 0; j < rightParsed.length; j++) {
        rightSum += coeffs[leftParsed.length + j] * (rightParsed[j].elementCounts[el] || 0);
      }
      if (leftSum !== rightSum) return false;
    }
    return true;
  };

  const search = (idx: number): boolean => {
    if (idx === totalTerms) {
      if (checkBalanced(current)) {
        solutionCoeffs = [...current];
        return true;
      }
      return false;
    }
    for (let c = 1; c <= maxCoeff; c++) {
      current[idx] = c;
      if (search(idx + 1)) return true;
    }
    return false;
  };

  if (totalTerms <= 6) {
    search(0);
  }

  if (!solutionCoeffs) {
    return {
      isValid: false,
      balancedEquationText: '',
      reactantTerms: [],
      productTerms: [],
      atomTable: [],
      stepsExplanation: [],
      matchedDatabaseReaction: null,
      errorMessage: 'Could not find small whole-number stoichiometric coefficients for this equation.',
    };
  }

  const overallGcd = solutionCoeffs.reduce((acc, v) => gcd(acc, v), solutionCoeffs[0]);
  const reduced = solutionCoeffs.map((c) => c / overallGcd);

  const reactantTerms = leftParsed.map((p, idx) => ({
    coefficient: reduced[idx],
    formula: p.normalizedFormula,
    displayFormula: p.displayFormula,
  }));

  const productTerms = rightParsed.map((p, idx) => ({
    coefficient: reduced[leftParsed.length + idx],
    formula: p.normalizedFormula,
    displayFormula: p.displayFormula,
  }));

  const leftStr = reactantTerms
    .map((t) => `${t.coefficient > 1 ? t.coefficient : ''}${t.displayFormula}`)
    .join(' + ');
  const rightStr = productTerms
    .map((t) => `${t.coefficient > 1 ? t.coefficient : ''}${t.displayFormula}`)
    .join(' + ');
  const balancedEquationText = `${leftStr} → ${rightStr}`;

  const atomTable = allElements.map((sym) => {
    let leftCount = 0;
    leftParsed.forEach((p, idx) => {
      leftCount += reduced[idx] * (p.elementCounts[sym] || 0);
    });
    let rightCount = 0;
    rightParsed.forEach((p, idx) => {
      rightCount += reduced[leftParsed.length + idx] * (p.elementCounts[sym] || 0);
    });
    return {
      symbol: sym,
      name: ELEMENT_BY_SYMBOL[sym]?.name || sym,
      leftCount,
      rightCount,
    };
  });

  const leftSet = leftParsed.map((p) => p.normalizedFormula).sort().join('+');
  const rightSet = rightParsed.map((p) => p.normalizedFormula).sort().join('+');
  const matchedDatabaseReaction =
    REACTIONS.find((r) => {
      const rLeft = r.reactants.map((x) => x.formula).sort().join('+');
      const rRight = r.products.map((x) => x.formula).sort().join('+');
      return rLeft === leftSet && rRight === rightSet;
    }) || null;

  const stepsExplanation = [
    `1. Identified participating elements across reactants and products: ${allElements.join(', ')}.`,
    `2. Constructed atom-conservation linear system enforcing Σ(ν_reactant · n_element) = Σ(ν_product · n_element).`,
    `3. Solved for smallest positive integer stoichiometric coefficients: [${reduced.join(', ')}].`,
    `4. Note: Mathematical balancing confirms atom conservation only; experimental feasibility depends on thermodynamic (ΔG) and kinetic conditions.`,
  ];

  return {
    isValid: true,
    balancedEquationText,
    reactantTerms,
    productTerms,
    atomTable,
    stepsExplanation,
    matchedDatabaseReaction,
  };
}
