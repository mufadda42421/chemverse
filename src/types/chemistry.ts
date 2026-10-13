/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum SimulationState {
  IDLE = 'IDLE',
  SELECTING_REACTANTS = 'SELECTING_REACTANTS',
  VALIDATING_INPUT = 'VALIDATING_INPUT',
  SEARCHING_REACTION_DATABASE = 'SEARCHING_REACTION_DATABASE',
  CHECKING_STOICHIOMETRY = 'CHECKING_STOICHIOMETRY',
  WAITING_FOR_REQUIRED_CONDITIONS = 'WAITING_FOR_REQUIRED_CONDITIONS',
  READY_TO_REACT = 'READY_TO_REACT',
  CINEMATIC_INTRO = 'CINEMATIC_INTRO',
  MOLECULAR_INTERACTION = 'MOLECULAR_INTERACTION',
  REACTION_TRANSFORMATION = 'REACTION_TRANSFORMATION',
  PRODUCT_FORMATION = 'PRODUCT_FORMATION',
  RESULTS = 'RESULTS',
  ERROR_OR_UNSUPPORTED = 'ERROR_OR_UNSUPPORTED',
}

export enum ReactionPreset {
  SYNTHESIS = 'Synthesis',
  DECOMPOSITION = 'Decomposition',
  ACID_BASE_NEUTRALIZATION = 'Acid-Base Neutralization',
  PRECIPITATION = 'Precipitation',
  COMBUSTION = 'Combustion',
  REDOX = 'Redox Reaction',
  THERMAL_DECOMPOSITION = 'Thermal Decomposition',
  PHOTOCHEMICAL = 'Photochemical Reaction',
}

export enum EvidenceStatus {
  EXPERIMENTALLY_DOCUMENTED = 'Experimentally documented',
  ESTABLISHED_REFERENCE = 'Established reference',
  COMPUTATIONALLY_PREDICTED = 'Computationally predicted',
  UNSUPPORTED_OR_UNCERTAIN = 'Unsupported or uncertain',
}

export type SubstanceCategory =
  | 'Elements'
  | 'Common molecules'
  | 'Acids and bases'
  | 'Salts'
  | 'Gases'
  | 'Organic compounds'
  | 'Water-based solutions'
  | 'Minerals'
  | 'Biochemical compounds'
  | 'Saved custom setups';

export type VisualizationMode = 'ball-and-stick' | 'space-filling' | 'wireframe';

export interface ElementData {
  atomicNumber: number;
  symbol: string;
  name: string;
  atomicMass: number;
  category: string;
  group: number;
  period: number;
  electronConfiguration: string;
  oxidationStates: string[];
  cpkColor: string;
  visualRadius: number;
  vdwRadius: number;
  standardState: 'solid' | 'liquid' | 'gas' | 'synthetic';
  electronegativity?: number;
  meltingPointK?: number;
  boilingPointK?: number;
  summary: string;
  safetyNote: string;
  defaultSubstanceId?: string;
}

export interface AtomNode {
  id: string;
  elementSymbol: string;
  position: [number, number, number]; // In Angstroms (scaled in 3D scene)
  label?: string;
  formalCharge?: number;
}

export interface BondEdge {
  id: string;
  atomAId: string;
  atomBId: string;
  order: 1 | 2 | 3;
}

export interface SafetyMetadata {
  hazardLevel: 'Low' | 'Moderate' | 'High' | 'Extreme';
  ghsWarnings: string[];
  handlingPrecautions: string;
  educationalDisclaimer: string;
}

export interface Substance {
  id: string;
  formula: string;
  displayFormula: string;
  name: string;
  iupacName?: string;
  category: SubstanceCategory;
  secondaryCategories?: SubstanceCategory[];
  identityType: 'elemental-molecule' | 'atomic-element' | 'compound' | 'ionic-lattice' | 'aqueous-solution';
  standardPhase: 's' | 'l' | 'g' | 'aq';
  molarMass: number;
  charge: number;
  molecularGeometry: string;
  bondAngle?: string;
  dipoleMoment?: string;
  pubchemCid?: number;
  smiles?: string;
  atoms: AtomNode[];
  bonds: BondEdge[];
  isSchematicGeometry?: boolean;
  provenance: EvidenceStatus;
  sourceReference: string;
  sourceUrl?: string;
  description: string;
  safety: SafetyMetadata;
}

export interface ChamberMoleculeInstance {
  instanceId: string;
  substanceId: string;
  position: [number, number, number];
  rotation: [number, number, number];
  velocity: [number, number, number];
  isProduct?: boolean;
  isUnreactedExcess?: boolean;
}

export interface ReactionCondition {
  temperatureC: number;
  temperatureLabel: string;
  pressureAtm: number;
  catalyst?: string;
  solvent?: string;
  lightExposure?: boolean;
  activationRequired: string;
  requiresSparkOrHeat?: boolean;
  requiresLight?: boolean;
  requiresAqueous?: boolean;
}

export interface StoichiometricTerm {
  substanceId: string;
  formula: string;
  displayFormula: string;
  coefficient: number;
  phase: 's' | 'l' | 'g' | 'aq';
}

export interface ReactionRecord {
  id: string;
  name: string;
  balancedEquation: string;
  reactants: StoichiometricTerm[];
  products: StoichiometricTerm[];
  preset: ReactionPreset;
  conditions: ReactionCondition;
  enthalpyKjPerMol: number; // Negative = exothermic, Positive = endothermic
  evidenceStatus: EvidenceStatus;
  sourceReference: string;
  sourceUrl: string;
  beginnerExplanation: string;
  intermediateExplanation: string;
  advancedExplanation: string;
  mechanismNotes: string;
  safety: SafetyMetadata;
  visualEffectConfig: {
    flashColor: string;
    particleColor: string;
    secondaryColor: string;
    precipitateColor?: string;
    energyIntensity: number; // 0.2 to 1.0
    durationMs: number;
  };
}

export interface StoichiometryEvaluation {
  matchedReaction: ReactionRecord | null;
  isRatioSatisfied: boolean;
  reactionEventsCount: number; // How many times the balanced reaction occurs
  limitingReactantIds: string[];
  consumedCounts: Record<string, number>;
  excessCounts: Record<string, number>;
  producedCounts: Record<string, number>;
  atomConservation: {
    element: string;
    symbol: string;
    reactantAtoms: number;
    productAtoms: number;
    remainingExcessAtoms: number;
    totalBefore: number;
    totalAfter: number;
    isConserved: boolean;
  }[];
  validationMessage: string;
}

export interface SavedExperiment {
  id: string;
  title: string;
  timestamp: string;
  reactantCounts: Record<string, number>;
  conditionsOverride: {
    temperatureC: number;
    pressureAtm: number;
    catalystActive: boolean;
    uvLightActive: boolean;
  };
  notes?: string;
}
