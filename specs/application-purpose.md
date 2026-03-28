# Application Purpose

## Summary

`bloodwork` is a personal blood test tracking dashboard for Marek Nevole. A public dashboard shows metrics, trends, and the current supplement stack. An admin area behind password auth provides data management — PDF upload, vocabulary editing, and supplement tracking.

## Goals

- Display a clear visual overview of blood test results (values vs. reference ranges, trends over time).
- Show the current supplement stack with dosages and a generated changelog.
- Let the admin upload PDF bloodwork reports and extract structured data via Gemini.
- Provide vocabulary and supplement management behind password authentication.
- Deploy to Cloudflare Pages for public access.

## Non-Goals

- No multi-user accounts — single admin, public readers.
- No real-time data or external API integrations beyond Gemini.

## Change Triggers

Update this document when the app's audience, purpose, feature direction, or product boundaries change.
