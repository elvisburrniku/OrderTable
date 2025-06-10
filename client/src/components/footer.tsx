import { ReadyTableLogo } from "@/components/ui/ready-table-logo";

export default function Footer() {
  const languages = [
    { code: "dk", name: "Danish" },
    { code: "nl", name: "Dutch" },
    { code: "fr", name: "French" },
    { code: "de", name: "German" },
    { code: "no", name: "Norwegian" },
    { code: "es", name: "Spanish" },
    { code: "se", name: "Swedish" }
  ];

  return (
    <footer className="bg-black text-white py-16" id="contact">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center mb-12">
          <div>
            <div className="flex items-center mb-6">
              <ReadyTableLogo size={32} textClassName="text-2xl font-bold text-white" />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
              BETTER BOOKING.<br />
              BETTER BUSINESS.
            </h2>
          </div>
          <div className="text-right">
            <div className="mb-4">
              <div className="text-lg font-semibold">+44 330 808 1717</div>
            </div>
            <div className="mb-4">
              <div className="text-lg">info@readytable.com</div>
            </div>
            <div className="text-sm text-gray-400">
              <div>Oerstads Boulevard 67</div>
              <div>2300 Copenhagen</div>
              <div>Denmark</div>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-800 pt-8 mb-8">
          <div className="grid md:grid-cols-5 gap-8 text-sm">
            <div>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Careers</a>
            </div>
            <div>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">General Terms and Conditions</a>
            </div>
            <div>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Affordable reservation system</a>
            </div>
            <div>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Restaurant booking system</a>
            </div>
            <div></div>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-4">
            <span>Restaurant reserveringssystem</span>
            <span>Reserveringssysteem voor restaurants</span>
            <span>Restaurant booking system</span>
            <span>Système de réservation de restaurant</span>
            <span>Systeem de reserva para restaurants</span>
          </div>
          <div className="flex items-center gap-4">
            {languages.map((lang) => (
              <img
                key={lang.code}
                src={`https://flagcdn.com/16x12/${lang.code}.png`}
                alt={lang.name}
                className="w-4 h-3"
              />
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
