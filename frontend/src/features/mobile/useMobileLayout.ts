import { useEffect, useState } from "react";

/** 手機版斷點：< 768px（Tailwind md 以下），對應 MOBILE_DESIGN_SPEC.md §2 */
const MOBILE_QUERY = "(max-width: 767px)";

function matches(): boolean {
  return typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches;
}

/** 視窗是否為手機寬度；跨越斷點時即時切換 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(matches);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = () => setIsMobile(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}

export type MobileTheme = "dark" | "light";

const THEME_KEY = "mobile-theme";

function readTheme(): MobileTheme {
  try {
    return window.localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

/** 手機版主題（深色預設）；記在 localStorage，無法存取時只在本次瀏覽有效 */
export function useMobileTheme() {
  const [theme, setTheme] = useState<MobileTheme>(readTheme);

  const toggle = () => {
    const next: MobileTheme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {
      /* 私密瀏覽等情況無法寫入：忽略 */
    }
  };

  return { theme, toggle };
}
