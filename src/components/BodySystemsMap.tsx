import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Info, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';

interface BodySystemsMapProps {
  gender: string;
  report: string | null;
}

type RiskLevel = 'low' | 'medium' | 'high';

interface BodySystem {
  id: string;
  name: string;
  position: { top: string; left: string };
  riskLevel: RiskLevel;
  commonIssues: string[];
  description: string;
  keywords: string[];
}

// Mock Data (Default fallbacks)
const BODY_SYSTEMS: BodySystem[] = [
  {
    id: 'nervous',
    name: 'Sistema Nervioso',
    position: { top: '15%', left: '50%' }, // Head
    riskLevel: 'high',
    commonIssues: ['Estrés acumulado', 'Insomnio', 'Tensión muscular y dolores de cabeza', 'Ansiedad recurrente'],
    description: 'Controla las respuestas al estrés y la relajación. Un nivel alto indica sobrecarga del sistema simpático.',
    keywords: ["nervioso", "estrés", "simpático", "parasimpático", "tensión", "corona", "cabeza", "cerebro", "ansiedad", "insomnio"]
  },
  {
    id: 'respiratory',
    name: 'Sistema Respiratorio',
    position: { top: '28%', left: '50%' }, // Chest
    riskLevel: 'low',
    commonIssues: ['Propensión a alergias', 'Congestión ocasional', 'Sensibilidad a cambios de clima'],
    description: 'Encargado de la oxigenación celular y la eliminación primaria de toxinas gaseosas.',
    keywords: ["respiratorio", "pulmones", "pulmón", "bronquios", "torácica", "tórax", "alergia", "respiratoria"]
  },
  {
    id: 'cardiovascular',
    name: 'Cardiovascular y Linfático',
    position: { top: '34%', left: '58%' }, // Heart / Left chest
    riskLevel: 'medium',
    commonIssues: ['Mala circulación periférica', 'Retención de líquidos', 'Pesadez en piernas'],
    description: 'Gestiona el flujo sanguíneo y el drenaje de desechos celulares.',
    keywords: ["cardiovascular", "corazón", "sangre", "circulación", "venosa", "linfático", "linfa", "vasos", "circulatorio"]
  },
  {
    id: 'digestive',
    name: 'Sistema Digestivo',
    position: { top: '45%', left: '50%' }, // Abdomen Central
    riskLevel: 'high',
    commonIssues: ['Indigestión y acidez', 'Inflamación post-comidas', 'Tránsito lento', 'Gases'],
    description: 'Absorbe nutrientes y procesa desechos. Es el núcleo de la resiliencia metabólica.',
    keywords: ["digestivo", "estómago", "intestinos", "intestinal", "colon", "digestión", "gastrointestinal"]
  },
  {
    id: 'elimination',
    name: 'Sistema de Eliminación (Filtros)',
    position: { top: '56%', left: '50%' }, // Abdomen Bajo / Pelvis
    riskLevel: 'medium',
    commonIssues: ['Sobrecarga de toxinas', 'Fatiga general', 'Problemas menores de piel', 'Cansancio vespertino'],
    description: 'Riñones, hígado y piel. Responsables de limpiar la sangre y mantener el equilibrio químico.',
    keywords: ["eliminación", "riñones", "riñón", "renal", "hígado", "hepático", "piel", "toxinas", "sudor", "urogenital"]
  }
];

