import React, { useRef } from "react";
import { Clipboard, Printer, Download, Sparkles, BookOpen, HeartPulse, Activity, MessageCircle } from "lucide-react";

interface ReportViewerProps {
  reportText: string;
  patientName?: string;
  age?: string;
  gender?: string;
  onSave?: () => void;
  isSaved?: boolean;
}

export default function ReportViewer({
  reportText,
  patientName = "Anónimo",
  age = "No especificada",
  gender = "No especificado",
  onSave,
  isSaved = false
}: ReportViewerProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Helper to parse sections from the markdown text
  const parseSection = (headingRegex: RegExp, nextHeadingRegex?: RegExp): string => {
    const startMatch = reportText.match(headingRegex);
    if (!startMatch || startMatch.index === undefined) return "";
    
    const startIdx = startMatch.index + startMatch[0].length;
    let endIdx = reportText.length;
    
    if (nextHeadingRegex) {
      const nextMatch = reportText.match(nextHeadingRegex);
      if (nextMatch && nextMatch.index !== undefined && nextMatch.index > startMatch.index) {
        endIdx = nextMatch.index;
      }
    }
    
    return reportText.substring(startIdx, endIdx).trim();
  };

  const resumen = parseSection(
    /### 📋 Resumen Constitucional \(Terreno biológico\)/i,
    /### 🔍 Signos Iridianos Clave/i
  ) || parseSection(/📋 Resumen Constitucional/i, /🔍 Signos Iridianos/i);

  const signos = parseSection(
    /### 🔍 Signos Iridianos Clave \(Estructurales, Pigmentarios y Reflejos\)/i,
    /### 🎯 Interpretación Fisiológica/i
  ) || parseSection(/🔍 Signos Iridianos Clave/i, /🎯 Interpretación Fisiológica/i);

  const interpretacion = parseSection(
    /### 🎯 Interpretación Fisiológica \(Relación causa-efecto en los sistemas orgánicos\)/i,
    /### 💡 Recomendaciones de Soporte/i
  ) || parseSection(/🎯 Interpretación Fisiológica/i, /💡 Recomendaciones de Soporte/i);

  const recomendaciones = parseSection(
    /### 💡 Recomendaciones de Soporte \(Orientación naturopática\/clínica basada en el terreno observado\)/i
  ) || parseSection(/💡 Recomendaciones de Soporte/i);

  // Fallback in case parsing fails
  const hasParsedSections = resumen || signos || interpretacion || recomendaciones;

  const handleCopy = () => {
    navigator.clipboard.writeText(reportText);
    alert("Informe copiado al portapapeles con éxito.");
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([reportText], { type: "text/plain;charset=utf-8" });
    element.href = URL.createObjectURL(file);
    element.download = `Informe_Iridologico_${patientName.replace(/\s+/g, "_")}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const formatText = (text: string) => {
    if (!text) return "No se ha podido procesar esta sección.";
    return text.split("\n").map((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
        // Render bullet list
        const content = trimmed.substring(1).trim();
        return (
          <li key={idx} className="ml-4 list-disc text-slate-300 text-sm py-0.5 leading-relaxed">
            {renderBoldText(content)}
          </li>
        );
      }
      if (trimmed.match(/^\d+\./)) {
        // Render numbered list
        const content = trimmed.replace(/^\d+\./, "").trim();
        return (
          <li key={idx} className="ml-4 list-decimal text-slate-300 text-sm py-0.5 leading-relaxed">
            {renderBoldText(content)}
          </li>
        );
      }
      if (trimmed === "") return <div key={idx} className="h-2" />;
      return (
        <p key={idx} className="text-slate-300 text-sm leading-relaxed mb-2">
          {renderBoldText(trimmed)}
        </p>
      );
    });
  };

  const renderBoldText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="text-emerald-300 font-semibold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const handleWhatsApp = () => {
    const disclaimer = "\n\n---\n*Nota de Extensión de responsabilidad médica:* Este reporte es generado por inteligencia artificial con fines informativos y de apoyo nutricional. No sustituye un diagnóstico, tratamiento o consejo médico profesional. Consulte siempre a su médico antes de comenzar cualquier suplementación.";
    const fullMessage = reportText + disclaimer;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(fullMessage)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="space-y-6" id="report-viewer">
      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-xs font-mono font-medium text-emerald-400">Informe Generado Exitosamente</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors border border-slate-700/50"
            title="Copiar texto completo"
          >
            <Clipboard className="w-3.5 h-3.5" />
            <span>Copiar</span>
          </button>
          <button
            onClick={handleWhatsApp}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-medium transition-colors border border-green-500"
            title="Enviar por WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>
          <button
            onClick={handleDownload}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors border border-slate-700/50"
            title="Descargar archivo TXT"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar</span>
          </button>
          <button
            onClick={handlePrint}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors border border-slate-700/50"
            title="Imprimir informe"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir</span>
          </button>
          {onSave && (
            <button
              onClick={onSave}
              disabled={isSaved}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                isSaved
                  ? "bg-emerald-950/40 border-emerald-900/60 text-emerald-400 cursor-default"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isSaved ? "Guardado" : "Guardar"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Printable Area / Report Canvas */}
      <div
        ref={printAreaRef}
        className="bg-slate-950 p-6 sm:p-8 rounded-2xl border border-slate-800/80 shadow-2xl space-y-6"
        id="printable-report-content"
      >
        {/* Printable Header */}
        <div className="border-b border-slate-800 pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-emerald-500 rounded-full" />
              <h2 className="text-xl font-bold text-slate-100 tracking-tight">Evaluación de Iridología Clínica</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-mono">Iridología Clínica - Enfoque Basado en la Evidencia</p>
          </div>
          <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 text-xs font-mono text-slate-300 space-y-1 w-full sm:w-auto">
            <div><span className="text-slate-500">Paciente:</span> <span className="font-semibold text-slate-100">{patientName}</span></div>
            <div className="flex gap-4">
              <div><span className="text-slate-500">Edad:</span> <span className="text-slate-200">{age} años</span></div>
              <div><span className="text-slate-500">Género:</span> <span className="text-slate-200 capitalize">{gender}</span></div>
            </div>
            <div><span className="text-slate-500">Fecha:</span> <span className="text-emerald-400">{new Date().toLocaleDateString("es-ES")}</span></div>
          </div>
        </div>

        {/* Content Section Cards */}
        {hasParsedSections ? (
          <div className="space-y-6">
            {/* 📋 Resumen Constitucional */}
            {resumen && (
              <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-800 hover:border-emerald-900/40 transition-colors">
                <div className="flex items-center gap-2.5 mb-3.5 border-b border-slate-800/80 pb-2.5">
                  <span className="p-1.5 bg-emerald-950 text-emerald-400 rounded-lg">
                    <BookOpen className="w-4 h-4" />
                  </span>
                  <h3 className="text-base font-bold text-slate-100">📋 Resumen Constitucional (Terreno biológico)</h3>
                </div>
                <div className="prose prose-invert max-w-none text-slate-300">
                  {formatText(resumen)}
                </div>
              </div>
            )}

            {/* 🔍 Signos Iridianos Clave */}
            {signos && (
              <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-800 hover:border-blue-900/40 transition-colors">
                <div className="flex items-center gap-2.5 mb-3.5 border-b border-slate-800/80 pb-2.5">
                  <span className="p-1.5 bg-blue-950 text-blue-400 rounded-lg">
                    <Activity className="w-4 h-4" />
                  </span>
                  <h3 className="text-base font-bold text-slate-100">🔍 Signos Iridianos Clave (Estructurales, Pigmentarios y Reflejos)</h3>
                </div>
                <div className="prose prose-invert max-w-none text-slate-300">
                  {formatText(signos)}
                </div>
              </div>
            )}

            {/* 🎯 Interpretación Fisiológica */}
            {interpretacion && (
              <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-800 hover:border-purple-900/40 transition-colors">
                <div className="flex items-center gap-2.5 mb-3.5 border-b border-slate-800/80 pb-2.5">
                  <span className="p-1.5 bg-purple-950 text-purple-400 rounded-lg">
                    <HeartPulse className="w-4 h-4" />
                  </span>
                  <h3 className="text-base font-bold text-slate-100">🎯 Interpretación Fisiológica (Relación causa-efecto en los sistemas orgánicos)</h3>
                </div>
                <div className="prose prose-invert max-w-none text-slate-300">
                  {formatText(interpretacion)}
                </div>
              </div>
            )}

            {/* 💡 Recomendaciones de Soporte */}
            {recomendaciones && (
              <div className="bg-emerald-950/10 p-5 rounded-xl border border-emerald-900/30 hover:border-emerald-800/50 transition-colors">
                <div className="flex items-center gap-2.5 mb-3.5 border-b border-emerald-900/20 pb-2.5">
                  <span className="p-1.5 bg-emerald-900/30 text-emerald-400 rounded-lg">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <h3 className="text-base font-bold text-emerald-400">💡 Recomendaciones de Soporte (Orientación naturopática)</h3>
                </div>
                <div className="prose prose-invert max-w-none text-slate-300">
                  {formatText(recomendaciones)}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Plain-text display fallback if structural parsing fails */
          <div className="bg-slate-900/50 p-5 rounded-xl border border-slate-800 text-slate-300 text-sm whitespace-pre-line leading-relaxed">
            {reportText}
          </div>
        )}

        {/* Clinical Disclaimer Footer */}
        <div className="border-t border-slate-800 pt-6 text-[11px] text-slate-500 space-y-1 leading-relaxed">
          <p>
            <strong>Nota de Exención de Responsabilidad Médica:</strong> La iridología clínica es una ciencia de evaluación de terreno biológico, vitalidad tisular y predisposiciones heredadas o adquiridas. No constituye un diagnóstico de enfermedades patológicas formales ni reemplaza los exámenes médicos clínicos estándares (laboratorio, imagenología, etc.).
          </p>
          <p className="font-mono text-[9px] text-slate-600">
            Generado por el Analizador de Iridología Clínica Profesional • Escuela Alemana & Bernard Jensen.
          </p>
        </div>
      </div>
    </div>
  );
}
