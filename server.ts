import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { initDb, query, hashPassword, verifyPassword } from "./src/db";

dotenv.config();

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "iridology-jwt-secret-982";

// Middleware to authenticate JWT tokens
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token de acceso faltante" });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: "Sesión inválida o expirada" });
    req.user = user;
    next();
  });
}

// Middleware to restrict access to admins
function requireAdmin(req: any, res: any, next: any) {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ error: "Acceso denegado: se requieren permisos de administrador" });
  }
}

// Use higher limit for base64 image uploads
app.use(express.json({ limit: "10mb" }));

// Lazy initializer for Gemini client
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing. Please add it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Unified callAIService supporting both OpenRouter (with any model) and Google GenAI SDK
async function callAIService({
  prompt,
  systemInstruction,
  temperature = 0.3,
  image = null,
  history = [],
}: {
  prompt: string;
  systemInstruction: string;
  temperature?: number;
  image?: { base64: string; mimeType: string } | null;
  history?: Array<{ role: string; text: string }>;
}): Promise<string> {
  const openRouterKey = process.env.OPENROUTER_API_KEY;

  if (openRouterKey) {
    // Standard OpenRouter chat completions format
    const model = process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash";
    const messages: any[] = [];

    if (systemInstruction) {
      messages.push({ role: "system", content: systemInstruction });
    }

    // Add chat history if present
    for (const h of history) {
      messages.push({
        role: h.role === "user" ? "user" : "assistant",
        content: h.text,
      });
    }

    // Add the current message (optionally multimodal)
    if (image) {
      const cleanBase64 = image.base64.includes(",") ? image.base64.split(",")[1] : image.base64;
      messages.push({
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: {
              url: `data:${image.mimeType};base64,${cleanBase64}`,
            },
          },
        ],
      });
    } else {
      messages.push({ role: "user", content: prompt });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openRouterKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/magoex/iridoclinic",
        "X-Title": "Iridoclinic Professional Suite",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter Error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content || "";
    } else {
      throw new Error(`Unexpected OpenRouter response structure: ${JSON.stringify(data)}`);
    }
  } else {
    // Default: use Google GenAI SDK
    const client = getGeminiClient();

    if (image) {
      const cleanBase64 = image.base64.replace(/^data:image\/\w+;base64,/, "");
      const imagePart = {
        inlineData: {
          mimeType: image.mimeType,
          data: cleanBase64,
        },
      };
      const textPart = { text: prompt };

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: { parts: [imagePart, textPart] },
        config: {
          systemInstruction,
          temperature,
        },
      });
      return response.text || "";
    } else if (history && history.length > 0) {
      // Chat with history using Google GenAI SDK
      const mappedHistory = history.map((item) => ({
        role: item.role === "user" ? "user" : "model",
        parts: [{ text: item.text }],
      }));

      const chat = client.chats.create({
        model: "gemini-3.5-flash",
        history: mappedHistory,
        config: {
          systemInstruction,
          temperature,
        },
      });

      const response = await chat.sendMessage({ message: prompt });
      return response.text || "";
    } else {
      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          temperature,
        },
      });
      return response.text || "";
    }
  }
}

