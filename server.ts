import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

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

// Endpoint for manual structured evaluation
app.post("/api/analyze-manual", async (req, res) => {
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
Realiza un informe iridológico clínico profesional completo para el siguiente paciente:
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
app.post("/api/analyze-photo", async (req, res) => {
  try {
    const { imageBase64, mimeType, patientName, age, gender, additionalNotes } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "No se ha proporcionado ninguna imagen base64." });
    }

    const prompt = `
Analiza detenidamente esta fotografía macro/micro del iris de un paciente clínico.
- Nombre/ID Paciente: ${patientName || "Anónimo"}
- Edad: ${age || "No especificada"}
- Género: ${gender || "No especificado"}
- Notas Clínicas Adicionales: ${additionalNotes || "Ninguna"}

CRÍTICO: No des un diagnóstico de plantilla genérico. Para demostrar que estás evaluando ESTA IMAGEN ESPECÍFICA y no un texto genérico de internet, debes realizar un análisis grounded en la imagen física. 

Sigue estas estrictas directrices en cada sección:

1. EVIDENCIA VISUAL DIRECTA (Grounded analysis) Y CONTROL DE CALIDAD:
   - REGLA DE ORO: Si la imagen suministrada NO es la de un ojo humano, o si es extremadamente borrosa, desenfocada, o la iluminación impide ver claramente el estroma del iris, DEBES RECHAZAR LA IMAGEN INMEDIATAMENTE.
   - En caso de rechazo, tu única respuesta debe ser exactamente el siguiente texto (sin Markdown adicional):
     "ERROR_CALIDAD: La imagen proporcionada no tiene la calidad suficiente o no es un iris válido para un estudio iridológico. Por favor, asegúrese de tomar una fotografía macro enfocada, bien iluminada y centrada en el ojo, y vuelva a intentarlo."
   - Si la imagen SÍ es válida, describe sus características visuales reales: la tonalidad exacta (ej. "azul grisáceo", "marrón profundo con pigmentos ámbar"), y la nitidez de las trabéculas. Menciona al menos 2 detalles visuales únicos de ESTA foto para probar que la analizaste.
   - Describe destellos de luz de la cámara (glare/reflejos) o sombras sobre el iris (ej. "reflejo blanco en el cuadrante supero-izquierdo a las 10:30").

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
app.post("/api/chat", async (req, res) => {
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

// Vite middleware setup or production static server
async function startServer() {
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
