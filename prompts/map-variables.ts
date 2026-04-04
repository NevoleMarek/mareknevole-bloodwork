export function mapVariablesPrompt(
  vocabulary: string,
  variables: string,
): string {
  return `You are given extracted blood test variables and an existing vocabulary of known biomarkers.

EXISTING VOCABULARY:
${vocabulary}

EXTRACTED VARIABLES:
${variables}

Your task:
1. For each extracted variable, find the best matching vocabulary entry by label (use fuzzy/case-insensitive matching — e.g. "Hba1c" matches "HbA1c", "WBC" matches "White Blood Cells").
2. If the extracted unit differs from the vocabulary unit, convert the value to the vocabulary's unit.
3. For variables with no vocabulary match, create a new entry: derive a snake_case key from the label, keep the original unit and value, and propose a reference range based on medical knowledge.

Return ONLY a raw JSON object — no markdown, no explanation, no code fences.

The JSON must match this exact structure:

{
  "mappings": [
    {
      "label": "Original Label From PDF",
      "originalValue": 5.5,
      "originalUnit": "mmol/L",
      "vocabularyKey": "glucose",
      "convertedValue": 99.1,
      "convertedUnit": "mg/dL",
      "isNew": false
    },
    {
      "label": "CRP",
      "originalValue": 0.8,
      "originalUnit": "mg/L",
      "vocabularyKey": "crp",
      "convertedValue": 0.8,
      "convertedUnit": "mg/L",
      "isNew": true,
      "referenceRange": { "min": 0, "max": 3 }
    }
  ]
}

Rules:
- "label": the exact label from the extracted variables
- "originalValue" / "originalUnit": copied from the extracted variable
- "vocabularyKey": the matching vocabulary key, or a new snake_case key for unmatched variables
- "convertedValue": the value converted to the vocabulary's unit (or same value if units match or it's a new entry)
- "convertedUnit": the vocabulary's unit (or original unit for new entries)
- "isNew": true only for variables that don't match any existing vocabulary entry
- "referenceRange": required only when "isNew" is true; propose a standard medical reference range
- Maintain the same order as the input variables`;
}
