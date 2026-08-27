export const extractVariablesPrompt = `Extract all blood test results from this medical PDF report.

Return ONLY a raw JSON object — no markdown, no explanation, no code fences.

The JSON must match this exact structure:

{
  "date": "YYYY-MM-DD or null",
  "variables": [
    {
      "label": "Test Name In English",
      "value": 98.0,
      "unit": "mg/dL"
    }
  ]
}

Rules:
- "date": the specimen collection date from the report in YYYY-MM-DD format; use null when the report does not state a specimen collection date. Never infer or substitute an upload date or today's date
- "label": translate the test name to its well-known English medical abbreviation or term (e.g. "Glukóza" → "Glucose", "Bílé krvinky" → "WBC", "Červené krvinky" → "RBC", "Trombocyty" → "Platelets", "Hematokrit" → "Hematocrit"). Use standard medical abbreviations when they exist (WBC, RBC, HbA1c, TSH, ALT, AST, GGT, CRP, HDL, LDL, etc.)
- "value": numeric value only
- "unit": unit string as written in the report
- Include every individual test result; do not omit any`;
