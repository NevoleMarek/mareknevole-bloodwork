import type {
  ExtractedVariable,
  MappedVariable,
  ReferenceRange,
  ResearchEntry,
  VocabularyEntry,
} from "@/lib/schemas/domain";
import type {
  MapRequest,
  MapResponse,
  ResearchRequest,
  ResearchResponse,
} from "@/lib/schemas/wire";

const MAX_ITEMS = 100;
const MAX_LABEL_LENGTH = 160;
const MAX_UNIT_LENGTH = 48;
const MAX_KEY_LENGTH = 96;
const MAX_DESCRIPTION_LENGTH = 1_000;

export type ValidationResult<A> =
  | { readonly ok: true; readonly value: A }
  | { readonly ok: false; readonly message: string };

const valid = <A>(value: A): ValidationResult<A> => ({ ok: true, value });
const invalid = (message: string): ValidationResult<never> => ({
  ok: false,
  message,
});

const isFiniteNumber = (value: number): boolean => Number.isFinite(value);

const validateText = (
  value: string,
  field: string,
  maxLength: number,
): string | undefined => {
  if (value.trim().length === 0) return `${field} must not be empty`;
  if (value.length > maxLength) return `${field} is too long`;
  if (/[\u0000-\u001f\u007f-\u009f]/u.test(value)) {
    return `${field} contains control characters`;
  }
  return undefined;
};

const validateKey = (value: string, field: string): string | undefined => {
  const textError = validateText(value, field, MAX_KEY_LENGTH);
  if (textError) return textError;
  if (!/^[a-z0-9]+(?:_[a-z0-9]+)*$/u.test(value)) {
    return `${field} must be a snake_case key`;
  }
  return undefined;
};

const validateVocabularyKey = (
  value: string,
  field: string,
): string | undefined => validateText(value, field, MAX_KEY_LENGTH);

const validateRange = (
  range: ReferenceRange | undefined,
  field: string,
  requireWidth = true,
): string | undefined => {
  if (range === undefined) return `${field} is required`;
  if (!isFiniteNumber(range.min) || !isFiniteNumber(range.max)) {
    return `${field} must contain finite numbers`;
  }
  if (range.min > range.max || (requireWidth && range.min === range.max)) {
    return `${field} must be an ordered, non-empty interval`;
  }
  return undefined;
};

const validateItemCount = (
  values: ReadonlyArray<unknown>,
  field: string,
): string | undefined => {
  if (values.length === 0) return `${field} must not be empty`;
  if (values.length > MAX_ITEMS) return `${field} is too large`;
  return undefined;
};

const normalizedText = (value: string): string =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/gu, "");

/** Normalize common aliases so an obvious match cannot be redirected. */
const analyteName = (value: string): string => {
  switch (normalizedText(value)) {
    case "a1c":
    case "hba1c":
    case "glycatedhemoglobin":
    case "glycosylatedhemoglobin":
      return "hba1c";
    case "hdl":
    case "hdlcholesterol":
      return "hdl";
    case "ldl":
    case "ldlcholesterol":
      return "ldl";
    case "totalcholesterol":
    case "cholesteroltotal":
      return "totalcholesterol";
    case "wbc":
    case "whitebloodcells":
    case "leukocytes":
    case "leucocytes":
      return "wbc";
    case "rbc":
    case "redbloodcells":
    case "erythrocytes":
      return "rbc";
    default:
      return normalizedText(value);
  }
};

/**
 * Derive the only key accepted for an unmatched variable. Returning undefined
 * for a label without an ASCII key makes that import fail visibly instead of
 * inventing a shared fallback key.
 */
export const deriveVocabularyKey = (label: string): string | undefined => {
  const key = label
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "_")
    .replace(/^_+|_+$/gu, "")
    .replace(/_+/gu, "_");
  if (key.length === 0) return undefined;
  return key.slice(0, MAX_KEY_LENGTH).replace(/_+$/gu, "");
};

const validateVariable = (
  variable: ExtractedVariable,
  field: string,
): string | undefined =>
  validateText(variable.label, `${field}.label`, MAX_LABEL_LENGTH) ??
  validateText(variable.unit, `${field}.unit`, MAX_UNIT_LENGTH) ??
  (!isFiniteNumber(variable.value)
    ? `${field}.value must be finite`
    : undefined);

