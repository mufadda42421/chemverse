/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Calculator,
  Compass,
  ExternalLink,
  FlaskConical,
  Scale,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { REACTIONS } from '../data/reactions';
import { SUBSTANCES, SUBSTANCE_BY_ID } from '../data/substances';
import {
  balanceChemicalEquation,
  parseChemicalFormula,
} from '../engine/chemistryEngine';
import {
  buildReactionFromScienceDatabaseQuery,
  fetchPubChemByCidOrName,
  PubChemLiveProperties,
  ReactomeReactionSearchHit,
  searchReactomeReactions,
} from '../services/pubchemService';
import { ReactionPreset, Substance } from '../types/chemistry';

export type ChemistryToolTab =
  | 'decoder'
  | 'balancer'
  | 'explorer'
  | 'learning';

interface ChemistryToolsModalProps {
  initialTab: ChemistryToolTab;
  onClose: () => void;
  onLoadReactionIntoSandbox: (reactionId: string) => void;
  onInspectSubstance: (substance: Substance) => void;
}

const LEARNING_MODULES = [
  {
    id: 'lesson-stoichiometry',
    level: 'Beginner',
    title: '01. Conservation of Atoms & Stoichiometry',
    reactionId: 'rxn-water-synthesis',
    summary:
      'In a chemical reaction, atoms are neither created nor destroyed—only rearranged through bond cleavage and formation.',
    explanation:
      'Why does forming water require two H₂ molecules for every one O₂ molecule? Because oxygen exists as a diatomic molecule (O₂) with two oxygen atoms, and each water molecule (H₂O) requires only one oxygen atom bonded to two hydrogens. Combining 2 H₂ (4 H atoms) with 1 O₂ (2 O atoms) yields 2 H₂O molecules with zero leftover atoms.',
    keyConcept: '2H₂(g) + O₂(g) → 2H₂O(l) · 4 H and 2 O atoms before and after.',
  },
  {
    id: 'lesson-geometry',
    level: 'Intermediate',
    title: '02. VSEPR Theory & Molecular Geometry Transformation',
    reactionId: 'rxn-ethene-hydrogenation',
    summary:
      'Watch how adding hydrogen across a double bond transforms flat sp² geometry into 3D tetrahedral sp³ geometry.',
    explanation:
      'Ethene (C₂H₄) has a rigid carbon–carbon double bond where each carbon is sp² hybridized with ~120° trigonal planar angles. When hydrogenated over a platinum catalyst (C₂H₄ + H₂ → C₂H₆), the π bond breaks and two new C–H σ bonds form, converting both carbons to sp³ tetrahedral geometry (109.5°).',
    keyConcept: 'Planar sp² (120°) → Staggered Tetrahedral sp³ (109.5°).',
  },
  {
    id: 'lesson-redox-precip',
    level: 'Intermediate',
    title: '03. Aqueous Precipitation vs. Electron-Transfer Redox',
    reactionId: 'rxn-silver-chloride-precipitation',
    summary:
      'Distinguish ion-partner exchange in precipitation from oxidation-state changes in redox displacement.',
    explanation:
      'In AgNO₃(aq) + NaCl(aq) → AgCl(s)↓ + NaNO₃(aq), no electrons are transferred; Ag⁺ and Cl⁻ simply lock into an insoluble crystal lattice (Ksp = 1.77 × 10⁻¹⁰). In contrast, Zn(s) + CuSO₄(aq) → ZnSO₄(aq) + Cu(s) transfers two valence electrons from neutral Zn⁰ to Cu²⁺.',
    keyConcept: 'Ion metathesis (no Δ oxidation state) vs. Redox electron transfer.',
  },
  {
    id: 'lesson-thermodynamics',
    level: 'Advanced',
    title: '04. Activation Energy, Catalysis & Chemical Equilibrium',
    reactionId: 'rxn-ammonia-synthesis',
    summary:
      'Understand why thermodynamically favorable reactions like N₂ + 3H₂ ⇌ 2NH₃ require catalysts and specific conditions.',
    explanation:
      'Even though ammonia synthesis is exothermic (ΔH° = -92.4 kJ/mol), the N≡N triple bond (945 kJ/mol) creates an enormous kinetic activation barrier. Iron catalysts lower this barrier via dissociative chemisorption, while high pressure (200 atm) shifts equilibrium toward fewer gas moles.',
    keyConcept: 'Thermodynamic spontaneity (ΔG) ≠ Kinetic rate (Ea).',
  },
];

