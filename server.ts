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
        prompt = `Aja como um professor de Direito especialista em ${subject || "Direito"}. 
        Forneça uma explicação detalhada, didática e muito explicativa sobre o tópico: "${topic}". 
        Sub-tópicos relevantes: ${description || "abrangência geral do tema"}.
        Use markdown para formatação. Inclua legislação correlata (especialmente a CF/88 ou Código Civil/Empresarial conforme o caso), 
        exemplos práticos e jurisprudência consolidada do STF/STJ.`;
      } else if (type === "questions") {
        prompt = `Aja como uma banca examinadora de concursos jurídicos de alto nível (OAB, Magistratura).
        Gere 5 questões de múltipla escolha sobre o tema "${topic}" em ${subject || "Direito"} (Contexto: ${description || "geral"}).
        Cada questão deve ter 4 alternativas (A, B, C, D) e apenas uma correta.
        As questões devem ser de nível difícil, abordando letra da lei e súmulas.
        Forneça a resposta correta e uma justificativa detalhada com a base legal para cada questão.
        Retorne em formato JSON: { questions: [ { text, options: {A, B, C, D}, answer, justification } ] }`;
      } else if (type === "discursive") {
        prompt = `Aja como um professor de Direito. Gere 2 questões discursivas (casos práticos complexos) sobre o tema "${topic}" em ${subject || "Direito"} (${description || "geral"}).
        Cada questão deve apresentar um problema jurídico fático e pedir uma fundamentação legal completa.
        Forneça também o padrão de resposta esperado citando artigos específicos.
        Retorne em formato JSON: { questions: [ { text, expected_answer } ] }`;
      } else if (type === "mock-exam") {
        prompt = `Gere um simulado completo com 10 questões de múltipla escolha sobre os principais tópicos de ${subject || "Direito"}.
        Inclua também 1 questão discursiva complexa ao final.
        Retorne em formato JSON: { questions: [ { topic, text, options: {A, B, C, D}, answer, justification } ], discursive: { text, expected_answer } }`;
      } else if (type === "combined-mock") {
        prompt = `Gere um simulado interdisciplinar de alto nível.
        15 Questões objetivas (5 de Direito Constitucional, 5 de Direito Empresarial, 5 de Direito Civil).
        1 Questão discursiva que una as três áreas (ex: um caso de sucessão empresarial com reflexos constitucionais).
        Retorne em formato JSON: { questions: [ { subject, text, options: {A, B, C, D}, answer, justification } ], discursive: { text, expected_answer } }`;
      } else if (type === "flashcards") {
        prompt = `Gere 10 flashcards de memorização ativa sobre o tema "${topic}" em ${subject || "Direito"}.
        Cada flashcard deve ter uma pergunta curta e direta no 'front' e uma resposta precisa no 'back'.
        Foque em prazos, definições legais, competências e súmulas importantes.
        Retorne em formato JSON: { flashcards: [ { front, back } ] }`;
      }

      if (!prompt) {
        return res.status(400).json({ error: "Invalid request type or missing parameters" });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      
      let text = response.text || "";
      
      if (!text || text.trim().length < 10) {
        throw new Error("O modelo retornou uma resposta insuficiente ou vazia. Tente novamente.");
      }

      // Clean JSON if needed
      if (type !== "explanation") {
        // Try to find JSON block
        const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (jsonMatch) {
          text = jsonMatch[0];
        } else {
          // Remove potential markdown fences
          text = text.replace(/```json|```/g, "").trim();
        }
        
        // Final sanity check for JSON
        try {
          JSON.parse(text);
        } catch (je) {
          console.error("JSON Parse cleanup failed:", text);
          throw new Error("Erro na formatação do conteúdo gerado. Por favor, tente novamente.");
        }
      }

      res.json({ content: text });
    } catch (error: any) {
      console.error("Gemini Error:", error);
      const isQuotaError = error.message?.toLowerCase().includes("quota") || 
                          error.message?.toLowerCase().includes("rate limit") ||
                          error.message?.toLowerCase().includes("resource_exhausted");
      
      res.status(isQuotaError ? 429 : 500).json({ 
        error: isQuotaError 
          ? "Limite de solicitações diário atingido. Por favor, tente novamente amanhã ou em alguns minutos. Todo conteúdo já gerado ficará salvo automaticamente." 
          : (error.message || "Failed to generate content") 
      });
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
