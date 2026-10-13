/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { Plus, Search, ShieldAlert, X } from 'lucide-react';
import { ALL_118_ELEMENTS } from '../data/elements';
import { REACTIONS } from '../data/reactions';
import { SUBSTANCES, SUBSTANCE_BY_ID } from '../data/substances';
import { ElementData } from '../types/chemistry';

interface PeriodicTableModalProps {
  onClose: () => void;
  onAddSubstanceToChamber: (substanceId: string, quantity: number) => void;
}

const CATEGORY_BORDER_COLOR: Record<string, string> = {
  'Alkali Metal': 'border-purple-500/60 bg-purple-950/30 hover:bg-purple-900/50',
  'Alkaline Earth Metal': 'border-lime-500/60 bg-lime-950/30 hover:bg-lime-900/50',
  'Transition Metal': 'border-cyan-500/50 bg-cyan-950/25 hover:bg-cyan-900/45',
  'Post-Transition Metal': 'border-slate-500/60 bg-slate-900/50 hover:bg-slate-800/70',
  Metalloid: 'border-amber-500/60 bg-amber-950/30 hover:bg-amber-900/50',
  'Reactive Nonmetal': 'border-emerald-500/60 bg-emerald-950/35 hover:bg-emerald-900/55',
  Halogen: 'border-teal-400/60 bg-teal-950/35 hover:bg-teal-900/55',
  'Noble Gas': 'border-sky-400/60 bg-sky-950/35 hover:bg-sky-900/55',
  Lanthanide: 'border-indigo-400/50 bg-indigo-950/30 hover:bg-indigo-900/50',
  Actinide: 'border-rose-400/50 bg-rose-950/30 hover:bg-rose-900/50',
};

