import * as Schema from "effect/Schema";

/**
 * Versioned proof that the administrator acknowledged the PDF processing notice.
 * Bump this value when the provider, payload, or disclosure materially changes.
 */
export const PDF_PROCESSING_CONSENT_VERSION = "gemini-pdf-v1" as const;

export const PdfProcessingConsent = Schema.Literal(
  PDF_PROCESSING_CONSENT_VERSION,
).annotate({ identifier: "PdfProcessingConsent" });

/** Multipart field carrying the versioned acknowledgement next to the PDF. */
export const PDF_PROCESSING_CONSENT_FIELD = "pdfProcessingConsent" as const;

export const PDF_PROCESSING_NOTICE =
  "The complete PDF is sent through Bloodwork to Google Gemini, a third-party AI service, for extraction. It may contain names, dates of birth, addresses, record numbers, and other sensitive health information.";

export const PDF_PROCESSING_RETENTION_NOTICE =
  "Bloodwork does not intentionally save the PDF in its database or file storage. Google's current Gemini API abuse-monitoring policy says submitted prompts, context (including files), and outputs may be retained for up to 55 days. Google terms differ for paid and unpaid usage; unpaid usage may also use submitted content to improve services and involve human review.";

export const GOOGLE_GEMINI_TERMS_URL = "https://ai.google.dev/gemini-api/terms";
export const GOOGLE_GEMINI_ABUSE_POLICY_URL =
  "https://ai.google.dev/gemini-api/docs/usage-policies";
