export const HEALTH_METRIC_KEYS = [
  "weight",
  "resting_hr",
  "hrv",
  "blood_pressure_systolic",
  "blood_pressure_diastolic",
  "sleep_duration",
  "vo2_max",
] as const;

export type HealthMetricKey = (typeof HEALTH_METRIC_KEYS)[number];

export type HealthMetric = {
  date: string;
  metric: HealthMetricKey;
  value: number;
  unit: string;
};

export type HealthMetricsRequest = {
  date: string;
  metrics: { metric: string; value: number; unit: string }[];
};
