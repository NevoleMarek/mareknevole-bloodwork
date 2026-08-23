import type { BloodworkReading, VocabularyEntry } from "@/types/bloodwork";

type ReadingWithMeasurements = BloodworkReading & { id: string };

type DataRouteDependencies<Database> = {
  getDatabase: () => Promise<Database>;
  getReadings: (database: Database) => Promise<ReadingWithMeasurements[]>;
  getVocabulary: (database: Database) => Promise<VocabularyEntry[]>;
};

export function createDataHandler<Database>(
  dependencies: DataRouteDependencies<Database>,
) {
  return async function getData() {
    const database = await dependencies.getDatabase();
    const [vocabulary, readings] = await Promise.all([
      dependencies.getVocabulary(database),
      dependencies.getReadings(database),
    ]);

    return Response.json({
      vocabulary: { entries: vocabulary },
      readings: readings.map((reading) => ({
        date: reading.date,
        source: reading.source,
        measurements: reading.measurements,
      })),
    });
  };
}
