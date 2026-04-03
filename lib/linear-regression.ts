type Point = { x: number; y: number };

export function linearRegression(points: Point[]): {
  slope: number;
  intercept: number;
} {
  if (points.length === 0) return { slope: 0, intercept: 0 };
  if (points.length === 1) return { slope: 0, intercept: points[0].y };

  const n = points.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (const { x, y } of points) {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}
