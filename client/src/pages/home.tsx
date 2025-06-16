import Navigation from "@/components/navigation";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Users, 
  BarChart3, 
  Settings, 
  MessageSquare, 
  QrCode,
  Clock,
  CreditCard,
  Mail,
  Smartphone,
  MapPin,
  Star,
  ArrowRight,
  CheckCircle,
  Globe,
  Shield,
  Zap,
  HeartHandshake,
  TrendingUp,
  Target,
  Utensils,
  ChefHat,
  TableProperties,
  Bell,
  FileText,
  Palette,
  Database,
  Link2,
  Activity
} from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const features = [
    {
      category: "Booking Management",
      icon: Calendar,
      color: "bg-blue-500",
      items: [
        "Real-time booking system with availability checking",
        "Table assignment with capacity validation", 
        "Booking modification and cancellation workflow",
        "Walk-in booking management",
        "Conflict detection and resolution",
        "Guest booking forms with custom fields"
      ]
    },
    {
      category: "Restaurant Operations",
      icon: Utensils,
      color: "bg-green-500", 
      items: [
        "Multi-restaurant management",
        "Table and room configuration",
        "Seating capacity optimization",
        "Opening hours and special periods",
        "Combined table management",
        "Real-time table status tracking"
      ]
    },
    {
      category: "Customer Experience",
      icon: Users,
      color: "bg-purple-500",
      items: [
        "Customer database and profiles",
        "Feedback collection system with QR codes",
        "Guest satisfaction surveys",
        "Booking confirmation emails",
        "SMS notifications and reminders",
        "Multi-language support"
      ]
    },
    {
      category: "Analytics & Insights",
      icon: BarChart3,
      color: "bg-orange-500",
      items: [
        "Booking statistics and trends",
        "Table utilization heat maps",
        "Revenue analytics",
        "Customer behavior insights",
        "Performance dashboards",
        "Activity logs and reporting"
      ]
    },
    {
      category: "Kitchen Operations",
      icon: ChefHat,
      color: "bg-red-500",
      items: [
        "Kitchen dashboard for order tracking",
        "Menu management system",
        "Product and category organization",
        "Order creation and management",
        "Kitchen performance analytics",
        "Printable order forms"
      ]
    },
    {
      category: "Integrations",
      icon: Link2,
      color: "bg-indigo-500",
      items: [
        "Google Calendar synchronization",
        "Stripe payment processing",
        "Email service integration (Brevo)",
        "Social media connections",
        "Webhook configurations",
        "Third-party app connections"
      ]
    }
  ];

  const highlights = [
    {
      icon: Shield,
      title: "Multi-Tenant Security",
      description: "Enterprise-grade security with tenant isolation and role-based access control"
    },
    {
      icon: Zap,
      title: "Real-Time Updates",
      description: "Live booking status, table availability, and instant notifications"
    },
    {
      icon: Globe,
      title: "Cloud-Based Platform",
      description: "Access from anywhere with automatic backups and scaling"
    },
    {
      icon: HeartHandshake,
      title: "Customer-Centric",
      description: "Seamless guest experience from booking to feedback collection"
    }
  ];

  const stats = [
    { number: "50+", label: "Features Available", icon: Target },
    { number: "24/7", label: "System Uptime", icon: Activity },
    { number: "∞", label: "Bookings Supported", icon: Calendar },
    { number: "100%", label: "Customizable", icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5"></div>
        <div className="relative max-w-7xl mx-auto">
          <div className="text-center">
            <Badge className="mb-6 bg-blue-100 text-blue-800 hover:bg-blue-200">
              Complete Restaurant Management Platform
            </Badge>
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6">
              ReadyTable
              <span className="block text-blue-600">Restaurant Platform</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Comprehensive booking and management solution with advanced features for modern restaurants. 
              From reservations to kitchen operations, analytics to customer feedback - everything in one platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
                  Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="#features">
                <Button size="lg" variant="outline">
                  Explore Features
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4">
                  <stat.icon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">{stat.number}</div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Highlights */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Choose ReadyTable?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Built for restaurants that demand excellence in every aspect of their operations
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {highlights.map((highlight, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg mb-4 mx-auto">
                    <highlight.icon className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-xl">{highlight.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-center">{highlight.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Comprehensive Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Complete Feature Set
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Every feature you need to run a successful restaurant, all integrated into one powerful platform
            </p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-12">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${feature.color}`}>
                      <feature.icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{feature.category}</CardTitle>
                      <CardDescription>
                        {feature.items.length} integrated features
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {feature.items.map((item, itemIndex) => (
                      <li key={itemIndex} className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Technical Excellence Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Built with Modern Technology
            </h2>
            <p className="text-lg text-gray-600">
              Enterprise-grade architecture ensuring reliability, security, and scalability
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-md">
              <CardHeader className="text-center">
                <Database className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <CardTitle>Robust Backend</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600">
                  PostgreSQL database with TypeScript, Express.js, and comprehensive API architecture
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-md">
              <CardHeader className="text-center">
                <Palette className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                <CardTitle>Modern Frontend</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600">
                  React 18 with TypeScript, Tailwind CSS, and responsive design for all devices
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-md">
              <CardHeader className="text-center">
                <Shield className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <CardTitle>Enterprise Security</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600">
                  Multi-tenant isolation, role-based access, and secure authentication with SSO support
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Transform Your Restaurant?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join restaurants worldwide using ReadyTable to streamline operations and delight customers
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
                Start Free Trial Today
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600">
                Contact Sales
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
