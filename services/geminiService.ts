
import { GoogleGenAI, Type } from "@google/genai";
import { ConstructionOrderData } from "../types";

const SYSTEM_INSTRUCTION = `Agent d'extraction ultra-rapide spécialisé dans les bons de travaux. 
TACHE : Extrais les champs suivants du document.

CHAMPS :
- num_bon_travaux : Référence du bon (sans espaces).
- adresse_1, adresse_2, adresse_3 : Adresse d'intervention découpée. 
  IMPORTANT : Prends EN PRIORITÉ l'adresse précise du LOCATAIRE (étage, porte, etc.) si elle diffère de l'adresse générale de l'immeuble.
- gardien_nom : Nom du contact sur place (gardien ou locataire).
- gardien_tel : Téléphone du contact.
- gardien_email : Email du contact (priorité locataire).
- nom_client : Nom du donneur d'ordre (le client).
- delai_intervention : Date d'échéance au format JJ/MM/AAAA.
- date_intervention : Date du document au format JJ/MM/AAAA.
- descriptif_travaux : Nature des travaux (EN MAJUSCULES, SANS ACCENTS).
- montant_ht : Le montant total Hors Taxes (HT) figurant sur le document (ex: '150.00' ou '425.10'). Indique uniquement la valeur numérique, ou '50' si non trouvé.

RÈGLES :
1. Recherche attentivement le montant total Hors Taxes (HT). Si aucun montant n'est trouvé, indique '50'.
2. Formate TOUTES les dates en JJ/MM/AAAA.
3. SI LE DOCUMENT CONTIENT la phrase de sécurité EXACTE "Prévention du risque amiante merci de consulter le DTA avant interventions" (strictement ces mots exacts, ne tolère aucune autre formulation similaire ou partielle relative à l'amiante et au DTA), le nom de client (nom_client) DOIT obligatoirement être "GHT 78 SUD".
4. Retourne UNIQUEMENT un objet JSON valide.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    num_bon_travaux: { type: Type.STRING },
    adresse_1: { type: Type.STRING },
    adresse_2: { type: Type.STRING },
    adresse_3: { type: Type.STRING },
    gardien_nom: { type: Type.STRING },
    gardien_tel: { type: Type.STRING },
    gardien_email: { type: Type.STRING },
    nom_client: { type: Type.STRING },
    delai_intervention: { type: Type.STRING },
    date_intervention: { type: Type.STRING },
    descriptif_travaux: { type: Type.STRING },
    montant_ht: { type: Type.STRING },
  },
  required: ["num_bon_travaux", "adresse_1", "nom_client", "delai_intervention", "date_intervention", "descriptif_travaux"]
};

export async function analyzeConstructionDocument(base64Data: string, mimeType: string): Promise<ConstructionOrderData> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: 'gemini-flash-lite-latest',
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        },
        {
          text: "Extract data according to instructions."
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
  if (!text) throw new Error("Réponse vide.");

  try {
    const data = JSON.parse(text) as ConstructionOrderData;
    
    // Nettoyage et formatage final
    if (data.num_bon_travaux) data.num_bon_travaux = data.num_bon_travaux.replace(/\s/g, '');
    if (data.descriptif_travaux) {
      data.descriptif_travaux = data.descriptif_travaux.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    }
    if (!data.gardien_email) data.gardien_email = "";
    if (!data.montant_ht || data.montant_ht.trim() === "") {
      data.montant_ht = "50";
    }

    return data;
  } catch (err) {
    throw new Error("Erreur de parsing des données extraites.");
  }
}
