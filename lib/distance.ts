/** 2点間の距離をメートルで返す(ハーバサイン公式) */
export function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** 距離の表示用文字列(m / km) */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

/** 徒歩の目安時間(不動産表示基準の分速80mで計算) */
export function walkingMinutes(meters: number): number {
  return Math.max(1, Math.ceil(meters / 80));
}

/** 電車・バス移動が現実的になる距離のしきい値(これ未満は徒歩の方が早いため非表示) */
export const TRANSIT_MIN_DISTANCE_M = 1500;

/**
 * 電車・バスの概算所要時間(距離ベースの目安、実際の乗換経路は考慮しない)。
 * 表定速度30km/h相当の移動時間に、駅までの徒歩・待ち時間・乗換の目安12分を加算。
 */
export function transitMinutes(meters: number): number {
  const overheadMin = 12;
  const effectiveSpeedKmPerMin = 0.5;
  return overheadMin + Math.ceil(meters / 1000 / effectiveSpeedKmPerMin);
}
