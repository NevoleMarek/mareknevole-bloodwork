import { describe, expect, it } from "vitest";

import {
  mapHealthMetricConfigRow,
  mapMeasurementRow,
  mapReadingRow,
  mapSupplementChangelogRow,
  mapSupplementRow,
  mapVocabularyRow,
} from "@/db/queries";

describe("row mappers", () => {
  it("maps vocabulary row to VocabularyEntry", () => {
    const row = {
      key: "glucose",
      label: "Glucose",
      unit: "mg/dL",
      reference_min: 70,
      reference_max: 100,
      description: null,
      featured: 0,
    };
    expect(mapVocabularyRow(row)).toEqual({
      key: "glucose",
      label: "Glucose",
      unit: "mg/dL",
      referenceRange: { min: 70, max: 100 },
      description: null,
      featured: false,
    });
  });

  it("maps vocabulary row with featured=1 to true", () => {
    const row = {
      key: "glucose",
      label: "Glucose",
      unit: "mg/dL",
      reference_min: 70,
      reference_max: 100,
      description: null,
      featured: 1,
    };
    expect(mapVocabularyRow(row)).toEqual({
      key: "glucose",
      label: "Glucose",
      unit: "mg/dL",
      referenceRange: { min: 70, max: 100 },
      description: null,
      featured: true,
    });
  });

  it("maps reading row", () => {
    const row = { id: "r1", date: "2025-06-15", source: "test.pdf" };
    expect(mapReadingRow(row)).toEqual({
      id: "r1",
      date: "2025-06-15",
      source: "test.pdf",
    });
  });

  it("maps measurement row", () => {
    const row = {
      id: "m1",
      reading_id: "r1",
      vocabulary_key: "glucose",
      value: 92,
      unit: "mg/dL",
      status: "normal",
    };
    expect(mapMeasurementRow(row)).toEqual({
      vocabularyKey: "glucose",
      value: 92,
      unit: "mg/dL",
      status: "normal",
    });
  });

  it("maps supplement row", () => {
    const row = {
      id: "s1",
      name: "Creatine",
      dose: "5 g",
      frequency: "daily",
      started_at: "Jun 2025",
      stopped_at: null,
      created_at: "2025-06-01T00:00:00Z",
      updated_at: "2025-06-01T00:00:00Z",
    };
    expect(mapSupplementRow(row)).toEqual({
      id: "s1",
      name: "Creatine",
      dose: "5 g",
      frequency: "daily",
      startedAt: "Jun 2025",
      stoppedAt: null,
      createdAt: "2025-06-01T00:00:00Z",
      updatedAt: "2025-06-01T00:00:00Z",
    });
  });

  it("maps supplement changelog row", () => {
    const row = {
      id: "c1",
      date: "2025-06-01",
      description: "Added Creatine 5 g",
      created_at: "2025-06-01T00:00:00Z",
    };
    expect(mapSupplementChangelogRow(row)).toEqual({
      id: "c1",
      date: "2025-06-01",
      description: "Added Creatine 5 g",
      createdAt: "2025-06-01T00:00:00Z",
    });
  });

  it("maps health metric config row", () => {
    const row = {
      metric: "heart_rate",
      label: "Heart Rate",
      unit: "bpm",
      aggregation: "avg",
      visible: 1,
    };
    expect(mapHealthMetricConfigRow(row)).toEqual({
      metric: "heart_rate",
      label: "Heart Rate",
      unit: "bpm",
      aggregation: "avg",
      visible: true,
    });
  });

  it("maps config row with visible=0 to false", () => {
    const row = {
      metric: "steps",
      label: "Steps",
      unit: "count",
      aggregation: "sum",
      visible: 0,
    };
    expect(mapHealthMetricConfigRow(row)).toEqual({
      metric: "steps",
      label: "Steps",
      unit: "count",
      aggregation: "sum",
      visible: false,
    });
  });
});
