export interface User {
  id: number;
  email: string;
  role: "admin" | "user";
  created_at?: string;
}

export interface Patient {
  id: number;
  user_id: number;
  name: string;
  age: number;
  gender: string;
  notes: string;
  created_at?: string;
}

export interface DbReport {
  id: number;
  patient_id: number;
  user_id: number;
  type: "manual" | "photo";
  date: string;
  evaluation_json?: string; // JSON string of IridologyEvaluation
  report_text: string;
  created_at?: string;
}

export interface PatientData {
  name: string;
  age: string;
  gender: string;
  notes: string;
}

export interface IridologyEvaluation {
  constitution: string;
  subtype: string;
  density: string;
  structuralSigns: string[];
  pigmentations: string[];
  autonomicCrown: string;
  peripheralSigns: string[];
  customNotes: string;
}

export interface SavedReport {
  id: string;
  date: string;
  patientName: string;
  age: string;
  gender: string;
  type: "manual" | "photo";
  evaluation?: IridologyEvaluation;
  reportText: string;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

// Interactive Iris Map Sector definition
export interface MapSector {
  id: string;
  name: string;
  quadrant: string; // e.g. "Superior (Cerebral)", "Lateral (Pulmones/Brazos)", "Medial (Corazón/Hígado)", "Inferior (Riñones/Pelvis)"
  organs: string[];
  description: string;
  clinicalSignificance: string;
  coordinates: { x: number; y: number; r: number; startAngle?: number; endAngle?: number }; // relative positions or arc details for rendering
  keywords: string[]; // for linking AI reports to this sector
}

export const IRIDOLOGY_SECTORS: MapSector[] = [
  {
    id: "cerebral",
    name: "Zona Cerebral / Sistema Nervioso Superior",
    quadrant: "Superior (11:00 a 1:00)",
    organs: ["Cerebro (Hemisferios)", "Cerebelo", "Glándula Pineal", "Hipófisis", "Área Psíquica", "Área Motora", "Sienes"],
    description: "Zona que regula el sistema nervioso central, la actividad intelectual, la memoria, la coordinación y los estados psíquicos primarios.",
    clinicalSignificance: "La presencia de rayos solares aquí indica alta tensión nerviosa o sobrecarga de toxinas en el sistema cerebroespinal. Lagunas o debilidad de fibra se asocian a fatiga mental, dolores de cabeza congestivos o predisposiciones neurogénicas.",
    coordinates: { x: 50, y: 18, r: 12, startAngle: 240, endAngle: 300 },
    keywords: ["cerebral", "cerebro", "pineal", "cabeza", "psíquica", "nervioso", "mental", "hipófisis", "pituitaria", "memoria", "intelectual", "sienes"]
  },
  {
    id: "respiratoria",
    name: "Zona Torácica / Respiratoria",
    quadrant: "Lateral Externo (2:00 a 3:00 en ojo derecho, 9:00 a 10:00 en ojo izquierdo)",
    organs: ["Pulmones", "Bronquios", "Pleura", "Costillas", "Región Mamaria"],
    description: "Representa el sistema broncopulmonar, la oxigenación tisular y el intercambio gaseoso.",
    clinicalSignificance: "Frecuente aparición de lagunas en forma de 'hoja' o 'lágrima', indicando debilidad bronquial heredada. Una coloración blanquecina (hiperreactividad o catarro) indica congestión linfática o acidosis pulmonar aguda, común en personas con constitución hidrogenoide.",
    coordinates: { x: 80, y: 38, r: 10 },
    keywords: ["respiratoria", "respiratorio", "pulmones", "pulmón", "bronquios", "bronquial", "pleura", "tórax", "torácica", "costillas"]
  },
  {
    id: "hepatobiliar",
    name: "Zona Hepatobiliar (Ojo Derecho Principalmente)",
    quadrant: "Lateral Inferior Derecho (7:00 a 8:00)",
    organs: ["Hígado", "Vesícula Biliar", "Conducto Colédoco"],
    description: "Zona metabólica por excelencia, encargada de la detoxificación hepática y la emulsión de grasas.",
    clinicalSignificance: "La heterocromía sectorial marrón/amarillenta (pigmentos biliares o 'manchas de toxinas') en esta área indica congestión portal, dificultad para procesar lípidos o sobrecarga de toxemia de origen digestivo.",
    coordinates: { x: 30, y: 78, r: 10 },
    keywords: ["hepatobiliar", "hígado", "hepático", "hepática", "vesícula", "biliar", "bilis", "colédoco", "metabólico", "portal"]
  },
  {
    id: "cardiaca",
    name: "Zona Cardiovascular / Mediastino (Ojo Izquierdo)",
    quadrant: "Lateral Interno Izquierdo (2:00 a 3:00)",
    organs: ["Corazón", "Aorta", "Mediastino", "Circulación Coronaria"],
    description: "Regula el bombeo sanguíneo, la oxigenación cardíaca directa y la vitalidad hemodinámica.",
    clinicalSignificance: "Los anillos de espasmo que cruzan este sector sugieren espasmos vasculares o tensión refleja neuromuscular de origen ansioso. El colarete distendido hacia esta zona indica presión intratorácica por gases intestinales (reflejo gastrocardíaco de Roemheld).",
    coordinates: { x: 20, y: 38, r: 10 },
    keywords: ["cardiovascular", "corazón", "cardíaca", "cardíaco", "aorta", "mediastino", "coronaria", "circulatorio", "vascular", "hemodinámica"]
  },
  {
    id: "gastrointestinal",
    name: "Zona Digestiva Central (Estómago e Intestinos)",
    quadrant: "Central (Alrededor de la pupila)",
    organs: ["Estómago", "Duodeno", "Intestino Delgado", "Colon Ascendente", "Colon Transverso", "Colon Descendente"],
    description: "La zona más interna contigua a la pupila. Representa la asimilación de nutrientes, la digestión ácida y la eliminación fecal.",
    clinicalSignificance: "Una corona del SNA (colarete) muy contraída indica espasmo intestinal (predisposición a cólicos, estreñimiento espástico). Si está distendida (atonía), indica estreñimiento crónico o megacolon. Pigmentaciones oscuras aquí sugieren disbiosis intestinal crónica o toxicidad sistémica residual.",
    coordinates: { x: 50, y: 50, r: 16 },
    keywords: ["digestiva", "digestivo", "estómago", "intestinal", "intestino", "colon", "duodeno", "gastrointestinal", "absorción", "asimilación", "pupila", "colarete", "corona simpática", "simpático"]
  },
  {
    id: "urogenital",
    name: "Zona Renal / Urogenital",
    quadrant: "Inferior (5:00 a 6:30)",
    organs: ["Riñones", "Uréteres", "Vejiga", "Glándulas Suprarrenales", "Ovarios / Testículos", "Útero / Próstata"],
    description: "Sistemas de filtración líquida corporal, excreción de urea, regulación de electrolitos y vitalidad endocrina (suprarrenales).",
    clinicalSignificance: "Criptas o lagunas en el cuadrante inferior indican hipofunción renal o predisposición a la retención de líquidos (terreno hidrogenoide). Los rayos solares que nacen de esta zona indican un agotamiento adrenal profundo por estrés crónico.",
    coordinates: { x: 50, y: 82, r: 11 },
    keywords: ["urogenital", "renal", "riñón", "riñones", "vejiga", "suprarrenal", "adrenal", "pélvica", "útero", "próstata", "ovarios", "testículos", "urinario"]
  },
  {
    id: "esplenica",
    name: "Zona Esplénica / Sistema Linfático",
    quadrant: "Lateral Externo Inferior",
    organs: ["Bazo (Ojo Izquierdo, 8:00)", "Páncreas", "Ganglios Linfáticos"],
    description: "Regula la respuesta inmune humoral/celular, la depuración celular y el bazo actúa como cementerio de eritrocitos.",
    clinicalSignificance: "El rosario linfático (puntos blanquecinos o amarillentos en la periferia) indica estasis linfática, congestión inmune y acidosis generalizada del terreno linfático. Indica necesidad de estímulos depurativos y ejercicio.",
    coordinates: { x: 78, y: 72, r: 10 },
    keywords: ["esplénica", "linfático", "linfa", "bazo", "páncreas", "pancreático", "ganglios", "inmune", "inmunológico", "rosario"]
  }
];

// Reference clinical terminology database
export const CLINICAL_GLOSSARY = [
  {
    term: "Linfática (Constitución)",
    description: "Iris azul, gris o verde con fibras estromales visibles. Predisposición a hiperreactividad inmune, problemas catarrales, eccemas y acidosis tisular por acumulo de ácido úrico y láctico."
  },
  {
    term: "Hematógena (Constitución)",
    description: "Iris marrón oscuro puro de aspecto aterciopelado. Las fibras estromales están ocultas por pigmento melánico. Predisposición a congestión hepática, estasis venosa, problemas circulatorios y disturbios metabólicos (lípidos, glucosa)."
  },
  {
    term: "Mixta o Biliar",
    description: "Iris con base clara (azul/verde) recubierto por una capa marrón/amarillenta sobre la zona digestiva y central. Predisposición a hipofunción hepatobiliar, problemas gastrointestinales y fluctuación de toxinas."
  },
  {
    term: "Densidad de Seda",
    description: "Fibras del estroma rectas, compactas y paralelas. Representa una genética con excelente resiliencia, vitalidad elevada y rápida capacidad de curación tras agresiones patológicas."
  },
  {
    term: "Densidad de Arpillera / Saco",
    description: "Fibras del estroma sumamente abiertas, distendidas u onduladas, con lagunas gigantes. Indica un terreno con baja vitalidad orgánica, propensión a la cronicidad y necesidad de cuidados higiénicos constantes."
  },
  {
    term: "Anillos de Tensión",
    description: "Líneas circulares o arcos concéntricos en el estroma medio-periférico. Indican hipertonía simpática, tensión muscular, deficiencia de magnesio tisular y predisposición al estrés psicosomático."
  },
  {
    term: "Rayos Solares",
    description: "Líneas oscuras radiales que parten de la corona del SNA hacia la periferia. Indican canales de toxicidad, hipotonía nerviosa refleja y sobrecarga tóxica de origen intestinal que afecta a los órganos diana periféricos."
  },
  {
    term: "Anillo de Sodio / Colesterol",
    description: "Anillo blanquecino, opaco o translúcido en la periferia del iris. Sugiere esclerosis vascular, mala microcirculación, depósitos inorgánicos de minerales (sodio) y disturbios en el metabolismo lipídico periférico."
  }
];
