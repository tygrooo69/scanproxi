
import { GoogleGenAI, Type } from "@google/genai";
import { ConstructionOrderData } from "../types";

const SYSTEM_INSTRUCTION = `Tu es un agent spécialisé dans l'analyse de documents de construction. Ton rôle est d'extraire des données structurées depuis des scans de bons de commande (PDF).

Instructions d'extraction :
- num_bon_travaux : Extraire le numéro de référence du bon.
- adresse_intervention : Adresse complète du chantier.
- coord_gardien : Nom/Téléphone du contact sur place.
- nom_client : Nom de l'entreprise ou du donneur d'ordre.
- delai_intervention : Période ou durée de validité.
- date_intervention : Date spécifique de rendez-vous si mentionnée.

Règles critiques :
1. CONFIDENTIALITÉ : Ne jamais extraire de prix, de montants HT, TTC ou de taux de TVA. Ignore totalement ces zones.
2. FORMAT : Réponds exclusivement au format JSON.
3. NULLITÉ : Si un champ n'est pas trouvé, inscris null.
4. LANGUE : Conserve le texte original pour les adresses et noms.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    num_bon_travaux: { type: Type.STRING, description: "Référence du bon" },
    adresse_intervention: { type: Type.STRING, description: "Adresse du chantier" },
    coord_gardien: { type: Type.STRING, description: "Contact gardien/client" },
    nom_client: { type: Type.STRING, description: "Nom du donneur d'ordre" },
    delai_intervention: { type: Type.STRING, description: "Délai de validité" },
    date_intervention: { type: Type.STRING, description: "Date prévue" },
  },
  required: ["num_bon_travaux", "adresse_intervention", "coord_gardien", "nom_client", "delai_intervention", "date_intervention"]
};

export async function analyzeConstructionDocument(base64Data: string, mimeType: string): Promise<ConstructionOrderData> {
  // Fix: Directly use process.env.API_KEY when initializing GoogleGenAI
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    // Fix: Using gemini-3-pro-preview for complex data extraction from documents
    model: "gemini-3-pro-preview",
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        },
        {
          text: "Analyse ce document PDF de bon de commande et extrait les informations selon le schéma défini."
        }
      ]
    },
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA
    }
  });

  const text = response.text;
  if (!text) throw new Error("Aucune donnée extraite");

  try {
    return JSON.parse(text) as ConstructionOrderData;
  } catch (err) {
    console.error("Failed to parse JSON response:", text);
    throw new Error("Erreur de parsing des données extraites.");
  }
}
