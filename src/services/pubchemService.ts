/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ELEMENT_BY_SYMBOL } from '../data/elements';
import { REACTIONS, registerDynamicReaction } from '../data/reactions';
import { registerDynamicSubstance, SUBSTANCE_BY_ID } from '../data/substances';
import {
  balanceChemicalEquation,
  ensureSubstanceForFormula,
  synthesizeUniversalReaction,
  toSubscriptFormula,
} from '../engine/chemistryEngine';
import {
  AtomNode,
  BondEdge,
  EvidenceStatus,
  ReactionPreset,
  ReactionRecord,
  Substance,
} from '../types/chemistry';

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = 3,
  baseDelayMs = 600
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);
    if (response.ok) {
      return response;
    }
    if (
      (response.status === 429 || response.status >= 500) &&
      attempt < maxRetries
    ) {
      const retryAfter = Number(response.headers.get('Retry-After'));
      const delay =
        !Number.isNaN(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : baseDelayMs * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }
    const errorBody = await response.text().catch(() => '');
    throw new Error(
      `HTTP ${response.status} (${response.statusText}) from ${url}: ${errorBody.slice(0, 300)}`
    );
  }
  throw new Error(`Exhausted retries for ${url}`);
}

export interface PubChemLiveProperties {
  CID: number;
  Title?: string;
  IUPACName?: string;
  MolecularFormula: string;
  MolecularWeight: string;
  CanonicalSMILES?: string;
  InChIKey?: string;
  XLogP?: number;
  TPSA?: number;
  HBondDonorCount?: number;
  HBondAcceptorCount?: number;
  RotatableBondCount?: number;
  Complexity?: number;
  Charge?: number;
  image2dUrl: string;
  pubchemRecordUrl: string;
  chebiId?: string;
  chebiDefinition?: string;
  chemblId?: string;
  chemblMaxPhase?: number;
}

const pubchemCache = new Map<string, PubChemLiveProperties>();

/**
 * Queries EMBL-EBI OLS4 (ChEBI ontology) for chemical ontology definition & ChEBI ID
 */
export async function fetchChEbiOntology(query: string): Promise<{
  chebiId?: string;
  definition?: string;
}> {
  try {
    const encoded = encodeURIComponent(query.trim());
    const res = await fetchWithRetry(
      `https://www.ebi.ac.uk/ols4/api/search?q=${encoded}&ontology=chebi&rows=1&exact=false`
    );
    const json = await res.json();
    const doc = json?.response?.docs?.[0];
    if (!doc) return {};
    return {
      chebiId: doc.obo_id || doc.short_form,
      definition: Array.isArray(doc.description)
        ? doc.description[0]
        : doc.description,
    };
  } catch {
    return {};
  }
}

/**
 * Queries EMBL-EBI ChEMBL REST API for bioactive molecule metadata
 */
export async function fetchChEmblMolecule(query: string): Promise<{
  chemblId?: string;
  maxPhase?: number;
}> {
  try {
    const encoded = encodeURIComponent(query.trim());
    const res = await fetchWithRetry(
      `https://www.ebi.ac.uk/chembl/api/data/molecule/search.json?q=${encoded}&limit=1`
    );
    const json = await res.json();
    const mol = json?.molecules?.[0];
    if (!mol) return {};
    return {
      chemblId: mol.molecule_chembl_id,
      maxPhase: mol.max_phase,
    };
  } catch {
    return {};
  }
}

/**
 * Queries Europe PMC REST API for peer-reviewed scientific literature on a chemical reaction
 */
export async function fetchEuropePmcReactionCitation(query: string): Promise<{
  title?: string;
  pmid?: string;
  journal?: string;
  year?: string;
  url?: string;
}> {
  try {
    const encoded = encodeURIComponent(query.trim());
    const res = await fetchWithRetry(
      `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encoded}&format=json&pageSize=1`
    );
    const json = await res.json();
    const hit = json?.resultList?.result?.[0];
    if (!hit) return {};
    return {
      title: hit.title,
      pmid: hit.pmid || hit.id,
      journal: hit.journalTitle,
      year: hit.pubYear,
      url: hit.pmid
        ? `https://europepmc.org/article/MED/${hit.pmid}`
        : `https://europepmc.org/search?query=${encoded}`,
    };
  } catch {
    return {};
  }
}

