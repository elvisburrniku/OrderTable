import { ReadyTableLogo } from "@/components/ui/ready-table-logo";
import { useTranslations, Language, detectLanguage } from "@/lib/i18n";
import { Globe, Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Instagram } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

export default function Footer() {
  const t = useTranslations();
  const [currentLanguage, setCurrentLanguage] = useState<Language>(detectLanguage());

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

  const companyLinks = [
    { name: t.footer.about, href: "/about" },
    { name: t.footer.careers, href: "/careers" },
    { name: t.footer.blog, href: "/blog" },
    { name: t.footer.press, href: "/press" }
  ];

  const productLinks = [
    { name: t.footer.features, href: "#features" },
    { name: t.footer.pricing, href: "#pricing" },
    { name: t.footer.security, href: "/security" },
    { name: t.footer.integrations, href: "/integrations" }
  ];

  const resourceLinks = [
    { name: t.footer.documentation, href: "/docs" },
    { name: t.footer.support, href: "/support" },
    { name: t.footer.community, href: "/community" },
    { name: t.footer.statusPage, href: "/status" }
  ];

  const legalLinks = [
    { name: t.footer.privacy, href: "/privacy" },
    { name: t.footer.terms, href: "/terms" },
    { name: t.footer.cookies, href: "/cookies" },
    { name: t.footer.gdpr, href: "/gdpr" }
  ];

  const socialLinks = [
    { name: "Facebook", icon: Facebook, href: "https://facebook.com/readytable" },
    { name: "Twitter", icon: Twitter, href: "https://twitter.com/readytable" },
    { name: "LinkedIn", icon: Linkedin, href: "https://linkedin.com/company/readytable" },
    { name: "Instagram", icon: Instagram, href: "https://instagram.com/readytable" }
  ];

  return (
    <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Top Section */}
        <div className="grid lg:grid-cols-12 gap-12 mb-12">
          {/* Company Info */}
          <div className="lg:col-span-4">
            <div className="flex items-center mb-6">
              <ReadyTableLogo size={36} textClassName="text-2xl font-bold text-white" />
            </div>
            <p className="text-gray-300 mb-6 leading-relaxed">
              {t.footer.description}
            </p>
            
            {/* Contact Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-blue-400" />
                <span className="text-gray-300">+45 70 20 12 45</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-blue-400" />
                <span className="text-gray-300">support@readytable.com</span>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-blue-400 mt-1" />
                <div className="text-gray-300">
                  <div>Ørestads Boulevard 67</div>
                  <div>2300 Copenhagen S</div>
                  <div>Denmark</div>
                </div>
              </div>
            </div>
          </div>

          {/* Links Sections */}
          <div className="lg:col-span-8">
            <div className="grid md:grid-cols-4 gap-8">
              {/* Company */}
              <div>
                <h3 className="text-lg font-semibold mb-4">{t.footer.company}</h3>
                <ul className="space-y-3">
                  {companyLinks.map((link, index) => (
                    <li key={index}>
                      <Link href={link.href}>
                        <a className="text-gray-400 hover:text-white transition-colors duration-200">
                          {link.name}
                        </a>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Product */}
              <div>
                <h3 className="text-lg font-semibold mb-4">{t.footer.product}</h3>
                <ul className="space-y-3">
                  {productLinks.map((link, index) => (
                    <li key={index}>
                      <Link href={link.href}>
                        <a className="text-gray-400 hover:text-white transition-colors duration-200">
                          {link.name}
                        </a>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Resources */}
              <div>
                <h3 className="text-lg font-semibold mb-4">{t.footer.resources}</h3>
                <ul className="space-y-3">
                  {resourceLinks.map((link, index) => (
                    <li key={index}>
                      <Link href={link.href}>
                        <a className="text-gray-400 hover:text-white transition-colors duration-200">
                          {link.name}
                        </a>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Legal */}
              <div>
                <h3 className="text-lg font-semibold mb-4">{t.footer.legal}</h3>
                <ul className="space-y-3">
                  {legalLinks.map((link, index) => (
                    <li key={index}>
                      <Link href={link.href}>
                        <a className="text-gray-400 hover:text-white transition-colors duration-200">
                          {link.name}
                        </a>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Social Media */}
        <div className="border-t border-gray-700 pt-8 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-6">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  className="text-gray-400 hover:text-white transition-colors duration-200"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <social.icon className="h-6 w-6" />
                  <span className="sr-only">{social.name}</span>
                </a>
              ))}
            </div>
            
            {/* Language Selector */}
            <div className="flex items-center gap-4">
              <Globe className="h-5 w-5 text-gray-400" />
              <div className="flex flex-wrap gap-2">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setCurrentLanguage(lang.code)}
                    className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm transition-colors duration-200 ${
                      currentLanguage === lang.code
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    <img
                      src={`https://flagcdn.com/16x12/${lang.flag}.png`}
                      alt={lang.name}
                      className="w-4 h-3"
                    />
                    <span className="hidden sm:inline">{lang.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-700 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-gray-400 text-sm">
              © {new Date().getFullYear()} ReadyTable. {t.footer.rights}
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <span>Made with ❤️ in Denmark</span>
              <span>•</span>
              <span>GDPR Compliant</span>
              <span>•</span>
              <span>ISO 27001 Certified</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