export function BodySystemsMap({ gender, report }: BodySystemsMapProps) {
  const [activeSystemId, setActiveSystemId] = useState<string>('digestive');

  const baseSystem = BODY_SYSTEMS.find(s => s.id === activeSystemId) || BODY_SYSTEMS[0];
  const isFemale = gender === 'Femenino' || gender.toLowerCase() === 'femenino' || gender === 'Fem.';

  // --- Motor Dinámico de Extracción de Hallazgos ---
  let dynamicRisk: RiskLevel = baseSystem.riskLevel;
  let dynamicIssues = [...baseSystem.commonIssues];

  if (report) {
    // 1. Chunking del reporte (reutilizando la heurística probada del mapa iridológico)
    const chunks = report
      .replace(/([.!?])\s+(?:[-*]\s+)?(?=[A-Z0-9#])/g, "$1\n")
      .replace(/###.*?\n/g, "")
      .split("\n")
      .map(s => s.trim().replace(/^[-*]\s*/, ""))
      .filter(s => s.length > 15);

    // 2. Filtrado de chunks por palabras clave del sistema activo
    const matches = chunks.filter(sentence => {
      const lower = sentence.toLowerCase();
      return baseSystem.keywords.some(kw => lower.includes(kw));
    });

    // 3. Lógica de Riesgo y Asignación de Hallazgos
    if (matches.length === 0) {
      dynamicRisk = 'low';
      dynamicIssues = ['Sin hallazgos clínicos relevantes detectados por la IA en este sistema.'];
    } else {
      // Limpiar asteriscos y tomar máximo 4 oraciones
      dynamicIssues = matches.map(m => m.replace(/[\*\*]/g, "")).slice(0, 4);
      
      const hasAlarmingKeywords = matches.some(m => {
        const lower = m.toLowerCase();
        return lower.includes('crónico') || lower.includes('grave') || lower.includes('agudo') || lower.includes('severo') || lower.includes('alto riesgo');
      });

      if (matches.length >= 3 || hasAlarmingKeywords) {
        dynamicRisk = 'high';
      } else {
        dynamicRisk = 'medium';
      }
    }
  }

  const activeSystem = {
    ...baseSystem,
    riskLevel: dynamicRisk,
    commonIssues: dynamicIssues
  };

  const riskColors = {
    low: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    medium: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    high: 'text-rose-400 bg-rose-500/10 border-rose-500/30'
  };

  const riskLabels = {
    low: 'Riesgo Bajo',
    medium: 'Riesgo Medio',
    high: 'Riesgo Alto'
  };

  const riskIcons = {
    low: <ShieldCheck className="w-4 h-4" />,
    medium: <AlertTriangle className="w-4 h-4" />,
    high: <Zap className="w-4 h-4" />
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full min-h-[600px] p-2">
      
      {/* Visual Silhouette Area (Left) */}
      <div className="lg:col-span-5 relative bg-slate-900/50 rounded-2xl border border-slate-800/80 flex items-center justify-center p-8 overflow-hidden shadow-inner">
        {/* Abstract Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/10 via-slate-900/0 to-transparent pointer-events-none" />

        {/* SVG Silhouette */}
        <div className="relative w-full max-w-[280px] aspect-[1/2.2] text-slate-700/50 drop-shadow-[0_0_25px_rgba(255,255,255,0.03)]">
          <svg viewBox="0 0 200 480" className="w-full h-full">
            {isFemale ? (
              <>
                <circle cx="100" cy="55" r="28" fill="currentColor" />
                <path d="M 65 105 Q 100 95 135 105 L 145 250 Q 100 270 55 250 Z" fill="currentColor" />
                <path d="M 55 115 Q 35 175 40 240" stroke="currentColor" strokeWidth="16" strokeLinecap="round" fill="none" />
                <path d="M 145 115 Q 165 175 160 240" stroke="currentColor" strokeWidth="16" strokeLinecap="round" fill="none" />
                <path d="M 82 260 L 75 420" stroke="currentColor" strokeWidth="22" strokeLinecap="round" fill="none" />
                <path d="M 118 260 L 125 420" stroke="currentColor" strokeWidth="22" strokeLinecap="round" fill="none" />
              </>
            ) : (
              <>
                <circle cx="100" cy="55" r="30" fill="currentColor" />
                <path d="M 55 105 Q 100 90 145 105 L 130 250 Q 100 260 70 250 Z" fill="currentColor" />
                <path d="M 45 115 Q 30 175 35 240" stroke="currentColor" strokeWidth="20" strokeLinecap="round" fill="none" />
                <path d="M 155 115 Q 170 175 165 240" stroke="currentColor" strokeWidth="20" strokeLinecap="round" fill="none" />
                <path d="M 85 260 L 75 420" stroke="currentColor" strokeWidth="24" strokeLinecap="round" fill="none" />
                <path d="M 115 260 L 125 420" stroke="currentColor" strokeWidth="24" strokeLinecap="round" fill="none" />
              </>
            )}
          </svg>

          {/* Hotspots */}
          {BODY_SYSTEMS.map((system) => {
            const isActive = activeSystemId === system.id;
            return (
              <button
                key={system.id}
                onClick={() => setActiveSystemId(system.id)}
                className={`absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-all duration-300 flex items-center justify-center cursor-pointer ${
                  isActive 
                    ? 'bg-indigo-500/40 border-indigo-400 scale-125 shadow-[0_0_15px_rgba(99,102,241,0.5)] z-20' 
                    : 'bg-slate-800/60 border-slate-600 hover:bg-indigo-500/20 hover:border-indigo-400/50 hover:scale-110 z-10'
                }`}
                style={{ top: system.position.top, left: system.position.left }}
              >
                <div className={`w-2 h-2 rounded-full transition-colors ${isActive ? 'bg-indigo-300' : 'bg-slate-400'}`} />
                
                {/* Pulse ring for active */}
                {isActive && (
                  <span className="absolute inset-0 rounded-full border-2 border-indigo-400 animate-ping opacity-75" />
                )}
              </button>
            );
          })}
        </div>

        {/* Gender Badge */}
        <div className="absolute top-4 left-4 bg-slate-800/80 backdrop-blur border border-slate-700/50 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-400 uppercase tracking-wider">
          Silueta: <span className="text-slate-200">{isFemale ? 'Femenina' : 'Masculina'}</span>
        </div>
      </div>

      {/* Information Panel Area (Right) */}
      <div className="lg:col-span-7 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSystem.id}
            initial={{ opacity: 0, x: 20, filter: 'blur(4px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: -20, filter: 'blur(4px)' }}
            transition={{ duration: 0.3 }}
            className="bg-slate-900/40 border border-slate-800/80 p-8 rounded-2xl shadow-xl relative overflow-hidden"
          >
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <span className="text-xs font-semibold text-indigo-400 uppercase tracking-widest font-mono block mb-2">
                    Análisis de Sistema
                  </span>
                  <h2 className="text-3xl font-bold text-slate-100 font-sans tracking-tight">
                    {activeSystem.name}
                  </h2>
                </div>
                
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${riskColors[activeSystem.riskLevel]} font-medium`}>
                  {riskIcons[activeSystem.riskLevel]}
                  <span className="text-sm">{riskLabels[activeSystem.riskLevel]}</span>
                </div>
              </div>

              <p className="text-slate-400 text-sm leading-relaxed mb-8 font-sans">
                {activeSystem.description}
              </p>

              <div className="bg-slate-950/50 p-6 rounded-xl border border-slate-800/60 shadow-inner">
                <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2 font-mono uppercase tracking-wider">
                  <Activity className="w-4 h-4 text-indigo-400" />
                  Tendencias y Riesgos Comunes
                </h3>
                
                <ul className="space-y-3">
                  {activeSystem.commonIssues.map((issue, idx) => (
                    <li key={idx} className="flex items-start gap-3 group">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/50 mt-1.5 group-hover:bg-indigo-400 transition-colors" />
                      <span className="text-slate-300 text-sm font-sans">{issue}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 flex items-center gap-3 bg-indigo-950/20 border border-indigo-900/30 p-4 rounded-xl">
                <Info className="w-5 h-5 text-indigo-400 shrink-0" />
                <p className="text-xs text-indigo-200/70 font-sans leading-relaxed">
                  Estos niveles de riesgo son una evaluación teórica basada en la topografía iridológica. Para una actualización dinámica, es necesario procesar una fotografía real del iris en la pestaña de Análisis Multimodal.
                </p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