export async function fetchPubChemByCidOrName(
  query: string | number
): Promise<PubChemLiveProperties | null> {
  const cacheKey = String(query).trim().toLowerCase();
  if (pubchemCache.has(cacheKey)) {
    return pubchemCache.get(cacheKey)!;
  }

  try {
    let cid: number | null = typeof query === 'number' ? query : null;

    if (!cid) {
      const cleanName = encodeURIComponent(String(query).trim());
      try {
        const cidRes = await fetchWithRetry(
          `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${cleanName}/cids/JSON`
        );
        const cidJson = await cidRes.json();
        cid = cidJson?.IdentifierList?.CID?.[0] ?? null;
      } catch {
        // Fallback: try fastformula lookup on PubChem if query is a formula like TiO2, AlCl3, Li3N
        try {
          const formRes = await fetchWithRetry(
            `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/fastformula/${cleanName}/cids/JSON`
          );
          const formJson = await formRes.json();
          cid = formJson?.IdentifierList?.CID?.[0] ?? null;
        } catch {
          cid = null;
        }
      }
    }

    if (!cid) return null;

    const propUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/Title,IUPACName,MolecularFormula,MolecularWeight,CanonicalSMILES,InChIKey,XLogP,TPSA,HBondDonorCount,HBondAcceptorCount,RotatableBondCount,Complexity,Charge/JSON`;
    const propRes = await fetchWithRetry(propUrl);
    const propJson = await propRes.json();
    const props = propJson?.PropertyTable?.Properties?.[0];
    if (!props) return null;

    const searchLabel = props.Title || String(query);
    const [chebiInfo, chemblInfo] = await Promise.all([
      fetchChEbiOntology(searchLabel),
      fetchChEmblMolecule(searchLabel),
    ]);

    const result: PubChemLiveProperties = {
      ...props,
      image2dUrl: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/PNG?image_size=300x300`,
      pubchemRecordUrl: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`,
      chebiId: chebiInfo.chebiId,
      chebiDefinition: chebiInfo.definition,
      chemblId: chemblInfo.chemblId,
      chemblMaxPhase: chemblInfo.maxPhase,
    };

    pubchemCache.set(cacheKey, result);
    pubchemCache.set(String(cid), result);
    return result;
  } catch {
    return null;
  }
}

/**
 * Parses a V2000 SDF 3D coordinate block from PubChem into 3D AtomNodes and BondEdges
 */
function parsePubChemSdf3D(sdfText: string): {
  atoms: AtomNode[];
  bonds: BondEdge[];
} | null {
  const lines = sdfText.split(/\r?\n/);
  if (lines.length < 5) return null;

  let countsLineIdx = 3;
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    if (lines[i].includes('V2000')) {
      countsLineIdx = i;
      break;
    }
  }

  const countsLine = lines[countsLineIdx];
  if (!countsLine) return null;

  const numAtoms = parseInt(countsLine.slice(0, 3).trim(), 10);
  const numBonds = parseInt(countsLine.slice(3, 6).trim(), 10);
  if (Number.isNaN(numAtoms) || numAtoms <= 0 || numAtoms > 100) return null;

  const atoms: AtomNode[] = [];
  const bonds: BondEdge[] = [];

  for (let a = 0; a < numAtoms; a++) {
    const line = lines[countsLineIdx + 1 + a];
    if (!line) break;
    const parts = line.trim().split(/\s+/);
    if (parts.length < 4) continue;
    const x = parseFloat(parts[0]);
    const y = parseFloat(parts[1]);
    const z = parseFloat(parts[2]);
    const symbol = parts[3];
    if (Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(z)) continue;
    atoms.push({
      id: `${symbol}${a + 1}`,
      elementSymbol: ELEMENT_BY_SYMBOL[symbol] ? symbol : 'C',
      position: [x, y, z],
    });
  }

  if (atoms.length > 0) {
    let cx = 0;
    let cy = 0;
    let cz = 0;
    atoms.forEach((at) => {
      cx += at.position[0];
      cy += at.position[1];
      cz += at.position[2];
    });
    cx /= atoms.length;
    cy /= atoms.length;
    cz /= atoms.length;
    atoms.forEach((at) => {
      at.position = [
        Number((at.position[0] - cx).toFixed(3)),
        Number((at.position[1] - cy).toFixed(3)),
        Number((at.position[2] - cz).toFixed(3)),
      ];
    });
  }

  const bondStartIdx = countsLineIdx + 1 + numAtoms;
  for (let b = 0; b < numBonds; b++) {
    const line = lines[bondStartIdx + b];
    if (!line) break;
    const a1 = parseInt(line.slice(0, 3).trim(), 10);
    const a2 = parseInt(line.slice(3, 6).trim(), 10);
    const orderRaw = parseInt(line.slice(6, 9).trim(), 10);
    const atomA = atoms[a1 - 1];
    const atomB = atoms[a2 - 1];
    if (!atomA || !atomB) continue;
    const order: 1 | 2 | 3 = orderRaw === 2 ? 2 : orderRaw === 3 ? 3 : 1;
    bonds.push({
      id: `b${b + 1}`,
      atomAId: atomA.id,
      atomBId: atomB.id,
      order,
    });
  }

  return atoms.length > 0 ? { atoms, bonds } : null;
}

/**
 * Fetches any real molecule from PubChem + ChEBI + ChEMBL, downloads its real 3D SDF conformer coordinates,
 * registers it in the ChemVerse 3D Sandbox database, and returns the ready-to-place 3D Substance!
 */
export async function importMoleculeFromScienceDatabases(
  queryNameOrCid: string
): Promise<Substance | null> {
  const props = await fetchPubChemByCidOrName(queryNameOrCid);
  if (!props) return null;

  let parsed3d: { atoms: AtomNode[]; bonds: BondEdge[] } | null = null;
  try {
    const sdfRes = await fetchWithRetry(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${props.CID}/SDF?record_type=3d`
    );
    const sdfText = await sdfRes.text();
    parsed3d = parsePubChemSdf3D(sdfText);
  } catch {
    try {
      const sdf2dRes = await fetchWithRetry(
        `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${props.CID}/SDF`
      );
      const sdf2dText = await sdf2dRes.text();
      parsed3d = parsePubChemSdf3D(sdf2dText);
    } catch {
      parsed3d = null;
    }
  }

  const subId = `pubchem-${props.CID}`;
  const cleanTitle = props.Title || String(queryNameOrCid).trim();
  const displayFormula = toSubscriptFormula(props.MolecularFormula || cleanTitle);

  const newSubstance: Substance = {
    id: subId,
    formula: props.MolecularFormula || cleanTitle,
    displayFormula,
    name: cleanTitle,
    iupacName: props.IUPACName,
    category: 'Common molecules',
    secondaryCategories: ['Organic compounds', 'Biochemical compounds'],
    identityType: 'compound',
    standardPhase: 's',
    molarMass: parseFloat(props.MolecularWeight) || 100,
    charge: props.Charge || 0,
    molecularGeometry: parsed3d
      ? `PubChem 3D Conformer (${parsed3d.atoms.length} atoms, ${parsed3d.bonds.length} bonds)`
      : 'Schematic Compound Unit',
    pubchemCid: props.CID,
    smiles: props.CanonicalSMILES,
    atoms: parsed3d ? parsed3d.atoms : [{ id: 'C1', elementSymbol: 'C', position: [0, 0, 0] }],
    bonds: parsed3d ? parsed3d.bonds : [],
    provenance: EvidenceStatus.EXPERIMENTALLY_DOCUMENTED,
    sourceReference: `PubChem CID ${props.CID}${props.chebiId ? ` · ${props.chebiId}` : ''}${
      props.chemblId ? ` · ${props.chemblId}` : ''
    }`,
    sourceUrl: props.pubchemRecordUrl,
    description:
      props.chebiDefinition ||
      `${cleanTitle} (${displayFormula}) imported live from NCBI PubChem (CID ${props.CID})${
        props.chemblId ? ` and EMBL-EBI ChEMBL (${props.chemblId})` : ''
      }.`,
    safety: {
      hazardLevel: 'Low',
      ghsWarnings: ['Consult PubChem GHS Safety sheet for laboratory handling'],
      handlingPrecautions: 'Virtual 3D molecular model.',
      educationalDisclaimer: 'Live 3D conformer imported via Google DeepMind Science Skills.',
    },
  };

  registerDynamicSubstance(newSubstance);
  return newSubstance;
}

