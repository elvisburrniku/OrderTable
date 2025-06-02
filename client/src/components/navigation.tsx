import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { getCurrentUser, logout } from "@/lib/auth";
import { Calendar, Users, BarChart3, Settings, LogOut, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface NavigationProps {
  isPublic?: boolean;
}

export default function Navigation({ isPublic = false }: NavigationProps) {
  const [location, setLocation] = useLocation();
  const user = getCurrentUser();

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  if (isPublic) {
    return (
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-brand-green rounded-lg flex items-center justify-center">
                <Calendar className="text-white" size={16} />
              </div>
              <span className="text-xl font-bold text-brand-dark">easyTable</span>
            </Link>
            
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-brand-gray hover:text-brand-green transition">Features</a>
              <a href="#pricing" className="text-brand-gray hover:text-brand-green transition">Pricing</a>
              <a href="#about" className="text-brand-gray hover:text-brand-green transition">About us</a>
              <a href="#cases" className="text-brand-gray hover:text-brand-green transition">Cases</a>
              <a href="#contact" className="text-brand-gray hover:text-brand-green transition">Contact</a>
            </div>

            <div className="flex items-center space-x-4">
              <Link href="/login">
                <Button variant="ghost" className="text-brand-gray hover:text-brand-green">
                  Log in
                </Button>
              </Link>
              <Link href="/login">
                <Button className="bg-brand-green text-white hover:bg-green-600">
                  Start free trial
                </Button>
              </Link>
            </div>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <div className="flex flex-col space-y-4 mt-8">
                  <a href="#features" className="text-brand-gray hover:text-brand-green">Features</a>
                  <a href="#pricing" className="text-brand-gray hover:text-brand-green">Pricing</a>
                  <a href="#about" className="text-brand-gray hover:text-brand-green">About us</a>
                  <a href="#cases" className="text-brand-gray hover:text-brand-green">Cases</a>
                  <a href="#contact" className="text-brand-gray hover:text-brand-green">Contact</a>
                  <Link href="/login">
                    <Button className="w-full bg-brand-green text-white hover:bg-green-600">
                      Start free trial
                    </Button>
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
    );
  }

  // Dashboard navigation
  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-brand-green rounded-lg flex items-center justify-center">
              <Calendar className="text-white" size={16} />
            </div>
            <span className="text-xl font-bold text-brand-dark">easyTable</span>
          </Link>
          
          <div className="hidden md:flex items-center space-x-6">
            <Link href="/bookings">
              <Button 
                variant={location === "/bookings" ? "default" : "ghost"} 
                className={location === "/bookings" ? "bg-brand-green text-white" : "text-brand-gray hover:text-brand-green"}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Booking
              </Button>
            </Link>
            <Link href="/customers">
              <Button 
                variant={location === "/customers" ? "default" : "ghost"} 
                className={location === "/customers" ? "bg-brand-green text-white" : "text-brand-gray hover:text-brand-green"}
              >
                <Users className="w-4 h-4 mr-2" />
                CRM
              </Button>
            </Link>
            <Button variant="ghost" className="text-brand-gray hover:text-brand-green">
              <BarChart3 className="w-4 h-4 mr-2" />
              Archive
            </Button>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-sm text-brand-gray hidden sm:block">
              Welcome, {user?.restaurantName}
            </span>
            <Button variant="ghost" size="icon" className="text-brand-gray hover:text-brand-green">
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-brand-gray hover:text-destructive">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
