import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, SupportedLanguage, RTL_LANGUAGES } from "@/i18n";

/**
 * Returns the active language based on the URL prefix (/fr/... → 'fr').
 * Also keeps i18n in sync so useTranslation() returns the right strings.
 * Sets dir="rtl" on <html> for RTL languages like Arabic.
 */
export function useLang(): SupportedLanguage {
  const { pathname } = useLocation();
  const { i18n } = useTranslation();

  const segment = pathname.split("/")[1] as SupportedLanguage;
  const lang: SupportedLanguage = SUPPORTED_LANGUAGES.includes(segment) ? segment : "en";

  useEffect(() => {
    if (i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
  }, [lang, i18n]);

  useEffect(() => {
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("dir", RTL_LANGUAGES.has(lang) ? "rtl" : "ltr");
  }, [lang]);

  return lang;
}
