/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EvidenceStatus, ReactionPreset, ReactionRecord } from '../types/chemistry';

export const REACTIONS: ReactionRecord[] = [
  // =========================================================================
  // 1. HYDROGEN + OXYGEN -> WATER (PRIMARY CANONICAL DEMO)
  // =========================================================================
  {
    id: 'rxn-water-synthesis',
    name: 'Synthesis of Water from Hydrogen and Oxygen',
    balancedEquation: '2H₂(g) + O₂(g) → 2H₂O(l)',
    reactants: [
      { substanceId: 'H2', formula: 'H2', displayFormula: 'H₂', coefficient: 2, phase: 'g' },
      { substanceId: 'O2', formula: 'O2', displayFormula: 'O₂', coefficient: 1, phase: 'g' },
    ],
    products: [
      { substanceId: 'H2O', formula: 'H2O', displayFormula: 'H₂O', coefficient: 2, phase: 'l' },
    ],
    preset: ReactionPreset.SYNTHESIS,
    conditions: {
      temperatureC: 570,
      temperatureLabel: 'Thermal ignition (>570 °C), spark, or Pt catalyst',
      pressureAtm: 1.0,
      catalyst: 'Platinum (Pt) or Spark Ignition',
      activationRequired: 'Activation energy barrier must be overcome via spark, flame, or catalytic surface; mixture is kinetically stable at 25 °C without initiation.',
      requiresSparkOrHeat: true,
    },
    enthalpyKjPerMol: -571.6,
    evidenceStatus: EvidenceStatus.EXPERIMENTALLY_DOCUMENTED,
    sourceReference: 'NIST Chemistry WebBook / JANAF Thermochemical Tables (ΔH°f = -285.8 kJ/mol H₂O(l))',
    sourceUrl: 'https://webbook.nist.gov/cgi/cbook.cgi?ID=C7732185',
    beginnerExplanation:
      'Two diatomic hydrogen molecules (H₂) combine with one diatomic oxygen molecule (O₂) to form two bent water molecules (H₂O). Every atom is conserved: 4 hydrogen atoms and 2 oxygen atoms rearrange into new polar O–H bonds.',
    intermediateExplanation:
      'Breaking two H–H single bonds (2 × 436 kJ/mol) and one O=O double bond (498 kJ/mol) requires energy input, while forming four O–H covalent bonds (4 × 463 kJ/mol) releases substantially more energy, making the overall reaction strongly exothermic (ΔH° = -571.6 kJ per 2 moles of liquid H₂O).',
    advancedExplanation:
      'In the gas phase, H₂ + O₂ proceeds via a branched-chain free-radical mechanism initiated by homolytic cleavage into H•, O•, and •OH radicals. Without an ignition source or platinum catalyst to lower the activation barrier, a stoichiometric mixture can persist metastably at room temperature.',
    mechanismNotes:
      'Visual simulation illustrates stoichiometric conservation and the structural transition from linear diatomic reactants (180°) to bent sp³ water molecules (104.45°). It does not depict sub-picosecond radical chain intermediates or quantum electron density redistribution.',
    safety: {
      hazardLevel: 'Extreme',
      ghsWarnings: [
        'H220: Extremely flammable gas mixture (Oxyhydrogen / Knallgas)',
        'Rapid exothermic expansion in confined vessels',
      ],
      handlingPrecautions:
        'Educational simulation only. Stoichiometric 2:1 H₂/O₂ mixtures detonate violently upon ignition in real life.',
      educationalDisclaimer:
        'This 3D sequence is a conceptual molecular visualization and not an experimental protocol.',
    },
    visualEffectConfig: {
      flashColor: '#38BDF8',
      particleColor: '#06B6D4',
      secondaryColor: '#60A5FA',
      energyIntensity: 0.75,
      durationMs: 4200,
    },
  },

  // =========================================================================
  // 2. METHANE COMBUSTION
  // =========================================================================
  {
    id: 'rxn-methane-combustion',
    name: 'Complete Combustion of Methane',
    balancedEquation: 'CH₄(g) + 2O₂(g) → CO₂(g) + 2H₂O(g)',
    reactants: [
      { substanceId: 'CH4', formula: 'CH4', displayFormula: 'CH₄', coefficient: 1, phase: 'g' },
      { substanceId: 'O2', formula: 'O2', displayFormula: 'O₂', coefficient: 2, phase: 'g' },
    ],
    products: [
      { substanceId: 'CO2', formula: 'CO2', displayFormula: 'CO₂', coefficient: 1, phase: 'g' },
      { substanceId: 'H2O', formula: 'H2O', displayFormula: 'H₂O', coefficient: 2, phase: 'g' },
    ],
    preset: ReactionPreset.COMBUSTION,
    conditions: {
      temperatureC: 537,
      temperatureLabel: 'Ignition (>537 °C autoignition or spark) in excess O₂',
      pressureAtm: 1.0,
      activationRequired: 'Requires thermal ignition source and adequate oxygen supply to prevent incomplete combustion to CO.',
      requiresSparkOrHeat: true,
    },
    enthalpyKjPerMol: -890.4,
    evidenceStatus: EvidenceStatus.EXPERIMENTALLY_DOCUMENTED,
    sourceReference: 'NIST Chemistry WebBook / CRC Handbook of Chemistry and Physics',
    sourceUrl: 'https://pubchem.ncbi.nlm.nih.gov/compound/297',
    beginnerExplanation:
      'One tetrahedral methane molecule (CH₄) reacts with two oxygen molecules (O₂) to produce one linear carbon dioxide molecule (CO₂) and two bent water molecules (H₂O).',
    intermediateExplanation:
      'Carbon is oxidized from an oxidation state of -4 in CH₄ to +4 in CO₂, while oxygen is reduced from 0 in O₂ to -2 in both CO₂ and H₂O, releasing 890.4 kJ/mol of thermal energy.',
    advancedExplanation:
      'High-temperature hydrocarbon oxidation proceeds through methyl radical (•CH₃), formaldehyde (CH₂O), and formyl (•CHO) intermediates before complete oxidation to CO₂.',
    mechanismNotes:
      'Shows conservation of 1 C, 4 H, and 4 O atoms across tetrahedral → linear + bent geometries.',
    safety: {
      hazardLevel: 'High',
      ghsWarnings: ['H220: Extremely flammable gas', 'Asphyxiation hazard if oxygen is depleted'],
      handlingPrecautions: 'Ensure complete ventilation and flame arrestors.',
      educationalDisclaimer: 'Stylized energy visualization of hydrocarbon combustion.',
    },
    visualEffectConfig: {
      flashColor: '#F59E0B',
      particleColor: '#FB923C',
      secondaryColor: '#38BDF8',
      energyIntensity: 0.85,
      durationMs: 4400,
    },
  },

  // =========================================================================
  // 3. HABER-BOSCH AMMONIA SYNTHESIS
  // =========================================================================
  {
    id: 'rxn-ammonia-synthesis',
    name: 'Haber–Bosch Synthesis of Ammonia',
    balancedEquation: 'N₂(g) + 3H₂(g) ⇌ 2NH₃(g)',
    reactants: [
      { substanceId: 'N2', formula: 'N2', displayFormula: 'N₂', coefficient: 1, phase: 'g' },
      { substanceId: 'H2', formula: 'H2', displayFormula: 'H₂', coefficient: 3, phase: 'g' },
    ],
    products: [
      { substanceId: 'NH3', formula: 'NH3', displayFormula: 'NH₃', coefficient: 2, phase: 'g' },
    ],
    preset: ReactionPreset.SYNTHESIS,
    conditions: {
      temperatureC: 450,
      temperatureLabel: '400–500 °C at 150–250 atm over promoted Fe catalyst',
      pressureAtm: 200,
      catalyst: 'Promoted Iron (Fe₃O₄/K₂O/Al₂O₃)',
      activationRequired: 'Cleaving the 945 kJ/mol N≡N triple bond requires chemisorption onto an active catalytic metal surface at elevated temperature and pressure.',
      requiresSparkOrHeat: true,
    },
    enthalpyKjPerMol: -92.4,
    evidenceStatus: EvidenceStatus.EXPERIMENTALLY_DOCUMENTED,
    sourceReference: 'Ertl, G. (Nobel Lecture 2007) / NIST Chemistry WebBook',
    sourceUrl: 'https://pubchem.ncbi.nlm.nih.gov/compound/222',
    beginnerExplanation:
      'One nitrogen molecule (N₂) and three hydrogen molecules (H₂) combine to form two trigonal pyramidal ammonia molecules (NH₃).',
    intermediateExplanation:
      'Because four moles of gas compress into two moles of gas, high pressure favors ammonia formation by Le Chatelier’s principle, while moderate high temperature balances reaction rate against exothermic equilibrium yield.',
    advancedExplanation:
      'Surface science studies by Gerhard Ertl demonstrated that N₂ and H₂ dissociatively chemisorb onto Fe(111) catalytic sites as atomic N(ads) and H(ads), followed by stepwise hydrogenation (NH → NH₂ → NH₃) and desorption.',
    mechanismNotes:
      'Illustrates the 1:3:2 stoichiometric ratio and transition from linear diatomic gases to trigonal pyramidal NH₃.',
    safety: {
      hazardLevel: 'High',
      ghsWarnings: ['H331: Ammonia product is toxic if inhaled', 'High-pressure industrial process'],
      handlingPrecautions: 'Industrial synthesis requires high-pressure alloy reactors.',
      educationalDisclaimer: 'Conceptual molecular simulation.',
    },
    visualEffectConfig: {
      flashColor: '#3B82F6',
      particleColor: '#60A5FA',
      secondaryColor: '#A855F7',
      energyIntensity: 0.65,
      durationMs: 4200,
    },
  },

  // =========================================================================
  // 4. ACID-BASE NEUTRALIZATION (HCl + NaOH)
  // =========================================================================
  {
    id: 'rxn-acid-base-neutralization',
    name: 'Strong Acid–Strong Base Neutralization',
    balancedEquation: 'HCl(aq) + NaOH(aq) → NaCl(aq) + H₂O(l)',
    reactants: [
      { substanceId: 'HCl', formula: 'HCl', displayFormula: 'HCl', coefficient: 1, phase: 'aq' },
      { substanceId: 'NaOH', formula: 'NaOH', displayFormula: 'NaOH', coefficient: 1, phase: 'aq' },
    ],
    products: [
      { substanceId: 'NaCl', formula: 'NaCl', displayFormula: 'NaCl', coefficient: 1, phase: 'aq' },
      { substanceId: 'H2O', formula: 'H2O', displayFormula: 'H₂O', coefficient: 1, phase: 'l' },
    ],
    preset: ReactionPreset.ACID_BASE_NEUTRALIZATION,
    conditions: {
      temperatureC: 25,
      temperatureLabel: '25 °C ambient aqueous solution',
      pressureAtm: 1.0,
      solvent: 'Water (H₂O)',
      activationRequired: 'Diffusion-controlled proton transfer in aqueous solution; proceeds rapidly at room temperature.',
      requiresAqueous: true,
    },
    enthalpyKjPerMol: -57.3,
    evidenceStatus: EvidenceStatus.EXPERIMENTALLY_DOCUMENTED,
    sourceReference: 'IUPAC Compendium of Chemical Terminology / NIST Thermochemistry',
    sourceUrl: 'https://pubchem.ncbi.nlm.nih.gov/compound/5234',
    beginnerExplanation:
      'Hydrochloric acid (HCl) and sodium hydroxide (NaOH) neutralize each other to form sodium chloride (NaCl) salt and water (H₂O).',
    intermediateExplanation:
      'In aqueous solution, H⁺ (as H₃O⁺) from the acid combines with OH⁻ from the base to form covalent H₂O molecules, while Na⁺ and Cl⁻ remain as hydrated spectator ions.',
    advancedExplanation:
      'Proton transfer in water occurs via the Grotthuss structural diffusion mechanism along hydrogen-bonded chains with an enthalpy of neutralization of -57.3 kJ/mol for strong monoprotic acids and bases.',
    mechanismNotes:
      'Displays formula-unit reactants exchanging H⁺ and OH⁻ to form discrete H₂O and NaCl formula unit representations.',
    safety: {
      hazardLevel: 'Moderate',
      ghsWarnings: ['Concentrated HCl and NaOH are corrosive prior to neutralization'],
      handlingPrecautions: 'Neutralize dilute solutions slowly to manage exothermic heat release.',
      educationalDisclaimer: 'Virtual neutralization model.',
    },
    visualEffectConfig: {
      flashColor: '#10B981',
      particleColor: '#34D399',
      secondaryColor: '#38BDF8',
      energyIntensity: 0.5,
      durationMs: 3800,
    },
  },

  // =========================================================================
  // 5. PRECIPITATION OF SILVER CHLORIDE
  // =========================================================================
  {
    id: 'rxn-silver-chloride-precipitation',
    name: 'Precipitation of Silver Chloride',
    balancedEquation: 'AgNO₃(aq) + NaCl(aq) → AgCl(s)↓ + NaNO₃(aq)',
    reactants: [
      { substanceId: 'AgNO3', formula: 'AgNO3', displayFormula: 'AgNO₃', coefficient: 1, phase: 'aq' },
      { substanceId: 'NaCl', formula: 'NaCl', displayFormula: 'NaCl', coefficient: 1, phase: 'aq' },
    ],
    products: [
      { substanceId: 'AgCl', formula: 'AgCl', displayFormula: 'AgCl', coefficient: 1, phase: 's' },
      { substanceId: 'NaNO3', formula: 'NaNO3', displayFormula: 'NaNO₃', coefficient: 1, phase: 'aq' },
    ],
    preset: ReactionPreset.PRECIPITATION,
    conditions: {
      temperatureC: 25,
      temperatureLabel: '25 °C aqueous solution',
      pressureAtm: 1.0,
      solvent: 'Water (H₂O)',
      activationRequired: 'Spontaneous double-displacement precipitation upon mixing aqueous solutions.',
      requiresAqueous: true,
    },
    enthalpyKjPerMol: -65.5,
    evidenceStatus: EvidenceStatus.EXPERIMENTALLY_DOCUMENTED,
    sourceReference: 'CRC Handbook Solubility Product Constants (Ksp(AgCl) = 1.77 × 10⁻¹⁰)',
    sourceUrl: 'https://pubchem.ncbi.nlm.nih.gov/compound/24561',
    beginnerExplanation:
      'When dissolved silver nitrate (AgNO₃) and sodium chloride (NaCl) mix, silver and chloride ions lock together into insoluble white silver chloride (AgCl) solid that settles out of solution.',
    intermediateExplanation:
      'The net ionic equation is Ag⁺(aq) + Cl⁻(aq) → AgCl(s). Because the lattice enthalpy of AgCl outweighs the hydration enthalpy of the separated ions, AgCl precipitates immediately while Na⁺ and NO₃⁻ remain dissolved.',
    advancedExplanation:
      'Nucleation occurs rapidly when the ion product Q = [Ag⁺][Cl⁻] exceeds Ksp = 1.77 × 10⁻¹⁰ at 298 K, followed by Ostwald ripening into curdy microcrystals.',
    mechanismNotes:
      'Visualizes ion exchange and downward settling of the solid AgCl precipitate unit.',
    safety: {
      hazardLevel: 'Moderate',
      ghsWarnings: ['H410: Silver compounds are very toxic to aquatic organisms'],
      handlingPrecautions: 'Dispose of silver precipitates in dedicated silver recovery containers.',
      educationalDisclaimer: 'Simplified discrete formula-unit visualization of precipitation.',
    },
    visualEffectConfig: {
      flashColor: '#E2E8F0',
      particleColor: '#F8FAFC',
      secondaryColor: '#38BDF8',
      precipitateColor: '#F1F5F9',
      energyIntensity: 0.45,
      durationMs: 4000,
    },
  },

  // =========================================================================
  // 6. CATALYTIC DECOMPOSITION OF HYDROGEN PEROXIDE
  // =========================================================================
  {
    id: 'rxn-peroxide-decomposition',
    name: 'Decomposition of Hydrogen Peroxide',
    balancedEquation: '2H₂O₂(l) → 2H₂O(l) + O₂(g)',
    reactants: [
      { substanceId: 'H2O2', formula: 'H2O2', displayFormula: 'H₂O₂', coefficient: 2, phase: 'l' },
    ],
    products: [
      { substanceId: 'H2O', formula: 'H2O', displayFormula: 'H₂O', coefficient: 2, phase: 'l' },
      { substanceId: 'O2', formula: 'O2', displayFormula: 'O₂', coefficient: 1, phase: 'g' },
    ],
    preset: ReactionPreset.DECOMPOSITION,
    conditions: {
      temperatureC: 25,
      temperatureLabel: '25 °C with MnO₂, KI, or Catalase catalyst (or thermal/UV input)',
      pressureAtm: 1.0,
      catalyst: 'Manganese dioxide (MnO₂) or Catalase enzyme',
      activationRequired: 'Slow uncatalyzed disproportionation is accelerated millions-fold by transition metal oxides or biological catalase.',
    },
    enthalpyKjPerMol: -196.1,
    evidenceStatus: EvidenceStatus.EXPERIMENTALLY_DOCUMENTED,
    sourceReference: 'NIST Chemistry WebBook / PubChem CID 784',
    sourceUrl: 'https://pubchem.ncbi.nlm.nih.gov/compound/784',
    beginnerExplanation:
      'Two hydrogen peroxide molecules (H₂O₂) break apart into two stable water molecules (H₂O) and one oxygen gas molecule (O₂).',
    intermediateExplanation:
      'This is a disproportionation reaction where oxygen in the -1 oxidation state (peroxide) is simultaneously reduced to -2 in H₂O and oxidized to 0 in O₂.',
    advancedExplanation:
      'Cleavage of the weak O–O single bond (142 kJ/mol) and formation of the strong O=O double bond (498 kJ/mol) drives a large negative Gibbs free energy change (ΔG° = -233.5 kJ/mol).',
    mechanismNotes:
      'Shows two nonplanar H₂O₂ molecules cleaving their peroxide bridge and rearranging into 2 H₂O + 1 O₂.',
    safety: {
      hazardLevel: 'High',
      ghsWarnings: ['Rapid oxygen evolution and exothermic steam generation with concentrated H₂O₂'],
      handlingPrecautions: 'Use dilute solutions and vented vessels.',
      educationalDisclaimer: 'Virtual simulation only.',
    },
    visualEffectConfig: {
      flashColor: '#38BDF8',
      particleColor: '#A855F7',
      secondaryColor: '#EF4444',
      energyIntensity: 0.6,
      durationMs: 4000,
    },
  },

  // =========================================================================
  // 7. THERMAL DECOMPOSITION OF CALCIUM CARBONATE
  // =========================================================================
  {
    id: 'rxn-limestone-calcination',
    name: 'Thermal Decomposition of Calcium Carbonate (Calcination)',
    balancedEquation: 'CaCO₃(s) → CaO(s) + CO₂(g)',
    reactants: [
      { substanceId: 'CaCO3', formula: 'CaCO3', displayFormula: 'CaCO₃', coefficient: 1, phase: 's' },
    ],
    products: [
      { substanceId: 'CaO', formula: 'CaO', displayFormula: 'CaO', coefficient: 1, phase: 's' },
      { substanceId: 'CO2', formula: 'CO2', displayFormula: 'CO₂', coefficient: 1, phase: 'g' },
    ],
    preset: ReactionPreset.THERMAL_DECOMPOSITION,
    conditions: {
      temperatureC: 850,
      temperatureLabel: 'Sustained heating >840 °C at 1 atm',
      pressureAtm: 1.0,
      activationRequired: 'Strongly endothermic reaction requiring continuous thermal energy input above 840 °C.',
      requiresSparkOrHeat: true,
    },
    enthalpyKjPerMol: 178.3,
    evidenceStatus: EvidenceStatus.EXPERIMENTALLY_DOCUMENTED,
    sourceReference: 'NIST JANAF Thermochemical Tables (ΔH° = +178.3 kJ/mol)',
    sourceUrl: 'https://pubchem.ncbi.nlm.nih.gov/compound/10112',
    beginnerExplanation:
      'When heated strongly, one unit of calcium carbonate (CaCO₃) breaks down into solid calcium oxide (CaO, quicklime) and carbon dioxide gas (CO₂).',
    intermediateExplanation:
      'Unlike combustion, calcination is endothermic (ΔH° = +178.3 kJ/mol). It becomes thermodynamically spontaneous (ΔG < 0) at high temperatures because generating gaseous CO₂ increases entropy (ΔS° > 0).',
    advancedExplanation:
      'At ~848 °C, the equilibrium decomposition pressure of CO₂ reaches 1 atm, driving continuous decarbonation in ventilated kilns.',
    mechanismNotes:
      'Visualizes thermal excitation and separation of linear CO₂(g) from the CaO solid unit.',
    safety: {
      hazardLevel: 'Moderate',
      ghsWarnings: ['High-temperature process; CaO product reacts corrosively with moisture'],
      handlingPrecautions: 'Thermal protection and dry storage for quicklime.',
      educationalDisclaimer: 'Conceptual thermal decomposition model.',
    },
    visualEffectConfig: {
      flashColor: '#F97316',
      particleColor: '#F59E0B',
      secondaryColor: '#EF4444',
      energyIntensity: 0.65,
      durationMs: 4100,
    },
  },

  // =========================================================================
  // 8. SINGLE-DISPLACEMENT REDOX: ZINC + COPPER(II) SULFATE
  // =========================================================================
  {
    id: 'rxn-zinc-copper-redox',
    name: 'Redox Displacement of Copper by Zinc',
    balancedEquation: 'Zn(s) + CuSO₄(aq) → ZnSO₄(aq) + Cu(s)',
    reactants: [
      { substanceId: 'Zn', formula: 'Zn', displayFormula: 'Zn', coefficient: 1, phase: 's' },
      { substanceId: 'CuSO4', formula: 'CuSO4', displayFormula: 'CuSO₄', coefficient: 1, phase: 'aq' },
    ],
    products: [
      { substanceId: 'ZnSO4', formula: 'ZnSO4', displayFormula: 'ZnSO₄', coefficient: 1, phase: 'aq' },
      { substanceId: 'Cu', formula: 'Cu', displayFormula: 'Cu', coefficient: 1, phase: 's' },
    ],
    preset: ReactionPreset.REDOX,
    conditions: {
      temperatureC: 25,
      temperatureLabel: '25 °C aqueous electrolyte',
      pressureAtm: 1.0,
      solvent: 'Water (H₂O)',
      activationRequired: 'Spontaneous electron transfer upon contact between metallic zinc and aqueous Cu²⁺ ions (E°cell = +1.10 V).',
      requiresAqueous: true,
    },
    enthalpyKjPerMol: -218.7,
    evidenceStatus: EvidenceStatus.EXPERIMENTALLY_DOCUMENTED,
    sourceReference: 'Standard Electrode Potentials (Daniell Cell, E° = +1.10 V)',
    sourceUrl: 'https://pubchem.ncbi.nlm.nih.gov/compound/24462',
    beginnerExplanation:
      'Zinc metal (Zn) transfers two electrons to dissolved copper(II) sulfate (CuSO₄), turning the zinc into dissolved zinc sulfate (ZnSO₄) and depositing solid metallic copper (Cu).',
    intermediateExplanation:
      'Oxidation half-reaction: Zn(s) → Zn²⁺(aq) + 2e⁻ (E°ox = +0.76 V). Reduction half-reaction: Cu²⁺(aq) + 2e⁻ → Cu(s) (E°red = +0.34 V). The sulfate ion (SO₄²⁻) acts as a spectator.',
    advancedExplanation:
      'This reaction is the chemical basis of the classic Daniell galvanic cell, with standard Gibbs free energy change ΔG° = -nFE° = -212.3 kJ/mol.',
    mechanismNotes:
      'Highlights two-electron transfer between Zn⁰ and Cu²⁺ and the swap of the metallic cation partner.',
    safety: {
      hazardLevel: 'Low',
      ghsWarnings: ['H410: Copper and zinc salts are toxic to aquatic organisms'],
      handlingPrecautions: 'Collect aqueous metal salt solutions in proper waste containers.',
      educationalDisclaimer: 'Conceptual redox electron-transfer visualization.',
    },
    visualEffectConfig: {
      flashColor: '#EA580C',
      particleColor: '#38BDF8',
      secondaryColor: '#F59E0B',
      energyIntensity: 0.6,
      durationMs: 4100,
    },
  },

  // =========================================================================
  // 9. PHOTOCHEMICAL OZONE FORMATION / PHOTOLYSIS CYCLE
  // =========================================================================
  {
    id: 'rxn-photochemical-ozone',
    name: 'UV Photochemical Conversion of Dioxygen to Ozone',
    balancedEquation: '3O₂(g) → 2O₃(g) (under UV-C hν)',
    reactants: [
      { substanceId: 'O2', formula: 'O2', displayFormula: 'O₂', coefficient: 3, phase: 'g' },
    ],
    products: [
      { substanceId: 'O3', formula: 'O3', displayFormula: 'O₃', coefficient: 2, phase: 'g' },
    ],
    preset: ReactionPreset.PHOTOCHEMICAL,
    conditions: {
      temperatureC: 25,
      temperatureLabel: 'Ultraviolet light (λ < 242 nm) or corona discharge',
      pressureAtm: 1.0,
      lightExposure: true,
      activationRequired: 'Requires high-energy UV photons (λ < 242 nm) to photodissociate O₂ into atomic oxygen radicals.',
      requiresLight: true,
    },
    enthalpyKjPerMol: 285.4,
    evidenceStatus: EvidenceStatus.EXPERIMENTALLY_DOCUMENTED,
    sourceReference: 'Chapman Stratospheric Ozone Cycle (Chapman, S. 1930) / NASA JPL Chemical Kinetics',
    sourceUrl: 'https://pubchem.ncbi.nlm.nih.gov/compound/24823',
    beginnerExplanation:
      'Absorbing ultraviolet light energy causes three oxygen molecules (O₂) to reorganize into two bent ozone molecules (O₃).',
    intermediateExplanation:
      'In the Chapman cycle, UV-C photons split O₂ into two oxygen atoms (O₂ + hν → 2O•), and each oxygen atom rapidly combines with another O₂ molecule (O• + O₂ + M → O₃ + M) to form ozone.',
    advancedExplanation:
      'Endothermic overall (ΔH° = +142.7 kJ per mole of O₃ formed); driven far from thermal equilibrium by solar actinic flux in the stratosphere.',
    mechanismNotes:
      'Visualizes UV photon input converting 3 linear O₂ molecules into 2 bent O₃ molecules.',
    safety: {
      hazardLevel: 'High',
      ghsWarnings: ['H330: Ozone is a potent respiratory toxin at ground level', 'UV-C radiation hazard'],
      handlingPrecautions: 'Never view UV-C sources directly; vent corona discharge ozonators.',
      educationalDisclaimer: 'Stratospheric photochemical education model.',
    },
    visualEffectConfig: {
      flashColor: '#A855F7',
      particleColor: '#C084FC',
      secondaryColor: '#38BDF8',
      energyIntensity: 0.7,
      durationMs: 4200,
    },
  },

  // =========================================================================
  // 10. SYNTHESIS OF SODIUM CHLORIDE
  // =========================================================================
  {
    id: 'rxn-sodium-chlorine-synthesis',
    name: 'Direct Synthesis of Sodium Chloride',
    balancedEquation: '2Na(s) + Cl₂(g) → 2NaCl(s)',
    reactants: [
      { substanceId: 'Na', formula: 'Na', displayFormula: 'Na', coefficient: 2, phase: 's' },
      { substanceId: 'Cl2', formula: 'Cl2', displayFormula: 'Cl₂', coefficient: 1, phase: 'g' },
    ],
    products: [
      { substanceId: 'NaCl', formula: 'NaCl', displayFormula: 'NaCl', coefficient: 2, phase: 's' },
    ],
    preset: ReactionPreset.REDOX,
    conditions: {
      temperatureC: 150,
      temperatureLabel: 'Thermal initiation or trace moisture catalyst',
      pressureAtm: 1.0,
      activationRequired: 'Initiated by warming sodium or introducing a trace drop of water; strongly exothermic redox electron transfer.',
      requiresSparkOrHeat: true,
    },
    enthalpyKjPerMol: -822.4,
    evidenceStatus: EvidenceStatus.EXPERIMENTALLY_DOCUMENTED,
    sourceReference: 'NIST Chemistry WebBook (ΔH°f(NaCl, s) = -411.2 kJ/mol)',
    sourceUrl: 'https://pubchem.ncbi.nlm.nih.gov/compound/5234',
    beginnerExplanation:
      'Two reactive sodium metal atoms (Na) and one toxic chlorine gas molecule (Cl₂) react to form two units of harmless crystalline sodium chloride (NaCl, table salt).',
    intermediateExplanation:
      'Each sodium atom transfers its 3s¹ valence electron to chlorine, oxidizing Na⁰ to Na⁺ and reducing Cl₂⁰ to two Cl⁻ ions, releasing intense yellow-orange sodium D-line light.',
    advancedExplanation:
      'Driven by the massive Born–Haber lattice enthalpy of crystalline NaCl (-787 kJ/mol), which easily compensates for the ionization energy of Na and bond dissociation of Cl₂.',
    mechanismNotes:
      'Illustrates how chemical properties depend on bonding and electronic structure rather than elemental identity alone.',
    safety: {
      hazardLevel: 'Extreme',
      ghsWarnings: ['Uses reactive alkali metal and toxic chlorine gas; violently exothermic'],
      handlingPrecautions: 'Demonstration restricted to fume hood containment.',
      educationalDisclaimer: 'Virtual simulation only.',
    },
    visualEffectConfig: {
      flashColor: '#FACC15',
      particleColor: '#F59E0B',
      secondaryColor: '#10B981',
      energyIntensity: 0.85,
      durationMs: 4200,
    },
  },

  // =========================================================================
  // 11. GAS-PHASE ACID-BASE SYNTHESIS OF AMMONIUM CHLORIDE
  // =========================================================================
  {
    id: 'rxn-ammonium-chloride-smoke',
    name: 'Synthesis of Ammonium Chloride from Ammonia and Hydrogen Chloride',
    balancedEquation: 'NH₃(g) + HCl(g) → NH₄Cl(s)',
    reactants: [
      { substanceId: 'NH3', formula: 'NH3', displayFormula: 'NH₃', coefficient: 1, phase: 'g' },
      { substanceId: 'HCl', formula: 'HCl', displayFormula: 'HCl', coefficient: 1, phase: 'g' },
    ],
    products: [
      { substanceId: 'NH4Cl', formula: 'NH4Cl', displayFormula: 'NH₄Cl', coefficient: 1, phase: 's' },
    ],
    preset: ReactionPreset.ACID_BASE_NEUTRALIZATION,
    conditions: {
      temperatureC: 25,
      temperatureLabel: '25 °C ambient gas contact',
      pressureAtm: 1.0,
      activationRequired: 'Spontaneous gas-phase Brønsted-Lowry proton transfer at room temperature.',
    },
    enthalpyKjPerMol: -176.0,
    evidenceStatus: EvidenceStatus.EXPERIMENTALLY_DOCUMENTED,
    sourceReference: 'NIST Chemistry WebBook / Graham’s Law Diffusion Classic Experiment',
    sourceUrl: 'https://pubchem.ncbi.nlm.nih.gov/compound/25517',
    beginnerExplanation:
      'One ammonia molecule (NH₃) and one hydrogen chloride molecule (HCl) combine directly in the gas phase to form solid ammonium chloride (NH₄Cl).',
    intermediateExplanation:
      'Nitrogen’s lone pair on NH₃ accepts a proton (H⁺) from HCl to form a tetrahedral ammonium cation (NH₄⁺) paired electrostatically with a chloride anion (Cl⁻).',
    advancedExplanation:
      'Despite negative entropy change (two gases forming a solid, ΔS° = -284.8 J/(mol·K)), the large negative enthalpy (ΔH° = -176.0 kJ/mol) makes ΔG° = -91.1 kJ/mol spontaneous at 298 K.',
    mechanismNotes:
      'Shows direct proton transfer and formation of the NH₄⁺ Cl⁻ ion pair.',
    safety: {
      hazardLevel: 'Moderate',
      ghsWarnings: ['Reactant vapors (NH₃ and HCl) are corrosive respiratory irritants'],
      handlingPrecautions: 'Perform in a well-ventilated fume hood.',
      educationalDisclaimer: 'Virtual simulation only.',
    },
    visualEffectConfig: {
      flashColor: '#F8FAFC',
      particleColor: '#CBD5E1',
      secondaryColor: '#3B82F6',
      energyIntensity: 0.5,
      durationMs: 3800,
    },
  },

  // =========================================================================
  // 12. CATALYTIC HYDROGENATION OF ETHENE TO ETHANE
  // =========================================================================
  {
    id: 'rxn-ethene-hydrogenation',
    name: 'Catalytic Hydrogenation of Ethene to Ethane',
    balancedEquation: 'C₂H₄(g) + H₂(g) → C₂H₆(g)',
    reactants: [
      { substanceId: 'C2H4', formula: 'C2H4', displayFormula: 'C₂H₄', coefficient: 1, phase: 'g' },
      { substanceId: 'H2', formula: 'H2', displayFormula: 'H₂', coefficient: 1, phase: 'g' },
    ],
    products: [
      { substanceId: 'C2H6', formula: 'C2H6', displayFormula: 'C₂H₆', coefficient: 1, phase: 'g' },
    ],
    preset: ReactionPreset.SYNTHESIS,
    conditions: {
      temperatureC: 150,
      temperatureLabel: '25–150 °C over Pt, Pd, or Ni catalyst',
      pressureAtm: 1.0,
      catalyst: 'Platinum (Pt), Palladium (Pd/C), or Nickel (Ni)',
      activationRequired: 'Requires heterogeneous transition-metal catalyst for syn-addition of H₂ across the C=C pi bond.',
    },
    enthalpyKjPerMol: -136.3,
    evidenceStatus: EvidenceStatus.EXPERIMENTALLY_DOCUMENTED,
    sourceReference: 'NIST Chemistry WebBook (Heat of hydrogenation of ethene = -136.3 kJ/mol)',
    sourceUrl: 'https://pubchem.ncbi.nlm.nih.gov/compound/6324',
    beginnerExplanation:
      'Planar ethene (C₂H₄) adds one hydrogen molecule (H₂) across its carbon–carbon double bond to become 3D staggered ethane (C₂H₆).',
    intermediateExplanation:
      'The carbon atoms rehybridize from trigonal planar sp² (120° bond angles) in ethene to tetrahedral sp³ (109.5° bond angles) in ethane as the C=C double bond converts into a C–C single bond plus two new C–H sigma bonds.',
    advancedExplanation:
      'Proceeds via the Horiuti–Polanyi mechanism on metal surfaces: H₂ dissociates into surface hydrides, ethene coordinates via its π-orbital, and sequential migratory insertion yields ethane.',
    mechanismNotes:
      'Demonstrates sp² planar to sp³ tetrahedral geometry transformation.',
    safety: {
      hazardLevel: 'High',
      ghsWarnings: ['Both reactants and product are extremely flammable gases'],
      handlingPrecautions: 'Purge catalytic reactors with inert nitrogen before introducing H₂.',
      educationalDisclaimer: 'Verified structural geometry transformation.',
    },
    visualEffectConfig: {
      flashColor: '#06B6D4',
      particleColor: '#38BDF8',
      secondaryColor: '#10B981',
      energyIntensity: 0.55,
      durationMs: 3900,
    },
  },

  // =========================================================================
  // 13. MAGNESIUM COMBUSTION IN OXYGEN
  // =========================================================================
  {
    id: 'rxn-magnesium-oxidation',
    name: 'Combustion of Magnesium in Oxygen',
    balancedEquation: '2Mg(s) + O₂(g) → 2MgO(s)',
    reactants: [
      { substanceId: 'Mg', formula: 'Mg', displayFormula: 'Mg', coefficient: 2, phase: 's' },
      { substanceId: 'O2', formula: 'O2', displayFormula: 'O₂', coefficient: 1, phase: 'g' },
    ],
    products: [
      { substanceId: 'MgO', formula: 'MgO', displayFormula: 'MgO', coefficient: 2, phase: 's' },
    ],
    preset: ReactionPreset.COMBUSTION,
    conditions: {
      temperatureC: 650,
      temperatureLabel: 'Thermal ignition (>630 °C)',
      pressureAtm: 1.0,
      activationRequired: 'Requires heating magnesium to its ignition temperature.',
      requiresSparkOrHeat: true,
    },
    enthalpyKjPerMol: -1203.2,
    evidenceStatus: EvidenceStatus.EXPERIMENTALLY_DOCUMENTED,
    sourceReference: 'NIST Chemistry WebBook (ΔH°f(MgO, s) = -601.6 kJ/mol)',
    sourceUrl: 'https://pubchem.ncbi.nlm.nih.gov/compound/14792',
    beginnerExplanation:
      'Two magnesium atoms (Mg) react with one oxygen molecule (O₂) to form two units of white magnesium oxide (MgO).',
    intermediateExplanation:
      'Magnesium is oxidized from 0 to +2 and oxygen is reduced from 0 to -2, releasing over 1200 kJ per mole of O₂ consumed.',
    advancedExplanation:
      'The high lattice energy of divalent Mg²⁺O²⁻ (~3795 kJ/mol) drives the extraordinarily exothermic oxidation.',
    mechanismNotes:
      'Uses a restrained, accessible glow effect rather than harsh blinding flashes.',
    safety: {
      hazardLevel: 'High',
      ghsWarnings: ['Real magnesium combustion emits intense ultraviolet light; never stare at burning Mg'],
      handlingPrecautions: 'Use welding shade protection in physical laboratories; never use water on metal fires.',
      educationalDisclaimer: 'Restrained visual effect designed for comfortable screen viewing.',
    },
    visualEffectConfig: {
      flashColor: '#E2E8F0',
      particleColor: '#38BDF8',
      secondaryColor: '#F8FAFC',
      energyIntensity: 0.75,
      durationMs: 4000,
    },
  },

  // =========================================================================
  // 14. CONTACT PROCESS: SULFUR DIOXIDE OXIDATION TO SULFUR TRIOXIDE
  // =========================================================================
  {
    id: 'rxn-contact-process-so3',
    name: 'Catalytic Oxidation of Sulfur Dioxide to Sulfur Trioxide',
    balancedEquation: '2SO₂(g) + O₂(g) ⇌ 2SO₃(g)',
    reactants: [
      { substanceId: 'SO2', formula: 'SO2', displayFormula: 'SO₂', coefficient: 2, phase: 'g' },
      { substanceId: 'O2', formula: 'O2', displayFormula: 'O₂', coefficient: 1, phase: 'g' },
    ],
    products: [
      { substanceId: 'SO3', formula: 'SO3', displayFormula: 'SO₃', coefficient: 2, phase: 'g' },
    ],
    preset: ReactionPreset.SYNTHESIS,
    conditions: {
      temperatureC: 450,
      temperatureLabel: '450 °C at 1–2 atm over V₂O₅ catalyst',
      pressureAtm: 1.5,
      catalyst: 'Vanadium(V) oxide (V₂O₅)',
      activationRequired: 'Requires V₂O₅ redox catalyst at 400–450 °C for rapid conversion.',
      requiresSparkOrHeat: true,
    },
    enthalpyKjPerMol: -197.8,
    evidenceStatus: EvidenceStatus.EXPERIMENTALLY_DOCUMENTED,
    sourceReference: 'NIST Chemistry WebBook / Industrial Contact Process Reference',
    sourceUrl: 'https://pubchem.ncbi.nlm.nih.gov/compound/24682',
    beginnerExplanation:
      'Two bent sulfur dioxide molecules (SO₂) react with one oxygen molecule (O₂) to form two trigonal planar sulfur trioxide molecules (SO₃).',
    intermediateExplanation:
      'Sulfur is oxidized from +4 in SO₂ to its maximum +6 oxidation state in SO₃, expanding its coordination from two double-bonded oxygens (bent, 119°) to three double-bonded oxygens (trigonal planar, 120°).',
    advancedExplanation:
      'Vanadium(V) oxide oxidizes SO₂ to SO₃ while being reduced to V(IV), which is subsequently re-oxidized by O₂ in a Mars–van Krevelen catalytic cycle.',
    mechanismNotes:
      'Shows bent SO₂ (119°) transforming into trigonal planar SO₃ (120°).',
    safety: {
      hazardLevel: 'Extreme',
      ghsWarnings: ['Both SO₂ and SO₃ are toxic, corrosive acid-anhydride gases'],
      handlingPrecautions: 'Closed industrial catalytic converter vessels only.',
      educationalDisclaimer: 'Verified gas-phase molecular geometries.',
    },
    visualEffectConfig: {
      flashColor: '#EAB308',
      particleColor: '#F59E0B',
      secondaryColor: '#EF4444',
      energyIntensity: 0.65,
      durationMs: 4100,
    },
  },

  // =========================================================================
  // 15. HYDRATION OF SULFUR TRIOXIDE TO SULFURIC ACID
  // =========================================================================
  {
    id: 'rxn-sulfuric-acid-hydration',
    name: 'Synthesis of Sulfuric Acid from Sulfur Trioxide and Water',
    balancedEquation: 'SO₃(g) + H₂O(l) → H₂SO₄(l)',
    reactants: [
      { substanceId: 'SO3', formula: 'SO3', displayFormula: 'SO₃', coefficient: 1, phase: 'g' },
      { substanceId: 'H2O', formula: 'H2O', displayFormula: 'H₂O', coefficient: 1, phase: 'l' },
    ],
    products: [
      { substanceId: 'H2SO4', formula: 'H2SO4', displayFormula: 'H₂SO₄', coefficient: 1, phase: 'l' },
    ],
    preset: ReactionPreset.SYNTHESIS,
    conditions: {
      temperatureC: 80,
      temperatureLabel: 'Controlled absorption (industrial oleum route)',
      pressureAtm: 1.0,
      activationRequired: 'Spontaneous, strongly exothermic nucleophilic attack of H₂O oxygen onto the electrophilic sulfur center of SO₃.',
    },
    enthalpyKjPerMol: -132.5,
    evidenceStatus: EvidenceStatus.EXPERIMENTALLY_DOCUMENTED,
    sourceReference: 'NIST Chemistry WebBook',
    sourceUrl: 'https://pubchem.ncbi.nlm.nih.gov/compound/1118',
    beginnerExplanation:
      'One trigonal planar sulfur trioxide molecule (SO₃) combines with one bent water molecule (H₂O) to form one tetrahedral sulfuric acid molecule (H₂SO₄).',
    intermediateExplanation:
      'No oxidation states change (S remains +6); this is a Lewis acid–base adduct rearrangement where SO₃ acts as a potent electrophile and H₂O as a nucleophile.',
    advancedExplanation:
      'In industrial practice, direct reaction of SO₃ gas with liquid water is so exothermic that it creates a corrosive acid mist; instead, SO₃ is absorbed into 98% H₂SO₄ to form pyrosulfuric acid (H₂S₂O₇, oleum), which is then safely diluted.',
    mechanismNotes:
      'Shows 1 S, 4 O, and 2 H atoms uniting into tetrahedral H₂SO₄.',
    safety: {
      hazardLevel: 'Extreme',
      ghsWarnings: ['EUH014: Reacts violently with water', 'H314: Causes severe skin burns and eye damage'],
      handlingPrecautions: 'Never mix SO₃ directly with bulk water in an open vessel.',
      educationalDisclaimer: 'Molecular-level stoichiometry simulation.',
    },
    visualEffectConfig: {
      flashColor: '#F59E0B',
      particleColor: '#EAB308',
      secondaryColor: '#38BDF8',
      energyIntensity: 0.7,
      durationMs: 4000,
    },
  },

  // =========================================================================
  // 16. COMBUSTION OF CARBON TO CARBON DIOXIDE
  // =========================================================================
  {
    id: 'rxn-carbon-combustion',
    name: 'Combustion of Carbon in Oxygen',
    balancedEquation: 'C(s) + O₂(g) → CO₂(g)',
    reactants: [
      { substanceId: 'C', formula: 'C', displayFormula: 'C', coefficient: 1, phase: 's' },
      { substanceId: 'O2', formula: 'O2', displayFormula: 'O₂', coefficient: 1, phase: 'g' },
    ],
    products: [
      { substanceId: 'CO2', formula: 'CO2', displayFormula: 'CO₂', coefficient: 1, phase: 'g' },
    ],
    preset: ReactionPreset.COMBUSTION,
    conditions: {
      temperatureC: 700,
      temperatureLabel: 'Thermal ignition (>700 °C in excess O₂)',
      pressureAtm: 1.0,
      activationRequired: 'Requires thermal ignition to initiate oxidation of solid carbon.',
      requiresSparkOrHeat: true,
    },
    enthalpyKjPerMol: -393.5,
    evidenceStatus: EvidenceStatus.EXPERIMENTALLY_DOCUMENTED,
    sourceReference: 'NIST Chemistry WebBook (ΔH°f(CO₂, g) = -393.5 kJ/mol)',
    sourceUrl: 'https://pubchem.ncbi.nlm.nih.gov/compound/280',
    beginnerExplanation:
      'One carbon atom unit (C) combines with one diatomic oxygen molecule (O₂) to form one linear carbon dioxide molecule (CO₂).',
    intermediateExplanation:
      'Defines the standard enthalpy of formation of carbon dioxide (ΔH°f = -393.5 kJ/mol), forming two strong C=O double bonds (~799 kJ/mol each).',
    advancedExplanation:
      'Heterogeneous gas–solid oxidation at the graphite surface produces surface carbonyl/lactone complexes that desorb as CO and oxidize further to CO₂ in excess oxygen.',
    mechanismNotes:
      'Shows 1 C and 1 O₂ forming linear O=C=O.',
    safety: {
      hazardLevel: 'Moderate',
      ghsWarnings: ['Oxygen-depleted atmospheres produce toxic carbon monoxide (CO)'],
      handlingPrecautions: 'Ensure adequate oxygen ventilation.',
      educationalDisclaimer: 'Verified stoichiometric transformation.',
    },
    visualEffectConfig: {
      flashColor: '#F97316',
      particleColor: '#F59E0B',
      secondaryColor: '#EF4444',
      energyIntensity: 0.7,
      durationMs: 3900,
    },
  },

  // =========================================================================
  // 17. COMBUSTION OF SULFUR TO SULFUR DIOXIDE
  // =========================================================================
  {
    id: 'rxn-sulfur-combustion',
    name: 'Oxidation of Sulfur to Sulfur Dioxide',
    balancedEquation: 'S(s) + O₂(g) → SO₂(g)',
    reactants: [
      { substanceId: 'S', formula: 'S', displayFormula: 'S', coefficient: 1, phase: 's' },
      { substanceId: 'O2', formula: 'O2', displayFormula: 'O₂', coefficient: 1, phase: 'g' },
    ],
    products: [
      { substanceId: 'SO2', formula: 'SO2', displayFormula: 'SO₂', coefficient: 1, phase: 'g' },
    ],
    preset: ReactionPreset.COMBUSTION,
    conditions: {
      temperatureC: 250,
      temperatureLabel: 'Thermal ignition (>232 °C)',
      pressureAtm: 1.0,
      activationRequired: 'Sulfur melts and ignites in oxygen with a characteristic blue flame.',
      requiresSparkOrHeat: true,
    },
    enthalpyKjPerMol: -296.8,
    evidenceStatus: EvidenceStatus.EXPERIMENTALLY_DOCUMENTED,
    sourceReference: 'NIST Chemistry WebBook (ΔH°f(SO₂, g) = -296.8 kJ/mol)',
    sourceUrl: 'https://pubchem.ncbi.nlm.nih.gov/compound/1119',
    beginnerExplanation:
      'One sulfur atom unit (S) reacts with one oxygen molecule (O₂) to form one bent sulfur dioxide molecule (SO₂).',
    intermediateExplanation:
      'Sulfur is oxidized from 0 to +4, forming a bent triatomic molecule with a 119° bond angle and characteristic blue chemiluminescence.',
    advancedExplanation:
      'First step of the industrial Contact Process for sulfuric acid production.',
    mechanismNotes:
      'Illustrates formation of bent SO₂ with characteristic blue glow.',
    safety: {
      hazardLevel: 'High',
      ghsWarnings: ['H331: Produces toxic and irritating SO₂ gas'],
      handlingPrecautions: 'Must be performed inside a fume hood.',
      educationalDisclaimer: 'Virtual simulation only.',
    },
    visualEffectConfig: {
      flashColor: '#3B82F6',
      particleColor: '#60A5FA',
      secondaryColor: '#EAB308',
      energyIntensity: 0.65,
      durationMs: 3900,
    },
  },

  // =========================================================================
  // 18. OXIDATION OF IRON TO IRON(III) OXIDE (RUSTING)
  // =========================================================================
  {
    id: 'rxn-iron-oxidation',
    name: 'Oxidation of Iron to Iron(III) Oxide (Rust)',
    balancedEquation: '4Fe(s) + 3O₂(g) → 2Fe₂O₃(s)',
    reactants: [
      { substanceId: 'Fe', formula: 'Fe', displayFormula: 'Fe', coefficient: 4, phase: 's' },
      { substanceId: 'O2', formula: 'O2', displayFormula: 'O₂', coefficient: 3, phase: 'g' },
    ],
    products: [
      { substanceId: 'Fe2O3', formula: 'Fe2O3', displayFormula: 'Fe₂O₃', coefficient: 2, phase: 's' },
    ],
    preset: ReactionPreset.REDOX,
    conditions: {
      temperatureC: 25,
      temperatureLabel: 'Ambient moisture or thermal oxidation',
      pressureAtm: 1.0,
      activationRequired: 'Proceeds slowly at room temperature in moist air, or rapidly when fine iron wool is heated.',
    },
    enthalpyKjPerMol: -1648.4,
    evidenceStatus: EvidenceStatus.EXPERIMENTALLY_DOCUMENTED,
    sourceReference: 'NIST Chemistry WebBook (ΔH°f(Fe₂O₃) = -824.2 kJ/mol)',
    sourceUrl: 'https://pubchem.ncbi.nlm.nih.gov/compound/518696',
    beginnerExplanation:
      'Four iron atoms (Fe) combine with three oxygen molecules (O₂) to form two units of reddish-brown iron(III) oxide (Fe₂O₃, rust)!',
    intermediateExplanation:
      'Iron is oxidized from 0 to +3 while oxygen is reduced from 0 to -2.',
    advancedExplanation:
      'Thermodynamically favored oxidation driven by the high stability of the corundum-type α-Fe₂O₃ crystal lattice.',
    mechanismNotes: 'Shows 4 Fe + 3 O₂ rearranging into 2 Fe₂O₃ units.',
    safety: {
      hazardLevel: 'Low',
      ghsWarnings: ['Fine iron powder is flammable when heated'],
      handlingPrecautions: 'Standard laboratory eyewear.',
      educationalDisclaimer: 'Virtual simulation only.',
    },
    visualEffectConfig: {
      flashColor: '#F97316',
      particleColor: '#D97706',
      secondaryColor: '#EF4444',
      energyIntensity: 0.7,
      durationMs: 4000,
    },
  },

  // =========================================================================
  // 19. SYNTHESIS OF POTASSIUM CHLORIDE
  // =========================================================================
  {
    id: 'rxn-potassium-chlorine',
    name: 'Synthesis of Potassium Chloride',
    balancedEquation: '2K(s) + Cl₂(g) → 2KCl(s)',
    reactants: [
      { substanceId: 'K', formula: 'K', displayFormula: 'K', coefficient: 2, phase: 's' },
      { substanceId: 'Cl2', formula: 'Cl2', displayFormula: 'Cl₂', coefficient: 1, phase: 'g' },
    ],
    products: [
      { substanceId: 'KCl', formula: 'KCl', displayFormula: 'KCl', coefficient: 2, phase: 's' },
    ],
    preset: ReactionPreset.REDOX,
    conditions: {
      temperatureC: 25,
      temperatureLabel: 'Direct contact',
      pressureAtm: 1.0,
      activationRequired: 'Spontaneous, vigorous electron transfer from alkali metal K to Cl₂.',
    },
    enthalpyKjPerMol: -873.0,
    evidenceStatus: EvidenceStatus.EXPERIMENTALLY_DOCUMENTED,
    sourceReference: 'NIST Chemistry WebBook',
    sourceUrl: 'https://pubchem.ncbi.nlm.nih.gov/compound/4873',
    beginnerExplanation:
      'Two potassium atoms (K) and one chlorine molecule (Cl₂) combine to form two units of potassium chloride salt (KCl).',
    intermediateExplanation:
      'Potassium donates its 4s¹ valence electron to chlorine, forming K⁺ and Cl⁻ ions with a lilac flame.',
    advancedExplanation:
      'Exothermic alkali-halogen salt formation (ΔH°f = -436.5 kJ/mol KCl).',
    mechanismNotes: 'Shows 2 K + 1 Cl₂ forming 2 KCl.',
    safety: {
      hazardLevel: 'Extreme',
      ghsWarnings: ['Violently exothermic alkali metal + halogen reaction'],
      handlingPrecautions: 'Virtual demonstration only.',
      educationalDisclaimer: 'Virtual simulation only.',
    },
    visualEffectConfig: {
      flashColor: '#A855F7',
      particleColor: '#C084FC',
      secondaryColor: '#10B981',
      energyIntensity: 0.8,
      durationMs: 4000,
    },
  },

  // =========================================================================
  // 20. SYNTHESIS OF LITHIUM OXIDE
  // =========================================================================
  {
    id: 'rxn-lithium-oxidation',
    name: 'Synthesis of Lithium Oxide',
    balancedEquation: '4Li(s) + O₂(g) → 2Li₂O(s)',
    reactants: [
      { substanceId: 'Li', formula: 'Li', displayFormula: 'Li', coefficient: 4, phase: 's' },
      { substanceId: 'O2', formula: 'O2', displayFormula: 'O₂', coefficient: 1, phase: 'g' },
    ],
    products: [
      { substanceId: 'Li2O', formula: 'Li2O', displayFormula: 'Li₂O', coefficient: 2, phase: 's' },
    ],
    preset: ReactionPreset.COMBUSTION,
    conditions: {
      temperatureC: 200,
      temperatureLabel: 'Thermal ignition (>180 °C)',
      pressureAtm: 1.0,
      activationRequired: 'Lithium burns with a bright crimson flame when heated in oxygen.',
      requiresSparkOrHeat: true,
    },
    enthalpyKjPerMol: -1195.8,
    evidenceStatus: EvidenceStatus.EXPERIMENTALLY_DOCUMENTED,
    sourceReference: 'NIST Chemistry WebBook',
    sourceUrl: 'https://pubchem.ncbi.nlm.nih.gov/compound/166630',
    beginnerExplanation:
      'Four lithium atoms (Li) combine with one oxygen molecule (O₂) to make two units of white lithium oxide (Li₂O).',
    intermediateExplanation:
      'Unlike heavier alkali metals that form peroxides or superoxides, lithium forms the normal oxide Li₂O due to the high charge density of the small Li⁺ ion.',
    advancedExplanation:
      'Crystallizes in the antifluorite structure with ΔH°f = -597.9 kJ/mol.',
    mechanismNotes: 'Shows 4 Li + 1 O₂ forming 2 Li₂O.',
    safety: {
      hazardLevel: 'High',
      ghsWarnings: ['Flammable alkali metal'],
      handlingPrecautions: 'Class D fire extinguisher required.',
      educationalDisclaimer: 'Virtual simulation only.',
    },
    visualEffectConfig: {
      flashColor: '#F43F5E',
      particleColor: '#FB7185',
      secondaryColor: '#EF4444',
      energyIntensity: 0.75,
      durationMs: 4000,
    },
  },

  // =========================================================================
  // 21. SYNTHESIS OF HYDROGEN CHLORIDE
  // =========================================================================
  {
    id: 'rxn-hcl-synthesis',
    name: 'Direct Synthesis of Hydrogen Chloride',
    balancedEquation: 'H₂(g) + Cl₂(g) → 2HCl(g)',
    reactants: [
      { substanceId: 'H2', formula: 'H2', displayFormula: 'H₂', coefficient: 1, phase: 'g' },
      { substanceId: 'Cl2', formula: 'Cl2', displayFormula: 'Cl₂', coefficient: 1, phase: 'g' },
    ],
    products: [
      { substanceId: 'HCl', formula: 'HCl', displayFormula: 'HCl', coefficient: 2, phase: 'g' },
    ],
    preset: ReactionPreset.PHOTOCHEMICAL,
    conditions: {
      temperatureC: 25,
      temperatureLabel: 'UV/Blue light (hν) or thermal spark',
      pressureAtm: 1.0,
      lightExposure: true,
      activationRequired: 'Initiated by UV/blue light homolysis of Cl₂ into Cl• radicals.',
      requiresLight: true,
    },
    enthalpyKjPerMol: -184.6,
    evidenceStatus: EvidenceStatus.EXPERIMENTALLY_DOCUMENTED,
    sourceReference: 'NIST Chemistry WebBook (ΔH°f(HCl, g) = -92.3 kJ/mol)',
    sourceUrl: 'https://pubchem.ncbi.nlm.nih.gov/compound/313',
    beginnerExplanation:
      'One hydrogen molecule (H₂) and one chlorine molecule (Cl₂) swap partners to form two hydrogen chloride molecules (HCl).',
    intermediateExplanation:
      'Proceeds via a photochemical radical chain reaction (Cl₂ + hν → 2Cl•; Cl• + H₂ → HCl + H•; H• + Cl₂ → HCl + Cl•).',
    advancedExplanation:
      'High quantum yield (~10⁵ molecules per absorbed photon) due to low activation barriers in propagation steps.',
    mechanismNotes: 'Shows 1 H₂ + 1 Cl₂ forming 2 HCl.',
    safety: {
      hazardLevel: 'Extreme',
      ghsWarnings: ['Explosive photochemical chain reaction; corrosive HCl gas product'],
      handlingPrecautions: 'Keep H₂/Cl₂ mixtures shielded from actinic light.',
      educationalDisclaimer: 'Virtual simulation only.',
    },
    visualEffectConfig: {
      flashColor: '#10B981',
      particleColor: '#34D399',
      secondaryColor: '#38BDF8',
      energyIntensity: 0.75,
      durationMs: 3900,
    },
  },
];

export function registerDynamicReaction(newRxn: ReactionRecord): void {
  const existingIdx = REACTIONS.findIndex((r) => r.id === newRxn.id);
  if (existingIdx >= 0) {
    REACTIONS[existingIdx] = newRxn;
  } else {
    REACTIONS.unshift(newRxn);
  }
}

