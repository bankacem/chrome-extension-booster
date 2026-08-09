import { useLocation, useNavigate } from "react-router-dom";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SUPPORTED_LANGUAGES, LANGUAGE_NAMES, SupportedLanguage } from "@/i18n";
import { useLang } from "@/hooks/useLang";

/**
 * Converts the current pathname to its equivalent in the target language.
 * /blog/some-slug        → /fr/blog/some-slug   (en → fr)
 * /fr/blog/some-slug     → /blog/some-slug       (fr → en)
 * /fr/blog/some-slug     → /es/blog/some-slug    (fr → es)
 */
function switchLangPath(pathname: string, currentLang: SupportedLanguage, targetLang: SupportedLanguage): string {
  // Strip existing language prefix if present
  const nonDefaultLangs = SUPPORTED_LANGUAGES.filter((l) => l !== "en");
  let strippedPath = pathname;
  for (const lang of nonDefaultLangs) {
    if (pathname === `/${lang}` || pathname.startsWith(`/${lang}/`)) {
      strippedPath = pathname.slice(`/${lang}`.length) || "/";
      break;
    }
  }

  if (targetLang === "en") return strippedPath;
  return `/${targetLang}${strippedPath === "/" ? "" : strippedPath}`;
}

export default function LanguageSwitcher() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const currentLang = useLang();

  const handleSelect = (lang: SupportedLanguage) => {
    if (lang === currentLang) return;
    const newPath = switchLangPath(pathname, currentLang, lang);
    navigate(newPath);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 px-2">
          <Globe className="h-4 w-4" />
          <span className="uppercase text-xs font-medium">{currentLang}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang}
            onClick={() => handleSelect(lang)}
            className={currentLang === lang ? "font-semibold" : ""}
          >
            {LANGUAGE_NAMES[lang]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
