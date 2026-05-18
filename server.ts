import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API to generate study content
  app.post("/api/generate-content", async (req, res) => {
    try {
      const { subject, topic, description, type } = req.body;
      
      let prompt = "";
      if (type === "explanation") {
        prompt = `Aja como um professor de Direito especialista em ${subject}. 
        Forneça uma explicação detalhada, didática e muito explicativa sobre o tópico: "${topic}". 
        Sub-tópicos relevantes: ${description}.
        Use markdown para formatação. Inclua legislação correlata (especialmente a CF/88 ou Código Civil/Empresarial conforme o caso), 
        exemplos práticos e jurisprudência consolidada do STF/STJ.`;
      } else if (type === "questions") {
        prompt = `Aja como uma banca examinadora de concursos jurídicos de alto nível (OAB, Magistratura).
        Gere 5 questões de múltipla escolha sobre o tema "${topic}" em ${subject} (Contexto: ${description}).
        Cada questão deve ter 4 alternativas (A, B, C, D) e apenas uma correta.
        As questões devem ser de nível difícil, abordando letra da lei e súmulas.
        Forneça a resposta correta e uma justificativa detalhada com a base legal para cada questão.
        Retorne em formato JSON: { questions: [ { text, options: {A, B, C, D}, answer, justification } ] }`;
      } else if (type === "discursive") {
        prompt = `Aja como um professor de Direito. Gere 2 questões discursivas (casos práticos complexos) sobre o tema "${topic}" em ${subject} (${description}).
        Cada questão deve apresentar um problema jurídico fático e pedir uma fundamentação legal completa.
        Forneça também o padrão de resposta esperado citando artigos específicos.
        Retorne em formato JSON: { questions: [ { text, expected_answer } ] }`;
      } else if (type === "mock-exam") {
        prompt = `Gere um simulado completo com 10 questões de múltipla escolha sobre os principais tópicos de ${subject}.
        Inclua também 1 questão discursiva complexa ao final.
        Retorne em formato JSON: { questions: [ { topic, text, options: {A, B, C, D}, answer, justification } ], discursive: { text, expected_answer } }`;
      } else if (type === "combined-mock") {
        prompt = `Gere um simulado interdisciplinar de alto nível.
        15 Questões objetivas (5 de Direito Constitucional, 5 de Direito Empresarial, 5 de Direito Civil).
        1 Questão discursiva que una as três áreas (ex: um caso de sucessão empresarial com reflexos constitucionais).
        Retorne em formato JSON: { questions: [ { subject, text, options: {A, B, C, D}, answer, justification } ], discursive: { text, expected_answer } }`;
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      
      let text = response.text || "";
      
      // Clean JSON if needed
      if (type !== "explanation") {
        text = text.replace(/```json|```/g, "").trim();
      }

      res.json({ content: text });
    } catch (error: any) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
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
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
