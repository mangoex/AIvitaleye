import React, { useState, useEffect, useRef } from "react";
import {
  PatientData,
  IridologyEvaluation,
  SavedReport,
  ChatMessage,
  CLINICAL_GLOSSARY,
} from "./types";
import { ManualEvaluationForm } from "./components/ManualEvaluationForm";
import IrisMapExplorer from "./components/IrisMapExplorer";
import { BodySystemsMap } from "./components/BodySystemsMap";
import { ProductRecommendations } from "./components/ProductRecommendations";
import ReportViewer from "./components/ReportViewer";
import {
  Sparkles,
  ClipboardList,
  Camera,
  Map,
  BookOpen,
  MessageSquare,
  History,
  User,
  Plus,
  Trash2,
  FileText,
  AlertCircle,
  HelpCircle,
  Send,
  Loader2,
  Calendar,
  ChevronRight,
  Info,
  Activity,
  HeartPulse,
  Award,
  ShoppingBag,
} from "lucide-react";

// Helper to procedurally generate a high-quality clinical iris image for sandbox simulation
export default function App() {
  // Tab control: "manual" | "photo" | "explorer" | "chat" | "glossary" | "history"
  const [activeTab, setActiveTab] = useState<string>("manual");

  // Patient Info
  const [patient, setPatient] = useState<PatientData>({
    name: "",
    age: "",
    gender: "masculino",
    notes: "",
  });

  // Manual evaluation signs
  const [manualEvaluation, setManualEvaluation] = useState<IridologyEvaluation>({
    constitution: "Linfática",
    subtype: "Fibrilar",
    density: "Seda",
    structuralSigns: [],
    pigmentations: [],
    autonomicCrown: "Simétrica y equilibrada",
    peripheralSigns: [],
    customNotes: "",
  });

  // Photo evaluation
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Start the webcam stream
  const handleStartCamera = async () => {
    setIsCameraActive(true);
    setErrorMsg(null);
    let stream: MediaStream | null = null;

    try {
      // First try: back camera (facingMode environment)
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
    } catch (err: any) {
      console.warn("Could not access environment camera, retrying with default video device:", err);
      try {
        // Second try: fallback to any default camera (more permissive)
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      } catch (fallbackErr: any) {
        console.warn("No physical camera found:", fallbackErr);
        setIsCameraActive(false);
        alert("Permiso de cámara denegado o dispositivo no encontrado. Por favor, suba una foto usando el botón 'Seleccionar Archivo'.");
        return;
      }
    }

    if (stream) {
      setCameraStream(stream);
      // Wait slightly to ensure video element is rendered
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch((err) => {
            console.error("Error starting video play:", err);
          });
        }
      }, 200);
    }
  };

  // Stop the webcam stream
  const handleStopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  };

  // Capture photo from the active webcam feed
  const handleCapturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      // Set canvas dimensions to match the video feed
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg");
        setPhotoPreview(dataUrl);
        // Create a dummy file object for consistency
        try {
          const byteString = atob(dataUrl.split(",")[1]);
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          const blob = new Blob([ab], { type: "image/jpeg" });
          const file = new File([blob], `captura_iris_${Date.now()}.jpg`, { type: "image/jpeg" });
          setPhotoFile(file);
        } catch (e) {
          console.error("Error creating File from captured data:", e);
        }
      }
      handleStopCamera();
    }
  };

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  // Stop camera if we navigate away from photo tab
  useEffect(() => {
    if (activeTab !== "photo") {
      handleStopCamera();
    }
  }, [activeTab]);

  // Status & Reports
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [report, setReport] = useState<string | null>(null);
  const [isReportSaved, setIsReportSaved] = useState<boolean>(false);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [selectedHistoricalReport, setSelectedHistoricalReport] = useState<SavedReport | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "ai",
      text: "Estimado colega, le doy la bienvenida al Asistente Consultor de Iridología Clínica. ¿Qué dudas teóricas, de mapeo sectorial o constitucionales desearía discutir hoy?",
      timestamp: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [chatInput, setChatInput] = useState<string>("");
  const [isChatSending, setIsChatSending] = useState<boolean>(false);

  // Glossary Search
  const [glossarySearch, setGlossarySearch] = useState<string>("");

  // Load saved reports from localStorage
  useEffect(() => {
    const loaded = localStorage.getItem("iridology_reports");
    if (loaded) {
      try {
        setSavedReports(JSON.parse(loaded));
      } catch (e) {
        console.error("Error loading saved reports:", e);
      }
    }
  }, []);

  // Save reports helper
  const persistReports = (newReports: SavedReport[]) => {
    setSavedReports(newReports);
    localStorage.setItem("iridology_reports", JSON.stringify(newReports));
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        setPhotoFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotoPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        alert("Por favor cargue un archivo de imagen válido (JPEG, PNG).");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          const maxDimension = 1024;
          
          if (width > height && width > maxDimension) {
            height *= maxDimension / width;
            width = maxDimension;
          } else if (height > maxDimension) {
            width *= maxDimension / height;
            height = maxDimension;
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            setPhotoPreview(canvas.toDataURL("image/jpeg", 0.85));
          } else {
            setPhotoPreview(reader.result as string); // fallback
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  // Clear photo
  const handleClearPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  // Submit manual evaluation
  const handleAnalyzeManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAnalyzing(true);
    setReport(null);
    setIsReportSaved(false);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/analyze-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName: patient.name,
          age: patient.age,
          gender: patient.gender,
          constitution: manualEvaluation.constitution,
          subtype: manualEvaluation.subtype,
          density: manualEvaluation.density,
          structuralSigns: manualEvaluation.structuralSigns,
          pigmentations: manualEvaluation.pigmentations,
          autonomicCrown: manualEvaluation.autonomicCrown,
          peripheralSigns: manualEvaluation.peripheralSigns,
          customNotes: `${manualEvaluation.customNotes}\n${patient.notes}`.trim(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Ocurrió un error al procesar el análisis");
      }

      const data = await res.json();
      setReport(data.report);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Error al conectar con el servidor de análisis clínico. Verifique la clave de API de Gemini.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Submit Photo analysis
  const handleAnalyzePhoto = async () => {
    if (!photoPreview) return;
    setIsAnalyzing(true);
    setReport(null);
    setIsReportSaved(false);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/analyze-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: photoPreview,
          mimeType: photoFile?.type || "image/jpeg",
          patientName: patient.name,
          age: patient.age,
          gender: patient.gender,
          additionalNotes: patient.notes,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Ocurrió un error al procesar la imagen");
      }

      const data = await res.json();
      
      // Check for strict quality rejection from the AI
      if (data.report && data.report.includes("ERROR_CALIDAD")) {
        // Strip the error code string and throw a clean error
        const cleanMessage = data.report.replace("ERROR_CALIDAD:", "").trim();
        throw new Error(cleanMessage);
      }

      setReport(data.report);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Error de red al procesar el análisis multimodal. Verifique su conexión y secretos de API.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Save report to clinical history
  const handleSaveReport = () => {
    if (!report) return;

    const newReport: SavedReport = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toLocaleDateString("es-ES", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      patientName: patient.name || "Anónimo",
      age: patient.age || "No especificada",
      gender: patient.gender || "No especificado",
      type: activeTab === "manual" ? "manual" : "photo",
      evaluation: activeTab === "manual" ? manualEvaluation : undefined,
      reportText: report,
    };

    const updated = [newReport, ...savedReports];
    persistReports(updated);
    setIsReportSaved(true);
  };

  // Delete saved report
  const handleDeleteReport = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("¿Está seguro de que desea eliminar este informe clínico del historial?")) {
      const filtered = savedReports.filter((r) => r.id !== id);
      persistReports(filtered);
      if (selectedHistoricalReport?.id === id) {
        setSelectedHistoricalReport(null);
      }
    }
  };

  // Send message to chatbot
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      sender: "user",
      text: chatInput,
      timestamp: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsChatSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg.text,
          history: chatMessages.map((m) => ({ role: m.sender === "user" ? "user" : "model", text: m.text })),
        }),
      });

      if (!res.ok) {
        throw new Error("No se pudo obtener respuesta del mentor.");
      }

      const data = await res.json();
      const aiMsg: ChatMessage = {
        id: Math.random().toString(36).substr(2, 9),
        sender: "ai",
        text: data.reply,
        timestamp: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
      };

      setChatMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      console.error(error);
      const errMsg: ChatMessage = {
        id: "err-" + Math.random().toString(36).substr(2, 9),
        sender: "ai",
        text: "Hubo un problema de conexión al procesar la respuesta. Verifique su conexión y la validez de la clave Gemini API.",
        timestamp: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
      };
      setChatMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsChatSending(false);
    }
  };

  // Toggle checklist values helper
  const handleCheckboxChange = (
    field: "structuralSigns" | "pigmentations" | "peripheralSigns",
    value: string
  ) => {
    setManualEvaluation((prev) => {
      const current = prev[field] as string[];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [field]: updated };
    });
  };

  const filteredGlossary = CLINICAL_GLOSSARY.filter(
    (item) =>
      item.term.toLowerCase().includes(glossarySearch.toLowerCase()) ||
      item.description.toLowerCase().includes(glossarySearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Clinically Designed Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30" id="clinical-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-950 border border-emerald-500/40 rounded-xl flex items-center justify-center text-emerald-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-100 tracking-tight">Iridoclinic</h1>
                <span className="text-[10px] bg-emerald-950 border border-emerald-900 text-emerald-400 px-2 py-0.5 rounded font-mono font-semibold">
                  PRO v2.4
                </span>
              </div>
              <p className="text-xs text-slate-400">Plataforma Profesional de Diagnóstico e Interpretación del Iris</p>
            </div>
          </div>

          {/* Quick Stats / System Badge */}
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="bg-slate-950/80 px-3 py-1.5 rounded border border-slate-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-slate-400">Enlace Clínico Gemini Activo</span>
            </div>
            <div className="bg-slate-950/80 px-3 py-1.5 rounded border border-slate-800 text-slate-400 hidden sm:block">
              Reglas: <span className="text-emerald-400">Escuelas Alemana & Jensen</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col lg:flex-row gap-6">
        
        {/* Left Sidebar Menu (Clinical Navigation) */}
        <aside className="w-full lg:w-64 flex-shrink-0" id="navigation-sidebar">
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-4 sticky top-24">
            
            {/* Patient File quick info snippet */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold font-mono uppercase tracking-wider">
                <User className="w-3.5 h-3.5 text-emerald-500" />
                <span>Expediente Activo</span>
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Nombre del Paciente..."
                  value={patient.name}
                  onChange={(e) => setPatient({ ...patient, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-600 font-medium"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Edad..."
                  value={patient.age}
                  onChange={(e) => setPatient({ ...patient, age: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-600"
                />
                <select
                  value={patient.gender}
                  onChange={(e) => setPatient({ ...patient, gender: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-emerald-600"
                >
                  <option value="masculino">Masc.</option>
                  <option value="femenino">Fem.</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <textarea
                placeholder="Notas breves del historial clínico..."
                value={patient.notes}
                onChange={(e) => setPatient({ ...patient, notes: e.target.value })}
                className="w-full h-12 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-600 resize-none"
              />
            </div>

            {/* Menu Links */}
            <div className="space-y-1">
              <div className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-widest px-2 mb-2">
                Módulos de Diagnóstico
              </div>

              <button
                onClick={() => {
                  setActiveTab("manual");
                  setSelectedHistoricalReport(null);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === "manual" && !selectedHistoricalReport
                    ? "bg-emerald-950/50 text-emerald-400 border-l-2 border-emerald-500"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ClipboardList className="w-4 h-4" />
                  <span>Lectura Estructurada</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              <button
                onClick={() => {
                  setActiveTab("photo");
                  setSelectedHistoricalReport(null);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === "photo" && !selectedHistoricalReport
                    ? "bg-emerald-950/50 text-emerald-400 border-l-2 border-emerald-500"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Camera className="w-4 h-4" />
                  <span>Análisis Multimodal (Foto)</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              <button
                onClick={() => {
                  setActiveTab("explorer");
                  setSelectedHistoricalReport(null);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === "explorer" && !selectedHistoricalReport
                    ? "bg-emerald-950/50 text-emerald-400 border-l-2 border-emerald-500"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Map className="w-4 h-4" />
                  <span>Mapa de Zonas Clínico</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              <button
                onClick={() => {
                  setActiveTab("systems");
                  setSelectedHistoricalReport(null);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === "systems" && !selectedHistoricalReport
                    ? "bg-emerald-950/50 text-emerald-400 border-l-2 border-emerald-500"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Activity className="w-4 h-4" />
                  <span>Sistemas del Cuerpo</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              <div className="h-px bg-slate-800/60 my-2" />

              <div className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-widest px-2 mb-2">
                Estudio & Soporte
              </div>

              <button
                onClick={() => {
                  setActiveTab("recommendations");
                  setSelectedHistoricalReport(null);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === "recommendations" && !selectedHistoricalReport
                    ? "bg-emerald-950/50 text-emerald-400 border-l-2 border-emerald-500"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ShoppingBag className="w-4 h-4" />
                  <span>Recomendaciones</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              <button
                onClick={() => {
                  setActiveTab("chat");
                  setSelectedHistoricalReport(null);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === "chat" && !selectedHistoricalReport
                    ? "bg-emerald-950/50 text-emerald-400 border-l-2 border-emerald-500"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="w-4 h-4" />
                  <span>Asistente / Mentor Iridólogo</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              <button
                onClick={() => {
                  setActiveTab("glossary");
                  setSelectedHistoricalReport(null);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === "glossary" && !selectedHistoricalReport
                    ? "bg-emerald-950/50 text-emerald-400 border-l-2 border-emerald-500"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-4 h-4" />
                  <span>Glosario de Signos</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              <button
                onClick={() => {
                  setActiveTab("history");
                  setSelectedHistoricalReport(null);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === "history" || selectedHistoricalReport
                    ? "bg-emerald-950/50 text-emerald-400 border-l-2 border-emerald-500"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <History className="w-4 h-4" />
                  <span>Historial de Informes</span>
                </div>
                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full text-slate-300">
                  {savedReports.length}
                </span>
              </button>
            </div>
          </div>
        </aside>

        {/* Center/Right Dynamic Panel Area */}
        <div className="flex-1 min-w-0 space-y-6" id="primary-dynamic-panel">
          
          {/* Error Banner if any */}
          {errorMsg && (
            <div className="bg-rose-950/60 border border-rose-900/80 p-4 rounded-xl flex items-start gap-3 text-rose-200 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
              <div>
                <p className="font-semibold">Error del Sistema Iridoclinic</p>
                <p className="text-rose-300/90 text-xs mt-1">{errorMsg}</p>
                <button
                  onClick={() => setErrorMsg(null)}
                  className="mt-2 text-xs font-mono font-semibold text-rose-400 hover:underline"
                >
                  Omitir advertencia
                </button>
              </div>
            </div>
          )}

          {/* ACTIVE SCREEN RENDERING */}

          {/* 1. Historically Selected Report Viewer */}
          {selectedHistoricalReport ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setSelectedHistoricalReport(null)}
                  className="text-xs font-mono text-emerald-500 hover:underline flex items-center gap-1.5"
                >
                  &larr; Volver a {activeTab === "history" ? "Historial" : "Análisis"}
                </button>
                <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded">
                  Informe Guardado: {selectedHistoricalReport.date}
                </span>
              </div>
              <ReportViewer
                reportText={selectedHistoricalReport.reportText}
                patientName={selectedHistoricalReport.patientName}
                age={selectedHistoricalReport.age}
                gender={selectedHistoricalReport.gender}
                isSaved={true}
              />
            </div>
          ) : (
            <>
              {/* NORMAL TABS */}

              {/* A. LECTURA DIAGNÓSTICA MANUAL ESTRUCTURADA */}
              {activeTab === "manual" && (
                <div className="space-y-6">
                  {report ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <button
                          onClick={() => setReport(null)}
                          className="text-xs font-mono text-emerald-500 hover:underline flex items-center gap-1"
                        >
                          &larr; Generar Otra Evaluación Manual
                        </button>
                      </div>
                      <ReportViewer
                        reportText={report}
                        patientName={patient.name}
                        age={patient.age}
                        gender={patient.gender}
                        onSave={handleSaveReport}
                        isSaved={isReportSaved}
                      />
                    </div>
                  ) : (
                    <form onSubmit={handleAnalyzeManual} className="space-y-6">
                      <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 space-y-6">
                        
                        {/* Title Section */}
                        <div className="border-b border-slate-800 pb-4">
                          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                            <ClipboardList className="w-5 h-5 text-emerald-400" />
                            Lectura Estructurada de Signos Iridianos
                          </h2>
                          <p className="text-xs text-slate-400 mt-1">
                            Ingrese los hallazgos de su microscopía / macrofotografía de iris para una interpretación clínica profunda guiada por expertos.
                          </p>
                        </div>

                        {/* Row 1: Constitution & Density */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 font-mono uppercase mb-1.5">
                              Constitución de Base
                            </label>
                            <select
                              value={manualEvaluation.constitution}
                              onChange={(e) => setManualEvaluation({ ...manualEvaluation, constitution: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-600"
                            >
                              <option value="Linfática (Base azul/gris)">Linfática (Base azul/gris)</option>
                              <option value="Hematógena (Base marrón pura)">Hematógena (Base marrón pura)</option>
                              <option value="Mixta / Biliar (Fondo claro con pigmentación)">Mixta / Biliar (Fondo claro con pigmentación)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-300 font-mono uppercase mb-1.5">
                              Subtipo Constitucional
                            </label>
                            <select
                              value={manualEvaluation.subtype}
                              onChange={(e) => setManualEvaluation({ ...manualEvaluation, subtype: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-600"
                            >
                              <option value="Fibrilar (Fibras normales rectas)">Fibrilar (Fibras normales rectas)</option>
                              <option value="Neurogénica (Fibras muy apretadas/tensas)">Neurogénica (Fibras muy apretadas/tensas)</option>
                              <option value="Ansioso-Tetánico (Anillos concéntricos)">Ansioso-Tetánico (Anillos concéntricos)</option>
                              <option value="Hidrogenoide (Catarral/Rosario Linfático)">Hidrogenoide (Catarral/Rosario Linfático)</option>
                              <option value="Metabólico (Capa de pigmentos grasos/ácidos)">Metabólico (Capa de pigmentos grasos/ácidos)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-300 font-mono uppercase mb-1.5">
                              Densidad del Estroma (Trabécula)
                            </label>
                            <select
                              value={manualEvaluation.density}
                              onChange={(e) => setManualEvaluation({ ...manualEvaluation, density: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-600"
                            >
                              <option value="Seda (Excelente resiliencia, fibras compactas rectas)">Seda (Excelente vitalidad)</option>
                              <option value="Satén (Buena resiliencia, ligeras ondulaciones)">Satén (Buena vitalidad)</option>
                              <option value="Lino (Mediana resiliencia, fibras abiertas, lagunas)">Lino (Mediana vitalidad)</option>
                              <option value="Arpillera / Saco (Baja resiliencia, lagunas gigantes, fibras sueltas)">Arpillera/Saco (Débil vitalidad)</option>
                            </select>
                          </div>
                        </div>

                        {/* Signos Estructurales Checkbox Grid */}
                        <div className="space-y-3">
                          <label className="block text-xs font-semibold text-slate-300 font-mono uppercase tracking-wider">
                            1. Signos Estructurales Observados (Marque los que apliquen)
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                            {[
                              "Lagunas (Pérdida de sustancia heredada)",
                              "Criptas (Vacíos oscuros pequeños de debilidad orgánica)",
                              "Rayos Solares (Brechas radiales oscuras)",
                              "Anillos de Espasmo / Tensión (Arcos circulares)",
                              "Fibras Abiertas (Defecto de elasticidad de tejido)",
                              "Ulcera de Borde (Pérdida en SNA)",
                            ].map((sign) => (
                              <label key={sign} className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer hover:text-white transition-colors">
                                <input
                                  type="checkbox"
                                  checked={manualEvaluation.structuralSigns.includes(sign)}
                                  onChange={() => handleCheckboxChange("structuralSigns", sign)}
                                  className="mt-0.5 rounded border-slate-800 bg-slate-900 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-slate-950 h-3.5 w-3.5"
                                />
                                <span>{sign}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Signos Pigmentarios / Heterocromías */}
                        <div className="space-y-3">
                          <label className="block text-xs font-semibold text-slate-300 font-mono uppercase tracking-wider">
                            2. Heterocromías y Manchas Toxémicas / Metabólicas
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                            {[
                              "Heterocromía Central (Marrón/Amarillo alrededor de pupila)",
                              "Heterocromía Sectorial (Sector de color diferente)",
                              "Manchas de Toxinas (Biliar/Ácido úrico acumulado)",
                              "Manchas de Yodo (Pigmentación naranja rojizo)",
                              "Ferrum (Manchas de hierro color óxido)",
                              "Porfirina (Área de choque pancreático/bazo)",
                            ].map((sign) => (
                              <label key={sign} className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer hover:text-white transition-colors">
                                <input
                                  type="checkbox"
                                  checked={manualEvaluation.pigmentations.includes(sign)}
                                  onChange={() => handleCheckboxChange("pigmentations", sign)}
                                  className="mt-0.5 rounded border-slate-800 bg-slate-900 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-slate-950 h-3.5 w-3.5"
                                />
                                <span>{sign}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Autonomic Crown State */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 font-mono uppercase mb-1.5">
                              3. Corona del SNA (Banda del Colarete)
                            </label>
                            <select
                              value={manualEvaluation.autonomicCrown}
                              onChange={(e) => setManualEvaluation({ ...manualEvaluation, autonomicCrown: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-600"
                            >
                              <option value="Equilibrada, simétrica en radio 1/3">Equilibrada, simétrica (Radio 1/3)</option>
                              <option value="Espástica / Contraída (Estrechez estomacal, espasmo)">Espástica / Contraída (Estrangulación digestiva)</option>
                              <option value="Atonía / Distendida (Atonía intestinal general, meteorismo)">Atonía / Distendida (Debilidad intestinal)</option>
                              <option value="Asimétrica (Distorsión en un cuadrante específico)">Asimétrica (Tensión localizada)</option>
                              <option value="Corona dentada o con picos (Hipofunción e hiperexcitación nerviosa)">Dentada con picos (Hipertonía simpática)</option>
                            </select>
                          </div>

                          {/* Peripheral Signs */}
                          <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-slate-300 font-mono uppercase mb-1.5">
                              4. Signos de la Periferia del Iris
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                "Borde de Costras (Toxicidad cutánea)",
                                "Anillo de Sodio/Colesterol",
                                "Arco Senil (Opacidad cerebral)",
                                "Rosario Linfático (Congestión)",
                              ].map((sign) => (
                                <label key={sign} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={manualEvaluation.peripheralSigns.includes(sign)}
                                    onChange={() => handleCheckboxChange("peripheralSigns", sign)}
                                    className="rounded border-slate-800 bg-slate-900 text-emerald-600 h-3.5 w-3.5"
                                  />
                                  <span>{sign}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Custom Observation Notes */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 font-mono uppercase mb-1.5">
                            Notas Clínicas o Topografía de Órganos de Choque detectados
                          </label>
                          <textarea
                            placeholder="Ej. Laguna en cuadrante de riñón a las 6:00, rayos solares extendiéndose a zona cerebral, pigmento biliar a las 7:30..."
                            value={manualEvaluation.customNotes}
                            onChange={(e) => setManualEvaluation({ ...manualEvaluation, customNotes: e.target.value })}
                            className="w-full h-24 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-600"
                          />
                        </div>

                        {/* Form Actions */}
                        <div className="flex justify-end pt-4 border-t border-slate-800">
                          <button
                            type="submit"
                            disabled={isAnalyzing}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-medium text-sm transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {isAnalyzing ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Procesando análisis clínico...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4" />
                                <span>Ejecutar Diagnóstico de Terreno</span>
                              </>
                            )}
                          </button>
                        </div>

                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* B. ANÁLISIS MULTIMODAL CON FOTOGRAFÍA DE MACRO IRIS */}
              {activeTab === "photo" && (
                <div className="space-y-6">
                  {report ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <button
                          onClick={() => setReport(null)}
                          className="text-xs font-mono text-emerald-500 hover:underline flex items-center gap-1"
                        >
                          &larr; Cargar Otra Fotografía de Iris
                        </button>
                      </div>
                      <ReportViewer
                        reportText={report}
                        patientName={patient.name}
                        age={patient.age}
                        gender={patient.gender}
                        onSave={handleSaveReport}
                        isSaved={isReportSaved}
                      />
                    </div>
                  ) : (
                    <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 space-y-6">
                      
                      {/* Title */}
                      <div className="border-b border-slate-800 pb-4">
                        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                          <Camera className="w-5 h-5 text-emerald-400" />
                          Análisis Multimodal de Fotografía de Iris
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">
                          Cargue una fotografía macro de alta calidad del iris para que la IA efectúe un escaneo minucioso de su topografía estromal, fibras, pigmentaciones y coronas del sistema autónomo.
                        </p>
                      </div>

                      {/* File Uploader Container */}
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all ${
                          isDragging
                            ? "border-emerald-500 bg-emerald-950/10"
                            : photoPreview || isCameraActive
                            ? "border-slate-800 bg-slate-950/40"
                            : "border-slate-800 hover:border-slate-700 bg-slate-950/20"
                        }`}
                      >
                        {isCameraActive ? (
                            <div className="w-full max-w-md mx-auto space-y-4 text-center">
                              <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-black aspect-video flex items-center justify-center">
                                <video
                                  ref={videoRef}
                                  autoPlay
                                  playsInline
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute top-2 left-2 bg-emerald-950/80 border border-emerald-800 text-[10px] text-emerald-400 font-mono px-2 py-0.5 rounded flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  Cámara en Vivo
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-center gap-3">
                                <button
                                  type="button"
                                  onClick={handleCapturePhoto}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer hover:scale-105 active:scale-95"
                                >
                                  <Camera className="w-4 h-4" />
                                  Capturar Foto
                                </button>
                                <button
                                  type="button"
                                  onClick={handleStopCamera}
                                  className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                        ) : photoPreview ? (
                          <div className="text-center space-y-4">
                            <div className="relative inline-block">
                              <img
                                src={photoPreview}
                                alt="Iris Preview"
                                className="max-h-[260px] rounded-xl border border-slate-800 shadow-2xl object-contain mx-auto"
                              />
                              <button
                                onClick={handleClearPhoto}
                                className="absolute -top-2 -right-2 bg-rose-600 hover:bg-rose-500 text-white rounded-full p-1.5 shadow-lg transition-colors border border-rose-500"
                                title="Eliminar foto"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="text-xs text-slate-400">
                              Archivo cargado: <span className="font-mono text-emerald-400 font-semibold">{photoFile?.name}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center space-y-4 py-4">
                            <button
                              type="button"
                              onClick={handleStartCamera}
                              title="Activar cámara"
                              className="w-16 h-16 bg-slate-900 hover:bg-slate-850 hover:text-emerald-400 border border-slate-800 hover:border-emerald-500/50 rounded-full flex items-center justify-center text-slate-400 mx-auto transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-lg"
                            >
                              <Camera className="w-7 h-7" />
                            </button>
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-slate-200">Haga clic en la cámara para tomar una foto</p>
                              <p className="text-xs text-slate-500">O arrastre su macrofotografía aquí</p>
                            </div>
                            <div className="pt-2">
                              <label className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all inline-block hover:scale-105 active:scale-95">
                                Seleccionar Archivo
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleFileChange}
                                  className="hidden"
                                />
                              </label>
                            </div>
                            <p className="text-[10px] text-slate-600 font-mono">Formatos recomendados: JPEG, PNG • Máx 10 MB</p>
                          </div>
                        )}
                      </div>

                      {/* Clinical recommendations on capturing photos */}
                      <div className="bg-blue-950/25 p-4 rounded-xl border border-blue-900/40 text-xs text-blue-200/90 leading-relaxed flex gap-3">
                        <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-200">Recomendaciones para una Captura Profesional de Calidad:</p>
                          <ul className="list-disc list-inside space-y-1 font-sans text-slate-400 text-[11px]">
                            <li>Utilice iluminación lateral oblicua para evitar reflejos frontales directos sobre la pupila.</li>
                            <li>Asegúrese de enfocar perfectamente las fibras del estroma y la pupila para un análisis correcto.</li>
                            <li>La imagen debe estar recortada y mostrar preferentemente solo el iris completo en alta resolución.</li>
                          </ul>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex justify-end pt-4 border-t border-slate-800">
                        <button
                          onClick={handleAnalyzePhoto}
                          disabled={isAnalyzing || !photoPreview}
                          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-medium text-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isAnalyzing ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Analizando patrones fotográficos del iris...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" />
                              <span>Analizar Fotografía de Iris</span>
                            </>
                          )}
                        </button>
                      </div>

                    </div>
                  )}
                </div>
              )}

              {/* C. INTERACTIVE ZONE MAP EXPLORER */}
              {activeTab === "explorer" && (
                <div className="space-y-6">
                  {/* UX Disclaimer for Users */}
                  <div className="bg-amber-950/40 border border-amber-900/60 rounded-xl p-4 flex gap-3 items-start shadow-sm">
                    <Info className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-amber-400 uppercase tracking-wide">Atención: Esta sección NO es el resultado de su análisis de foto.</p>
                      <p className="text-xs text-amber-200/80 leading-relaxed font-sans">
                        El "Mapa de Zonas Clínico" es únicamente una enciclopedia estática e interactiva. Los textos aquí mostrados son fijos y le enseñan qué órgano representa cada zona del ojo. 
                        <strong> Los resultados verdaderos de la IA aparecerán directamente en la pestaña "Análisis Multimodal (Foto)" al procesar una imagen.</strong>
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                    <div className="border-b border-slate-800 pb-4 mb-6">
                      <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                        <Map className="w-5 h-5 text-emerald-400" />
                        Mapa Iridológico Interactivo (Referencia Educativa)
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Explore los diferentes sectores del iris según los mapas clínicos clásicos. Haga clic en cada cuadrante para conocer qué sistemas orgánicos se proyectan en él y su interpretación diagnóstica de terreno.
                      </p>
                    </div>

                    <IrisMapExplorer report={report} />
                  </div>
                </div>
              )}

              {/* C2. INTERACTIVE BODY SYSTEMS MAP */}
              {activeTab === "systems" && (
                <div className="space-y-6">
                  <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                    <div className="border-b border-slate-800 pb-4 mb-6">
                      <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-emerald-400" />
                        Sistemas del Cuerpo
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Visualice los niveles de riesgo teórico por sistema corporal basándose en los hallazgos iridológicos generales de la constitución seleccionada.
                      </p>
                    </div>

                    <BodySystemsMap gender={patient.gender} report={report} />
                  </div>
                </div>
              )}

              {/* C3. PRODUCT RECOMMENDATIONS */}
              {activeTab === "recommendations" && (
                <ProductRecommendations report={report} />
              )}

              {/* D. CLINICAL CLINIC ASSISTANT CHAT */}
              {activeTab === "chat" && (
                <div className="space-y-6">
                  <div className="bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden flex flex-col h-[600px]">
                    
                    {/* Chat Header */}
                    <div className="bg-slate-900 p-4 border-b border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-emerald-950 border border-emerald-500/30 rounded-lg flex items-center justify-center text-emerald-400">
                          <MessageSquare className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-200">Asistente Mentor en Iridología Clínica</h3>
                          <p className="text-[10px] text-slate-500 font-mono">Colega Docente e Historial de Escuelas Iridianas</p>
                        </div>
                      </div>

                      {/* Quick preset selector */}
                      <span className="text-[10px] text-slate-400 bg-slate-950 border border-slate-800 px-2 py-1 rounded font-mono">
                        Sesión Técnica Segura
                      </span>
                    </div>

                    {/* Messages Body */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/20" id="chat-messages-container">
                      {chatMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex gap-3 max-w-[85%] ${
                            msg.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                          }`}
                        >
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0 border ${
                              msg.sender === "user"
                                ? "bg-slate-800 border-slate-700 text-slate-300"
                                : "bg-emerald-950 border-emerald-900 text-emerald-400"
                            }`}
                          >
                            {msg.sender === "user" ? "U" : "IA"}
                          </div>
                          <div
                            className={`p-3.5 rounded-2xl text-sm leading-relaxed ${
                              msg.sender === "user"
                                ? "bg-emerald-600 text-white rounded-tr-none"
                                : "bg-slate-900/80 text-slate-200 rounded-tl-none border border-slate-800/80"
                            }`}
                          >
                            <div className="whitespace-pre-line font-sans">
                              {msg.text}
                            </div>
                            <div className="text-[9px] opacity-60 mt-1.5 text-right font-mono">
                              {msg.timestamp}
                            </div>
                          </div>
                        </div>
                      ))}
                      {isChatSending && (
                        <div className="flex gap-3 mr-auto">
                          <div className="w-7 h-7 rounded-full bg-emerald-950 border border-emerald-900 text-emerald-400 flex items-center justify-center text-xs flex-shrink-0">
                            IA
                          </div>
                          <div className="bg-slate-900/80 border border-slate-800/80 px-4 py-3 rounded-2xl rounded-tl-none text-slate-400 text-xs flex items-center gap-2">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                            <span>Mentor iridólogo formulando respuesta científica...</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Suggestions list */}
                    <div className="p-3 border-t border-slate-800 bg-slate-900/40">
                      <div className="flex flex-wrap gap-2">
                        {[
                          "¿Cuál es el terreno de un iris hidrogenoide?",
                          "Explícame la constitución Hematógena",
                          "¿Qué indican los anillos de tensión periféricos?",
                          "Diferencia entre lagunas y criptas",
                        ].map((promptText) => (
                          <button
                            key={promptText}
                            onClick={() => setChatInput(promptText)}
                            className="text-[11px] px-2.5 py-1 bg-slate-800/60 hover:bg-slate-800 text-slate-300 rounded border border-slate-700/40 transition-colors text-left font-sans"
                          >
                            {promptText}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSendMessage} className="p-4 bg-slate-900 border-t border-slate-800 flex gap-2">
                      <input
                        type="text"
                        placeholder="Preguntar sobre tipologías de iris, iridogramas, escuelas, signos..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-600"
                      />
                      <button
                        type="submit"
                        disabled={isChatSending || !chatInput.trim()}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-4 py-2.5 flex items-center justify-center transition-colors disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>

                  </div>
                </div>
              )}

              {/* E. CLINICAL TERMS GLOSSARY */}
              {activeTab === "glossary" && (
                <div className="space-y-6">
                  <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 space-y-6">
                    <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                          <BookOpen className="w-5 h-5 text-emerald-400" />
                          Glosario Clínico de Iridología Científica
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">
                          Base de términos clínicos, constituciones, subtipos y terminología precisa para la microscopía ocular.
                        </p>
                      </div>

                      {/* Search Bar */}
                      <div className="w-full sm:w-64">
                        <input
                          type="text"
                          placeholder="Buscar signo o constitución..."
                          value={glossarySearch}
                          onChange={(e) => setGlossarySearch(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                    </div>

                    {/* Glossary Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredGlossary.map((item, index) => (
                        <div
                          key={index}
                          className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 hover:border-slate-700/60 transition-colors space-y-2"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                            <h3 className="text-sm font-bold text-slate-200">{item.term}</h3>
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed font-sans">
                            {item.description}
                          </p>
                        </div>
                      ))}
                      {filteredGlossary.length === 0 && (
                        <div className="col-span-2 text-center py-12 text-slate-500 text-xs">
                          No se encontraron términos coincidentes. Intente con otra palabra clave.
                        </div>
                      )}
                    </div>

                    {/* Clinical disclaimer regarding terminology */}
                    <div className="bg-emerald-950/20 p-4 rounded-xl border border-emerald-900/30 text-xs text-emerald-200/90 leading-relaxed font-sans">
                      <strong>Uso Ético de la Terminología:</strong> Recuerde que en Iridología Clínica Profesional nos expresamos en términos de "hipofunción", "estasis linfática", "sobrecarga ácida", "espasmo neuromuscular" o "reactividad del terreno". Nunca use diagnósticos nominales médicos oficiales con pacientes de forma temeraria o sin su respectiva validación alopática.
                    </div>
                  </div>
                </div>
              )}

              {/* F. SAVED CLINICAL REPORTS HISTORY */}
              {activeTab === "history" && (
                <div className="space-y-6">
                  <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 space-y-4">
                    <div className="border-b border-slate-800 pb-4">
                      <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                        <History className="w-5 h-5 text-emerald-400" />
                        Historial de Evaluaciones Iridológicas
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Consulte los informes clínicos guardados localmente sobre las constituciones y terrenos observados en sus pacientes.
                      </p>
                    </div>

                    {savedReports.length > 0 ? (
                      <div className="space-y-3">
                        {savedReports.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => setSelectedHistoricalReport(item)}
                            className="bg-slate-950 border border-slate-800/80 hover:border-emerald-900/50 p-4 rounded-xl flex items-center justify-between gap-4 cursor-pointer transition-all hover:bg-slate-950/90 group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 flex-shrink-0 group-hover:text-emerald-400 group-hover:border-emerald-900/40 transition-colors">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-sm font-bold text-slate-200 truncate group-hover:text-slate-100 transition-colors">
                                  {item.patientName}
                                </h3>
                                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500 font-mono mt-0.5">
                                  <span>Edad: {item.age}</span>
                                  <span>Género: {item.gender}</span>
                                  <span>Tipo: {item.type === "manual" ? "Lectura Estructurada" : "Análisis Foto"}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 flex-shrink-0">
                              <span className="text-xs font-mono text-slate-500 hidden sm:block">
                                {item.date}
                              </span>
                              <button
                                onClick={(e) => handleDeleteReport(item.id, e)}
                                className="p-1.5 hover:bg-rose-950/40 text-slate-500 hover:text-rose-400 rounded-lg transition-colors border border-transparent hover:border-rose-900/30"
                                title="Eliminar del historial"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 space-y-3">
                        <History className="w-10 h-10 text-slate-700 mx-auto" />
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-400">Historial de registros vacío</p>
                          <p className="text-xs text-slate-600">Comience realizando una evaluación estructurada o un análisis fotográfico para almacenar sus informes.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </>
          )}

        </div>
      </main>

      {/* Clinical footer branding */}
      <footer className="bg-slate-950 border-t border-slate-900 py-6 text-center text-xs text-slate-500 font-mono mt-12">
        <p>© {new Date().getFullYear()} Iridoclinic Professional Suite • Escuela de Iridología Clínica Aplicada</p>
        <p className="text-slate-600 mt-1">Conexión de IA Médica y Multimodal asistida por Google Gemini LLM</p>
      </footer>
    </div>
  );
}
