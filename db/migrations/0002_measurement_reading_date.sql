ALTER TABLE measurements ADD COLUMN reading_date TEXT;

UPDATE measurements
SET reading_date = (
  SELECT readings.date
  FROM readings
  WHERE readings.id = measurements.reading_id
)
WHERE reading_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_measurements_latest
  ON measurements(vocabulary_key, reading_date DESC, reading_id DESC, id DESC);
