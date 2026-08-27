export function researchVariablesPrompt(entries: string): string {
  return `You are a medical reference assistant. Research the following blood test biomarkers and provide reference ranges and descriptions.

BIOMARKERS TO RESEARCH:
${entries}

For each biomarker, provide:
1. A concise description (1-2 sentences): what it measures, why it matters clinically
2. Standard reference ranges for healthy adults

Return ONLY a raw JSON object — no markdown, no explanation, no code fences.

The JSON must match this exact structure:

{
  "entries": [
    {
      "vocabularyKey": "glucose",
      "description": "Measures blood sugar levels. Elevated values may indicate diabetes or insulin resistance.",
      "referenceRange": { "min": 70, "max": 100 }
    }
  ]
}

Rules:
- "vocabularyKey": must match the input vocabularyKey exactly
- "description": 1-2 sentences, factual, clinical significance
- "referenceRange": standard reference range for healthy adults in the given unit when a trustworthy interval is available; omit it when no reviewed interval can be established
- Maintain the same order as the input`;
}
