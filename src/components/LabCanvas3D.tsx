/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ELEMENT_BY_SYMBOL } from '../data/elements';
import { SUBSTANCE_BY_ID } from '../data/substances';
import {
  ChamberMoleculeInstance,
  ReactionPreset,
  ReactionRecord,
  SimulationState,
  VisualizationMode,
} from '../types/chemistry';

export interface SelectedAtomInfo {
  instanceId: string;
  substanceId: string;
  atomId: string;
  elementSymbol: string;
  worldPosition: [number, number, number];
}

interface LabCanvas3DProps {
  molecules: ChamberMoleculeInstance[];
  simulationState: SimulationState;
  activeReaction: ReactionRecord | null;
  visualizationMode: VisualizationMode;
  showAtomLabels: boolean;
  showBonds: boolean;
  showAngleOverlay: boolean;
  playbackSpeed: number;
  isPaused: boolean;
  selectedInstanceId: string | null;
  selectedAtom: SelectedAtomInfo | null;
  cameraResetTrigger: number;
  cameraFocusTrigger: number;
  reducedQuality: boolean;
  onSelectMolecule: (instanceId: string | null, substanceId: string | null) => void;
  onSelectAtom: (atomInfo: SelectedAtomInfo | null) => void;
  onPhaseChange: (newState: SimulationState) => void;
  onTransformationSwapToProducts: () => void;
}

/**
 * Generates a crisp high-DPI canvas texture for 3D atom symbol sprites
 */
