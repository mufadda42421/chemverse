/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  Box,
  Compass,
  ExternalLink,
  Eye,
  RotateCcw,
  ShieldAlert,
  Sliders,
  Sparkles,
  X,
} from 'lucide-react';
import { ELEMENT_BY_SYMBOL } from '../data/elements';
import { REACTIONS } from '../data/reactions';
import {
  fetchPubChemByCidOrName,
  PubChemLiveProperties,
} from '../services/pubchemService';
import { Substance, VisualizationMode } from '../types/chemistry';

interface MoleculeInspectionModalProps {
  substance: Substance;
  onClose: () => void;
  onLoadReactionPreset?: (reactionId: string) => void;
}

export const MoleculeInspectionModal: React.FC<MoleculeInspectionModalProps> = ({
  substance,
  onClose,
  onLoadReactionPreset,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [vizMode, setVizMode] = useState<VisualizationMode>('ball-and-stick');
  const [labelsOn, setLabelsOn] = useState(true);
  const [bondsOn, setBondsOn] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);
  const [resetCount, setResetCount] = useState(0);
  const [liveData, setLiveData] = useState<PubChemLiveProperties | null>(null);
  const [loadingLive, setLoadingLive] = useState(false);

  // Fetch live verified data from PubChem PUG REST
  useEffect(() => {
    let cancelled = false;
    setLoadingLive(true);
    const query = substance.pubchemCid || substance.name;
    fetchPubChemByCidOrName(query)
      .then((res) => {
        if (!cancelled) {
          setLiveData(res);
          setLoadingLive(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadingLive(false);
      });
    return () => {
      cancelled = true;
    };
  }, [substance]);

  // Dedicated 3D Inspection Viewport
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 520;
    const height = container.clientHeight || 420;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#070A12');

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 50);
    camera.position.set(0, 1.2, 4.6);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 1.8;

    const ambient = new THREE.AmbientLight('#94A3B8', 0.9);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight('#FFFFFF', 1.9);
    dirLight.position.set(5, 8, 6);
    scene.add(dirLight);

    const rimLight = new THREE.PointLight('#06B6D4', 2.0, 12);
    rimLight.position.set(-4, -2, -4);
    scene.add(rimLight);

    const molGroup = new THREE.Group();
    scene.add(molGroup);

    const scale = 1.05;
    substance.atoms.forEach((atom) => {
      const el = ELEMENT_BY_SYMBOL[atom.elementSymbol];
      const baseR = el?.visualRadius || 0.48;
      const radius =
        vizMode === 'space-filling'
          ? baseR * 1.65
          : vizMode === 'wireframe'
          ? baseR * 0.85
          : baseR;

      const geo = new THREE.SphereGeometry(radius, 32, 32);
      const mat = new THREE.MeshPhysicalMaterial({
        color: el?.cpkColor || '#38BDF8',
        roughness: 0.2,
        metalness: 0.15,
        clearcoat: 0.7,
        wireframe: vizMode === 'wireframe',
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        atom.position[0] * scale,
        atom.position[1] * scale,
        atom.position[2] * scale
      );
      molGroup.add(mesh);

      if (labelsOn) {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d')!;
        ctx.beginPath();
        ctx.arc(64, 64, 42, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(11, 14, 23, 0.85)';
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = el?.cpkColor || '#38BDF8';
        ctx.stroke();
        ctx.font = 'bold 42px "JetBrains Mono", monospace';
        ctx.fillStyle = '#F8FAFC';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(atom.elementSymbol, 64, 66);

        const tex = new THREE.CanvasTexture(canvas);
        const sprite = new THREE.Sprite(
          new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true })
        );
        sprite.position.set(
          atom.position[0] * scale,
          atom.position[1] * scale + radius + 0.3,
          atom.position[2] * scale
        );
        sprite.scale.set(0.45, 0.45, 1);
        molGroup.add(sprite);
      }
    });

    if (bondsOn && vizMode !== 'space-filling') {
      const atomMap = new Map(substance.atoms.map((a) => [a.id, a]));
      substance.bonds.forEach((bond) => {
        const a = atomMap.get(bond.atomAId);
        const b = atomMap.get(bond.atomBId);
        if (!a || !b) return;
        const start = new THREE.Vector3(...a.position).multiplyScalar(scale);
        const end = new THREE.Vector3(...b.position).multiplyScalar(scale);
        const dir = new THREE.Vector3().subVectors(end, start);
        const len = dir.length();
        const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

        const up =
          Math.abs(dir.clone().normalize().y) > 0.9
            ? new THREE.Vector3(1, 0, 0)
            : new THREE.Vector3(0, 1, 0);
        const perp = new THREE.Vector3().crossVectors(dir, up).normalize();
        const offsets =
          bond.order === 1 ? [0] : bond.order === 2 ? [-0.09, 0.09] : [-0.14, 0, 0.14];

        offsets.forEach((off) => {
          const cylGeo = new THREE.CylinderGeometry(
            bond.order === 1 ? 0.08 : 0.05,
            bond.order === 1 ? 0.08 : 0.05,
            len,
            16
          );
          const cylMat = new THREE.MeshStandardMaterial({
            color: '#CBD5E1',
            roughness: 0.3,
            metalness: 0.5,
            wireframe: vizMode === 'wireframe',
          });
          const cyl = new THREE.Mesh(cylGeo, cylMat);
          cyl.position.copy(mid).add(perp.clone().multiplyScalar(off));
          cyl.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            dir.clone().normalize()
          );
          molGroup.add(cyl);
        });
      });
    }

    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      controls.dispose();
      renderer.dispose();
    };
  }, [substance, vizMode, labelsOn, bondsOn, autoRotate, resetCount]);

  const relatedReactions = REACTIONS.filter(
    (r) =>
      r.reactants.some((x) => x.substanceId === substance.id) ||
      r.products.some((x) => x.substanceId === substance.id)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-5xl bg-[#0F1626] border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0B0E17]">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white">
                {substance.name} ({substance.displayFormula})
              </h2>
              <span className="text-xs font-mono text-cyan-400">
                {substance.provenance} · {substance.category}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              3D Molecular Geometry & PubChem Structural Inspector
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close inspection view"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Two-Pane Split Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto">
          {/* Left 3D Viewport */}
          <div className="lg:col-span-6 relative bg-[#070A12] min-h-[380px] flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800">
            <div ref={mountRef} className="w-full h-[380px] lg:h-full flex-1" />

            {/* Viewport Controls Overlay */}
            <div className="p-4 bg-[#0B0E17]/90 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                {(
                  [
                    ['ball-and-stick', 'Ball & Stick'],
                    ['space-filling', 'Space-Filling'],
                    ['wireframe', 'Wireframe'],
                  ] as [VisualizationMode, string][]
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    onClick={() => setVizMode(mode)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      vizMode === mode
                        ? 'bg-cyan-500 text-slate-950 font-semibold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLabelsOn(!labelsOn)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                    labelsOn
                      ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300'
                      : 'border-slate-700 text-slate-400'
                  }`}
                >
                  Labels {labelsOn ? 'On' : 'Off'}
                </button>
                <button
                  onClick={() => setBondsOn(!bondsOn)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                    bondsOn
                      ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300'
                      : 'border-slate-700 text-slate-400'
                  }`}
                >
                  Bonds {bondsOn ? 'On' : 'Off'}
                </button>
                <button
                  onClick={() => setAutoRotate(!autoRotate)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                    autoRotate
                      ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300'
                      : 'border-slate-700 text-slate-400'
                  }`}
                >
                  Spin
                </button>
                <button
                  onClick={() => setResetCount((c) => c + 1)}
                  className="p-1.5 text-slate-300 hover:text-white border border-slate-700 rounded-md"
                  title="Reset Camera"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Scientific Metadata & Live PubChem Inspector */}
          <div className="lg:col-span-6 p-6 space-y-5 overflow-y-auto max-h-[68vh]">
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">
                Structural & Geometric Profile
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                {substance.description}
              </p>
              {substance.isSchematicGeometry && (
                <p className="text-xs text-amber-300/90 mt-2 font-mono">
                  Note: Schematic formula-unit model representing an extended bulk solid or ionic lattice.
                </p>
              )}
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-lg">
                <div className="text-xs text-slate-400">Molecular Geometry</div>
                <div className="text-sm font-semibold text-white mt-0.5">
                  {substance.molecularGeometry}
                </div>
              </div>
              <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-lg">
                <div className="text-xs text-slate-400">Bond Angle</div>
                <div className="text-sm font-mono font-semibold text-cyan-300 mt-0.5 tabular-nums">
                  {substance.bondAngle || 'N/A (Monatomic / Lattice)'}
                </div>
              </div>
              <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-lg">
                <div className="text-xs text-slate-400">Molar Mass</div>
                <div className="text-sm font-mono font-semibold text-white mt-0.5 tabular-nums">
                  {substance.molarMass.toFixed(3)}{' '}
                  <span className="text-xs text-slate-400">g/mol</span>
                </div>
              </div>
              <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-lg">
                <div className="text-xs text-slate-400">Dipole Moment</div>
                <div className="text-sm font-mono font-semibold text-white mt-0.5 tabular-nums">
                  {substance.dipoleMoment || 'N/A'}
                </div>
              </div>
              <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-lg">
                <div className="text-xs text-slate-400">Atoms / Bonds</div>
                <div className="text-sm font-mono font-semibold text-white mt-0.5 tabular-nums">
                  {substance.atoms.length} atoms · {substance.bonds.length} bonds
                </div>
              </div>
              <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-lg">
                <div className="text-xs text-slate-400">Standard State</div>
                <div className="text-sm font-mono font-semibold text-white mt-0.5">
                  ({substance.standardPhase}) phase
                </div>
              </div>
            </div>

            {/* Live PubChem PUG REST Integration Card */}
            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Live PubChem PUG REST Verification
                </span>
                {substance.pubchemCid && (
                  <a
                    href={`https://pubchem.ncbi.nlm.nih.gov/compound/${substance.pubchemCid}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-slate-300 hover:text-cyan-300 flex items-center gap-1 font-mono"
                  >
                    CID {substance.pubchemCid}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {loadingLive ? (
                <p className="text-xs text-slate-400 font-mono">
                  Querying NCBI PubChem REST API...
                </p>
              ) : liveData ? (
                <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                  <div>
                    <span className="text-slate-400">IUPAC: </span>
                    <span className="text-slate-200">{liveData.IUPACName || substance.iupacName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">SMILES: </span>
                    <span className="text-slate-200">{liveData.CanonicalSMILES || substance.smiles}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">InChIKey: </span>
                    <span className="text-slate-200 truncate block" title={liveData.InChIKey}>
                      {liveData.InChIKey || 'Verified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">H-Bond D/A: </span>
                    <span className="text-slate-200 tabular-nums">
                      {liveData.HBondDonorCount ?? 0} / {liveData.HBondAcceptorCount ?? 0}
                    </span>
                  </div>
                  {liveData.chebiId && (
                    <div>
                      <span className="text-slate-400">EMBL-EBI ChEBI: </span>
                      <span className="text-cyan-300">{liveData.chebiId}</span>
                    </div>
                  )}
                  {liveData.chemblId && (
                    <div>
                      <span className="text-slate-400">ChEMBL ID: </span>
                      <span className="text-emerald-300">
                        {liveData.chemblId}{' '}
                        {liveData.chemblMaxPhase ? `(Phase ${liveData.chemblMaxPhase})` : ''}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  Source: {substance.sourceReference}
                </p>
              )}
            </div>

            {/* Safety & Hazard Profile */}
            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Laboratory Safety Metadata (Hazard: {substance.safety.hazardLevel})
                </span>
              </div>
              <ul className="text-xs text-slate-300 space-y-1">
                {substance.safety.ghsWarnings.map((w, i) => (
                  <li key={i} className="font-mono text-slate-300">
                    • {w}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-slate-400 pt-1">
                {substance.safety.handlingPrecautions}
              </p>
            </div>

            {/* Related Documented Reactions */}
            {relatedReactions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-300">
                  Documented Sandbox Reactions Involving {substance.displayFormula}
                </h4>
                <div className="space-y-1.5">
                  {relatedReactions.map((rxn) => (
                    <div
                      key={rxn.id}
                      className="flex items-center justify-between p-2.5 bg-slate-900 border border-slate-800 rounded-lg"
                    >
                      <div>
                        <div className="text-xs font-mono font-semibold text-cyan-300">
                          {rxn.balancedEquation}
                        </div>
                        <div className="text-xs text-slate-400">{rxn.name}</div>
                      </div>
                      {onLoadReactionPreset && (
                        <button
                          onClick={() => {
                            onLoadReactionPreset(rxn.id);
                            onClose();
                          }}
                          className="px-3 py-1.5 text-xs font-medium bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500 hover:text-slate-950 rounded-md transition-colors whitespace-nowrap shrink-0"
                        >
                          Load in Sandbox
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
