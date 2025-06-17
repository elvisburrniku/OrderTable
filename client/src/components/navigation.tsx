import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X, Globe, ChevronDown } from "lucide-react";
import { ReadyTableLogo } from "@/components/ui/ready-table-logo";
import { useTranslations, useLanguage } from "@/contexts/language-context";
import { Language } from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const t = useTranslations();
  const { language: currentLanguage, setLanguage } = useLanguage();

  const languages: { code: Language; name: string; flag: string }[] = [
    { code: "en", name: "English", flag: "gb" },
    { code: "de", name: "Deutsch", flag: "de" },
    { code: "es", name: "Español", flag: "es" },
    { code: "fr", name: "Français", flag: "fr" },
    { code: "it", name: "Italiano", flag: "it" },
    { code: "no", name: "Norsk", flag: "no" },
    { code: "da", name: "Dansk", flag: "dk" },
    { code: "sv", name: "Svenska", flag: "se" },
    { code: "cs", name: "Čeština", flag: "cz" },
    { code: "nl", name: "Nederlands", flag: "nl" }
  ];

  const currentLang = languages.find(lang => lang.code === currentLanguage) || languages[0];

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <ReadyTableLogo textClassName="text-xl font-bold text-gray-900" />
            </Link>
          </div>
          
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              <a href="#features" className="text-gray-700 hover:text-green-600 px-3 py-2 text-sm font-medium transition-colors">{t.nav.features}</a>
              <a href="#pricing" className="text-gray-700 hover:text-green-600 px-3 py-2 text-sm font-medium transition-colors">{t.nav.pricing}</a>
              <a href="#contact" className="text-gray-700 hover:text-green-600 px-3 py-2 text-sm font-medium transition-colors">{t.nav.contact}</a>
              
              {/* Language Switcher */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center gap-2 text-gray-700 hover:text-green-600">
                    <img
                      src={`https://flagcdn.com/16x12/${currentLang.flag}.png`}
                      alt={currentLang.name}
                      className="w-4 h-3"
                    />
                    <span className="hidden lg:inline">{currentLang.name}</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {languages.map((lang) => (
                    <DropdownMenuItem
                      key={lang.code}
                      onClick={() => setLanguage(lang.code)}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <img
                        src={`https://flagcdn.com/16x12/${lang.flag}.png`}
                        alt={lang.name}
                        className="w-4 h-3"
                      />
                      <span>{lang.name}</span>
                      {currentLanguage === lang.code && (
                        <span className="ml-auto text-green-600">✓</span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Link href="/login">
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  {t.nav.login}
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </Button>
          </div>
        </div>
        
        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <div className="flex flex-col space-y-2">
              <a href="#features" className="text-gray-700 hover:text-green-600 px-3 py-2 text-sm font-medium">{t.nav.features}</a>
              <a href="#pricing" className="text-gray-700 hover:text-green-600 px-3 py-2 text-sm font-medium">{t.nav.pricing}</a>
              <a href="#contact" className="text-gray-700 hover:text-green-600 px-3 py-2 text-sm font-medium">{t.nav.contact}</a>
              
              {/* Mobile Language Switcher */}
              <div className="px-3 py-2">
                <div className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Language
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`flex items-center gap-2 px-2 py-1 rounded text-sm transition-colors ${
                        currentLanguage === lang.code
                          ? 'bg-green-100 text-green-700'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <img
                        src={`https://flagcdn.com/16x12/${lang.flag}.png`}
                        alt={lang.name}
                        className="w-4 h-3"
                      />
                      <span className="text-xs">{lang.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              <Link href="/login" className="pt-2 px-3">
                <Button className="bg-green-600 hover:bg-green-700 text-white w-full">
                  {t.nav.login}
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
