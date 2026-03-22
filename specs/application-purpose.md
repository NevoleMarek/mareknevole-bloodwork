# Application Purpose

## Summary

`bloodwork` is a personal blood test analysis dashboard. Users upload bloodwork PDFs, Gemini extracts the results, and the main dashboard visualizes them as charts, trends, and reference-range comparisons.

## Goals

- Display a clear visual overview of blood test results (values vs. reference ranges, trends over time).
- Let users upload a PDF bloodwork report and extract structured data via Gemini.
- Allow users to control what Gemini extracts by editing `prompts/extract.txt`.
- Keep the local feedback loop fast so new features can be explored quickly.

## Non-Goals

- No user accounts or persistent storage.
- No deployment or hosting requirements beyond local development.

## Change Triggers

Update this document when the app's audience, purpose, feature direction, or product boundaries change.