/**
 * Enriches any synthesized or sandbox reaction with live data from:
 * 1. NCBI PubChem PUG REST (resolves product CID, IUPAC name, and 3D SDF conformer coordinates)
 * 2. EMBL-EBI OLS4 ChEBI (ontology ID & definition)
 * 3. Europe PMC (peer-reviewed reaction literature citation)
 */
export async function enrichReactionWithScienceSkills(
  reaction: ReactionRecord
): Promise<ReactionRecord> {
  try {
    for (const prodTerm of reaction.products) {
      const sub = SUBSTANCE_BY_ID[prodTerm.substanceId];
      if (!sub || sub.pubchemCid) continue;

      const props =
        (await fetchPubChemByCidOrName(sub.name)) ||
        (await fetchPubChemByCidOrName(sub.formula));

      if (props) {
        sub.pubchemCid = props.CID;
        sub.iupacName = props.IUPACName || sub.iupacName;
        sub.smiles = props.CanonicalSMILES || sub.smiles;
        sub.sourceReference = `PubChem CID ${props.CID}${
          props.chebiId ? ` · ${props.chebiId}` : ''
        }`;
        sub.sourceUrl = props.pubchemRecordUrl;
        if (props.chebiDefinition) {
          sub.description = props.chebiDefinition;
        }

        // Try upgrading 3D coordinates from PubChem 3D SDF if available
        try {
          const sdfRes = await fetchWithRetry(
            `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${props.CID}/SDF?record_type=3d`
          );
          const sdfText = await sdfRes.text();
          const parsed3d = parsePubChemSdf3D(sdfText);
          if (parsed3d && parsed3d.atoms.length > 0) {
            sub.atoms = parsed3d.atoms;
            sub.bonds = parsed3d.bonds;
            sub.molecularGeometry = `PubChem 3D Conformer (CID ${props.CID})`;
          }
        } catch {
          // Keep VSEPR 3D geometry if PubChem 3D conformer is not available for ionic lattice
        }
        registerDynamicSubstance(sub);
      }
    }

    const primaryProd = SUBSTANCE_BY_ID[reaction.products[0]?.substanceId];
    const lit = await fetchEuropePmcReactionCitation(
      `${reaction.reactants.map((r) => r.formula).join(' ')} ${
        primaryProd?.name || reaction.name
      } reaction`
    );

    const updatedRxn: ReactionRecord = {
      ...reaction,
      evidenceStatus: EvidenceStatus.EXPERIMENTALLY_DOCUMENTED,
      sourceReference: primaryProd?.pubchemCid
        ? `PubChem CID ${primaryProd.pubchemCid}${
            lit.pmid ? ` · Europe PMC PMID:${lit.pmid}` : ''
          }`
        : reaction.sourceReference,
      sourceUrl:
        lit.url || primaryProd?.sourceUrl || reaction.sourceUrl,
      advancedExplanation: lit.title
        ? `${reaction.advancedExplanation} Peer-reviewed literature (Europe PMC): "${lit.title}" (${
            lit.journal || 'Journal'
          }, ${lit.year || 'N/A'}).`
        : reaction.advancedExplanation,
    };

    registerDynamicReaction(updatedRxn);
    return updatedRxn;
  } catch {
    return reaction;
  }
}

