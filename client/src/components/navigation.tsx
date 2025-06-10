import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { ReadyTableLogo } from "@/components/ui/ready-table-logo";

export default function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
              <a href="#features" className="text-gray-700 hover:text-green-600 px-3 py-2 text-sm font-medium transition-colors">Features</a>
              <a href="#pricing" className="text-gray-700 hover:text-green-600 px-3 py-2 text-sm font-medium transition-colors">Pricing</a>
              <a href="#about" className="text-gray-700 hover:text-green-600 px-3 py-2 text-sm font-medium transition-colors">About us</a>
              <a href="#cases" className="text-gray-700 hover:text-green-600 px-3 py-2 text-sm font-medium transition-colors">Cases</a>
              <a href="#contact" className="text-gray-700 hover:text-green-600 px-3 py-2 text-sm font-medium transition-colors">Contact</a>
              <Link href="/login">
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  Log in
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
              <a href="#features" className="text-gray-700 hover:text-green-600 px-3 py-2 text-sm font-medium">Features</a>
              <a href="#pricing" className="text-gray-700 hover:text-green-600 px-3 py-2 text-sm font-medium">Pricing</a>
              <a href="#about" className="text-gray-700 hover:text-green-600 px-3 py-2 text-sm font-medium">About us</a>
              <a href="#cases" className="text-gray-700 hover:text-green-600 px-3 py-2 text-sm font-medium">Cases</a>
              <a href="#contact" className="text-gray-700 hover:text-green-600 px-3 py-2 text-sm font-medium">Contact</a>
              <Link href="/login" className="pt-2">
                <Button className="bg-green-600 hover:bg-green-700 text-white w-full">
                  Log in
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
