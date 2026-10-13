/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Eye,
  Flame,
  HelpCircle,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  Sun,
  Trash2,
  Undo2,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import {
  ChemistryToolsModal,
  ChemistryToolTab,
} from './components/ChemistryToolsModal';
import { LabCanvas3D, SelectedAtomInfo } from './components/LabCanvas3D';
import { MoleculeInspectionModal } from './components/MoleculeInspectionModal';
import { PeriodicTableModal } from './components/PeriodicTableModal';
import { ELEMENT_BY_SYMBOL } from './data/elements';
import { REACTIONS } from './data/reactions';
import { SUBSTANCES, SUBSTANCE_BY_ID } from './data/substances';
import { evaluateReactionStoichiometry } from './engine/chemistryEngine';
import {
  buildReactionFromScienceDatabaseQuery,
  enrichReactionWithScienceSkills,
  fetchPubChemByCidOrName,
  importMoleculeFromScienceDatabases,
} from './services/pubchemService';
import { soundEngine } from './services/soundEffects';
import {
  ChamberMoleculeInstance,
  SimulationState,
  Substance,
  VisualizationMode,
} from './types/chemistry';

// Kid-friendly starter recipes that work with 1 click!
const KID_FRIENDLY_RECIPES = [
  {
    id: 'rxn-water-synthesis',
    title: 'Make Water!',
    subtitle: '2 Hydrogen + 1 Oxygen → 2 Water',
    badge: 'Most Popular',
  },
  {
    id: 'rxn-water-excess',
    title: 'Leftover Hydrogen!',
    subtitle: '3 Hydrogen + 1 Oxygen → 2 Water + 1 Leftover',
    badge: 'Fun Test',
  },
  {
    id: 'rxn-methane-combustion',
    title: 'Campfire Gas!',
    subtitle: '1 Methane + 2 Oxygen → Carbon Dioxide + 2 Water',
    badge: 'Energy',
  },
  {
    id: 'rxn-sodium-chlorine-synthesis',
    title: 'Make Table Salt!',
    subtitle: '2 Sodium + 1 Chlorine → 2 Table Salt',
    badge: 'Crystal',
  },
  {
    id: 'rxn-iron-oxidation',
    title: 'Make Iron Rust!',
    subtitle: '4 Iron + 3 Oxygen → 2 Rust (Fe₂O₃)',
    badge: 'Metals',
  },
  {
    id: 'rxn-acid-base-neutralization',
    title: 'Acid + Base Mix!',
    subtitle: 'Acid (HCl) + Base (NaOH) → Salt + Water',
    badge: 'Safe Mix',
  },
  {
    id: 'rxn-silver-chloride-precipitation',
    title: 'Snowy Crystal Drop!',
    subtitle: 'Silver Nitrate + Salt → White Silver Chloride',
    badge: 'Precipitate',
  },
  {
    id: 'rxn-peroxide-decomposition',
    title: 'Bubble Breaker!',
    subtitle: '2 Hydrogen Peroxide → 2 Water + 1 Oxygen',
    badge: 'Splits Apart',
  },
];

// Simple kid-friendly groups for the left shelf (including all 118 Elements and Live Science DB Search!)
type SimpleShelfFilter =
  | 'starters'
  | 'elements'
  | 'gases'
  | 'liquids'
  | 'solids'
  | 'science-db';

const STARTER_IDS = [
  'H2',
  'O2',
  'H2O',
  'CH4',
  'CO2',
  'Na',
  'Cl2',
  'NaCl',
  'HCl',
  'NaOH',
  'H2O2',
  'NH3',
  'N2',
];

/**
 * Computes evenly spaced 3D positions inside the reaction chamber
 */
function computeChamberPositions(count: number): [number, number, number][] {
  if (count === 1) return [[0, 0.35, 0]];
  if (count === 2)
    return [
      [-1.45, 0.35, 0],
      [1.45, 0.35, 0],
    ];
  if (count === 3)
    return [
      [-1.65, 0.55, 0.35],
      [1.65, 0.55, 0.35],
      [0, -0.35, -0.4],
    ];
  const positions: [number, number, number][] = [];
  const radius = Math.min(2.45, 1.2 + count * 0.18);
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const tierY = (i % 2 === 0 ? 0.45 : -0.35) + Math.sin(i * 1.7) * 0.25;
    positions.push([
      Math.cos(angle) * radius,
      tierY,
      Math.sin(angle) * radius * 0.75,
    ]);
  }
  return positions;
}