// SYSTEM INSTRUCTIONS FOR THE IRIDOLOGY EXPERT
const SYSTEM_INSTRUCTION = `
Actuarás como un Iridólogo Clínico Profesional de nivel avanzado, con un enfoque holístico, científico y basado en la evidencia médica de las escuelas de iridología validadas (como la Escuela Alemana de Josef Deck/Angerer y la Escuela Americana de Bernard Jensen adaptada a la clínica moderna). Tu objetivo no es la adivinación, sino el análisis de la topografía del iris para identificar terrenos genéticos, predisposiciones a la inflamación, niveles de toxicidad tisular y la reactividad del sistema nervioso autónomo.

MARCO TEÓRICO Y CONOCIMIENTO CORE:
- Anatomía y Fisiología del Iris: estroma, epitelio pigmentario posterior, esfínter, y red vascular y nerviosa conectada con el sistema cerebroespinal y simpático.
- Topografía e Iridogramas: zonas concéntricas (digestiva, absorción, utilización, linfática, circulatoria y piel) y cuadrantes sectoriales (órganos específicos).
- Tipologías Constitucionales:
  - Linfática (Fibras visibles, reactividad inmune, acidosis).
  - Hematógena (Marrón puro, predisposición metabólica/hepática, congestión).
  - Mixta o Biliar (Fluctuación entre Linfática y Hematógena, debilidad hepatobiliar).
  - Subtipos específicos: Neurogénica, Ansioso-Tetánica, Hidrogenoide, Hematógena Pura, etc.

PROTOCOLO DE LECTURA DIAGNÓSTICA (ESTRICTO ORDEN DE PRIORIDAD):
1. Densidad del Estroma (Constitución de Base): Seda (excelente), Satén (buena), Lino (mediana), Arpillera/Saco (pobre/débil). Representa la fuerza vital y resiliencia.
2. Signos Estructurales: Lagunas y Criptas (debilidad heredada o adquirida), Rayos Solares (brechas radiales de toxicidad/tensión), Anillos de Tensión o Espasmo (estrés neuromuscular, sobrecarga simpática).
3. Signos de Pigmentación (Heterocromías): manchas de toxinas, manchas de yodo, ferrum, etc., y heterocromías centrales/sectoriales para identificar órganos de choque metabólico (hígado, riñones, páncreas).
4. La Corona del Sistema Nervioso Autónomo (Banda de la Corona): simetría, distensión (atonía) o contracción (espasmos, cólicos).
5. Signos Periféricos: Borde de Costras (eliminación deficiente por piel), Anillo de Sodio/Colesterol (esclerosis vascular, lípidos), Arco Senil.

RIGOR CLÍNICO Y NORMAS ÉTICAS:
- Evita terminología vaga. Utiliza terminología clínica precisa: acidosis tisular, hiperreactividad vagal, estasis linfática, hipofunción glandular, congestión portal, etc.
- EN IRIDOLOGÍA NO SE DIAGNOSTICAN ENFERMEDADES CON NOMBRE PATOLÓGICO (como 'Cáncer' o 'Diabetes'). Se diagnostican estados de los tejidos, debilidades orgánicas, hiperactividad, hipoactividad, congestión y sobrecargas toxémicas. Respeta este principio ético rigurosamente.

FORMATO DE RESPUESTA EXIGIDO:
Debes estructurar tu salida SIEMPRE con la siguiente jerarquía visual exacta (en formato Markdown):

### 📋 Resumen Constitucional (Terreno biológico)
[Análisis detallado de la constitución, subtipo, densidad del estroma, y resiliencia/fuerza vital general del terreno]

### 🔍 Signos Iridianos Clave (Estructurales, Pigmentarios y Reflejos)
[Identificación minuciosa de lagunas, criptas, rayos solares, anillos de tensión, pigmentaciones, estado de la corona del SNA y signos periféricos]

### 🎯 Interpretación Fisiológica (Relación causa-efecto en los sistemas orgánicos)
[Análisis patofisiológico de cómo interactúan estos signos, identificando órganos de choque, acidosis, sobrecargas toxémicas e hiper/hipofunciones sin dar nombres de patologías comerciales o formales]

### 💡 Recomendaciones de Soporte (Orientación naturopática/clínica basada en el terreno observado)
[Pautas terapéuticas de soporte natural: nutrición específica, plantas medicinales adaptógenas/depurativas, hidroterapia, gestión de estrés o estímulos de eliminación tisular acordes al terreno]

### ⚙️ Resumen de Síntomas Comunes (Lenguaje Sencillo)
[A partir del diagnóstico, enumera posibles síntomas cotidianos en lenguaje MUY SENCILLO para el paciente. Usa este formato estricto:
- Sistema Nervioso: [Síntomas separados por comas, ej: Insomnio, estrés, dolores de cabeza]
- Sistema Respiratorio: [Síntomas separados por comas]
- Cardiovascular (Circulatorio) y Linfático: [Síntomas separados por comas, ej: Mala circulación, pesadez]
- Sistema Digestivo: [Síntomas separados por comas, ej: Indigestión, gases, intestino lento]
- Sistema de Eliminación: [Síntomas separados por comas]
Nota: Si no hay hallazgos para un sistema, escribe "Sin síntomas evidentes".]
`;

