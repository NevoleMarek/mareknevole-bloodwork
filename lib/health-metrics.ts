/** Readable names for Apple Health export keys; `unit` only where HealthKit fixes it. */
export const HEALTH_METRIC_NAMES: ReadonlyMap<
  string,
  { label: string; unit?: string }
> = new Map([
  ["active_energy_burned", { label: "Active energy" }],
  ["apple_exercise_time", { label: "Exercise time" }],
  ["apple_stand_time", { label: "Stand time" }],
  ["basal_energy_burned", { label: "Resting energy" }],
  ["blood_pressure_diastolic", { label: "Diastolic blood pressure" }],
  ["blood_pressure_systolic", { label: "Systolic blood pressure" }],
  ["body_fat_percentage", { label: "Body fat" }],
  ["body_mass", { label: "Weight" }],
  ["body_mass_index", { label: "Body mass index", unit: "kg/m²" }],
  ["distance_walking_running", { label: "Walking + running distance" }],
  ["flights_climbed", { label: "Flights climbed", unit: "floors" }],
  ["heart_rate", { label: "Heart rate", unit: "bpm" }],
  ["heart_rate_variability_sdnn", { label: "Heart rate variability (SDNN)" }],
  ["oxygen_saturation", { label: "Blood oxygen" }],
  ["respiratory_rate", { label: "Respiratory rate", unit: "breaths/min" }],
  ["resting_heart_rate", { label: "Resting heart rate", unit: "bpm" }],
  ["sleep_analysis", { label: "Sleep" }],
  ["step_count", { label: "Steps", unit: "steps" }],
  ["vo2_max", { label: "VO₂ max", unit: "mL/kg/min" }],
  ["walking_heart_rate_average", { label: "Walking heart rate", unit: "bpm" }],
]);

const COUNT_UNITS = new Set(["bpm", "count", "count/min", "floors", "steps"]);

export function healthValueFormat(unit: string): (value: number) => string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: COUNT_UNITS.has(unit) ? 0 : 1,
  }).format;
}
