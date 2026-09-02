export function formatPrice(sar: number): string {
  return `SAR ${Math.round(sar).toLocaleString("en-US")}`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}