const validateVocabulary = (
  vocabulary: ReadonlyArray<VocabularyEntry>,
): string | undefined => {
  if (vocabulary.length > MAX_ITEMS) return "vocabulary is too large";
  const keys = new Set<string>();
  for (const [index, entry] of vocabulary.entries()) {
    const keyError = validateVocabularyKey(
      entry.key,
      `vocabulary[${index}].key`,
    );
    if (keyError) return keyError;
    if (keys.has(entry.key)) return `vocabulary[${index}].key is duplicated`;
    keys.add(entry.key);
    const labelError = validateText(
      entry.label,
      `vocabulary[${index}].label`,
      MAX_LABEL_LENGTH,
    );
    if (labelError) return labelError;
    const unitError = validateText(
      entry.unit,
      `vocabulary[${index}].unit`,
      MAX_UNIT_LENGTH,
    );
    if (unitError) return unitError;
  }
  return undefined;
};

const variableIdentity = (variable: ExtractedVariable): string =>
  `${variable.label}\u0000${variable.value}\u0000${variable.unit}`;

export const validateMapRequest = (
  request: MapRequest,
): ValidationResult<MapRequest> => {
  const itemError = validateItemCount(request.variables, "variables");
  if (itemError) return invalid(itemError);
  const vocabularyError = validateVocabulary(request.vocabulary);
  if (vocabularyError) return invalid(vocabularyError);

  const identities = new Set<string>();
  for (const [index, variable] of request.variables.entries()) {
    const variableError = validateVariable(variable, `variables[${index}]`);
    if (variableError) return invalid(variableError);
    const identity = variableIdentity(variable);
    if (identities.has(identity)) {
      return invalid(`variables[${index}] duplicates an earlier input`);
    }
    identities.add(identity);
  }
  return valid(request);
};

const normalizedUnit = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[μµ]/gu, "u")
    .replace(/[×x]/gu, "x")
    .replace(/\s+/gu, "");

const knownAnalytes = new Set([
  "glucose",
  "totalcholesterol",
  "hdl",
  "ldl",
  "cholesterol",
  "triglycerides",
  "creatinine",
]);

const conversionFactor = (
  label: string,
  key: string,
  fromUnit: string,
  toUnit: string,
): number | undefined => {
  const from = normalizedUnit(fromUnit);
  const to = normalizedUnit(toUnit);
  if (from === to) return 1;

  const keyAnalyte = analyteName(key);
  const analyte = knownAnalytes.has(keyAnalyte)
    ? keyAnalyte
    : analyteName(label);
  if (from === "mmol/l" && to === "mg/dl") {
    if (analyte === "glucose") return 18;
    if (
      analyte === "totalcholesterol" ||
      analyte === "hdl" ||
      analyte === "ldl" ||
      analyte === "cholesterol"
    ) {
      return 38.67;
    }
    if (analyte === "triglycerides") return 88.57;
  }
  if (from === "mg/dl" && to === "mmol/l") {
    if (analyte === "glucose") return 1 / 18;
    if (
      analyte === "totalcholesterol" ||
      analyte === "hdl" ||
      analyte === "ldl" ||
      analyte === "cholesterol"
    ) {
      return 1 / 38.67;
    }
    if (analyte === "triglycerides") return 1 / 88.57;
  }
  if (from === "umol/l" && to === "mg/dl" && analyte === "creatinine") {
    return 1 / 88.4;
  }
  if (from === "mg/dl" && to === "umol/l" && analyte === "creatinine") {
    return 88.4;
  }
  if (from === "g/l" && to === "g/dl") return 1 / 10;
  if (from === "g/dl" && to === "g/l") return 10;
  if (from === "ng/ml" && to === "ug/l") return 1;
  if (from === "ug/l" && to === "ng/ml") return 1;
  if (
    (from === "k/ul" || from === "10^9/l" || from === "10e9/l") &&
    (to === "k/ul" || to === "10^9/l" || to === "10e9/l")
  ) {
    return 1;
  }
  return undefined;
};

