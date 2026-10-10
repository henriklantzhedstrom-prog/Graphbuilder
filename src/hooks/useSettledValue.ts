import { useEffect, useState } from "react";

/**
 * Värdet som det var när det senast stod stilla i `delay` millisekunder. Används för sådant som
 * är dyrt att räkna om i varje bildruta medan värdet rör sig (t.ex. zoomen under en glidning).
 */
export function useSettledValue<T>(value: T, delay: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    if (Object.is(value, settled)) return;
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, settled, delay]);
  return settled;
}
