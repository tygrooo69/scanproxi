import { GoogleGenAI, Type } from "@google/genai";
import { ConstructionOrderData } from "../types";

const SYSTEM_INSTRUCTION = `Tu es un agent spécialisé dans l'analyse de documents de construction. Ton rôle est d'extraire des données structurées depuis des scans de bons de commande (PDF).

Instructions d'extraction :
- num_bon_travaux : Extraire le numéro de référence du bon.
- adresse_1 : Ligne 1 de l'adresse (Voie, Numéro). Maximum 40 caractères.
- adresse_2 : Ligne 2 de l'adresse (Complément, Bâtiment, Résidence). Maximum 40 caractères.
- adresse_3 : Ligne 3 de l'adresse (Code Postal, Ville). Maximum 40 caractères.

- gardien_nom : Extrait UNIQUEMENT le Nom et Prénom du gardien ou du contact sur place. (Ex: "M. Dupont", "Sophie Martin").
- gardien_tel : Extrait UNIQUEMENT le numéro de téléphone du gardien ou contact. (Ex: "06 12 34 56 78").
- gardien_email : Extrait l'adresse EMAIL du gardien ou du contact sur place. RÈGLE STRICTE : Ignore les emails commençant par "facture", "factures" ou "billing". Si la seule adresse trouvée est de ce type, renvoie null.

- nom_client : Nom de l'entreprise ou du donneur d'ordre (ex: VILOGIA, OPH).
- delai_intervention : Date limite d'intervention. S'il y a plusieurs dates ou une période (ex: "du 12/01 au 15/01"), garde UNIQUEMENT la dernière date (la plus lointaine dans le temps).
- date_intervention : Date d'émission ou de création du document/bon (et non la date du rendez-vous).
- descriptif_travaux : Résumé détaillé de la nature des travaux à effectuer (ex: "Remplacement de vitrage", "Réparation de serrure", "Recherche de fuite").

Règles critiques :
1. ADRESSE : Si l'adresse est longue, découpe-la intelligemment sur les 3 champs (adresse_1, adresse_2, adresse_3) pour ne pas dépasser 40 caractères par champ.
2. CONFIDENTIALITÉ : Ne jamais extraire de prix, de montants HT, TTC ou de taux de TVA. Ignore totalement ces zones.
3. FORMAT : Réponds exclusivement au format JSON pur.
4. NULLITÉ : Si un champ n'est pas trouvé, inscris null.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    num_bon_travaux: { type: Type.STRING, description: "Référence du bon" },
    adresse_1: { type: Type.STRING, description: "Adresse Ligne 1 (Voie) - Max 40 chars" },
    adresse_2: { type: Type.STRING, description: "Adresse Ligne 2 (Complément) - Max 40 chars" },
    adresse_3: { type: Type.STRING, description: "Adresse Ligne 3 (CP Ville) - Max 40 chars" },
    
    gardien_nom: { type: Type.STRING, description: "Nom et Prénom du contact" },
    gardien_tel: { type: Type.STRING, description: "Téléphone du contact" },
    gardien_email: { type: Type.STRING, description: "Email du contact (Hors facturation)" },

    nom_client: { type: Type.STRING, description: "Nom du donneur d'ordre" },
    delai_intervention: { type: Type.STRING, description: "Délai de validité (Dernière date)" },
    date_intervention: { type: Type.STRING, description: "Date du document" },
    descriptif_travaux: { type: Type.STRING, description: "Détails des travaux à réaliser" },
  },
  required: ["num_bon_travaux", "adresse_1", "adresse_3", "nom_client", "delai_intervention", "date_intervention", "descriptif_travaux"]
};

export async function analyzeConstructionDocument(base64Data: string, mimeType: string): Promise<ConstructionOrderData> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
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

  const startIdx = text.indexOf('{');
  const endIdx = text.lastIndexOf('}');
  
  if (startIdx === -1 || endIdx === -1) {
    throw new Error("L'IA n'a pas retourné de JSON valide.");
  }

  const cleanJson = text.substring(startIdx, endIdx + 1);

  try {
    const data = JSON.parse(cleanJson) as ConstructionOrderData;
    
    // Post-traitement : Nettoyage du numéro de bon (suppression espaces et caractères spéciaux)
    // On ne garde que les lettres et les chiffres
    if (data.num_bon_travaux) {
      data.num_bon_travaux = data.num_bon_travaux.replace(/[^a-zA-Z0-9]/g, '');
    }

    // Sécurité supplémentaire pour tronquer les adresses si l'IA a halluciné > 40 chars
    if (data.adresse_1) data.adresse_1 = data.adresse_1.substring(0, 40);
    if (data.adresse_2) data.adresse_2 = data.adresse_2.substring(0, 40);
    if (data.adresse_3) data.adresse_3 = data.adresse_3.substring(0, 40);

    return data;
  } catch (err) {
    console.error("Erreur de parsing JSON. Texte reçu:", text);
    throw new Error("Échec du décodage des données extraites.");
  }
}