function createAtomLabelTexture(symbol: string, bgColor: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 128, 128);

  // Subtle dark circular badge
  ctx.beginPath();
  ctx.arc(64, 64, 44, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(11, 14, 23, 0.82)';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = bgColor;
  ctx.stroke();

  ctx.font = 'bold 46px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#F8FAFC';
  ctx.fillText(symbol, 64, 66);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export const LabCanvas3D: React.FC<LabCanvas3DProps> = ({
  molecules,
  simulationState,
  activeReaction,
  visualizationMode,
  showAtomLabels,
  showBonds,
  showAngleOverlay,
  playbackSpeed,
  isPaused,
  selectedInstanceId,
  cameraResetTrigger,
  cameraFocusTrigger,
  reducedQuality,
  onSelectMolecule,
  onSelectAtom,
  onPhaseChange,
  onTransformationSwapToProducts,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [webglLost, setWebglLost] = useState(false);

  // Refs for mutable animation loop state without re-creating the WebGL context
  const stateRef = useRef({
    molecules,
    simulationState,
    activeReaction,
    visualizationMode,
    showAtomLabels,
    showBonds,
    showAngleOverlay,
    playbackSpeed,
    isPaused,
    selectedInstanceId,
  });

  useEffect(() => {
    stateRef.current = {
      molecules,
      simulationState,
      activeReaction,
      visualizationMode,
      showAtomLabels,
      showBonds,
      showAngleOverlay,
      playbackSpeed,
      isPaused,
      selectedInstanceId,
    };
  }, [
    molecules,
    simulationState,
    activeReaction,
    visualizationMode,
    showAtomLabels,
    showBonds,
    showAngleOverlay,
    playbackSpeed,
    isPaused,
    selectedInstanceId,
  ]);

  const callbacksRef = useRef({
    onSelectMolecule,
    onSelectAtom,
    onPhaseChange,
    onTransformationSwapToProducts,
  });

  useEffect(() => {
    callbacksRef.current = {
      onSelectMolecule,
      onSelectAtom,
      onPhaseChange,
      onTransformationSwapToProducts,
    };
  });

  // Scene object references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const moleculeGroupsRef = useRef<Map<string, THREE.Group>>(new Map());
  const labelTextureCacheRef = useRef<Map<string, THREE.CanvasTexture>>(new Map());

  // Reaction timeline tracker
  const reactionClockRef = useRef<{
    active: boolean;
    elapsedMs: number;
    swappedToProducts: boolean;
    completed: boolean;
  }>({
    active: false,
    elapsedMs: 0,
    swappedToProducts: false,
    completed: false,
  });

  // Reset timeline when CINEMATIC_INTRO begins
  useEffect(() => {
    if (simulationState === SimulationState.CINEMATIC_INTRO) {
      reactionClockRef.current = {
        active: true,
        elapsedMs: 0,
        swappedToProducts: false,
        completed: false,
      };
    } else if (
      simulationState === SimulationState.IDLE ||
      simulationState === SimulationState.SELECTING_REACTANTS ||
      simulationState === SimulationState.READY_TO_REACT
    ) {
      reactionClockRef.current.active = false;
      reactionClockRef.current.elapsedMs = 0;
      reactionClockRef.current.swappedToProducts = false;
      reactionClockRef.current.completed = false;
    }
  }, [simulationState]);

  // Camera Reset handler
  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current) return;
    cameraRef.current.position.set(0, 3.2, 10.5);
    controlsRef.current.target.set(0, 0.3, 0);
    controlsRef.current.update();
  }, [cameraResetTrigger]);

  // Camera Focus on Selected Molecule handler
  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current) return;
    if (selectedInstanceId && moleculeGroupsRef.current.has(selectedInstanceId)) {
      const grp = moleculeGroupsRef.current.get(selectedInstanceId)!;
      const pos = grp.position;
      controlsRef.current.target.copy(pos);
      cameraRef.current.position.set(pos.x, pos.y + 1.2, pos.z + 4.5);
      controlsRef.current.update();
    }
  }, [cameraFocusTrigger, selectedInstanceId]);

  // Initialize Three.js WebGL Laboratory Scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#070A12');
    scene.fog = new THREE.FogExp2('#070A12', 0.028);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 120);
    camera.position.set(0, 3.2, 10.5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: !reducedQuality,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, reducedQuality ? 1 : 2));
    renderer.shadowMap.enabled = !reducedQuality;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglLost(true);
    };
    const handleContextRestored = () => {
      setWebglLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxDistance = 24;
    controls.minDistance = 1.8;
    controls.maxPolarAngle = Math.PI / 2 + 0.12;
    controls.target.set(0, 0.3, 0);
    controlsRef.current = controls;

    // =======================================================================
    // 1. THREE-POINT STUDIO & LABORATORY LIGHTING
    // =======================================================================
    const ambientLight = new THREE.AmbientLight('#94A3B8', 0.75);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight('#F8FAFC', 1.8);
    keyLight.position.set(6, 12, 8);
    if (!reducedQuality) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
    }
    scene.add(keyLight);

    const rimLight = new THREE.PointLight('#06B6D4', 2.4, 18);
    rimLight.position.set(-5, 4, -5);
    scene.add(rimLight);

    const coreReactionLight = new THREE.PointLight('#38BDF8', 0.5, 14);
    coreReactionLight.position.set(0, 0.5, 0);
    scene.add(coreReactionLight);

    // =======================================================================
    // 2. FUTURISTIC CONTAINMENT CHAMBER & LABORATORY APPARATUS
    // =======================================================================
    const labEnvironment = new THREE.Group();
    scene.add(labEnvironment);

    // Reflective Laboratory Floor + Radial Calibration Grid
    const floorGeo = new THREE.CircleGeometry(28, 64);
    const floorMat = new THREE.MeshStandardMaterial({
      color: '#0B0F19',
      roughness: 0.25,
      metalness: 0.7,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -3.0;
    floorMesh.receiveShadow = true;
    labEnvironment.add(floorMesh);

    const polarGrid = new THREE.PolarGridHelper(14, 16, 8, 64, 0x1e293b, 0x0f172a);
    polarGrid.position.y = -2.98;
    labEnvironment.add(polarGrid);

    // Lower Containment Pedestal
    const basePedestalGeo = new THREE.CylinderGeometry(4.3, 4.7, 0.45, 48);
    const metalPedestalMat = new THREE.MeshStandardMaterial({
      color: '#1E293B',
      roughness: 0.3,
      metalness: 0.85,
    });
    const basePedestal = new THREE.Mesh(basePedestalGeo, metalPedestalMat);
    basePedestal.position.y = -2.75;
    basePedestal.receiveShadow = true;
    labEnvironment.add(basePedestal);

    // Glowing Emitter Ring at Base of Chamber
    const baseRingGeo = new THREE.TorusGeometry(4.1, 0.055, 16, 96);
    const ringMat = new THREE.MeshBasicMaterial({ color: '#06B6D4' });
    const baseRing = new THREE.Mesh(baseRingGeo, ringMat);
    baseRing.rotation.x = Math.PI / 2;
    baseRing.position.y = -2.5;
    labEnvironment.add(baseRing);

    // Upper Containment Crown & Ring
    const topCapGeo = new THREE.CylinderGeometry(4.5, 4.2, 0.35, 48);
    const topCap = new THREE.Mesh(topCapGeo, metalPedestalMat);
    topCap.position.y = 3.6;
    labEnvironment.add(topCap);

    const topRing = new THREE.Mesh(baseRingGeo, ringMat);
    topRing.rotation.x = Math.PI / 2;
    topRing.position.y = 3.4;
    labEnvironment.add(topRing);

    // Transparent Borosilicate Containment Cylinder
    const glassChamberGeo = new THREE.CylinderGeometry(4.1, 4.1, 5.9, 48, 1, true);
    const glassChamberMat = new THREE.MeshPhysicalMaterial({
      color: '#38BDF8',
      transparent: true,
      opacity: 0.08,
      roughness: 0.1,
      metalness: 0.1,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const glassChamber = new THREE.Mesh(glassChamberGeo, glassChamberMat);
    glassChamber.position.y = 0.45;
    labEnvironment.add(glassChamber);

    // 4 Structural Vertical Support Pillars around the Chamber
    const pillarGeo = new THREE.CylinderGeometry(0.08, 0.08, 6.2, 16);
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + Math.PI / 4;
      const pillar = new THREE.Mesh(pillarGeo, metalPedestalMat);
      pillar.position.set(Math.cos(angle) * 4.35, 0.45, Math.sin(angle) * 4.35);
      labEnvironment.add(pillar);
    }

    // Energy Core Wave / Shockwave Torus (Visible during reaction transition)
    const waveRingGeo = new THREE.TorusGeometry(0.5, 0.04, 16, 64);
    const waveRingMat = new THREE.MeshBasicMaterial({
      color: '#38BDF8',
      transparent: true,
      opacity: 0,
    });
    const waveRing = new THREE.Mesh(waveRingGeo, waveRingMat);
    waveRing.rotation.x = Math.PI / 2;
    waveRing.position.y = 0.3;
    scene.add(waveRing);

    // =======================================================================
    // 3. REACTION ENERGY PARTICLE SYSTEM (220 PARTICLES)
    // =======================================================================
    const particleCount = reducedQuality ? 90 : 220;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleVelocities: THREE.Vector3[] = [];
    for (let i = 0; i < particleCount; i++) {
      const r = 0.4 + Math.random() * 3.2;
      const theta = Math.random() * Math.PI * 2;
      const y = -2.0 + Math.random() * 4.8;
      particlePositions[i * 3] = Math.cos(theta) * r;
      particlePositions[i * 3 + 1] = y;
      particlePositions[i * 3 + 2] = Math.sin(theta) * r;
      particleVelocities.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          0.008 + Math.random() * 0.015,
          (Math.random() - 0.5) * 0.02
        )
      );
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: '#06B6D4',
      size: 0.08,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // =======================================================================
    // 4. INTERACTIVE RAYCASTER (CLICK MOLECULES OR INDIVIDUAL ATOMS)
    // =======================================================================
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };

    const onPointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      const dx = e.clientX - pointerDownPos.x;
      const dy = e.clientY - pointerDownPos.y;
      // Ignore camera drags
      if (Math.hypot(dx, dy) > 6) return;

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const pickableMeshes: THREE.Object3D[] = [];
      moleculeGroupsRef.current.forEach((group) => {
        group.traverse((child) => {
          if ((child as THREE.Mesh).isMesh && child.userData?.isAtomMesh) {
            pickableMeshes.push(child);
          }
        });
      });

      const intersects = raycaster.intersectObjects(pickableMeshes, false);
      if (intersects.length > 0) {
        const hit = intersects[0].object;
        const { instanceId, substanceId, atomId, elementSymbol } = hit.userData;
        const worldPos = new THREE.Vector3();
        hit.getWorldPosition(worldPos);
        callbacksRef.current.onSelectMolecule(instanceId, substanceId);
        callbacksRef.current.onSelectAtom({
          instanceId,
          substanceId,
          atomId,
          elementSymbol,
          worldPosition: [worldPos.x, worldPos.y, worldPos.z],
        });
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    // =======================================================================
    // 5. ANIMATION & CINEMATIC REACTION ENGINE LOOP
    // =======================================================================
    let animationFrameId = 0;
    let lastTime = performance.now();

    const animate = (now: number) => {
      animationFrameId = requestAnimationFrame(animate);
      const dtMs = Math.min(now - lastTime, 60);
      lastTime = now;

      const {
        simulationState: simState,
        activeReaction: rxn,
        playbackSpeed: speed,
        isPaused: paused,
        selectedInstanceId: selId,
      } = stateRef.current;

      const effectiveDt = paused ? 0 : dtMs * speed;
      const timeSec = now * 0.001;

      // Update Reaction State Machine Timeline if active
      if (reactionClockRef.current.active && !paused && rxn) {
        reactionClockRef.current.elapsedMs += effectiveDt;
        const t = reactionClockRef.current.elapsedMs;

        // Phase transitions:
        // 0 - 900ms: CINEMATIC_INTRO (camera & balanced arrangement)
        // 900 - 2200ms: MOLECULAR_INTERACTION (reactants approach center, bonds stretch)
        // 2200 - 2900ms: REACTION_TRANSFORMATION (energy flash, swap reactants -> products at 2450ms)
        // 2900 - 4100ms: PRODUCT_FORMATION (products settle into chamber)
        // > 4100ms: RESULTS
        if (t >= 900 && t < 2200 && simState === SimulationState.CINEMATIC_INTRO) {
          callbacksRef.current.onPhaseChange(SimulationState.MOLECULAR_INTERACTION);
        } else if (t >= 2200 && t < 2900 && simState === SimulationState.MOLECULAR_INTERACTION) {
          callbacksRef.current.onPhaseChange(SimulationState.REACTION_TRANSFORMATION);
        }

        if (t >= 2450 && !reactionClockRef.current.swappedToProducts) {
          reactionClockRef.current.swappedToProducts = true;
          callbacksRef.current.onTransformationSwapToProducts();
          callbacksRef.current.onPhaseChange(SimulationState.PRODUCT_FORMATION);
        }

        if (t >= 4100 && !reactionClockRef.current.completed) {
          reactionClockRef.current.completed = true;
          reactionClockRef.current.active = false;
          callbacksRef.current.onPhaseChange(SimulationState.RESULTS);
        }

        // Dynamic lighting and energy wave during transition
        const flashColor = rxn.visualEffectConfig.flashColor || '#38BDF8';
        coreReactionLight.color.set(flashColor);
        waveRingMat.color.set(flashColor);
        particleMat.color.set(rxn.visualEffectConfig.particleColor || '#06B6D4');

        if (t >= 1800 && t <= 3100) {
          const peakProgress = 1 - Math.abs(t - 2450) / 650;
          coreReactionLight.intensity = 1.0 + Math.max(0, peakProgress) * 6.5;
          ambientLight.intensity = 0.35; // Dim background slightly for dramatic contrast
          const ringProgress = Math.max(0, (t - 2200) / 900);
          waveRing.scale.setScalar(1 + ringProgress * 7.5);
          waveRingMat.opacity = Math.max(0, (1 - ringProgress) * 0.75);
        } else {
          coreReactionLight.intensity = THREE.MathUtils.lerp(coreReactionLight.intensity, 0.6, 0.08);
          ambientLight.intensity = THREE.MathUtils.lerp(ambientLight.intensity, 0.75, 0.08);
          waveRingMat.opacity = THREE.MathUtils.lerp(waveRingMat.opacity, 0, 0.15);
        }
      } else {
        coreReactionLight.intensity = THREE.MathUtils.lerp(coreReactionLight.intensity, 0.5, 0.08);
        ambientLight.intensity = THREE.MathUtils.lerp(ambientLight.intensity, 0.75, 0.08);
        waveRingMat.opacity = 0;
      }

      // Animate Chamber Molecular Groups
      const tMs = reactionClockRef.current.elapsedMs;
      moleculeGroupsRef.current.forEach((group, instanceId) => {
        const basePos: THREE.Vector3 = group.userData.basePosition;
        const isProduct = group.userData.isProduct;
        const isExcess = group.userData.isUnreactedExcess;
        const phaseOffset = group.userData.phaseOffset || 0;

        if (!paused) {
          // Gentle axial rotation so 3D geometry is immediately apparent
          group.rotation.y += 0.006 * speed;
          group.rotation.x = Math.sin(timeSec * 0.9 + phaseOffset) * 0.18;
        }

        // Highlight ring scale if selected
        const selRing = group.getObjectByName('selection-halo') as THREE.Mesh | undefined;
        if (selRing) {
          selRing.visible = selId === instanceId;
          if (selRing.visible) {
            selRing.rotation.z = timeSec * 1.5;
          }
        }

        // Position choreography based on reaction state
        if (reactionClockRef.current.active && rxn) {
          const preset = rxn.preset;
          if (!reactionClockRef.current.swappedToProducts && !isExcess) {
            // Reactant approach phase (0 -> 2450ms)
            const approachProgress = THREE.MathUtils.clamp((tMs - 700) / 1700, 0, 1);
            const eased = approachProgress * approachProgress * (3 - 2 * approachProgress);

            if (
              preset === ReactionPreset.DECOMPOSITION ||
              preset === ReactionPreset.THERMAL_DECOMPOSITION
            ) {
              // Vibrate & stretch prior to cleavage
              const vib = Math.sin(now * 0.04) * 0.12 * eased;
              group.position.set(
                basePos.x * (1 - eased * 0.5) + vib,
                basePos.y + Math.cos(now * 0.04) * 0.08 * eased,
                basePos.z * (1 - eased * 0.5)
              );
              group.scale.setScalar(1 + eased * 0.18);
            } else {
              // Converge toward reaction center (0, 0.35, 0)
              const targetCenter = new THREE.Vector3(0, 0.35, 0);
              group.position.lerpVectors(basePos, targetCenter, eased * 0.82);
              const scaleFactor = tMs > 2100 ? Math.max(0.2, 1 - (tMs - 2100) / 400) : 1;
              group.scale.setScalar(scaleFactor);
            }
          } else if (reactionClockRef.current.swappedToProducts && isProduct) {
            // Product formation & settling phase (2450 -> 4100ms)
            const formProgress = THREE.MathUtils.clamp((tMs - 2450) / 1400, 0, 1);
            const easedOut = 1 - Math.pow(1 - formProgress, 3);
            const startOrigin = new THREE.Vector3(0, 0.35, 0);

            // If precipitation, AgCl settles gently toward bottom of chamber
            const finalTarget = basePos.clone();
            if (
              rxn.preset === ReactionPreset.PRECIPITATION &&
              group.userData.substanceId === 'AgCl'
            ) {
              finalTarget.y = -1.75;
            }

            group.position.lerpVectors(startOrigin, finalTarget, easedOut);
            group.scale.setScalar(0.25 + easedOut * 0.75);
          }
        } else {
          // Normal floating physics in chamber
          const floatY = Math.sin(timeSec * 1.4 + phaseOffset) * 0.14;
          const targetY =
            rxn?.preset === ReactionPreset.PRECIPITATION &&
            group.userData.substanceId === 'AgCl' &&
            isProduct
              ? -1.75 + floatY * 0.25
              : basePos.y + floatY;
          group.position.x = THREE.MathUtils.lerp(group.position.x, basePos.x, 0.08);
          group.position.y = THREE.MathUtils.lerp(group.position.y, targetY, 0.08);
          group.position.z = THREE.MathUtils.lerp(group.position.z, basePos.z, 0.08);
          group.scale.setScalar(THREE.MathUtils.lerp(group.scale.x, 1, 0.1));
        }
      });

      // Animate Chamber Particles
      const posAttr = particleGeo.getAttribute('position') as THREE.BufferAttribute;
      const speedMult = reactionClockRef.current.active ? 3.5 : 1.0;
      for (let i = 0; i < particleCount; i++) {
        let px = posAttr.getX(i);
        let py = posAttr.getY(i);
        let pz = posAttr.getZ(i);

        if (!paused) {
          py += particleVelocities[i].y * speedMult * speed;
          px += Math.sin(timeSec + i) * 0.003 * speedMult;
          pz += Math.cos(timeSec + i) * 0.003 * speedMult;
          if (py > 2.8) py = -2.2;
        }
        posAttr.setXYZ(i, px, py, pz);
      }
      posAttr.needsUpdate = true;

      controls.update();
      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(animate);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
      controls.dispose();
      renderer.dispose();
    };
  }, [reducedQuality]);

  // =========================================================================
  // SYNCHRONIZE 3D MOLECULAR MESHES WITH CHAMBER STATE & VISUALIZATION OPTIONS
  // =========================================================================
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const currentMap = moleculeGroupsRef.current;
    const incomingIds = new Set(molecules.map((m) => m.instanceId));

    // Remove molecules no longer in state
    currentMap.forEach((group, id) => {
      if (!incomingIds.has(id)) {
        scene.remove(group);
        currentMap.delete(id);
      }
    });

    // Rebuild or update each molecule instance
    molecules.forEach((mol, idx) => {
      const substance = SUBSTANCE_BY_ID[mol.substanceId];
      if (!substance) return;

      // Remove existing group to rebuild cleanly when mode/labels/bonds change
      if (currentMap.has(mol.instanceId)) {
        const oldGrp = currentMap.get(mol.instanceId)!;
        scene.remove(oldGrp);
        currentMap.delete(mol.instanceId);
      }

      const group = new THREE.Group();
      group.position.set(mol.position[0], mol.position[1], mol.position[2]);
      group.userData = {
        instanceId: mol.instanceId,
        substanceId: mol.substanceId,
        basePosition: new THREE.Vector3(...mol.position),
        isProduct: mol.isProduct,
        isUnreactedExcess: mol.isUnreactedExcess,
        phaseOffset: idx * 1.15,
      };

      const coordScale = 0.88; // Scale Angstroms to comfortable 3D viewport units

      // 1. Render Atoms
      substance.atoms.forEach((atom) => {
        const elData = ELEMENT_BY_SYMBOL[atom.elementSymbol];
        const colorHex = elData?.cpkColor || '#38BDF8';
        const baseRadius = elData?.visualRadius || 0.48;

        const radius =
          visualizationMode === 'space-filling'
            ? baseRadius * 1.65
            : visualizationMode === 'wireframe'
            ? baseRadius * 0.85
            : baseRadius;

        const sphereGeo = new THREE.SphereGeometry(
          radius,
          reducedQuality ? 16 : 28,
          reducedQuality ? 16 : 28
        );
        const sphereMat = new THREE.MeshPhysicalMaterial({
          color: colorHex,
          roughness: 0.22,
          metalness: 0.15,
          clearcoat: 0.6,
          clearcoatRoughness: 0.15,
          wireframe: visualizationMode === 'wireframe',
        });

        const atomMesh = new THREE.Mesh(sphereGeo, sphereMat);
        atomMesh.position.set(
          atom.position[0] * coordScale,
          atom.position[1] * coordScale,
          atom.position[2] * coordScale
        );
        atomMesh.castShadow = !reducedQuality;
        atomMesh.userData = {
          isAtomMesh: true,
          instanceId: mol.instanceId,
          substanceId: mol.substanceId,
          atomId: atom.id,
          elementSymbol: atom.elementSymbol,
        };
        group.add(atomMesh);

        // Atom Symbol Label Sprite
        if (showAtomLabels) {
          const cacheKey = `${atom.elementSymbol}_${colorHex}`;
          let tex = labelTextureCacheRef.current.get(cacheKey);
          if (!tex) {
            tex = createAtomLabelTexture(atom.elementSymbol, colorHex);
            labelTextureCacheRef.current.set(cacheKey, tex);
          }
          const spriteMat = new THREE.SpriteMaterial({
            map: tex,
            depthTest: false,
            transparent: true,
          });
          const sprite = new THREE.Sprite(spriteMat);
          sprite.position.set(
            atom.position[0] * coordScale,
            atom.position[1] * coordScale + radius + 0.28,
            atom.position[2] * coordScale
          );
          sprite.scale.set(0.48, 0.48, 1);
          group.add(sprite);
        }
      });

      // 2. Render Chemical Bonds (Single, Double, Triple)
      if (showBonds && visualizationMode !== 'space-filling') {
        const atomMap = new Map(substance.atoms.map((a) => [a.id, a]));
        substance.bonds.forEach((bond) => {
          const atomA = atomMap.get(bond.atomAId);
          const atomB = atomMap.get(bond.atomBId);
          if (!atomA || !atomB) return;

          const start = new THREE.Vector3(
            atomA.position[0] * coordScale,
            atomA.position[1] * coordScale,
            atomA.position[2] * coordScale
          );
          const end = new THREE.Vector3(
            atomB.position[0] * coordScale,
            atomB.position[1] * coordScale,
            atomB.position[2] * coordScale
          );

          const dir = new THREE.Vector3().subVectors(end, start);
          const length = dir.length();
          const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

          // Compute perpendicular offset vector for double and triple bonds
          const arbitraryUp =
            Math.abs(dir.clone().normalize().y) > 0.9
              ? new THREE.Vector3(1, 0, 0)
              : new THREE.Vector3(0, 1, 0);
          const perp = new THREE.Vector3().crossVectors(dir, arbitraryUp).normalize();

          const offsets: number[] =
            bond.order === 1
              ? [0]
              : bond.order === 2
              ? [-0.09, 0.09]
              : [-0.14, 0, 0.14];

          offsets.forEach((offsetDist) => {
            const cylGeo = new THREE.CylinderGeometry(
              bond.order === 1 ? 0.075 : 0.048,
              bond.order === 1 ? 0.075 : 0.048,
              length,
              12
            );
            const cylMat = new THREE.MeshStandardMaterial({
              color: '#CBD5E1',
              roughness: 0.35,
              metalness: 0.5,
              wireframe: visualizationMode === 'wireframe',
            });
            const cyl = new THREE.Mesh(cylGeo, cylMat);
            const offsetVec = perp.clone().multiplyScalar(offsetDist);
            cyl.position.copy(mid).add(offsetVec);
            cyl.quaternion.setFromUnitVectors(
              new THREE.Vector3(0, 1, 0),
              dir.clone().normalize()
            );
            group.add(cyl);
          });
        });
      }

      // 3. Optional Bond Angle Arc Overlay (e.g., 104.45° for H2O, 119° for SO2)
      if (showAngleOverlay && substance.atoms.length >= 3 && substance.bondAngle) {
        const a0 = new THREE.Vector3(...substance.atoms[0].position).multiplyScalar(coordScale);
        const a1 = new THREE.Vector3(...substance.atoms[1].position).multiplyScalar(coordScale);
        const a2 = new THREE.Vector3(...substance.atoms[2].position).multiplyScalar(coordScale);
        const v1 = a1.clone().sub(a0).normalize().multiplyScalar(0.55);
        const v2 = a2.clone().sub(a0).normalize().multiplyScalar(0.55);

        const arcPoints: THREE.Vector3[] = [];
        for (let step = 0; step <= 16; step++) {
          const t = step / 16;
          const pt = new THREE.Vector3()
            .lerpVectors(v1, v2, t)
            .normalize()
            .multiplyScalar(0.55)
            .add(a0);
          arcPoints.push(pt);
        }
        const arcGeo = new THREE.BufferGeometry().setFromPoints(arcPoints);
        const arcMat = new THREE.LineBasicMaterial({ color: '#F59E0B' });
        const arcLine = new THREE.Line(arcGeo, arcMat);
        group.add(arcLine);
      }

      // 4. Selection Halo Ring
      const haloGeo = new THREE.RingGeometry(1.15, 1.25, 32);
      const haloMat = new THREE.MeshBasicMaterial({
        color: '#06B6D4',
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      });
      const haloMesh = new THREE.Mesh(haloGeo, haloMat);
      haloMesh.name = 'selection-halo';
      haloMesh.rotation.x = Math.PI / 2;
      haloMesh.position.y = -0.9;
      haloMesh.visible = selectedInstanceId === mol.instanceId;
      group.add(haloMesh);

      scene.add(group);
      currentMap.set(mol.instanceId, group);
    });
  }, [
    molecules,
    visualizationMode,
    showAtomLabels,
    showBonds,
    showAngleOverlay,
    selectedInstanceId,
    reducedQuality,
  ]);

  if (webglLost) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#070A12] text-slate-300 p-8 text-center">
        <p className="text-lg font-semibold text-white mb-2">3D WebGL Context Interrupted</p>
        <p className="text-sm text-slate-400 max-w-md">
          The browser graphics context was paused. Click Reset Camera or reload to restore the 3D molecular chamber.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full cursor-grab active:cursor-grabbing select-none"
      aria-label="Interactive 3D Chemistry Reaction Chamber"
    />
  );
};
