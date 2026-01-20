import { GoogleGenAI, Type } from "@google/genai";
import { ConstructionOrderData } from "../types";

const SYSTEM_INSTRUCTION = `Tu es un agent spécialisé dans l'analyse de documents de construction. Ton rôle est d'extraire des données structurées depuis des scans de bons de commande (PDF).

Instructions d'extraction :
- num_bon_travaux : Extraire le numéro de référence du bon.
- adresse_intervention : Adresse complète du chantier.
- coord_gardien : Nom/Téléphone du contact sur place (gardien ou locataire).
- nom_client : Nom de l'entreprise ou du donneur d'ordre (ex: VILOGIA, OPH).
- delai_intervention : Période ou durée de validité mentionnée.
- date_intervention : Date spécifique de rendez-vous si mentionnée.

Règles critiques :
1. CONFIDENTIALITÉ : Ne jamais extraire de prix, de montants HT, TTC ou de taux de TVA. Ignore totalement ces zones.
2. FORMAT : Réponds exclusivement au format JSON pur.
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        },
        {
          text: "Analyse ce document PDF et extrait les données demandées au format JSON."
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
  if (!text) {
    throw new Error("Le modèle n'a renvoyé aucune réponse.");
  }

  // Nettoyage de sécurité pour garantir un parsing JSON valide
  const startIdx = text.indexOf('{');
  const endIdx = text.lastIndexOf('}');
  
  if (startIdx === -1 || endIdx === -1) {
    throw new Error("L'IA n'a pas retourné de JSON valide.");
  }

  const cleanJson = text.substring(startIdx, endIdx + 1);

  try {
    return JSON.parse(cleanJson) as ConstructionOrderData;
  } catch (err) {
    console.error("Erreur de parsing JSON. Texte reçu:", text);
    throw new Error("Échec du décodage des données extraites.");
  }
}