export default function App() {
  // =========================================================================
  // 1. CHAMBER MOLECULES STATE (Starts with 2 H2 + 1 O2 ready to react!)
  // =========================================================================
  const [chamberMolecules, setChamberMolecules] = useState<
    ChamberMoleculeInstance[]
  >(() => {
    const pos = computeChamberPositions(3);
    return [
      {
        instanceId: 'init-H2-1',
        substanceId: 'H2',
        position: pos[0],
        rotation: [0, 0, 0],
        velocity: [0, 0, 0],
      },
      {
        instanceId: 'init-H2-2',
        substanceId: 'H2',
        position: pos[1],
        rotation: [0, 0, 0],
        velocity: [0, 0, 0],
      },
      {
        instanceId: 'init-O2-1',
        substanceId: 'O2',
        position: pos[2],
        rotation: [0, 0, 0],
        velocity: [0, 0, 0],
      },
    ];
  });

  const [preReactionSnapshot, setPreReactionSnapshot] = useState<
    ChamberMoleculeInstance[] | null
  >(null);
  const [undoStack, setUndoStack] = useState<ChamberMoleculeInstance[][]>([]);
  const [simulationState, setSimulationState] = useState<SimulationState>(
    SimulationState.READY_TO_REACT
  );

  // Simple Toggle for Science Teacher / Advanced Details
  const [showScienceDetails, setShowScienceDetails] = useState<boolean>(false);

  // Reaction Conditions (Auto-managed for kids, adjustable in Science Details)
  const [chamberTempC, setChamberTempC] = useState<number>(575);
  const [catalystActive, setCatalystActive] = useState<boolean>(true);
  const [uvLightActive, setUvLightActive] = useState<boolean>(false);

  // 3D Look & Camera Controls
  const [visualizationMode, setVisualizationMode] =
    useState<VisualizationMode>('ball-and-stick');
  const [showAtomLabels, setShowAtomLabels] = useState<boolean>(true);
  const [showBonds, setShowBonds] = useState<boolean>(true);
  const [showAngleOverlay, setShowAngleOverlay] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [cameraResetTrigger, setCameraResetTrigger] = useState<number>(0);
  const [cameraFocusTrigger] = useState<number>(0);

  // Selection & Modals
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(
    'init-O2-1'
  );
  const [selectedSubstanceId, setSelectedSubstanceId] = useState<string | null>(
    'O2'
  );
  const [selectedAtom, setSelectedAtom] = useState<SelectedAtomInfo | null>(
    null
  );
  const [inspectingSubstance, setInspectingSubstance] =
    useState<Substance | null>(null);
  const [shelfFilter, setShelfFilter] = useState<SimpleShelfFilter>('starters');
  const [shelfSearch, setShelfSearch] = useState<string>('');
  const [scienceDbQuery, setScienceDbQuery] = useState<string>('Caffeine');
  const [scienceReactionInput, setScienceReactionInput] =
    useState<string>('Al + Cl2');
  const [scienceDbLoading, setScienceDbLoading] = useState<boolean>(false);
  const [scienceDbStatus, setScienceDbStatus] = useState<string>('');
  const [periodicTableOpen, setPeriodicTableOpen] = useState<boolean>(false);
  const [activeToolsModal, setActiveToolsModal] =
    useState<ChemistryToolTab | null>(null);

  // =========================================================================
  // 2. STOICHIOMETRY & REACTION MATCHING
  // =========================================================================
  const reactantCounts = useMemo(() => {
    const sourceList =
      (simulationState === SimulationState.RESULTS ||
        simulationState === SimulationState.PRODUCT_FORMATION) &&
      preReactionSnapshot
        ? preReactionSnapshot
        : chamberMolecules;

    const counts: Record<string, number> = {};
    sourceList.forEach((m) => {
      counts[m.substanceId] = (counts[m.substanceId] || 0) + 1;
    });
    return counts;
  }, [chamberMolecules, simulationState, preReactionSnapshot]);

  const stoichiometry = useMemo(
    () => evaluateReactionStoichiometry(reactantCounts),
    [reactantCounts]
  );

  // Keep state machine updated when molecules change
  useEffect(() => {
    if (
      simulationState === SimulationState.CINEMATIC_INTRO ||
      simulationState === SimulationState.MOLECULAR_INTERACTION ||
      simulationState === SimulationState.REACTION_TRANSFORMATION ||
      simulationState === SimulationState.PRODUCT_FORMATION ||
      simulationState === SimulationState.RESULTS
    ) {
      return;
    }

    if (chamberMolecules.length === 0) {
      setSimulationState(SimulationState.IDLE);
      return;
    }

    if (!stoichiometry.matchedReaction) {
      setSimulationState(SimulationState.SELECTING_REACTANTS);
      return;
    }

    if (!stoichiometry.isRatioSatisfied) {
      setSimulationState(SimulationState.CHECKING_STOICHIOMETRY);
      return;
    }

    setSimulationState(SimulationState.READY_TO_REACT);
  }, [chamberMolecules.length, stoichiometry, simulationState]);

  // =========================================================================
  // 3. EASY ADD / REMOVE / RECIPE HANDLERS
  // =========================================================================
  const pushUndoAndSetMolecules = useCallback(
    (nextList: ChamberMoleculeInstance[]) => {
      setUndoStack((prev) => [...prev.slice(-12), chamberMolecules]);
      const positions = computeChamberPositions(nextList.length);
      const repositioned = nextList.map((item, idx) => ({
        ...item,
        position: positions[idx] || [0, 0, 0],
      }));
      setChamberMolecules(repositioned);
    },
    [chamberMolecules]
  );

  const handleAddSubstance = useCallback(
    (substanceId: string, qty = 1) => {
      soundEngine.playAddMolecule();
      const baseList =
        simulationState === SimulationState.RESULTS ? [] : chamberMolecules;

      const added: ChamberMoleculeInstance[] = Array.from({ length: qty }).map(
        (_, i) => ({
          instanceId: `mol-${substanceId}-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 6)}-${i}`,
          substanceId,
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          velocity: [0, 0, 0],
        })
      );

      const combined = [...baseList, ...added];
      const positions = computeChamberPositions(combined.length);
      const finalMols = combined.map((m, idx) => ({
        ...m,
        position: positions[idx],
      }));

      setUndoStack((prev) => [...prev.slice(-12), chamberMolecules]);
      setChamberMolecules(finalMols);
      setPreReactionSnapshot(null);
      setSelectedInstanceId(added[added.length - 1].instanceId);
      setSelectedSubstanceId(substanceId);
      setSimulationState(SimulationState.SELECTING_REACTANTS);
    },
    [chamberMolecules, simulationState]
  );

  const handleRemoveOneSubstanceInstance = useCallback(
    (substanceId: string) => {
      const idx = chamberMolecules
        .map((m) => m.substanceId)
        .lastIndexOf(substanceId);
      if (idx === -1) return;
      const next = chamberMolecules.filter((_, i) => i !== idx);
      pushUndoAndSetMolecules(next);
      setPreReactionSnapshot(null);
      setSimulationState(
        next.length === 0
          ? SimulationState.IDLE
          : SimulationState.SELECTING_REACTANTS
      );
    },
    [chamberMolecules, pushUndoAndSetMolecules]
  );

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setChamberMolecules(previous);
    setPreReactionSnapshot(null);
    setSimulationState(SimulationState.SELECTING_REACTANTS);
  }, [undoStack]);

  const handleResetChamber = useCallback(() => {
    setUndoStack((prev) => [...prev.slice(-12), chamberMolecules]);
    setChamberMolecules([]);
    setPreReactionSnapshot(null);
    setSelectedInstanceId(null);
    setSelectedSubstanceId(null);
    setSelectedAtom(null);
    setSimulationState(SimulationState.IDLE);
  }, [chamberMolecules]);

  const handleLoadReactionPreset = useCallback((reactionId: string) => {
    if (reactionId === 'rxn-water-excess') {
      const pos = computeChamberPositions(4);
      const mols: ChamberMoleculeInstance[] = [
        {
          instanceId: 'ex-H2-1',
          substanceId: 'H2',
          position: pos[0],
          rotation: [0, 0, 0],
          velocity: [0, 0, 0],
        },
        {
          instanceId: 'ex-H2-2',
          substanceId: 'H2',
          position: pos[1],
          rotation: [0, 0, 0],
          velocity: [0, 0, 0],
        },
        {
          instanceId: 'ex-H2-3',
          substanceId: 'H2',
          position: pos[2],
          rotation: [0, 0, 0],
          velocity: [0, 0, 0],
        },
        {
          instanceId: 'ex-O2-1',
          substanceId: 'O2',
          position: pos[3],
          rotation: [0, 0, 0],
          velocity: [0, 0, 0],
        },
      ];
      setChamberMolecules(mols);
      setPreReactionSnapshot(null);
      setChamberTempC(575);
      setCatalystActive(true);
      setUvLightActive(false);
      setSelectedInstanceId(mols[0].instanceId);
      setSelectedSubstanceId('H2');
      setSimulationState(SimulationState.READY_TO_REACT);
      soundEngine.playAddMolecule();
      return;
    }

    const rxn = REACTIONS.find((r) => r.id === reactionId);
    if (!rxn) return;

    const newInstances: ChamberMoleculeInstance[] = [];
    rxn.reactants.forEach((term) => {
      for (let i = 0; i < term.coefficient; i++) {
        newInstances.push({
          instanceId: `preset-${term.substanceId}-${i}-${Date.now()}`,
          substanceId: term.substanceId,
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          velocity: [0, 0, 0],
        });
      }
    });

    const positions = computeChamberPositions(newInstances.length);
    const positioned = newInstances.map((m, idx) => ({
      ...m,
      position: positions[idx],
    }));

    setChamberMolecules(positioned);
    setPreReactionSnapshot(null);
    setChamberTempC(Math.max(25, rxn.conditions.temperatureC));
    setCatalystActive(true);
    setUvLightActive(Boolean(rxn.conditions.requiresLight));
    setSelectedInstanceId(positioned[0]?.instanceId || null);
    setSelectedSubstanceId(positioned[0]?.substanceId || null);
    setSelectedAtom(null);
    setSimulationState(SimulationState.READY_TO_REACT);
    soundEngine.playAddMolecule();
  }, []);

  // =========================================================================
  // 4. START REACTION & PRODUCT FORMATION
  // =========================================================================
  const handleStartReaction = useCallback(() => {
    const rxn = stoichiometry.matchedReaction;
    if (!rxn) {
      return;
    }

    // Automatically ensure conditions are set so 5th graders never get stuck
    setChamberTempC(Math.max(chamberTempC, rxn.conditions.temperatureC));
    setCatalystActive(true);
    if (rxn.conditions.requiresLight) {
      setUvLightActive(true);
    }

    // Enrich synthesized reactions live via Google DeepMind Science Skills (PubChem 3D SDF + ChEBI + Europe PMC)
    void enrichReactionWithScienceSkills(rxn);

    // If the student placed reactants in the chamber but needs more molecules to balance 1 full reaction event,
    // automatically top up the missing reactant molecules so ANY reaction runs with 1 click!
    let workingMolecules = [...chamberMolecules];
    if (!stoichiometry.isRatioSatisfied) {
      const currentCounts: Record<string, number> = {};
      workingMolecules.forEach((m) => {
        currentCounts[m.substanceId] = (currentCounts[m.substanceId] || 0) + 1;
      });

      rxn.reactants.forEach((term) => {
        const have = currentCounts[term.substanceId] || 0;
        const missing = Math.max(0, term.coefficient - have);
        for (let i = 0; i < missing; i++) {
          workingMolecules.push({
            instanceId: `autobuild-${term.substanceId}-${Date.now()}-${i}`,
            substanceId: term.substanceId,
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            velocity: [0, 0, 0],
          });
        }
      });

      const positions = computeChamberPositions(workingMolecules.length);
      workingMolecules = workingMolecules.map((m, idx) => ({
        ...m,
        position: positions[idx] || [0, 0, 0],
      }));
    }

    const updatedCounts: Record<string, number> = {};
    workingMolecules.forEach((m) => {
      updatedCounts[m.substanceId] = (updatedCounts[m.substanceId] || 0) + 1;
    });
    const updatedEval = evaluateReactionStoichiometry(updatedCounts);

    const neededCounts = { ...updatedEval.consumedCounts };
    const taggedReactants = workingMolecules.map((mol) => {
      const rem = neededCounts[mol.substanceId] || 0;
      if (rem > 0) {
        neededCounts[mol.substanceId] = rem - 1;
        return { ...mol, isUnreactedExcess: false };
      }
      return { ...mol, isUnreactedExcess: true };
    });

    setPreReactionSnapshot(taggedReactants);
    setChamberMolecules(taggedReactants);
    setIsPaused(false);
    setSimulationState(SimulationState.CINEMATIC_INTRO);
    soundEngine.playReactionStart();
  }, [stoichiometry, chamberTempC, chamberMolecules]);

  const handleTransformationSwapToProducts = useCallback(() => {
    if (!stoichiometry.matchedReaction) return;
    soundEngine.playTransformationChime();

    const nextObjects: ChamberMoleculeInstance[] = [];

    Object.entries(stoichiometry.producedCounts).forEach(([subId, count]) => {
      for (let i = 0; i < count; i++) {
        nextObjects.push({
          instanceId: `prod-${subId}-${i}-${Date.now()}`,
          substanceId: subId,
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          velocity: [0, 0, 0],
          isProduct: true,
        });
      }
    });

    Object.entries(stoichiometry.excessCounts).forEach(([subId, count]) => {
      for (let i = 0; i < count; i++) {
        nextObjects.push({
          instanceId: `excess-${subId}-${i}-${Date.now()}`,
          substanceId: subId,
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          velocity: [0, 0, 0],
          isProduct: false,
          isUnreactedExcess: true,
        });
      }
    });

    const positions = computeChamberPositions(nextObjects.length);
    const positioned = nextObjects.map((m, idx) => ({
      ...m,
      position: positions[idx],
    }));

    setChamberMolecules(positioned);
    if (positioned.length > 0) {
      setSelectedInstanceId(positioned[0].instanceId);
      setSelectedSubstanceId(positioned[0].substanceId);
    }
  }, [stoichiometry]);

  const handleReplayReaction = useCallback(() => {
    if (!preReactionSnapshot) return;
    setChamberMolecules(preReactionSnapshot);
    setIsPaused(false);
    setSimulationState(SimulationState.CINEMATIC_INTRO);
    soundEngine.playReactionStart();
  }, [preReactionSnapshot]);

  const handleRestoreReactants = useCallback(() => {
    if (!preReactionSnapshot) return;
    setChamberMolecules(preReactionSnapshot);
    setPreReactionSnapshot(null);
    setSimulationState(SimulationState.READY_TO_REACT);
  }, [preReactionSnapshot]);

  const handleBuildReactionFromScienceDb = useCallback(
    async (customEq?: string) => {
      const target = (customEq ?? scienceReactionInput).trim();
      if (!target) return;
      setScienceDbLoading(true);
      setScienceDbStatus(
        `Synthesizing & verifying reaction "${target}" with PubChem, ChEBI & Europe PMC...`
      );
      try {
        const built = await buildReactionFromScienceDatabaseQuery(target);
        if (built) {
          handleLoadReactionPreset(built.id);
          setScienceDbStatus(
            `✓ Loaded Reaction: ${built.balancedEquation} (${built.sourceReference})`
          );
        } else {
          setScienceDbStatus(
            `Could not parse "${target}". Try "Al + Cl2", "Ca + H2O", or "Fe + S"!`
          );
        }
      } catch {
        setScienceDbStatus(`Error building reaction. Please try again.`);
      } finally {
        setScienceDbLoading(false);
      }
    },
    [scienceReactionInput, handleLoadReactionPreset]
  );

  const handleImportFromScienceDb = useCallback(
    async (customName?: string) => {
      const target = (customName ?? scienceDbQuery).trim();
      if (!target) return;
      setScienceDbLoading(true);
      setScienceDbStatus(`Searching PubChem, ChEBI & ChEMBL for "${target}"...`);
      try {
        const imported = await importMoleculeFromScienceDatabases(target);
        if (imported) {
          handleAddSubstance(imported.id, 1);
          setScienceDbStatus(
            `✓ Added 3D ${imported.name} (${imported.displayFormula}) from ${imported.sourceReference}!`
          );
        } else {
          setScienceDbStatus(
            `Could not find "${target}". Try Aspirin, Glucose, Caffeine, Water, or Benzene!`
          );
        }
      } catch {
        setScienceDbStatus(`Error contacting Science Database. Please try again.`);
      } finally {
        setScienceDbLoading(false);
      }
    },
    [scienceDbQuery, handleAddSubstance]
  );

  // Filtered Substances for the Left Shelf
  const shelfSubstances = useMemo(() => {
    const q = shelfSearch.trim().toLowerCase();
    let list = SUBSTANCES;

    if (!q) {
      if (shelfFilter === 'starters') {
        list = STARTER_IDS.map((id) => SUBSTANCE_BY_ID[id]).filter(Boolean);
      } else if (shelfFilter === 'elements') {
        list = SUBSTANCES.filter((s) => s.category === 'Elements');
      } else if (shelfFilter === 'gases') {
        list = SUBSTANCES.filter((s) => s.standardPhase === 'g');
      } else if (shelfFilter === 'liquids') {
        list = SUBSTANCES.filter(
          (s) => s.standardPhase === 'l' || s.standardPhase === 'aq'
        );
      } else if (shelfFilter === 'solids') {
        list = SUBSTANCES.filter((s) => s.standardPhase === 's');
      }
    } else {
      list = SUBSTANCES.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.formula.toLowerCase().includes(q) ||
          s.displayFormula.toLowerCase().includes(q)
      );
    }
    return list;
  }, [shelfFilter, shelfSearch]);

  const activeSelectedSubstance = selectedSubstanceId
    ? SUBSTANCE_BY_ID[selectedSubstanceId]
    : null;
  const activeSelectedAtomElement = selectedAtom
    ? ELEMENT_BY_SYMBOL[selectedAtom.elementSymbol]
    : null;

  const isReactionAnimating =
    simulationState === SimulationState.CINEMATIC_INTRO ||
    simulationState === SimulationState.MOLECULAR_INTERACTION ||
    simulationState === SimulationState.REACTION_TRANSFORMATION ||
    simulationState === SimulationState.PRODUCT_FORMATION;

  // Friendly Step Guide Message for 5th Graders
  const friendlyGuideBanner = useMemo(() => {
    if (simulationState === SimulationState.RESULTS && stoichiometry.matchedReaction) {
      return {
        step: '🎉 Ta-Da! Reaction Complete!',
        headline: stoichiometry.matchedReaction.balancedEquation,
        subtext: stoichiometry.matchedReaction.beginnerExplanation,
        tone: 'emerald',
      };
    }
    if (isReactionAnimating && stoichiometry.matchedReaction) {
      return {
        step: '⚡ Watch Closely!',
        headline: stoichiometry.matchedReaction.balancedEquation,
        subtext:
          'The atoms are letting go of their old bonds and snapping together into brand-new molecules!',
        tone: 'cyan',
      };
    }
    if (chamberMolecules.length === 0) {
      return {
        step: 'Step 1: Put Molecules in the Chamber!',
        headline: 'Chamber is Empty',
        subtext:
          'Pick a fun recipe at the top OR click the "+ Add" buttons on the left shelf!',
        tone: 'slate',
      };
    }
    if (stoichiometry.matchedReaction && stoichiometry.isRatioSatisfied) {
      return {
        step: 'Step 2: Ready! Press the Big Green Button at the Bottom!',
        headline: stoichiometry.matchedReaction.balancedEquation,
        subtext: `You have the right mix to make ${stoichiometry.matchedReaction.products
          .map((p) => SUBSTANCES.find((s) => s.id === p.substanceId)?.name || p.displayFormula)
          .join(' and ')}!`,
        tone: 'emerald',
      };
    }
    if (stoichiometry.matchedReaction && !stoichiometry.isRatioSatisfied) {
      const needed = stoichiometry.matchedReaction.reactants
        .map((r) => `${r.coefficient} ${r.displayFormula}`)
        .join(' + ');
      return {
        step: 'Step 2: Press START REACTION (Auto-Balances Recipe!)!',
        headline: stoichiometry.matchedReaction.balancedEquation,
        subtext: `Full recipe uses ${needed} — press the big green START REACTION button below and we will auto-balance it for you!`,
        tone: 'emerald',
      };
    }
    return {
      step: 'Keep Mixing or Pick a Recipe Above!',
      headline: stoichiometry.validationMessage,
      subtext:
        'Try clicking one of the Recipe Buttons at the top (like "Make Water!") to see a reaction right away.',
      tone: 'amber',
    };
  }, [
    simulationState,
    stoichiometry,
    isReactionAnimating,
    chamberMolecules.length,
  ]);

  return (
    <div className="w-screen h-screen bg-[#0B0E17] text-slate-100 flex flex-col overflow-hidden select-none">
      {/* ================================================================= */}
      {/* TOP BAR CONTRACT: 3 ZONES (Brand | 4 Simple Links | 1 Action)     */}
      {/* ================================================================= */}
      <header className="flex items-center justify-between gap-8 px-6 py-3 bg-[#0B0E17] border-b border-slate-800 z-30 shrink-0">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#sandbox"
          onClick={(e) => {
            e.preventDefault();
            setActiveToolsModal(null);
            setPeriodicTableOpen(false);
          }}
          className="text-xl font-bold tracking-tight text-white whitespace-nowrap shrink-0"
        >
          ChemVerse
        </a>

        {/* Zone 2: 4 simple kid-friendly navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-300">
          <button
            onClick={() => setPeriodicTableOpen(true)}
            className="hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            All 118 Elements
          </button>
          <button
            onClick={() => setActiveToolsModal('learning')}
            className="hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Mini Lessons
          </button>
          <button
            onClick={() => setActiveToolsModal('decoder')}
            className="hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Formula Helper
          </button>
          <button
            onClick={() => setActiveToolsModal('explorer')}
            className="hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Reaction Book
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => handleLoadReactionPreset('rxn-water-synthesis')}
            className="px-4 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Load Water Recipe
          </button>
        </div>
      </header>

      {/* ================================================================= */}
      {/* 1-CLICK FUN RECIPE BAR (Designed so a 5th grader can click & go!) */}
      {/* ================================================================= */}
      <div className="flex items-center gap-2.5 px-5 py-2.5 bg-[#0F1626] border-b border-slate-800 z-20 shrink-0 overflow-x-auto">
        <span className="text-xs font-bold text-cyan-300 whitespace-nowrap shrink-0">
          1-Click Recipes:
        </span>
        {KID_FRIENDLY_RECIPES.map((recipe) => (
          <button
            key={recipe.id}
            onClick={() => handleLoadReactionPreset(recipe.id)}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-cyan-500/20 border border-slate-700 hover:border-cyan-400 rounded-xl text-left transition-all whitespace-nowrap shrink-0 cursor-pointer group"
          >
            <div className="text-xs font-bold text-white group-hover:text-cyan-300">
              {recipe.title}
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              {recipe.subtitle}
            </div>
          </button>
        ))}
      </div>

      {/* ================================================================= */}
      {/* MAIN 3-COLUMN WORKBENCH: ZERO OVERLAP BETWEEN SHELF, 3D & INSPECTOR */}
      {/* ================================================================= */}
      <div className="flex-1 flex w-full min-h-0 overflow-hidden">
        {/* =============================================================== */}
        {/* LEFT COLUMN: MOLECULE SHELF + ALL 118 ELEMENTS + SCIENCE DB     */}
        {/* =============================================================== */}
        <aside className="w-72 xl:w-80 bg-[#0B0E17] border-r border-slate-800 flex flex-col shrink-0 h-full overflow-hidden">
          <div className="p-3 border-b border-slate-800 space-y-2 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-white truncate">
                1. Pick Any Element / Molecule
              </h2>
              <button
                onClick={() => setPeriodicTableOpen(true)}
                className="text-xs font-bold text-cyan-300 hover:underline cursor-pointer whitespace-nowrap shrink-0"
              >
                Table Grid
              </button>
            </div>

            {/* Quick Search Box for any of the 118 Elements or Molecules */}
            <input
              type="text"
              value={shelfSearch}
              onChange={(e) => setShelfSearch(e.target.value)}
              placeholder="Search 118 elements (Au, Fe, U, H₂O)..."
              className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
            />

            {/* Simple Filter Buttons including All 118 Elements & Science DB */}
            <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              {(
                [
                  ['starters', 'Favorites'],
                  ['elements', '118 Elements'],
                  ['science-db', 'Science DB'],
                  ['gases', 'Gases'],
                  ['liquids', 'Liquids'],
                  ['solids', 'Solids'],
                ] as [SimpleShelfFilter, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => {
                    setShelfFilter(key);
                    setShelfSearch('');
                  }}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    shelfFilter === key && !shelfSearch
                      ? 'bg-cyan-400 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable List of Molecule Cards OR Live Science Database */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2 min-h-0">
            {shelfFilter === 'science-db' && !shelfSearch ? (
              <div className="space-y-3">
                {/* 1. Universal Science Skills Reaction Builder */}
                <div className="p-3 bg-slate-900 border border-emerald-500/40 rounded-xl space-y-2">
                  <div className="text-xs font-bold text-emerald-300">
                    ⚡ Any Reaction Builder (Science Skills DB)
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Type <strong>any elements or equation</strong>! We balance it and verify products with <strong>PubChem</strong>, <strong>ChEBI</strong> & <strong>Europe PMC</strong>:
                  </p>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={scienceReactionInput}
                      onChange={(e) => setScienceReactionInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleBuildReactionFromScienceDb();
                      }}
                      placeholder="e.g. Al + Cl2, Fe + S, Ca + H2O"
                      className="flex-1 min-w-0 px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                    />
                    <button
                      onClick={() => handleBuildReactionFromScienceDb()}
                      disabled={scienceDbLoading}
                      className="px-2.5 py-1.5 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Load Rxn
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {[
                      'Al + Cl2',
                      'Fe + S',
                      'Ca + H2O',
                      'Li + N2',
                      'Ti + O2',
                      'Zn + S',
                    ].map((eq) => (
                      <button
                        key={eq}
                        onClick={() => {
                          setScienceReactionInput(eq);
                          handleBuildReactionFromScienceDb(eq);
                        }}
                        className="px-2 py-1 bg-slate-950 hover:bg-emerald-500/20 border border-slate-800 hover:border-emerald-400 rounded-lg text-[11px] font-mono text-slate-200 cursor-pointer"
                      >
                        {eq}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Live 3D Molecule Importer */}
                <div className="p-3 bg-slate-900 border border-cyan-500/40 rounded-xl space-y-2.5">
                  <div className="text-xs font-bold text-cyan-300">
                    🔬 Live 3D Molecule Importer (PubChem + ChEBI)
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Type any real molecule name to fetch its 3D coordinates from <strong>PubChem</strong>, <strong>ChEBI</strong> & <strong>ChEMBL</strong>:
                  </p>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={scienceDbQuery}
                      onChange={(e) => setScienceDbQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleImportFromScienceDb();
                      }}
                      placeholder="e.g. Caffeine, Aspirin, Glucose"
                      className="flex-1 min-w-0 px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                    />
                    <button
                      onClick={() => handleImportFromScienceDb()}
                      disabled={scienceDbLoading}
                      className="px-2.5 py-1.5 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                    >
                      {scienceDbLoading ? '...' : '+ Fetch 3D'}
                    </button>
                  </div>

                  <div className="space-y-1.5 pt-0.5">
                    <div className="text-[11px] font-bold text-slate-400">
                      1-Click Live 3D Imports:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        'Caffeine',
                        'Aspirin',
                        'Glucose',
                        'Ethanol',
                        'Benzene',
                        'Acetone',
                        'Citric Acid',
                        'Dopamine',
                      ].map((molName) => (
                        <button
                          key={molName}
                          onClick={() => {
                            setScienceDbQuery(molName);
                            handleImportFromScienceDb(molName);
                          }}
                          className="px-2 py-1 bg-slate-950 hover:bg-cyan-500/20 border border-slate-800 hover:border-cyan-400 rounded-lg text-xs font-semibold text-slate-200 cursor-pointer"
                        >
                          + {molName}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {scienceDbStatus && (
                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-emerald-300 font-mono">
                    {scienceDbStatus}
                  </div>
                )}
              </div>
            ) : (
              shelfSubstances.map((sub) => {
                const countInChamber = chamberMolecules.filter(
                  (m) => m.substanceId === sub.id
                ).length;

                return (
                  <div
                    key={sub.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', sub.id);
                    }}
                    className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                      countInChamber > 0
                        ? 'bg-slate-900 border-cyan-500/60'
                        : 'bg-slate-900/75 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div
                      className="cursor-pointer flex-1 min-w-0"
                      onClick={() => setInspectingSubstance(sub)}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-mono font-bold text-cyan-300 shrink-0">
                          {sub.displayFormula}
                        </span>
                        <span className="text-xs font-bold text-white truncate">
                          {sub.name}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {sub.standardPhase === 'g'
                          ? 'Gas'
                          : sub.standardPhase === 'l'
                          ? 'Liquid'
                          : sub.standardPhase === 'aq'
                          ? 'Water Mix'
                          : 'Solid'}{' '}
                        · Click for 3D info
                      </div>
                    </div>

                    {/* Big + and - Counter Buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      {countInChamber > 0 && (
                        <>
                          <button
                            onClick={() =>
                              handleRemoveOneSubstanceInstance(sub.id)
                            }
                            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-rose-500/30 text-white flex items-center justify-center cursor-pointer"
                            title="Take 1 out"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-5 text-center font-mono text-xs font-bold text-emerald-400 tabular-nums">
                            {countInChamber}
                          </span>
                        </>
                      )}
                      <button
                        onClick={() => handleAddSubstance(sub.id, 1)}
                        className="px-2.5 h-7 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                        title="Put 1 in Chamber"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        Add
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Simple Atom Color Key */}
          <div className="p-2.5 bg-[#080B12] border-t border-slate-800 space-y-1 shrink-0">
            <div className="text-[11px] font-bold text-slate-300">
              Atom Color Guide:
            </div>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-semibold">
              <span className="text-white">⚪ H</span>
              <span className="text-red-400">🔴 O</span>
              <span className="text-zinc-400">⚫ C</span>
              <span className="text-blue-400">🔵 N</span>
              <span className="text-emerald-400">🟢 Cl</span>
              <span className="text-purple-400">🟣 Na</span>
            </div>
          </div>
        </aside>

        {/* =============================================================== */}
        {/* CENTER COLUMN: DOCKED GUIDE + 3D STAGE + DOCKED ACTION BAR      */}
        {/* =============================================================== */}
        <main className="flex-1 flex flex-col min-w-0 h-full bg-[#070A12] overflow-hidden">
          {/* Top Step-by-Step Banner (Docked cleanly above the 3D Chamber) */}
          <div className="px-4 py-2.5 bg-[#0B0E17] border-b border-slate-800 text-center shrink-0">
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5">
              <span
                className={`text-xs font-bold ${
                  friendlyGuideBanner.tone === 'emerald'
                    ? 'text-emerald-400'
                    : friendlyGuideBanner.tone === 'cyan'
                    ? 'text-cyan-300'
                    : friendlyGuideBanner.tone === 'amber'
                    ? 'text-amber-300'
                    : 'text-slate-300'
                }`}
              >
                {friendlyGuideBanner.step}
              </span>
              <span className="text-sm sm:text-base font-mono font-bold text-white">
                {friendlyGuideBanner.headline}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5 line-clamp-1">
              {friendlyGuideBanner.subtext}
            </p>
          </div>

          {/* Dedicated Unobstructed 3D WebGL Reaction Chamber */}
          <div
            className="relative flex-1 w-full min-h-0 overflow-hidden"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const droppedSubstanceId = e.dataTransfer.getData('text/plain');
              if (droppedSubstanceId && SUBSTANCE_BY_ID[droppedSubstanceId]) {
                handleAddSubstance(droppedSubstanceId, 1);
              }
            }}
          >
            <LabCanvas3D
              molecules={chamberMolecules}
              simulationState={simulationState}
              activeReaction={stoichiometry.matchedReaction}
              visualizationMode={visualizationMode}
              showAtomLabels={showAtomLabels}
              showBonds={showBonds}
              showAngleOverlay={showAngleOverlay}
              playbackSpeed={playbackSpeed}
              isPaused={isPaused}
              selectedInstanceId={selectedInstanceId}
              selectedAtom={selectedAtom}
              cameraResetTrigger={cameraResetTrigger}
              cameraFocusTrigger={cameraFocusTrigger}
              reducedQuality={false}
              onSelectMolecule={(instId, subId) => {
                setSelectedInstanceId(instId);
                setSelectedSubstanceId(subId);
              }}
              onSelectAtom={(atomInfo) => setSelectedAtom(atomInfo)}
              onPhaseChange={(nextState) => setSimulationState(nextState)}
              onTransformationSwapToProducts={handleTransformationSwapToProducts}
            />
          </div>

          {/* Bottom Docked Action & Camera Bar (Zero Overlap!) */}
          <div className="px-4 py-2.5 bg-[#0B0E17] border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
            {/* Big Main Action Button */}
            <div className="flex items-center gap-2">
              {simulationState === SimulationState.RESULTS ? (
                <>
                  <button
                    onClick={handleReplayReaction}
                    className="px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs sm:text-sm rounded-xl flex items-center gap-2 transition-all shadow-lg cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <RotateCcw className="w-4 h-4 stroke-[2.5]" />
                    Watch Reaction Again!
                  </button>
                  <button
                    onClick={handleRestoreReactants}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Back to Ingredients
                  </button>
                </>
              ) : (
                <button
                  onClick={handleStartReaction}
                  disabled={
                    !stoichiometry.matchedReaction ||
                    isReactionAnimating
                  }
                  className="px-5 py-2 bg-emerald-400 hover:bg-emerald-300 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-xs sm:text-sm rounded-xl flex items-center gap-2 transition-all shadow-lg cursor-pointer disabled:cursor-not-allowed whitespace-nowrap shrink-0"
                >
                  <Play className="w-4 h-4 fill-current" />
                  {isReactionAnimating
                    ? 'Reacting Now...'
                    : 'START REACTION!'}
                </button>
              )}

              {isReactionAnimating && (
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl cursor-pointer"
                  title={isPaused ? 'Play' : 'Pause'}
                >
                  {isPaused ? (
                    <Play className="w-4 h-4" />
                  ) : (
                    <Pause className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>

            {/* Simple 3D Style Switcher & Clear Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() =>
                  setVisualizationMode((m) =>
                    m === 'ball-and-stick' ? 'space-filling' : 'ball-and-stick'
                  )
                }
                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 cursor-pointer whitespace-nowrap shrink-0"
              >
                Style:{' '}
                {visualizationMode === 'ball-and-stick'
                  ? 'Balls & Sticks'
                  : 'Big Bubbles'}
              </button>

              <button
                onClick={() => setShowAtomLabels(!showAtomLabels)}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold cursor-pointer whitespace-nowrap shrink-0 ${
                  showAtomLabels
                    ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-300'
                    : 'border-slate-800 bg-slate-900 text-slate-400'
                }`}
              >
                Letters: {showAtomLabels ? 'ON' : 'OFF'}
              </button>

              <button
                onClick={() => setCameraResetTrigger((c) => c + 1)}
                className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-slate-200 hover:text-white cursor-pointer"
                title="Center Camera"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={handleResetChamber}
                className="px-2.5 py-1.5 bg-slate-900 hover:bg-rose-950/60 border border-slate-700 rounded-xl text-xs font-bold text-slate-300 hover:text-rose-300 flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                title="Empty the Chamber"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear
              </button>

              <button
                onClick={() => {
                  const next = !soundEnabled;
                  setSoundEnabled(next);
                  soundEngine.enabled = next;
                }}
                className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-slate-200 cursor-pointer"
                title={soundEnabled ? 'Sound On' : 'Sound Muted'}
              >
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-500" />
                )}
              </button>
            </div>
          </div>
        </main>

        {/* =============================================================== */}
        {/* RIGHT COLUMN: WHAT'S INSIDE & ATOM COUNTER                      */}
        {/* =============================================================== */}
        <aside className="w-72 xl:w-80 bg-[#0B0E17] border-l border-slate-800 hidden lg:flex flex-col shrink-0 h-full overflow-hidden">
          <div className="p-3 border-b border-slate-800 flex items-center justify-between shrink-0">
            <h2 className="text-sm font-bold text-white">
              2. What’s Inside?
            </h2>
            {activeSelectedSubstance && (
              <button
                onClick={() => setInspectingSubstance(activeSelectedSubstance)}
                className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-400 text-cyan-300 hover:text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Eye className="w-3.5 h-3.5" />
                Zoom In 3D
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
            {/* 1. Simple Atom Counter (Shows atoms are never lost!) */}
            {stoichiometry.atomConservation.length > 0 ? (
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">
                    Atom Counter (Before = After)
                  </span>
                  <span className="text-xs font-bold text-emerald-400">
                    ✓ Conserved
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Zero atoms disappear! They just swap partners:
                </p>
                <div className="space-y-1.5">
                  {stoichiometry.atomConservation.map((row) => (
                    <div
                      key={row.symbol}
                      className="flex items-center justify-between p-2 bg-slate-950 rounded-lg text-xs"
                    >
                      <span className="font-bold text-white">
                        {row.element} ({row.symbol})
                      </span>
                      <span className="font-mono font-bold text-cyan-300 tabular-nums">
                        {row.totalBefore} → {row.totalAfter}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 space-y-1">
                <div className="font-bold text-white">
                  Current Chamber Mix:
                </div>
                {chamberMolecules.length === 0 ? (
                  <p className="text-slate-400">
                    No molecules yet! Click "+ Add" on the left shelf.
                  </p>
                ) : (
                  <p>
                    You have {chamberMolecules.length} molecule
                    {chamberMolecules.length > 1 ? 's' : ''} floating in the
                    chamber. Press <strong>START REACTION!</strong> below to auto-balance and react!
                  </p>
                )}
              </div>
            )}

            {/* Active Reaction Provenance Badge */}
            {stoichiometry.matchedReaction && (
              <div className="p-3 bg-slate-900 border border-emerald-500/30 rounded-xl space-y-1.5">
                <div className="text-[11px] font-bold text-emerald-400">
                  Active Reaction Recipe:
                </div>
                <div className="text-xs font-mono font-bold text-white">
                  {stoichiometry.matchedReaction.balancedEquation}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {stoichiometry.matchedReaction.beginnerExplanation}
                </p>
                <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800">
                  <span className="truncate">
                    {stoichiometry.matchedReaction.sourceReference}
                  </span>
                  {stoichiometry.matchedReaction.sourceUrl && (
                    <a
                      href={stoichiometry.matchedReaction.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan-300 hover:underline shrink-0 ml-2"
                    >
                      Source ↗
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* 2. Selected Molecule Card in Kid-Friendly Words */}
            {activeSelectedSubstance && (
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5">
                <div className="text-xs font-bold text-cyan-400">
                  Selected 3D Model:
                </div>
                <div className="text-sm font-bold text-white">
                  {activeSelectedSubstance.name} (
                  {activeSelectedSubstance.displayFormula})
                </div>
                <div className="text-xs text-slate-300">
                  <span className="font-semibold text-white">3D Shape: </span>
                  {activeSelectedSubstance.molecularGeometry}
                  {activeSelectedSubstance.bondAngle
                    ? ` (${activeSelectedSubstance.bondAngle})`
                    : ''}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {activeSelectedSubstance.description}
                </p>

                {activeSelectedAtomElement && selectedAtom && (
                  <div className="p-2 bg-slate-950 border border-cyan-500/40 rounded-lg text-xs space-y-0.5">
                    <div className="font-bold text-cyan-300">
                      Clicked Atom: {activeSelectedAtomElement.name} (
                      {activeSelectedAtomElement.symbol})
                    </div>
                    <div className="text-slate-300">
                      Atomic Number #{activeSelectedAtomElement.atomicNumber} ·{' '}
                      {activeSelectedAtomElement.summary}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. Optional Science Teacher / Advanced Details Accordion */}
            <div className="pt-1">
              <button
                onClick={() => setShowScienceDetails(!showScienceDetails)}
                className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 flex items-center justify-between cursor-pointer"
              >
                <span>
                  {showScienceDetails
                    ? 'Hide Extra Science Controls'
                    : 'Show Extra Science Controls'}
                </span>
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              </button>

              {showScienceDetails && (
                <div className="mt-2 p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                      <label htmlFor="temp-slider-simple">
                        Chamber Temperature
                      </label>
                      <span className="font-mono font-bold text-cyan-300 tabular-nums">
                        {chamberTempC} °C
                      </span>
                    </div>
                    <input
                      id="temp-slider-simple"
                      type="range"
                      min={25}
                      max={900}
                      step={25}
                      value={chamberTempC}
                      onChange={(e) => setChamberTempC(Number(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCatalystActive(!catalystActive)}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border cursor-pointer ${
                        catalystActive
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      Spark: {catalystActive ? 'ON' : 'OFF'}
                    </button>
                    <button
                      onClick={() => setUvLightActive(!uvLightActive)}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border cursor-pointer ${
                        uvLightActive
                          ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      UV Light: {uvLightActive ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {stoichiometry.matchedReaction && (
                    <div className="text-xs text-slate-300 space-y-1 border-t border-slate-800 pt-2">
                      <div className="font-bold text-amber-300">
                        Safety Note:
                      </div>
                      <p>
                        {
                          stoichiometry.matchedReaction.safety
                            .handlingPrecautions
                        }
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* ================================================================= */}
      {/* MODALS: 3D CLOSE-UP, PERIODIC TABLE, CHEMISTRY HELPERS            */}
      {/* ================================================================= */}
      {inspectingSubstance && (
        <MoleculeInspectionModal
          substance={inspectingSubstance}
          onClose={() => setInspectingSubstance(null)}
          onLoadReactionPreset={(rxnId) => handleLoadReactionPreset(rxnId)}
        />
      )}

      {periodicTableOpen && (
        <PeriodicTableModal
          onClose={() => setPeriodicTableOpen(false)}
          onAddSubstanceToChamber={(subId, qty) =>
            handleAddSubstance(subId, qty)
          }
        />
      )}

      {activeToolsModal && (
        <ChemistryToolsModal
          initialTab={activeToolsModal}
          onClose={() => setActiveToolsModal(null)}
          onLoadReactionIntoSandbox={(rxnId) => handleLoadReactionPreset(rxnId)}
          onInspectSubstance={(sub) => {
            setActiveToolsModal(null);
            setInspectingSubstance(sub);
          }}
        />
      )}
    </div>
  );
}