// --- AUTHENTICATION & DATABASE ROUTES ---

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email y contraseña son obligatorios" });
    }
    const users = await query("SELECT * FROM users WHERE email = ?", [email]);
    const user = users[0];
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );
    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Patients endpoints
app.get("/api/patients", authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const patients = await query("SELECT * FROM patients WHERE user_id = ? ORDER BY name ASC", [userId]);
    res.json({ patients });
  } catch (error: any) {
    console.error("Error fetching patients:", error);
    res.status(500).json({ error: "Error al obtener contactos" });
  }
});

app.post("/api/patients", authenticateToken, async (req: any, res) => {
  try {
    const { name, age, gender, notes } = req.body;
    const userId = req.user.id;
    if (!name) return res.status(400).json({ error: "El nombre es obligatorio" });
    
    await query(
      "INSERT INTO patients (user_id, name, age, gender, notes) VALUES (?, ?, ?, ?, ?)",
      [userId, name, age ? Number(age) : null, gender || "masculino", notes || ""]
    );
    const inserted = await query("SELECT * FROM patients WHERE user_id = ? ORDER BY id DESC LIMIT 1", [userId]);
    res.json({ patient: inserted[0] });
  } catch (error: any) {
    console.error("Error creating patient:", error);
    res.status(500).json({ error: "Error al crear contacto" });
  }
});

// Reports endpoints
app.get("/api/reports", authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const reports = await query(
      `SELECT r.*, p.name as patient_name, p.age as patient_age, p.gender as patient_gender 
       FROM reports r 
       JOIN patients p ON r.patient_id = p.id 
       WHERE r.user_id = ? 
       ORDER BY r.id DESC`,
      [userId]
    );
    res.json({ reports });
  } catch (error: any) {
    console.error("Error fetching reports:", error);
    res.status(500).json({ error: "Error al obtener reportes" });
  }
});

app.post("/api/reports", authenticateToken, async (req: any, res) => {
  try {
    const { patientId, type, date, evaluationJson, reportText } = req.body;
    const userId = req.user.id;
    if (!patientId || !reportText) {
      return res.status(400).json({ error: "Contacto e informe son obligatorios" });
    }
    
    // Verify patient belongs to user
    const patients = await query("SELECT id FROM patients WHERE id = ? AND user_id = ?", [patientId, userId]);
    if (patients.length === 0) {
      return res.status(404).json({ error: "Contacto no encontrado" });
    }

    await query(
      "INSERT INTO reports (patient_id, user_id, type, date, evaluation_json, report_text) VALUES (?, ?, ?, ?, ?, ?)",
      [
        patientId,
        userId,
        type || "photo",
        date || new Date().toLocaleString("es-ES"),
        evaluationJson ? JSON.stringify(evaluationJson) : null,
        reportText
      ]
    );
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error saving report:", error);
    res.status(500).json({ error: "Error al guardar el reporte" });
  }
});

app.delete("/api/reports/:id", authenticateToken, async (req: any, res) => {
  try {
    const reportId = req.params.id;
    const userId = req.user.id;
    
    // Verify report belongs to user
    const reports = await query("SELECT id FROM reports WHERE id = ? AND user_id = ?", [reportId, userId]);
    if (reports.length === 0) {
      return res.status(404).json({ error: "Reporte no encontrado" });
    }
    
    await query("DELETE FROM reports WHERE id = ?", [reportId]);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Delete report error:", error);
    res.status(500).json({ error: "Error al eliminar el reporte" });
  }
});

// User Administration endpoints
app.get("/api/admin/users", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await query("SELECT id, email, role, created_at FROM users ORDER BY email ASC");
    res.json({ users });
  } catch (error: any) {
    console.error("Admin fetch users error:", error);
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
});

app.post("/api/admin/users", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role) {
      return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }
    const existing = await query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: "El correo ya está registrado" });
    }
    const hashedPassword = hashPassword(password);
    await query(
      "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)",
      [email, hashedPassword, role]
    );
    res.json({ success: true });
  } catch (error: any) {
    console.error("Admin create user error:", error);
    res.status(500).json({ error: "Error al crear usuario" });
  }
});