export const PeriodicTableModal: React.FC<PeriodicTableModalProps> = ({
  onClose,
  onAddSubstanceToChamber,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedElement, setSelectedElement] = useState<ElementData>(ALL_118_ELEMENTS[0]);

  const categories = useMemo(
    () => ['ALL', ...Array.from(new Set(ALL_118_ELEMENTS.map((e) => e.category)))],
    []
  );

  const matchingCompounds = useMemo(() => {
    return SUBSTANCES.filter((sub) =>
      sub.atoms.some((a) => a.elementSymbol === selectedElement.symbol)
    );
  }, [selectedElement]);

  const matchingReactions = useMemo(() => {
    const subIds = new Set(matchingCompounds.map((c) => c.id));
    return REACTIONS.filter(
      (r) =>
        r.reactants.some((x) => subIds.has(x.substanceId)) ||
        r.products.some((x) => subIds.has(x.substanceId))
    );
  }, [matchingCompounds]);

  const defaultSubstance = selectedElement.defaultSubstanceId
    ? SUBSTANCE_BY_ID[selectedElement.defaultSubstanceId]
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-7xl bg-[#0B0E17] border border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-slate-800 bg-[#0F1626]">
          <div>
            <h2 className="text-lg font-bold text-white">
              Interactive Periodic Table of the 118 Elements
            </h2>
            <p className="text-xs text-slate-400">
              Select any element to inspect electron configuration, oxidation states, and distinguish elemental molecules (e.g., H₂, O₂) from compounds.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search symbol, name, Z..."
                className="pl-9 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 w-52"
              />
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              aria-label="Close Periodic Table"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Category Filter Strip */}
        <div className="px-6 py-2.5 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto bg-[#0B0E17]">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                selectedCategory === cat
                  ? 'bg-cyan-500 text-slate-950 font-semibold'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Main Content Grid: 18-Column Periodic Table + Right Element Profile Drawer */}
        <div className="grid grid-cols-1 xl:grid-cols-12 flex-1 overflow-y-auto">
          {/* Left: 18-Column Grid */}
          <div className="xl:col-span-8 p-4 overflow-x-auto border-b xl:border-b-0 xl:border-r border-slate-800">
            <div
              className="grid gap-1 min-w-[780px]"
              style={{ gridTemplateColumns: 'repeat(18, minmax(0, 1fr))' }}
            >
              {Array.from({ length: 9 }).map((_, rowIdx) => {
                const period = rowIdx + 1;
                return Array.from({ length: 18 }).map((__, colIdx) => {
                  const group = colIdx + 1;
                  const el = ALL_118_ELEMENTS.find(
                    (item) => item.period === period && item.group === group
                  );

                  if (!el) {
                    return (
                      <div
                        key={`empty-${period}-${group}`}
                        className="h-12 rounded opacity-0 pointer-events-none"
                      />
                    );
                  }

                  const q = searchQuery.trim().toLowerCase();
                  const matchesQuery =
                    !q ||
                    el.symbol.toLowerCase().includes(q) ||
                    el.name.toLowerCase().includes(q) ||
                    String(el.atomicNumber) === q;
                  const matchesCat =
                    selectedCategory === 'ALL' || el.category === selectedCategory;
                  const dimmed = !matchesQuery || !matchesCat;
                  const isSelected = selectedElement.atomicNumber === el.atomicNumber;
                  const hasSandboxForm = Boolean(el.defaultSubstanceId);

                  return (
                    <button
                      key={el.atomicNumber}
                      onClick={() => setSelectedElement(el)}
                      className={`h-13 p-1 rounded border text-left transition-all flex flex-col justify-between relative ${
                        CATEGORY_BORDER_COLOR[el.category] ||
                        'border-slate-700 bg-slate-900'
                      } ${
                        isSelected
                          ? 'ring-2 ring-cyan-400 scale-105 z-10'
                          : ''
                      } ${dimmed ? 'opacity-20' : 'opacity-100'}`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[9px] font-mono text-slate-300 tabular-nums leading-none">
                          {el.atomicNumber}
                        </span>
                        {hasSandboxForm && (
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-cyan-400"
                            title="Available directly in 3D Sandbox"
                          />
                        )}
                      </div>
                      <div className="text-xs font-bold text-white leading-tight">
                        {el.symbol}
                      </div>
                      <div className="text-[8px] text-slate-300 truncate w-full leading-none">
                        {el.name}
                      </div>
                    </button>
                  );
                });
              })}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
              <span>
                Rows 8 & 9 display the Lanthanide (Z=58–71) and Actinide (Z=90–103) f-block series.
              </span>
              <span className="font-mono text-cyan-300">
                Cyan corner indicator = Direct elemental substance available for 3D Chamber
              </span>
            </div>
          </div>

          {/* Right: Selected Element Detailed Profile */}
          <div className="xl:col-span-4 p-6 space-y-5 overflow-y-auto bg-[#0F1626]/60">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-xl border-2 flex flex-col items-center justify-center shadow-lg"
                  style={{
                    borderColor: selectedElement.cpkColor,
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                  }}
                >
                  <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                    {selectedElement.atomicNumber}
                  </span>
                  <span className="text-2xl font-bold text-white">
                    {selectedElement.symbol}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {selectedElement.name}
                  </h3>
                  <p className="text-xs text-cyan-400 font-mono">
                    {selectedElement.category} · {selectedElement.standardState}
                  </p>
                  <p className="text-xs text-slate-400 font-mono tabular-nums mt-0.5">
                    Atomic Mass: {selectedElement.atomicMass} u
                  </p>
                </div>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              {selectedElement.summary}
            </p>

            {/* Add Elemental Form to Sandbox Button */}
            {defaultSubstance ? (
              <div className="p-3.5 bg-cyan-950/30 border border-cyan-500/40 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-cyan-300">
                      Standard Molecular / Elemental Form: {defaultSubstance.displayFormula}
                    </div>
                    <div className="text-[11px] text-slate-300">
                      {defaultSubstance.name} ({defaultSubstance.molecularGeometry})
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onAddSubstanceToChamber(defaultSubstance.id, 1);
                      onClose();
                    }}
                    className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add {defaultSubstance.displayFormula} to Chamber
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Note: Under ordinary conditions, {selectedElement.name} is represented in reactions by its standard chemical form ({defaultSubstance.displayFormula}) rather than isolated gas-phase atoms.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-400">
                Elemental {selectedElement.symbol} is cataloged in the reference table. See compounds below for sandbox-ready molecules containing {selectedElement.symbol}.
              </div>
            )}

            {/* Atomic Properties Grid */}
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                <div className="text-slate-400">Electron Configuration</div>
                <div className="font-mono font-semibold text-white mt-0.5">
                  {selectedElement.electronConfiguration}
                </div>
              </div>
              <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                <div className="text-slate-400">Oxidation States</div>
                <div className="font-mono font-semibold text-white mt-0.5">
                  {selectedElement.oxidationStates.join(', ')}
                </div>
              </div>
              <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                <div className="text-slate-400">Electronegativity</div>
                <div className="font-mono font-semibold text-white mt-0.5 tabular-nums">
                  {selectedElement.electronegativity ?? 'N/A'} (Pauling)
                </div>
              </div>
              <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                <div className="text-slate-400">Van der Waals Radius</div>
                <div className="font-mono font-semibold text-white mt-0.5 tabular-nums">
                  {selectedElement.vdwRadius} Å
                </div>
              </div>
            </div>

            {/* Known Sandbox Substances Containing This Element */}
            {matchingCompounds.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-300">
                  Sandbox Substances Containing {selectedElement.symbol} ({matchingCompounds.length})
                </h4>
                <div className="grid grid-cols-1 gap-1.5">
                  {matchingCompounds.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between p-2 bg-slate-900 border border-slate-800 rounded-lg"
                    >
                      <div>
                        <span className="text-xs font-mono font-bold text-cyan-300">
                          {sub.displayFormula}
                        </span>
                        <span className="text-xs text-slate-300 ml-2">{sub.name}</span>
                      </div>
                      <button
                        onClick={() => {
                          onAddSubstanceToChamber(sub.id, 1);
                          onClose();
                        }}
                        className="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-200 rounded transition-colors whitespace-nowrap shrink-0"
                      >
                        + Add to Sandbox
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documented Reactions */}
            {matchingReactions.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold text-slate-300">
                  Documented Reactions ({matchingReactions.length})
                </h4>
                {matchingReactions.slice(0, 4).map((r) => (
                  <div
                    key={r.id}
                    className="p-2 bg-slate-900/70 border border-slate-800 rounded text-xs"
                  >
                    <div className="font-mono text-cyan-300">{r.balancedEquation}</div>
                    <div className="text-slate-400 text-[11px]">{r.name}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Safety Note */}
            <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg flex items-start gap-2 text-xs text-slate-300">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-amber-300">Safety: </span>
                {selectedElement.safetyNote}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
