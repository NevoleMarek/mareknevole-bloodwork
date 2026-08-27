type UnitFamily =
  | "mass-concentration"
  | "molar-concentration"
  | "cell-concentration"
  | "activity-concentration"
  | "pressure";

type UnitDefinition = {
  readonly unit: string;
  readonly family: UnitFamily;
  /** The value represented by one unit, in the family's base unit. */
  readonly factor: number;
};

const unitDefinitions: readonly UnitDefinition[] = [
  // Mass concentration, with g/L as the base unit.
  { unit: "mg/dl", family: "mass-concentration", factor: 0.01 },
  { unit: "g/dl", family: "mass-concentration", factor: 10 },
  { unit: "g/l", family: "mass-concentration", factor: 1 },
  { unit: "mg/l", family: "mass-concentration", factor: 0.001 },
  { unit: "ug/dl", family: "mass-concentration", factor: 0.00001 },
  { unit: "ug/ml", family: "mass-concentration", factor: 0.001 },
  { unit: "ug/l", family: "mass-concentration", factor: 0.000001 },
  { unit: "ng/ml", family: "mass-concentration", factor: 0.000001 },
  { unit: "ng/dl", family: "mass-concentration", factor: 0.00000001 },
  { unit: "ng/l", family: "mass-concentration", factor: 0.000000001 },
  { unit: "pg/ml", family: "mass-concentration", factor: 0.000000001 },

  // Molar concentration, with mol/L as the base unit.
  { unit: "mol/l", family: "molar-concentration", factor: 1 },
  { unit: "mmol/l", family: "molar-concentration", factor: 0.001 },
  { unit: "umol/l", family: "molar-concentration", factor: 0.000001 },
  { unit: "nmol/l", family: "molar-concentration", factor: 0.000000001 },
  { unit: "pmol/l", family: "molar-concentration", factor: 0.000000000001 },
  { unit: "mmol/dl", family: "molar-concentration", factor: 0.01 },
  { unit: "umol/dl", family: "molar-concentration", factor: 0.00001 },

  // Cell counts, with K/μL as the base unit.
  { unit: "k/ul", family: "cell-concentration", factor: 1 },
  { unit: "10^9/l", family: "cell-concentration", factor: 1 },
  { unit: "cells/ul", family: "cell-concentration", factor: 0.001 },
  { unit: "cell/ul", family: "cell-concentration", factor: 0.001 },
  { unit: "cells/l", family: "cell-concentration", factor: 0.000000001 },
  { unit: "cell/l", family: "cell-concentration", factor: 0.000000001 },

  // Enzyme activity, with U/L as the base unit.
  { unit: "u/l", family: "activity-concentration", factor: 1 },
  { unit: "ku/l", family: "activity-concentration", factor: 1000 },
  { unit: "mu/l", family: "activity-concentration", factor: 0.001 },
  { unit: "u/ml", family: "activity-concentration", factor: 1000 },
  { unit: "mu/ml", family: "activity-concentration", factor: 1 },

  // Pressure, with mmHg as the base unit.
  { unit: "mmhg", family: "pressure", factor: 1 },
  { unit: "kpa", family: "pressure", factor: 7.50061683 },
  { unit: "pa", family: "pressure", factor: 0.00750061683 },
  { unit: "cmh2o", family: "pressure", factor: 0.73555924 },
];

type MolecularWeight = {
  readonly key: string;
  /** Molecular weight in g/mol. */
  readonly gramsPerMole: number;
};

// Mass-to-molar conversions need the analyte's molecular weight. Keep this
// deliberately explicit: guessing a factor for an unknown biomarker would
// produce a value that looks valid while representing the wrong measurement.
const molecularWeights: readonly MolecularWeight[] = [
  { key: "glucose", gramsPerMole: 180.156 },
  { key: "total_cholesterol", gramsPerMole: 386.65 },
  { key: "hdl", gramsPerMole: 386.65 },
  { key: "ldl", gramsPerMole: 386.65 },
  { key: "triglycerides", gramsPerMole: 885.7 },
  { key: "creatinine", gramsPerMole: 113.12 },
  { key: "uric_acid", gramsPerMole: 168.11 },
  { key: "bilirubin", gramsPerMole: 584.66 },
  { key: "urea", gramsPerMole: 60.06 },
];

function normalizeUnit(unit: string): string {
  return unit
    .trim()
    .toLowerCase()
    .replace(/[μµ]/g, "u")
    .replace(/\s+/g, "")
    .replace(/⁹/g, "9")
    .replace(/²/g, "2");
}

function findUnit(unit: string): UnitDefinition | undefined {
  const normalized = normalizeUnit(unit);
  return unitDefinitions.find((definition) => definition.unit === normalized);
}

function findMolecularWeight(key: string): number | undefined {
  const normalized = key.trim().toLowerCase();
  return molecularWeights.find((weight) => weight.key === normalized)
    ?.gramsPerMole;
}

/**
 * Convert a mapped source value into a vocabulary entry's unit.
 *
 * `null` means the units are not a known safe conversion. Callers should
 * retain the current mapping in that case instead of saving a guessed value.
 */
export function convertUnitValue(
  value: number,
  fromUnit: string,
  toUnit: string,
  vocabularyKey: string,
): number | null {
  if (!Number.isFinite(value)) return null;

  const normalizedFrom = normalizeUnit(fromUnit);
  const normalizedTo = normalizeUnit(toUnit);
  if (normalizedFrom === normalizedTo) return value;

  const source = findUnit(fromUnit);
  const target = findUnit(toUnit);
  if (!source || !target) return null;

  if (source.family === target.family) {
    const converted = (value * source.factor) / target.factor;
    return Number.isFinite(converted) ? converted : null;
  }

  const isMassMolarConversion =
    (source.family === "mass-concentration" &&
      target.family === "molar-concentration") ||
    (source.family === "molar-concentration" &&
      target.family === "mass-concentration");
  if (!isMassMolarConversion) return null;

  const gramsPerMole = findMolecularWeight(vocabularyKey);
  if (gramsPerMole === undefined) return null;

  const converted =
    source.family === "mass-concentration"
      ? (value * source.factor) / gramsPerMole / target.factor
      : (value * source.factor * gramsPerMole) / target.factor;
  return Number.isFinite(converted) ? converted : null;
}