app.put("/api/admin/users/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const { email, password, role } = req.body;
    if (!email || !role) {
      return res.status(400).json({ error: "Email y rol son obligatorios" });
    }

    const existing = await query("SELECT id FROM users WHERE email = ? AND id != ?", [email, userId]);
    if (existing.length > 0) {
      return res.status(400).json({ error: "El correo ya está registrado por otro usuario" });
    }

    if (password) {
      const hashedPassword = hashPassword(password);
      await query(
        "UPDATE users SET email = ?, password_hash = ?, role = ? WHERE id = ?",
        [email, hashedPassword, role, userId]
      );
    } else {
      await query(
        "UPDATE users SET email = ?, role = ? WHERE id = ?",
        [email, role, userId]
      );
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error("Admin update user error:", error);
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
});

app.delete("/api/admin/users/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const userToDelete = await query("SELECT email FROM users WHERE id = ?", [userId]);
    if (userToDelete.length > 0 && userToDelete[0].email === "mangoex@gmail.com") {
      return res.status(400).json({ error: "No se puede eliminar al Super Administrador principal" });
    }

    await query("DELETE FROM users WHERE id = ?", [userId]);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Admin delete user error:", error);
    res.status(500).json({ error: "Error al eliminar usuario" });
  }
});

// Endpoint for manual structured evaluation
app.post("/api/analyze-manual", authenticateToken, async (req, res) => {
  try {
    const {
      patientName,
      age,
      gender,
      constitution,
      subtype,
      density,
      structuralSigns,
      pigmentations,
      autonomicCrown,
      peripheralSigns,
      customNotes,
    } = req.body;

    const prompt = `
Realiza un informe iridológico clínico profesional completo para el siguiente contacto:
- Nombre/ID: ${patientName || "Anónimo"}
- Edad: ${age || "No especificada"} años
- Género: ${gender || "No especificado"}

DATOS OBSERVADOS DE LA TOPOGRAFÍA DEL IRIS:
- Constitución de Base: ${constitution}
- Subtipo Constitucional: ${subtype}
- Densidad del Estroma (Fibras): ${density}
- Signos Estructurales observados: ${Array.isArray(structuralSigns) ? structuralSigns.join(", ") : structuralSigns}
- Signos de Pigmentación / Heterocromías: ${Array.isArray(pigmentations) ? pigmentations.join(", ") : pigmentations}
- Corona del Sistema Nervioso Autónomo (Banda de la Corona): ${autonomicCrown}
- Signos Periféricos observados: ${Array.isArray(peripheralSigns) ? peripheralSigns.join(", ") : peripheralSigns}
- Notas de observación clínica adicionales del profesional: ${customNotes || "Ninguna"}

Por favor, procesa estos signos según el protocolo de lectura diagnóstica estructurado. Recuerda usar terminología iridológica clínica y respetar estrictamente la restricción de NO diagnosticar enfermedades nominales directas, sino terrenos, debilidades tisulares, estados inflamatorios, metabólicos o nerviosos. Sigue la jerarquía visual requerida en tu respuesta.
`;

    const report = await callAIService({
      prompt,
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.2,
    });

    res.json({ report });
  } catch (error: any) {
    console.error("Error in analyze-manual:", error);
    res.status(500).json({ error: error.message || "Error interno del servidor" });
  }
});