export const ChemistryToolsModal: React.FC<ChemistryToolsModalProps> = ({
  initialTab,
  onClose,
  onLoadReactionIntoSandbox,
  onInspectSubstance,
}) => {
  const [activeTab, setActiveTab] = useState<ChemistryToolTab>(initialTab);

  // 1. Formula Decoder State
  const [formulaInput, setFormulaInput] = useState('H2SO4');
  const [pubchemLookupResult, setPubchemLookupResult] =
    useState<PubChemLiveProperties | null>(null);
  const [pubchemLoading, setPubchemLoading] = useState(false);

  const parsedFormula = useMemo(
    () => parseChemicalFormula(formulaInput),
    [formulaInput]
  );

  const matchedKnownSubstance = useMemo(() => {
    if (!parsedFormula.isValid) return null;
    return (
      SUBSTANCES.find(
        (s) => s.formula.toLowerCase() === parsedFormula.normalizedFormula.toLowerCase()
      ) || null
    );
  }, [parsedFormula]);

  const relatedDecoderReactions = useMemo(() => {
    if (!parsedFormula.isValid) return [];
    const norm = parsedFormula.normalizedFormula.toLowerCase();
    return REACTIONS.filter(
      (r) =>
        r.reactants.some((x) => x.formula.toLowerCase() === norm) ||
        r.products.some((x) => x.formula.toLowerCase() === norm)
    );
  }, [parsedFormula]);

  const handleVerifyPubChem = async () => {
    if (!parsedFormula.isValid) return;
    setPubchemLoading(true);
    const query = matchedKnownSubstance?.pubchemCid || parsedFormula.normalizedFormula;
    const res = await fetchPubChemByCidOrName(query);
    setPubchemLookupResult(res);
    setPubchemLoading(false);
  };

  // 2. Equation Balancer State
  const [equationInput, setEquationInput] = useState('CH4 + O2 -> CO2 + H2O');
  const [balancerSimulating, setBalancerSimulating] = useState(false);
  const balancedResult = useMemo(
    () => balanceChemicalEquation(equationInput),
    [equationInput]
  );

  const handleSimulateBalancedEquation = async () => {
    if (!balancedResult.isValid) return;
    if (balancedResult.matchedDatabaseReaction) {
      onLoadReactionIntoSandbox(balancedResult.matchedDatabaseReaction.id);
      onClose();
      return;
    }
    setBalancerSimulating(true);
    const created = await buildReactionFromScienceDatabaseQuery(equationInput);
    setBalancerSimulating(false);
    if (created) {
      onLoadReactionIntoSandbox(created.id);
      onClose();
    }
  };

  // 3. Reaction Explorer State
  const [explorerQuery, setExplorerQuery] = useState('');
  const [explorerCategory, setExplorerCategory] = useState<string>('ALL');
  const [moleScaleInput, setMoleScaleInput] = useState<number>(2.5);
  const [reactomeHits, setReactomeHits] = useState<ReactomeReactionSearchHit[]>([]);
  const [scienceRxnLoading, setScienceRxnLoading] = useState(false);

  const handleSearchScienceReactionDb = async () => {
    const q = explorerQuery.trim();
    if (!q) return;
    setScienceRxnLoading(true);
    const [hits, builtRxn] = await Promise.all([
      searchReactomeReactions(q),
      buildReactionFromScienceDatabaseQuery(q),
    ]);
    setReactomeHits(hits);
    setScienceRxnLoading(false);
    if (builtRxn && (q.includes('+') || q.includes('->') || q.includes('='))) {
      onLoadReactionIntoSandbox(builtRxn.id);
      onClose();
    }
  };

  const filteredReactions = useMemo(() => {
    return REACTIONS.filter((r) => {
      const matchesCat =
        explorerCategory === 'ALL' || r.preset === explorerCategory;
      const q = explorerQuery.trim().toLowerCase();
      if (!q) return matchesCat;
      const hay = `${r.name} ${r.balancedEquation} ${r.preset} ${r.conditions.temperatureLabel}`.toLowerCase();
      return matchesCat && hay.includes(q);
    });
  }, [explorerQuery, explorerCategory]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-6xl bg-[#0B0E17] border border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header & Tool Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-slate-800 bg-[#0F1626]">
          <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveTab('decoder')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'decoder'
                  ? 'bg-cyan-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              Formula Decoder
            </button>
            <button
              onClick={() => setActiveTab('balancer')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'balancer'
                  ? 'bg-cyan-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              Equation Balancer
            </button>
            <button
              onClick={() => setActiveTab('explorer')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'explorer'
                  ? 'bg-cyan-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              Reaction Explorer & Mole Calculator
            </button>
            <button
              onClick={() => setActiveTab('learning')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'learning'
                  ? 'bg-cyan-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Chemistry Learning Center
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            aria-label="Close Chemistry Tools"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* =============================================================== */}
          {/* TAB 1: FORMULA DECODER */}
          {/* =============================================================== */}
          {activeTab === 'decoder' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white">
                  Chemical Formula Decoder & Molar Mass Analyzer
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Enter any chemical formula (supports nested parentheses like Ca(OH)2, Al2(SO4)3, H2SO4, C6H12O6) to compute exact elemental composition and molar mass.
                </p>
              </div>

              {/* Quick-Try Formula Presets */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-400">Quick-Try Examples:</span>
                {['H2O', 'CO2', 'NaCl', 'H2SO4', 'Ca(OH)2', 'C6H12O6', 'Al2(SO4)3', 'NH4Cl'].map(
                  (ex) => (
                    <button
                      key={ex}
                      onClick={() => {
                        setFormulaInput(ex);
                        setPubchemLookupResult(null);
                      }}
                      className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors whitespace-nowrap shrink-0 ${
                        formulaInput === ex
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {ex}
                    </button>
                  )
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  value={formulaInput}
                  onChange={(e) => {
                    setFormulaInput(e.target.value);
                    setPubchemLookupResult(null);
                  }}
                  placeholder="Enter formula e.g. Ca(OH)2"
                  className="px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-base font-mono text-white focus:outline-none focus:border-cyan-500 w-72"
                />
                <button
                  onClick={handleVerifyPubChem}
                  disabled={!parsedFormula.isValid || pubchemLoading}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-semibold text-cyan-300 rounded-lg border border-slate-700 flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
                >
                  <Sparkles className="w-4 h-4" />
                  {pubchemLoading ? 'Querying PubChem...' : 'Query Live PubChem Record'}
                </button>
                {matchedKnownSubstance && (
                  <button
                    onClick={() => onInspectSubstance(matchedKnownSubstance)}
                    className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    Open 3D Molecular Structure ({matchedKnownSubstance.displayFormula})
                  </button>
                )}
              </div>

              {!parsedFormula.isValid ? (
                <div className="p-4 bg-rose-950/30 border border-rose-500/40 rounded-lg text-xs text-rose-300">
                  {parsedFormula.errorMessage}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-7 space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg">
                        <div className="text-xs text-slate-400">Formatted Formula</div>
                        <div className="text-2xl font-mono font-bold text-cyan-300 mt-1">
                          {parsedFormula.displayFormula}
                        </div>
                      </div>
                      <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg">
                        <div className="text-xs text-slate-400">Total Atom Count</div>
                        <div className="text-2xl font-mono font-bold text-white mt-1 tabular-nums">
                          {parsedFormula.totalAtoms}
                        </div>
                      </div>
                      <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg">
                        <div className="text-xs text-slate-400">Molar Mass</div>
                        <div className="text-2xl font-mono font-bold text-white mt-1 tabular-nums">
                          {parsedFormula.molarMass.toFixed(3)}
                          <span className="text-xs text-slate-400 ml-1">g/mol</span>
                        </div>
                      </div>
                    </div>

                    {/* Element Breakdown Table */}
                    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-[11px] text-slate-400 bg-slate-950/50">
                            <th className="py-2.5 px-4">Element</th>
                            <th className="py-2.5 px-4 font-mono">Count</th>
                            <th className="py-2.5 px-4 font-mono">Atomic Mass (u)</th>
                            <th className="py-2.5 px-4 font-mono">Subtotal (g/mol)</th>
                            <th className="py-2.5 px-4 font-mono">Mass %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/70 text-xs">
                          {parsedFormula.elementBreakdown.map((item) => (
                            <tr key={item.symbol}>
                              <td className="py-2.5 px-4 font-medium text-white">
                                {item.name} ({item.symbol})
                              </td>
                              <td className="py-2.5 px-4 font-mono tabular-nums text-cyan-300">
                                {item.count}
                              </td>
                              <td className="py-2.5 px-4 font-mono tabular-nums text-slate-300">
                                {item.atomicMass.toFixed(3)}
                              </td>
                              <td className="py-2.5 px-4 font-mono tabular-nums text-white">
                                {item.subtotalMass.toFixed(3)}
                              </td>
                              <td className="py-2.5 px-4 font-mono tabular-nums text-emerald-400">
                                {item.massPercent.toFixed(2)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right Column: Identity, PubChem & Related Reactions */}
                  <div className="lg:col-span-5 space-y-4">
                    {matchedKnownSubstance && (
                      <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
                        <div className="text-xs text-cyan-400 font-mono">
                          Verified Sandbox Substance
                        </div>
                        <div className="text-base font-bold text-white">
                          {matchedKnownSubstance.name}
                        </div>
                        <p className="text-xs text-slate-300">
                          {matchedKnownSubstance.description}
                        </p>
                      </div>
                    )}

                    {pubchemLookupResult && (
                      <div className="p-4 bg-slate-900 border border-cyan-500/40 rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-cyan-300">
                            PubChem PUG REST Live Record
                          </span>
                          <a
                            href={pubchemLookupResult.pubchemRecordUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-mono text-cyan-400 hover:underline flex items-center gap-1"
                          >
                            CID {pubchemLookupResult.CID}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <div className="text-xs font-mono text-slate-300 space-y-1">
                          <div>IUPAC: {pubchemLookupResult.IUPACName || 'N/A'}</div>
                          <div>SMILES: {pubchemLookupResult.CanonicalSMILES || 'N/A'}</div>
                          <div>TPSA: {pubchemLookupResult.TPSA ?? 0} Å²</div>
                        </div>
                      </div>
                    )}

                    {relatedDecoderReactions.length > 0 && (
                      <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
                        <div className="text-xs font-semibold text-white">
                          Documented Sandbox Reactions ({relatedDecoderReactions.length})
                        </div>
                        {relatedDecoderReactions.map((r) => (
                          <div
                            key={r.id}
                            className="flex items-center justify-between p-2 bg-slate-950 border border-slate-800 rounded"
                          >
                            <span className="text-xs font-mono text-cyan-300">
                              {r.balancedEquation}
                            </span>
                            <button
                              onClick={() => {
                                onLoadReactionIntoSandbox(r.id);
                                onClose();
                              }}
                              className="px-2.5 py-1 text-xs bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500 hover:text-slate-950 rounded transition-colors whitespace-nowrap shrink-0"
                            >
                              Try in Sandbox
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 2: EQUATION BALANCER */}
          {/* =============================================================== */}
          {activeTab === 'balancer' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white">
                  Stoichiometric Chemical Equation Balancer
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Balances chemical equations using linear atom conservation. Note: Mathematical balancing guarantees conservation of mass, not thermodynamic or kinetic feasibility.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-400">Sample Unbalanced Equations:</span>
                {[
                  'H2 + O2 -> H2O',
                  'CH4 + O2 -> CO2 + H2O',
                  'N2 + H2 -> NH3',
                  'Fe + O2 -> Fe2O3',
                  'C2H6 + O2 -> CO2 + H2O',
                  'Al + HCl -> AlCl3 + H2',
                ].map((eq) => (
                  <button
                    key={eq}
                    onClick={() => setEquationInput(eq)}
                    className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors whitespace-nowrap shrink-0 ${
                      equationInput === eq
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {eq}
                  </button>
                ))}
              </div>

              <div>
                <input
                  type="text"
                  value={equationInput}
                  onChange={(e) => setEquationInput(e.target.value)}
                  className="w-full max-w-xl px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-base font-mono text-white focus:outline-none focus:border-cyan-500"
                  placeholder="e.g. H2 + O2 -> H2O"
                />
              </div>

              {!balancedResult.isValid ? (
                <div className="p-4 bg-rose-950/30 border border-rose-500/40 rounded-lg text-xs text-rose-300">
                  {balancedResult.errorMessage}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-7 space-y-4">
                    <div className="p-5 bg-slate-900 border border-cyan-500/40 rounded-xl">
                      <div className="text-xs text-slate-400">Balanced Chemical Equation</div>
                      <div className="text-2xl font-mono font-bold text-cyan-300 mt-1">
                        {balancedResult.balancedEquationText}
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                        <span className="text-xs text-emerald-400">
                          {balancedResult.matchedDatabaseReaction
                            ? `Matches documented reaction: ${balancedResult.matchedDatabaseReaction.name}`
                            : 'Ready to synthesize 3D molecules via PubChem & Science Skills!'}
                        </span>
                        <button
                          onClick={handleSimulateBalancedEquation}
                          disabled={balancerSimulating}
                          className="px-3 py-1.5 text-xs font-semibold bg-cyan-500 text-slate-950 rounded-lg hover:bg-cyan-400 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          {balancerSimulating
                            ? 'Resolving 3D...'
                            : 'Simulate in 3D Sandbox'}
                        </button>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
                      <div className="text-xs font-semibold text-white">
                        Step-by-Step Mathematical Derivation
                      </div>
                      <ul className="space-y-1.5 text-xs text-slate-300">
                        {balancedResult.stepsExplanation.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="lg:col-span-5">
                    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                      <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 text-xs font-semibold text-white">
                        Atom Conservation Verification
                      </div>
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400">
                            <th className="py-2 px-4">Element</th>
                            <th className="py-2 px-4 font-mono">Reactants</th>
                            <th className="py-2 px-4 font-mono">Products</th>
                            <th className="py-2 px-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/70">
                          {balancedResult.atomTable.map((row) => (
                            <tr key={row.symbol}>
                              <td className="py-2 px-4 font-medium text-white">
                                {row.name} ({row.symbol})
                              </td>
                              <td className="py-2 px-4 font-mono tabular-nums text-slate-200">
                                {row.leftCount}
                              </td>
                              <td className="py-2 px-4 font-mono tabular-nums text-slate-200">
                                {row.rightCount}
                              </td>
                              <td className="py-2 px-4 font-mono text-emerald-400">
                                ● Balanced
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 3: REACTION EXPLORER & MACROSCOPIC MOLE CALCULATOR */}
          {/* =============================================================== */}
          {activeTab === 'explorer' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Documented Reaction Explorer & Macroscopic Mole Stoichiometry
                  </h3>
                  <p className="text-xs text-slate-400">
                    Search all {REACTIONS.length} documented reactions by reactant, product, category, or condition, and scale macroscopic molar masses.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
                    <label className="text-xs text-slate-400 whitespace-nowrap">
                      Macroscopic Scale (mol of reaction):
                    </label>
                    <input
                      type="number"
                      min={0.1}
                      max={1000}
                      step={0.5}
                      value={moleScaleInput}
                      onChange={(e) =>
                        setMoleScaleInput(Math.max(0.01, Number(e.target.value) || 1))
                      }
                      className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-xs font-mono text-cyan-300 tabular-nums"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={explorerQuery}
                        onChange={(e) => setExplorerQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSearchScienceReactionDb();
                        }}
                        placeholder="Search or type e.g. Al + Cl2..."
                        className="pl-9 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white w-56"
                      />
                    </div>
                    <button
                      onClick={handleSearchScienceReactionDb}
                      disabled={scienceRxnLoading}
                      className="px-3 py-1.5 text-xs font-semibold bg-cyan-500 text-slate-950 rounded-lg hover:bg-cyan-400 disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      {scienceRxnLoading ? 'Searching...' : 'Search Science DB'}
                    </button>
                  </div>
                </div>
              </div>

              {reactomeHits.length > 0 && (
                <div className="p-4 bg-slate-900/90 border border-cyan-500/40 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-300">
                      Live Reactome Knowledgebase Biochemical Reactions ({reactomeHits.length} hits)
                    </span>
                    <button
                      onClick={() => setReactomeHits([])}
                      className="text-xs text-slate-400 hover:text-white cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {reactomeHits.map((hit) => (
                      <div
                        key={hit.stId}
                        className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between text-[11px] font-mono text-cyan-400">
                            <span>Reactome: {hit.stId}</span>
                            <span>{hit.species}</span>
                          </div>
                          <div className="text-xs font-bold text-white mt-0.5">
                            {hit.name}
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                            {hit.summary}
                          </p>
                        </div>
                        <div className="pt-2 flex items-center justify-between">
                          <a
                            href={hit.reactomeUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-cyan-300 hover:underline flex items-center gap-1"
                          >
                            View in Reactome <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preset Filter Buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {['ALL', ...Object.values(ReactionPreset)].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setExplorerCategory(cat)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      explorerCategory === cat
                        ? 'bg-cyan-500 text-slate-950 font-semibold'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Reaction List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredReactions.map((rxn) => {
                  const totalEnthalpy = rxn.enthalpyKjPerMol * moleScaleInput;
                  return (
                    <div
                      key={rxn.id}
                      className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>
                            {rxn.preset} · {rxn.evidenceStatus}
                          </span>
                          <span
                            className={`font-mono tabular-nums ${
                              rxn.enthalpyKjPerMol < 0 ? 'text-emerald-400' : 'text-amber-400'
                            }`}
                          >
                            ΔH° = {rxn.enthalpyKjPerMol > 0 ? '+' : ''}
                            {rxn.enthalpyKjPerMol} kJ/mol
                          </span>
                        </div>
                        <div className="text-base font-mono font-bold text-cyan-300">
                          {rxn.balancedEquation}
                        </div>
                        <div className="text-sm font-semibold text-white">{rxn.name}</div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {rxn.beginnerExplanation}
                        </p>
                      </div>

                      {/* Mole-Based Mass Calculation Strip */}
                      <div className="p-2.5 bg-slate-950/80 border border-slate-800/90 rounded-lg text-[11px] font-mono text-slate-300 space-y-1">
                        <div className="text-slate-400">
                          At ξ = {moleScaleInput} mol reaction extent (ΔH ={' '}
                          {totalEnthalpy.toFixed(1)} kJ):
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                          {rxn.reactants.map((r) => {
                            const sub = SUBSTANCE_BY_ID[r.substanceId];
                            const moles = r.coefficient * moleScaleInput;
                            const grams = moles * (sub?.molarMass || 0);
                            return (
                              <span key={r.substanceId} className="tabular-nums">
                                {moles.toFixed(2)} mol {r.displayFormula} ({grams.toFixed(1)} g)
                              </span>
                            );
                          })}
                          <span className="text-cyan-400">→</span>
                          {rxn.products.map((p) => {
                            const sub = SUBSTANCE_BY_ID[p.substanceId];
                            const moles = p.coefficient * moleScaleInput;
                            const grams = moles * (sub?.molarMass || 0);
                            return (
                              <span
                                key={p.substanceId}
                                className="text-emerald-300 tabular-nums"
                              >
                                {moles.toFixed(2)} mol {p.displayFormula} ({grams.toFixed(1)} g)
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-slate-400 truncate max-w-[65%]">
                          Conditions: {rxn.conditions.temperatureLabel}
                        </span>
                        <button
                          onClick={() => {
                            onLoadReactionIntoSandbox(rxn.id);
                            onClose();
                          }}
                          className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                        >
                          <FlaskConical className="w-3.5 h-3.5" />
                          Try in Sandbox
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 4: CHEMISTRY LEARNING CENTER */}
          {/* =============================================================== */}
          {activeTab === 'learning' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-bold text-white">
                  Interactive Chemistry Learning Center
                </h3>
                <p className="text-xs text-slate-400">
                  Guided lessons connecting molecular structure, stoichiometry, and thermodynamics directly to live 3D sandbox experiments.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {LEARNING_MODULES.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="p-5 bg-slate-900 border border-slate-800 rounded-xl flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="text-xs font-mono text-cyan-400">
                        {lesson.level} Level
                      </div>
                      <h4 className="text-base font-bold text-white">{lesson.title}</h4>
                      <p className="text-xs text-slate-200 font-medium">
                        {lesson.summary}
                      </p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {lesson.explanation}
                      </p>
                    </div>

                    <div className="space-y-3 pt-2 border-t border-slate-800">
                      <div className="text-xs font-mono text-emerald-300">
                        {lesson.keyConcept}
                      </div>
                      <button
                        onClick={() => {
                          onLoadReactionIntoSandbox(lesson.reactionId);
                          onClose();
                        }}
                        className="w-full py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors"
                      >
                        Try in 3D Sandbox
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