const expectedConvertedValue = (
  variable: ExtractedVariable,
  entry: VocabularyEntry | undefined,
): ValidationResult<{ readonly unit: string; readonly value: number }> => {
  const unit = entry?.unit ?? variable.unit;
  const factor = conversionFactor(
    variable.label,
    entry?.key ?? deriveVocabularyKey(variable.label) ?? "",
    variable.unit,
    unit,
  );
  if (factor === undefined) {
    return invalid(
      `no approved conversion from ${variable.unit} to ${unit} for ${variable.label}`,
    );
  }
  const value = variable.value * factor;
  if (!isFiniteNumber(value)) return invalid("converted value must be finite");
  return valid({ unit, value });
};

const numericallyEquivalent = (actual: number, expected: number): boolean => {
  const tolerance = Math.max(1e-6, Math.abs(expected) * 0.005);
  return Math.abs(actual - expected) <= tolerance;
};

const matchingVocabulary = (
  variable: ExtractedVariable,
  vocabulary: ReadonlyArray<VocabularyEntry>,
): ReadonlyArray<VocabularyEntry> => {
  const variableName = analyteName(variable.label);
  return vocabulary.filter(
    (entry) =>
      analyteName(entry.key) === variableName ||
      analyteName(entry.label) === variableName,
  );
};

/**
 * Validate and canonicalize model mappings. The model may round a known
 * conversion, but it cannot rewrite an input, select an unknown key, invent a
 * new key, or provide an unchecked value/range.
 */
export const validateMapResponse = (
  request: MapRequest,
  response: MapResponse,
): ValidationResult<MapResponse> => {
  const requestResult = validateMapRequest(request);
  if (!requestResult.ok) return invalid(requestResult.message);
  if (request.variables.length !== response.mappings.length) {
    return invalid("mappings must contain exactly one result per variable");
  }

  const vocabularyByKey = new Map(
    request.vocabulary.map((entry) => [entry.key, entry]),
  );
  const outputKeys = new Set<string>();
  const mappings: MappedVariable[] = [];

  for (const [index, variable] of request.variables.entries()) {
    const mapping = response.mappings[index];
    if (mapping.label !== variable.label) {
      return invalid(
        `mappings[${index}].label does not match its input variable`,
      );
    }
    if (mapping.originalValue !== variable.value) {
      return invalid(
        `mappings[${index}].originalValue does not match its input variable`,
      );
    }
    if (mapping.originalUnit !== variable.unit) {
      return invalid(
        `mappings[${index}].originalUnit does not match its input variable`,
      );
    }
    if (
      !isFiniteNumber(mapping.originalValue) ||
      !isFiniteNumber(mapping.convertedValue)
    ) {
      return invalid(`mappings[${index}] contains a non-finite value`);
    }
    const keyError = validateVocabularyKey(
      mapping.vocabularyKey,
      `mappings[${index}].vocabularyKey`,
    );
    if (keyError) return invalid(keyError);
    const unitError = validateText(
      mapping.convertedUnit,
      `mappings[${index}].convertedUnit`,
      MAX_UNIT_LENGTH,
    );
    if (unitError) return invalid(unitError);

    const entry = vocabularyByKey.get(mapping.vocabularyKey);
    const matches = matchingVocabulary(variable, request.vocabulary);
    if (matches.length > 1) {
      return invalid(
        `mappings[${index}] has an ambiguous vocabulary match for ${variable.label}`,
      );
    }
    if (matches.length === 1 && mapping.vocabularyKey !== matches[0].key) {
      return invalid(
        `mappings[${index}].vocabularyKey is not the matching key`,
      );
    }

    if (entry === undefined) {
      const expectedKey = deriveVocabularyKey(variable.label);
      if (expectedKey === undefined || mapping.vocabularyKey !== expectedKey) {
        return invalid(
          `mappings[${index}].vocabularyKey is not an allowed new key`,
        );
      }
      if (!mapping.isNew) {
        return invalid(
          `mappings[${index}] must mark an unmatched variable as new`,
        );
      }
      const rangeError = validateRange(
        mapping.referenceRange,
        `mappings[${index}].referenceRange`,
      );
      if (rangeError) return invalid(rangeError);
    } else {
      if (mapping.isNew) {
        return invalid(
          `mappings[${index}] cannot mark an existing biomarker as new`,
        );
      }
      if (mapping.referenceRange !== undefined) {
        return invalid(
          `mappings[${index}].referenceRange is not allowed for an existing biomarker`,
        );
      }
    }
    if (outputKeys.has(mapping.vocabularyKey)) {
      return invalid(`mappings[${index}].vocabularyKey is duplicated`);
    }
    outputKeys.add(mapping.vocabularyKey);

    const converted = expectedConvertedValue(variable, entry);
    if (!converted.ok)
      return invalid(`mappings[${index}]: ${converted.message}`);
    if (mapping.convertedUnit !== converted.value.unit) {
      return invalid(`mappings[${index}].convertedUnit is not canonical`);
    }
    if (!numericallyEquivalent(mapping.convertedValue, converted.value.value)) {
      return invalid(
        `mappings[${index}].convertedValue does not match the approved conversion`,
      );
    }

    mappings.push({
      ...mapping,
      convertedValue: converted.value.value,
      convertedUnit: converted.value.unit,
    });
  }
  return valid({ ...response, mappings });
};