// Endpoint for multimodal photo evaluation
app.post("/api/analyze-photo", authenticateToken, async (req, res) => {
  try {
    const { imageBase64, mimeType, patientName, age, gender, additionalNotes } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "No se ha proporcionado ninguna imagen base64." });
    }

    const prompt = `
Analiza detenidamente esta fotografía macro/micro del iris de un contacto clínico.
- Nombre/ID Contacto: ${patientName || "Anónimo"}
- Edad: ${age || "No especificada"}
- Género: ${gender || "No especificado"}
- Notas Clínicas Adicionales: ${additionalNotes || "Ninguna"}

CRÍTICO: No des un diagnóstico de plantilla genérico. Para demostrar que estás evaluando ESTA IMAGEN ESPECÍFICA y no un texto genérico de internet, debes realizar un análisis grounded en la imagen física. 

Sigue estas estrictas directrices en cada sección:

1. EVIDENCIA VISUAL DIRECTA Y CONTROL DE CALIDAD:
   - REGLA DE ORO: Realiza tu mejor esfuerzo para analizar la imagen siempre que se pueda distinguir un ojo humano o iris, incluso si la iluminación es subóptima, la foto está ligeramente desenfocada o no es una toma macro perfecta. Solo debes rechazar la imagen e indicar "ERROR_CALIDAD" si la imagen suministrada NO es la de un ojo humano en absoluto (por ejemplo, si es una foto de un paisaje, un objeto, o un documento) o si la imagen está completamente oscura/blanca de modo que sea imposible distinguir ningún rasgo o color básico.
   - En caso de rechazo absoluto, tu única respuesta debe ser exactamente el siguiente texto (sin Markdown adicional):
     "ERROR_CALIDAD: La imagen proporcionada no tiene la calidad suficiente o no es un iris válido para un estudio iridológico. Por favor, asegúrese de tomar una fotografía enfocada, bien iluminada y centrada en el ojo, y vuelva a intentarlo."
   - Si la imagen muestra un ojo humano pero la calidad es limitada (borrosa o mala iluminación), inicia tu sección de "Resumen Constitucional" con una breve nota aclaratoria para el profesional sobre las limitaciones visuales observadas (por ejemplo: "Nota: La toma presenta desenfoque periférico, por lo que el análisis de signos estructurales en esa zona es de carácter preliminar"), y luego procede con el análisis con la información disponible.
   - Describe sus características visuales reales: la tonalidad exacta observable y la visibilidad de las trabéculas. Menciona al menos 2 detalles visuales únicos de esta foto (como destellos de luz de la cámara, reflejos o sombras, ej: "reflejo blanco a las 11 en punto") para evidenciar que analizas este archivo específico.

2. PROTOCOLO DE EVALUACIÓN SECTORIAL Y SIGNOS ESPECÍFICOS:
   - Identifica la constitución biológica (Linfática, Hematógena, o Mixta/Biliar) justificando con lo que observas (ej. "fibras radiales blancas onduladas bien delineadas" o "estroma aterciopelado homogéneo pigmentado").
   - Evalúa la densidad estromal estimando la resistencia del terreno orgánico, vinculando la densidad a las zonas que se ven en la foto.
   - Busca y ubica de manera explícita signos iridianos clave indicando su localización exacta utilizando las posiciones del reloj iridológico (por ejemplo: "laguna en forma de ojal a las 5 en punto en la zona renal", "rayo solar que se extiende de la corona a la periferia a las 2 en punto", o "anillos de contracción concéntricos visibles en la zona de las 4 a las 8").
   - Describe el estado de la Corona del Sistema Nervioso Autónomo (banda del colarete): si es regular, distendida o contraída, e indica en qué posiciones horarias del reloj se aprecian estas variaciones.
   - Si un signo clásico no es visible en este iris específico, indica explícitamente "No se aprecian signos de... en esta toma" en lugar de inventarlos.

Escribe el informe final respetando estrictamente el formato clínico estructurado:
- ### 📋 Resumen Constitucional (Terreno biológico)
- ### 🔍 Signos Iridianos Clave (Estructurales, Pigmentarios y Reflejos)
- ### 🎯 Interpretación Fisiológica (Relación causa-efecto en los sistemas orgánicos)
- ### 💡 Recomendaciones de Soporte (Orientación naturopática/clínica basada en el terreno observado)
- ### ⚙️ Resumen de Síntomas Comunes (Lenguaje Sencillo)

Recuerda: Usa terminología científica e iridológica pura de las escuelas Josef Deck, Josef Angerer o Bernard Jensen. No nombres enfermedades formales (como diabetes o cirrosis), sino debilidad tisular, acidosis tisular, congestión hepatobiliar, hipofunción renal, etc.
`;

    const report = await callAIService({
      prompt,
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.55,
      image: {
        base64: imageBase64,
        mimeType: mimeType || "image/jpeg",
      },
    });

    res.json({ report });
  } catch (error: any) {
    console.error("Error in analyze-photo:", error);
    res.status(500).json({ error: error.message || "Error interno del servidor" });
  }
});

