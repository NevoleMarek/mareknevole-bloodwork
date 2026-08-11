export type HealthMetric = {
  date: string;
  metric: string;
  value: number;
  unit: string;
};

export type HealthMetricConfig = {
  metric: string;
  label: string;
  unit: string;
  aggregation: "avg" | "sum" | "duration";
  visible: boolean;
};

export type HealthData = {
  metrics: HealthMetric[];
  configs: HealthMetricConfig[];
};

export type HealthImportRequest = {
  metrics: { date: string; metric: string; value: number; unit: string }[];
  configs: {
    metric: string;
    label: string;
    unit: string;
    aggregation: string;
  }[];
};
