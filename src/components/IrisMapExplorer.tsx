import React, { useState } from "react";
import { IRIDOLOGY_SECTORS, MapSector } from "../types";
import { Eye, Info, Layers, BookOpen, BrainCircuit } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface IrisMapExplorerProps {
  report?: string | null;
}

export default function IrisMapExplorer({ report }: IrisMapExplorerProps) {
  const [selectedSector, setSelectedSector] = useState<MapSector>(IRIDOLOGY_SECTORS[4]); // default to gastrointestinal (center)
  const [hoveredSectorId, setHoveredSectorId] = useState<string | null>(null);

  // Lógica heurística para extraer hallazgos relevantes basados en palabras clave
  const getRelevantFindings = (): string[] => {
    if (!report || !selectedSector.keywords) return [];
    
    // Convertir el reporte en oraciones usando lookaheads (compatible con todos los navegadores)
    const chunks = report
      .replace(/([.!?])\s+(?:[-*]\s+)?(?=[A-Z0-9#])/g, "$1\n") // Inyectar saltos de línea tras cada punto (incluso si hay viñetas pegadas)
      .replace(/###.*?\n/g, "") // Limpiar títulos markdown
      .split("\n")
      .map(s => s.trim().replace(/^[-*]\s*/, "")) // Limpiar viñetas
      .filter(s => s.length > 15);
      
    const matches = chunks.filter(sentence => {
      const lower = sentence.toLowerCase();
      // Si la oración menciona alguna de las palabras clave del sector seleccionado
      return selectedSector.keywords.some(kw => lower.includes(kw.toLowerCase()));
    });
    
    return matches.slice(0, 4); // Limitar a un máximo de 4 oraciones clave para no saturar UI
  };

  const dynamicFindings = getRelevantFindings();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:bg-slate-900/50 lg:p-6 lg:rounded-2xl lg:border lg:border-slate-800 lg:backdrop-blur-sm" id="map-explorer-container">
      {/* Visual SVG Iris Map (Left Side) */}
      <div className="lg:col-span-6 flex flex-col items-center justify-center p-4 bg-slate-950 rounded-xl border border-slate-800/80 relative overflow-hidden min-h-[400px]">
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-slate-900/90 px-3 py-1.5 rounded-full border border-slate-800 text-xs font-mono text-emerald-400">
          <Eye className="w-3.5 h-3.5 animate-pulse" />
          <span>Iridograma Clínico Interactivo</span>
        </div>

        {/* The Interactive SVG Iris */}
        <div className="w-full max-w-[320px] aspect-square relative my-6">
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full select-none"
            style={{ filter: "drop-shadow(0 0 12px rgba(16, 185, 129, 0.15))" }}
          >
            {/* Background Sclera / Eye outer contour */}
            <circle cx="50" cy="50" r="49" fill="#0f172a" stroke="#1e293b" strokeWidth="1" />
            <circle cx="50" cy="50" r="45" fill="none" stroke="#334155" strokeWidth="0.5" strokeDasharray="2 2" />

            {/* Iris Stromal Fibers background texture */}
            <g opacity="0.35">
              {Array.from({ length: 60 }).map((_, i) => {
                const angle = (i * 360) / 60;
                const x1 = 50 + 16 * Math.cos((angle * Math.PI) / 180);
                const y1 = 50 + 16 * Math.sin((angle * Math.PI) / 180);
                const x2 = 50 + 44 * Math.cos((angle * Math.PI) / 180);
                const y2 = 50 + 44 * Math.sin((angle * Math.PI) / 180);
                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={i % 3 === 0 ? "#10b981" : "#0ea5e9"}
                    strokeWidth="0.2"
                  />
                );
              })}
            </g>

            {/* Concentric Zone: Skin & Lymph Periphery (Ring 6) */}
            <circle cx="50" cy="50" r="43" fill="none" stroke="#0ea5e9" strokeWidth="2" opacity="0.15" />

            {/* SECTOR SLICES */}
            
            {/* 1. Cerebral Sector (Superior) - 11:00 to 1:00 (Angles ~240 to 300) */}
            <path
              d="M 50 50 L 21.4 16.5 A 43 43 0 0 1 78.6 16.5 Z"
              fill={selectedSector.id === "cerebral" ? "rgba(16, 185, 129, 0.25)" : hoveredSectorId === "cerebral" ? "rgba(16, 185, 129, 0.12)" : "rgba(14, 165, 233, 0.04)"}
              stroke={selectedSector.id === "cerebral" ? "#10b981" : "#1e293b"}
              strokeWidth={selectedSector.id === "cerebral" ? "1.5" : "0.5"}
              className="cursor-pointer transition-all duration-300"
              onClick={() => setSelectedSector(IRIDOLOGY_SECTORS[0])}
              onMouseEnter={() => setHoveredSectorId("cerebral")}
              onMouseLeave={() => setHoveredSectorId(null)}
            />

            {/* 2. Respiratory Sector (Right / Lateral East) - Angles 330 to 30 (Angles ~-30 to 30) */}
            <path
              d="M 50 50 L 87.2 28.5 A 43 43 0 0 1 87.2 71.5 Z"
              fill={selectedSector.id === "respiratoria" ? "rgba(16, 185, 129, 0.25)" : hoveredSectorId === "respiratoria" ? "rgba(16, 185, 129, 0.12)" : "rgba(14, 165, 233, 0.04)"}
              stroke={selectedSector.id === "respiratoria" ? "#10b981" : "#1e293b"}
              strokeWidth={selectedSector.id === "respiratoria" ? "1.5" : "0.5"}
              className="cursor-pointer transition-all duration-300"
              onClick={() => setSelectedSector(IRIDOLOGY_SECTORS[1])}
              onMouseEnter={() => setHoveredSectorId("respiratoria")}
              onMouseLeave={() => setHoveredSectorId(null)}
            />

            {/* 3. Renal / Urogenital (Inferior) - Angles 60 to 120 (Angles ~60 to 120) */}
            <path
              d="M 50 50 L 71.5 87.2 A 43 43 0 0 1 28.5 87.2 Z"
              fill={selectedSector.id === "urogenital" ? "rgba(16, 185, 129, 0.25)" : hoveredSectorId === "urogenital" ? "rgba(16, 185, 129, 0.12)" : "rgba(14, 165, 233, 0.04)"}
              stroke={selectedSector.id === "urogenital" ? "#10b981" : "#1e293b"}
              strokeWidth={selectedSector.id === "urogenital" ? "1.5" : "0.5"}
              className="cursor-pointer transition-all duration-300"
              onClick={() => setSelectedSector(IRIDOLOGY_SECTORS[5])}
              onMouseEnter={() => setHoveredSectorId("urogenital")}
              onMouseLeave={() => setHoveredSectorId(null)}
            />

            {/* 4. Hepatobiliar Sector (Lower Left / South West) - Angles 120 to 180 (Angles 120 to 180) */}
            <path
              d="M 50 50 L 28.5 87.2 A 43 43 0 0 1 7 50 Z"
              fill={selectedSector.id === "hepatobiliar" ? "rgba(16, 185, 129, 0.25)" : hoveredSectorId === "hepatobiliar" ? "rgba(16, 185, 129, 0.12)" : "rgba(14, 165, 233, 0.04)"}
              stroke={selectedSector.id === "hepatobiliar" ? "#10b981" : "#1e293b"}
              strokeWidth={selectedSector.id === "hepatobiliar" ? "1.5" : "0.5"}
              className="cursor-pointer transition-all duration-300"
              onClick={() => setSelectedSector(IRIDOLOGY_SECTORS[2])}
              onMouseEnter={() => setHoveredSectorId("hepatobiliar")}
              onMouseLeave={() => setHoveredSectorId(null)}
            />

            {/* 5. Cardiac / Mediastinum (Upper Left / North West) - Angles 180 to 240 */}
            <path
              d="M 50 50 L 7 50 A 43 43 0 0 1 21.4 16.5 Z"
              fill={selectedSector.id === "cardiaca" ? "rgba(16, 185, 129, 0.25)" : hoveredSectorId === "cardiaca" ? "rgba(16, 185, 129, 0.12)" : "rgba(14, 165, 233, 0.04)"}
              stroke={selectedSector.id === "cardiaca" ? "#10b981" : "#1e293b"}
              strokeWidth={selectedSector.id === "cardiaca" ? "1.5" : "0.5"}
              className="cursor-pointer transition-all duration-300"
              onClick={() => setSelectedSector(IRIDOLOGY_SECTORS[3])}
              onMouseEnter={() => setHoveredSectorId("cardiaca")}
              onMouseLeave={() => setHoveredSectorId(null)}
            />

            {/* Concentric Zone: Lymphatic Rosario / Periphery (Dashed Ring) */}
            <circle cx="50" cy="50" r="38" fill="none" stroke="#10b981" strokeWidth="0.8" strokeDasharray="1.5 2" opacity="0.5" />

            {/* Concentric Zone: SNA Crown (Colarete / Autonomic Border) */}
            <path
              d="M 50 50 m -22 0 a 22 22 0 1 0 44 0 a 22 22 0 1 0 -44 0"
              fill="none"
              stroke="#e11d48"
              strokeWidth="0.8"
              strokeDasharray="4 1.5 1 1.5"
              className="animate-pulse"
              style={{ transformOrigin: "center" }}
              opacity="0.85"
            />

            {/* 6. Gastrointestinal Sector (Central Ring around Pupil) */}
            <circle
              cx="50"
              cy="50"
              r="21"
              fill={selectedSector.id === "gastrointestinal" ? "rgba(16, 185, 129, 0.3)" : hoveredSectorId === "gastrointestinal" ? "rgba(16, 185, 129, 0.15)" : "rgba(225, 29, 72, 0.03)"}
              stroke={selectedSector.id === "gastrointestinal" ? "#10b981" : "#e11d48"}
              strokeWidth={selectedSector.id === "gastrointestinal" ? "1.2" : "0.5"}
              className="cursor-pointer transition-all duration-300"
              onClick={() => setSelectedSector(IRIDOLOGY_SECTORS[4])}
              onMouseEnter={() => setHoveredSectorId("gastrointestinal")}
              onMouseLeave={() => setHoveredSectorId(null)}
            />

            {/* Pupil (Deep Black Center) */}
            <circle cx="50" cy="50" r="14" fill="#000000" stroke="#000000" strokeWidth="1" />
            <circle cx="47" cy="47" r="1.5" fill="#ffffff" opacity="0.8" /> {/* light reflection */}
          </svg>

          {/* Glowing Overlay Labels for interactive guidance */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-900/80 rounded border border-slate-700/60 text-[10px] font-mono text-slate-300 pointer-events-none">
            CEREBRAL
          </div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-900/80 rounded border border-slate-700/60 text-[10px] font-mono text-slate-300 pointer-events-none">
            RENAL / VEJIGA
          </div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-slate-900/80 rounded border border-slate-700/60 text-[10px] font-mono text-slate-300 pointer-events-none">
            PULMÓN
          </div>
          <div className="absolute left-0 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-slate-900/80 rounded border border-slate-700/60 text-[10px] font-mono text-slate-300 pointer-events-none">
            CARDÍACO/PORTAL
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <span className="block px-1.5 py-0.5 bg-rose-950/90 border border-rose-800 text-[8px] font-mono font-bold text-rose-300 rounded text-center uppercase tracking-wider">
              SNA
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="w-full grid grid-cols-3 gap-2 mt-2 pt-3 border-t border-slate-800/60 text-center text-[10px] font-mono text-slate-400">
          <div className="flex items-center justify-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#10b981]" />
            <span>Fibras Estromales</span>
          </div>
          <div className="flex items-center justify-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#e11d48]" />
            <span>Colarete / SNA</span>
          </div>
          <div className="flex items-center justify-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#0ea5e9]" />
            <span>Rosario Linfático</span>
          </div>
        </div>
      </div>

      {/* Clinical Details Panels (Right Side) */}
      <div className="lg:col-span-6 flex flex-col justify-between bg-slate-950/40 p-5 rounded-xl border border-slate-800/80" id="sector-details-panel">
        {/* Selector rápido de Sectores para mayor usabilidad */}
        <div className="mb-5 pb-4 border-b border-slate-800/60">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest font-mono block mb-2">
            Navegación Rápida de Sectores:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {IRIDOLOGY_SECTORS.map((sector) => {
              const isActive = selectedSector.id === sector.id;
              return (
                <button
                  key={sector.id}
                  type="button"
                  onClick={() => setSelectedSector(sector)}
                  className={`text-[11px] px-2.5 py-1.5 rounded-lg border transition-all duration-200 font-medium cursor-pointer ${
                    isActive
                      ? "bg-emerald-950/40 border-emerald-500/80 text-emerald-400 font-semibold shadow-[0_0_12px_rgba(16,185,129,0.1)]"
                      : "bg-slate-900/40 hover:bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300"
                  }`}
                >
                  {sector.name.split(" (")[0].split(" / ")[0]}
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={selectedSector.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            {/* Header */}
            <div>
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest font-mono">
                Sector Topográfico Seleccionado
              </span>
              <h3 className="text-xl font-bold text-slate-100 mt-1 flex items-center gap-2">
                {selectedSector.name}
              </h3>
              <p className="text-xs text-slate-400 mt-1 bg-slate-900/60 px-2.5 py-1 rounded border border-slate-800/80 inline-block font-mono">
                Ubicación: <span className="text-slate-300">{selectedSector.quadrant}</span>
              </p>
            </div>

            {/* Description */}
            <div className="bg-slate-900/30 p-3.5 rounded-lg border border-slate-800/50">
              <h4 className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5 mb-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-500" />
                Fisiología y Anatomía Representada:
              </h4>
              <p className="text-sm text-slate-300 leading-relaxed">
                {selectedSector.description}
              </p>
            </div>

            {/* Organs Projected */}
            <div>
              <h4 className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5 mb-2">
                <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                Órganos Proyectados (Cuadrante Tridimensional):
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {selectedSector.organs.map((organ, index) => (
                  <span
                    key={index}
                    className="text-xs px-2.5 py-1 bg-slate-800/50 hover:bg-slate-800 text-slate-300 rounded border border-slate-700/40 transition-colors"
                  >
                    {organ}
                  </span>
                ))}
              </div>
            </div>

            {/* Clinical Interpretation Guidelines */}
            <div className="bg-emerald-950/25 p-4 rounded-lg border border-emerald-900/40">
              <h4 className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5 mb-1.5">
                <Info className="w-3.5 h-3.5" />
                Significación Clínica General (Referencia):
              </h4>
              <p className="text-sm text-emerald-200/90 leading-relaxed font-sans">
                {selectedSector.clinicalSignificance}
              </p>
            </div>

            {/* Dynamic AI Findings (Only visible if a report exists and matches the sector) */}
            {report && dynamicFindings.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-indigo-950/40 p-4 rounded-lg border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.1)] relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full" />
                <h4 className="text-xs font-mono font-bold text-indigo-400 flex items-center gap-1.5 mb-2 relative z-10">
                  <BrainCircuit className="w-4 h-4" />
                  Hallazgos de la IA para esta Zona:
                </h4>
                <ul className="space-y-2 relative z-10">
                  {dynamicFindings.map((finding, idx) => (
                    <li key={idx} className="text-sm text-indigo-100/90 leading-relaxed font-sans flex items-start gap-2">
                      <span className="text-indigo-500 mt-0.5">•</span>
                      <span>{finding.replace(/[\\*\\*]/g, "")}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {/* If there's a report but no findings for this sector */}
            {report && dynamicFindings.length === 0 && (
              <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-800/50 flex gap-2 items-center">
                <Info className="w-4 h-4 text-slate-500" />
                <span className="text-xs text-slate-400 font-sans">
                  La IA no destacó hallazgos específicos de atención prioritaria para la zona {selectedSector.name.split(" ")[1]} en este escaneo.
                </span>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Quick Instructions Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500 font-mono">
          <span>Escuelas de Deck y Bernard Jensen</span>
          <span className="text-emerald-500">Seleccione otra zona en el iris</span>
        </div>
      </div>
    </div>
  );
}