// Endpoint for general clinical iridology Q&A chat
app.post("/api/chat", authenticateToken, async (req, res) => {
  try {
    const { message, history } = req.body;

    const reply = await callAIService({
      prompt: message,
      systemInstruction: SYSTEM_INSTRUCTION + "\n\nResponde como un colega experto o mentor docente en iridología clínica profesional. Mantén un tono sumamente técnico, respetuoso, didáctico y ético.",
      temperature: 0.4,
      history: history || [],
    });

    res.json({ reply });
  } catch (error: any) {
    console.error("Error in chat:", error);
    res.status(500).json({ error: error.message || "Error interno del servidor" });
  }
});

// Endpoint for product recommendations
app.post("/api/recommend-products", authenticateToken, async (req, res) => {
  try {
    const { report } = req.body;

    if (!report) {
      return res.status(400).json({ error: "No report provided." });
    }

    const productsPath = path.join(process.cwd(), "src", "data", "products.json");
    const productsData = fs.readFileSync(productsPath, "utf-8");

    const prompt = `
Actúa como un Iridólogo Clínico Experto y Asesor Nutricional.
Se te ha proporcionado el siguiente informe clínico iridológico de un contacto:

--- INICIO DEL REPORTE ---
${report}
--- FIN DEL REPORTE ---

Y aquí tienes nuestro catálogo de productos disponibles en la clínica en formato JSON:
--- INICIO DEL CATÁLOGO ---
${productsData}
--- FIN DEL CATÁLOGO ---

Tu tarea es recomendar los mejores productos de este catálogo específicamente para tratar o apoyar las debilidades o hallazgos clínicos mencionados en el reporte del contacto.

REGLAS ESTRICTAS DE SALIDA:
Debes responder ÚNICA Y EXCLUSIVAMENTE con un arreglo (array) en formato JSON puro. No agregues texto antes ni después. No uses bloques de código tipo markdown.
Cada objeto del arreglo debe tener la siguiente estructura exacta:
{
  "id": "id-del-producto",
  "priority": número del 1 al 3 (donde 1 es Indispensable/Principal, 2 es Muy Recomendado, 3 es Opcional/Preventivo),
  "system": "El nombre del sistema del cuerpo al que apoya este producto (ej. 'Sistema Nervioso', 'Cardiovascular', 'Sistema Digestivo', 'Soporte Inmunológico', etc.)",
  "justification": "Breve explicación de 2 o 3 líneas de por qué este producto ayudará al contacto, mencionando los ingredientes clave y el hallazgo del reporte que justifica la recomendación."
}

Solo recomienda productos que realmente apliquen al caso (máximo 5 productos). Si no hay suficientes hallazgos, recomienda al menos 1 producto general como V-ITAX o GENIUS SHAKE si es niño.
La propiedad "id" debe coincidir exactamente con el "id" del catálogo proporcionado.
`;

    const jsonString = await callAIService({
      prompt,
      systemInstruction: "Eres un experto asesor nutricional clínico. Tu salida debe ser única y exclusivamente JSON puro válido, sin markdown, sin backticks ni explicaciones extra.",
      temperature: 0.1,
    });

    try {
      let cleanJson = jsonString.trim();
      // Extraer el arreglo JSON buscando el primer '[' y el último ']'
      const startIdx = cleanJson.indexOf("[");
      const endIdx = cleanJson.lastIndexOf("]");
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        cleanJson = cleanJson.substring(startIdx, endIdx + 1);
      } else {
        // Fallback: limpiar posibles backticks de markdown
        cleanJson = cleanJson.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
      }
      const recommendations = JSON.parse(cleanJson);
      res.json({ recommendations });
    } catch (parseError) {
      console.error("Error parsing AI JSON response:", jsonString);
      res.status(500).json({ error: "La IA no devolvió un formato JSON válido.", raw: jsonString });
    }

  } catch (error: any) {
    console.error("Error in recommend-products:", error);
    res.status(500).json({ error: error.message || "Error interno del servidor" });
  }
});

// Vite middleware setup or production static server
async function startServer() {
  try {
    // Initialize SQLite/PostgreSQL tables and seed superadmin
    await initDb();
  } catch (dbErr) {
    console.error("Critical error during Database Initialization:", dbErr);
    process.exit(1);
  }

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Iridology Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
