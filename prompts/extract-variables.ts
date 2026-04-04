export const extractVariablesPrompt = `Extract all blood test results from this medical PDF report.

Return ONLY a raw JSON object — no markdown, no explanation, no code fences.

The JSON must match this exact structure:

{
  "date": "YYYY-MM-DD",
  "variables": [
    {
      "label": "Test Name As Written",
      "value": 98.0,
      "unit": "mg/dL"
    }
  ]
}

Rules:
- "date": the specimen collection date from the report in YYYY-MM-DD format; if not found, use today's date
- "label": exact test name as it appears in the report
- "value": numeric value only
- "unit": unit string as written in the report
- Include every individual test result; do not omit any`;
