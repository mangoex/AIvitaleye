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
      const cleanBase64 = image.base64.replace(/^data:image\/\w+;base64,/, "");
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
Analiza detenidamente esta fotografía macro del iris de un paciente clínico.
- Nombre/ID Paciente: ${patientName || "Anónimo"}
- Edad: ${age || "No especificada"}
- Género: ${gender || "No especificado"}
- Notas Clínicas Adicionales: ${additionalNotes || "Ninguna"}

Realiza tu evaluación iridológica detallada siguiendo minuciosamente cada paso del protocolo clínico:
1. Identifica la constitución primaria (Linfática, Hematógena, Mixta/Biliar) observando el color general del estroma y la disposición de las fibras.
2. Determina la densidad estromal (Seda, Satén, Lino, Arpillera) valorando la resiliencia y separación de las trabéculas.
3. Examina detalladamente el estroma en busca de signos estructurales (Lagunas, criptas, rayos solares, anillos de tensión o espasmo).
4. Analiza signos de pigmentación, heterocromías (central o sectorial) e identifica posibles órganos de choque metabólico según el iridograma tridimensional.
5. Examina el estado y simetría de la Corona del Sistema Nervioso Autónomo (banda del colarete).
6. Identifica signos periféricos (como borde de costras, anillo de sodio/colesterol o arco senil).

Escribe el informe final respetando estrictamente el formato clínico estructurado:
- ### 📋 Resumen Constitucional (Terreno biológico)
- ### 🔍 Signos Iridianos Clave (Estructurales, Pigmentarios y Reflejos)
- ### 🎯 Interpretación Fisiológica (Relación causa-efecto en los sistemas orgánicos)
- ### 💡 Recomendaciones de Soporte (Orientación naturopática/clínica basada en el terreno observado)

Recuerda: Usa terminología científica e iridológica pura. No nombres enfermedades formales (como diabetes o cirrosis), sino debilidad tisular, acidosis tisular, congestión hepatobiliar, hipofunción renal, etc.
`;

    const report = await callAIService({
      prompt,
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.3,
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
