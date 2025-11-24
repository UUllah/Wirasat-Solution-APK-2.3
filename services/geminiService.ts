import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Property, PropertyType, Party } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const getPropertyValuationEstimate = async (
  areaSqFt: number,
  location: { lat: number, lng: number },
  type: PropertyType,
  description?: string
): Promise<{ rate: number, analysis: string }> => {
  if (!apiKey) {
    console.warn("No API Key provided. Returning mock data.");
    return { rate: 15000, analysis: "API Key missing. Using mock valuation." };
  }

  const prompt = `
    Act as a real estate expert in Pakistan. 
    Estimate the current market value per square foot (in PKR) for a ${type} property.
    Location Coordinates: ${location.lat}, ${location.lng}.
    Area: ${areaSqFt} sq ft.
    Additional Details: ${description || 'Standard condition'}.

    Provide the output in valid JSON format ONLY with no markdown code blocks:
    {
      "ratePerSqFt": number,
      "analysis": "Short 2-sentence explanation of the price based on location trends in Pakistan."
    }
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text || "{}";
    const data = JSON.parse(text);
    return {
      rate: data.ratePerSqFt || 5000,
      analysis: data.analysis || "Could not determine precise value."
    };
  } catch (error) {
    console.error("Gemini Valuation Error:", error);
    return { rate: 5000, analysis: "AI service unavailable. Please enter manually." };
  }
};

export const getPropertyAdvice = async (property: Property, party: Party): Promise<string> => {
   if (!apiKey) return "Please configure API Key for AI advice.";

   const prompt = `
     Analyze the suitability of this property for the inheritor.
     Property: ${property.name} (${property.type}), ${property.areaSqFt} sqft. Value: PKR ${property.totalValue}.
     Inheritor: ${party.name} (${party.relation}).
     
     Suggest pros and cons considering:
     - Rental income potential (if commercial/residential)
     - Living needs (if residential)
     - Liquidity (ease of selling)
     - Long term appreciation vs Gold.
     
     Keep it concise (max 3 bullet points).
   `;

   try {
     const response = await ai.models.generateContent({
       model: 'gemini-2.5-flash',
       contents: prompt,
     });
     return response.text || "No advice generated.";
   } catch (e) {
     return "Could not generate advice.";
   }
};

export const resolveShariahDispute = async (parties: Party[], totalAssetValue: number): Promise<string> => {
    if (!apiKey) return "AI unavailable.";
    
    const partySummary = parties.map(p => `${p.name} (${p.relation})`).join(', ');

    const prompt = `
      Given the following inheritors: ${partySummary}.
      Total Estate Value: PKR ${totalAssetValue}.
      Explain the Shariah distribution (Faraid) briefly. 
      Identify if there are any immediate blocking rules (e.g. inheritance denied due to specific complex family trees not shown). 
      Assume standard Hanafi Sunni jurisprudence unless otherwise implied.
      Keep it very brief and reassuring.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        return response.text || "";
    } catch (e) {
        return "Calculation explanation unavailable.";
    }
};