const validateResearchEntry = (
  entry: ResearchEntry,
  index: number,
): string | undefined =>
  validateKey(entry.vocabularyKey, `newEntries[${index}].vocabularyKey`) ??
  validateText(entry.label, `newEntries[${index}].label`, MAX_LABEL_LENGTH) ??
  validateText(entry.unit, `newEntries[${index}].unit`, MAX_UNIT_LENGTH) ??
  validateRange(
    entry.referenceRange,
    `newEntries[${index}].referenceRange`,
    false,
  );

export const validateResearchRequest = (
  request: ResearchRequest,
): ValidationResult<ResearchRequest> => {
  const itemError = validateItemCount(request.newEntries, "newEntries");
  if (itemError) return invalid(itemError);
  const keys = new Set<string>();
  for (const [index, entry] of request.newEntries.entries()) {
    const entryError = validateResearchEntry(entry, index);
    if (entryError) return invalid(entryError);
    if (keys.has(entry.vocabularyKey)) {
      return invalid(`newEntries[${index}].vocabularyKey is duplicated`);
    }
    keys.add(entry.vocabularyKey);
  }
  return valid(request);
};

/** Research output is keyed by the requested new-entry list, in its order. */
export const validateResearchResponse = (
  request: ResearchRequest,
  response: ResearchResponse,
): ValidationResult<ResearchResponse> => {
  const requestResult = validateResearchRequest(request);
  if (!requestResult.ok) return invalid(requestResult.message);
  if (request.newEntries.length !== response.entries.length) {
    return invalid(
      "research must contain exactly one result per requested entry",
    );
  }

  const allowedKeys = new Set(
    request.newEntries.map((entry) => entry.vocabularyKey),
  );
  const seenKeys = new Set<string>();
  for (const [index, entry] of response.entries.entries()) {
    const keyError = validateKey(
      entry.vocabularyKey,
      `entries[${index}].vocabularyKey`,
    );
    if (keyError) return invalid(keyError);
    if (!allowedKeys.has(entry.vocabularyKey)) {
      return invalid(
        `entries[${index}].vocabularyKey is not an allowed research key`,
      );
    }
    if (seenKeys.has(entry.vocabularyKey)) {
      return invalid(`entries[${index}].vocabularyKey is duplicated`);
    }
    seenKeys.add(entry.vocabularyKey);
    if (entry.vocabularyKey !== request.newEntries[index].vocabularyKey) {
      return invalid(`entries[${index}] does not match its input order`);
    }
    const descriptionError = validateText(
      entry.description,
      `entries[${index}].description`,
      MAX_DESCRIPTION_LENGTH,
    );
    if (descriptionError) return invalid(descriptionError);
    const rangeError = validateRange(
      entry.referenceRange,
      `entries[${index}].referenceRange`,
    );
    if (rangeError) return invalid(rangeError);
  }
  return valid(response);
};