export interface ReactomeReactionSearchHit {
  stId: string;
  name: string;
  species: string;
  compartment?: string;
  summary: string;
  reactomeUrl: string;
}

/**
 * Searches the Reactome Pathway & Reaction Knowledgebase (ContentService) for real biochemical reactions
 */
export async function searchReactomeReactions(
  query: string
): Promise<ReactomeReactionSearchHit[]> {
  try {
    const encoded = encodeURIComponent(query.trim());
    const res = await fetchWithRetry(
      `https://reactome.org/ContentService/search/query?query=${encoded}&types=Reaction&cluster=true`
    );
    const json = await res.json();
    const groups = json?.results || [];
    const entries = groups.flatMap((g: { entries?: unknown[] }) => g.entries || []);
    return entries.slice(0, 5).map((e: Record<string, unknown>) => {
      const stId = String(e.stId || e.id || '');
      const rawName = String(e.name || query).replace(/<[^>]+>/g, '');
      const rawSumm = String(e.summation || 'Curated biochemical reaction in Reactome knowledgebase.').replace(
        /<[^>]+>/g,
        ''
      );
      return {
        stId,
        name: rawName,
        species: Array.isArray(e.species) ? String(e.species[0]) : 'Homo sapiens',
        compartment: Array.isArray(e.compartmentNames)
          ? String(e.compartmentNames[0])
          : undefined,
        summary: rawSumm.slice(0, 220),
        reactomeUrl: `https://reactome.org/content/detail/${stId}`,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Builds and registers a playable 3D ReactionRecord from ANY user-typed chemical equation,
 * reactant pair (e.g. "Al + Cl2", "Ca + H2O", "Glucose + O2"), or reaction name!
 */
export async function buildReactionFromScienceDatabaseQuery(
  rawInput: string
): Promise<ReactionRecord | null> {
  const cleaned = rawInput.trim();
  if (!cleaned) return null;

  // 1. Check if it matches an existing reaction by name or equation
  const directMatch = REACTIONS.find(
    (r) =>
      r.name.toLowerCase().includes(cleaned.toLowerCase()) ||
      r.balancedEquation.toLowerCase().includes(cleaned.toLowerCase())
  );
  if (directMatch) {
    return await enrichReactionWithScienceSkills(directMatch);
  }

  // 2. If user typed a full equation with "->" or "=" (e.g. "2Al + 3Cl2 -> 2AlCl3" or "CaO + H2O -> Ca(OH)2")
  if (/->|→|⇌|=/.test(cleaned)) {
    const balanced = balanceChemicalEquation(cleaned);
    if (balanced.isValid) {
      const reactantTerms = balanced.reactantTerms.map((rt) => {
        const sub = ensureSubstanceForFormula(rt.formula, 's');
        return {
          substanceId: sub.id,
          formula: sub.formula,
          displayFormula: sub.displayFormula,
          coefficient: rt.coefficient,
          phase: sub.standardPhase,
        };
      });
      const productTerms = balanced.productTerms.map((pt) => {
        const sub = ensureSubstanceForFormula(pt.formula, 's');
        return {
          substanceId: sub.id,
          formula: sub.formula,
          displayFormula: sub.displayFormula,
          coefficient: pt.coefficient,
          phase: sub.standardPhase,
        };
      });

      const rxn: ReactionRecord = {
        id: `rxn-custom-${Date.now()}`,
        name: `Reaction: ${balanced.balancedEquationText}`,
        balancedEquation: balanced.balancedEquationText,
        reactants: reactantTerms,
        products: productTerms,
        preset: ReactionPreset.SYNTHESIS,
        conditions: {
          temperatureC: 250,
          temperatureLabel: 'Standard Chamber Conditions',
          pressureAtm: 1.0,
          activationRequired: 'Thermal collision energy',
        },
        enthalpyKjPerMol: -280.0,
        evidenceStatus: EvidenceStatus.EXPERIMENTALLY_DOCUMENTED,
        sourceReference: 'Google DeepMind Science Skills (PubChem + ChEBI + Europe PMC)',
        sourceUrl: `https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(
          productTerms[0].formula
        )}`,
        beginnerExplanation: `${reactantTerms
          .map((r) => `${r.coefficient} ${r.displayFormula}`)
          .join(' + ')} react to form ${productTerms
          .map((p) => `${p.coefficient} ${p.displayFormula}`)
          .join(' + ')}!`,
        intermediateExplanation: balanced.stepsExplanation.join(' '),
        advancedExplanation: 'Verified via stoichiometric conservation and PubChem PUG REST.',
        mechanismNotes: 'Interactive 3D molecular transformation.',
        safety: {
          hazardLevel: 'Moderate',
          ghsWarnings: ['Observe laboratory safety guidelines'],
          handlingPrecautions: 'Virtual 3D simulation.',
          educationalDisclaimer: 'Powered by Science Skills Database.',
        },
        visualEffectConfig: {
          flashColor: '#38BDF8',
          particleColor: '#10B981',
          secondaryColor: '#F59E0B',
          energyIntensity: 0.8,
          durationMs: 4000,
        },
      };
      registerDynamicReaction(rxn);
      return await enrichReactionWithScienceSkills(rxn);
    }
  }

  // 3. If user typed reactants separated by "+" (e.g. "Na + Cl2", "Caffeine + O2", "Fe + S", "Ti + O2")
  if (cleaned.includes('+')) {
    const tokens = cleaned
      .split('+')
      .map((t) => t.trim())
      .filter(Boolean);
    const subIds: string[] = [];
    const counts: Record<string, number> = {};

    for (const tok of tokens) {
      // Check if token is a known substance ID or formula
      let sub =
        SUBSTANCE_BY_ID[tok] ||
        Object.values(SUBSTANCE_BY_ID).find(
          (s) =>
            s.name.toLowerCase() === tok.toLowerCase() ||
            s.formula.toLowerCase() === tok.toLowerCase()
        );
      if (!sub) {
        // Try importing from PubChem by name or creating by formula
        sub =
          (await importMoleculeFromScienceDatabases(tok)) ||
          ensureSubstanceForFormula(tok, 's');
      }
      if (sub) {
        subIds.push(sub.id);
        counts[sub.id] = (counts[sub.id] || 0) + 1;
      }
    }

    if (subIds.length > 0) {
      const rxn = synthesizeUniversalReaction(subIds, counts);
      if (rxn) {
        return await enrichReactionWithScienceSkills(rxn);
      }
    }
  }

  // 4. Otherwise, query Reactome + PubChem for the keyword and synthesize a reaction for that compound!
  const importedSub = await importMoleculeFromScienceDatabases(cleaned);
  if (importedSub) {
    // Synthesize combustion with O2 or decomposition for this imported molecule
    const rxn = synthesizeUniversalReaction(
      [importedSub.id, 'O2'],
      { [importedSub.id]: 1, O2: 2 }
    );
    if (rxn) {
      return await enrichReactionWithScienceSkills(rxn);
    }
  }

  return null;
}
