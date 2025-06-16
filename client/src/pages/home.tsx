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
  Activity,
  Monitor,
  Tablet,
  Watch,
  Infinity,
  Crown,
  Sparkles,
  Play,
  X
} from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const pricingPlans = [
    {
      name: "Starter",
      price: "$0",
      period: "forever",
      description: "Perfect for small restaurants getting started",
      features: [
        "Up to 50 bookings per month",
        "Basic table management",
        "Email notifications",
        "Guest booking forms",
        "Basic analytics",
        "Community support"
      ],
      buttonText: "Start Free",
      buttonStyle: "outline",
      popular: false
    },
    {
      name: "Professional",
      price: "$29",
      period: "per month",
      description: "Everything you need to run a successful restaurant",
      features: [
        "Unlimited bookings",
        "Advanced table management",
        "SMS & email notifications",
        "QR code feedback system",
        "Advanced analytics & reports",
        "Kitchen dashboard",
        "Multi-location support",
        "Priority support",
        "Custom integrations"
      ],
      buttonText: "Start 14-Day Free Trial",
      buttonStyle: "default",
      popular: true
    },
    {
      name: "Enterprise",
      price: "$99",
      period: "per month",
      description: "Advanced features for restaurant chains and enterprises",
      features: [
        "Everything in Professional",
        "White-label solution",
        "Advanced API access",
        "Custom integrations",
        "Dedicated account manager",
        "24/7 phone support",
        "Custom training sessions",
        "SLA guarantee"
      ],
      buttonText: "Contact Sales",
      buttonStyle: "outline",
      popular: false
    }
  ];

  const features = [
    {
      category: "Booking Management",
      icon: Calendar,
      color: "from-blue-500 to-blue-600",
      items: [
        "Real-time availability checking",
        "Smart table assignment", 
        "Booking modifications & cancellations",
        "Walk-in management",
        "Conflict detection & resolution",
        "Custom booking forms"
      ]
    },
    {
      category: "Restaurant Operations",
      icon: Utensils,
      color: "from-green-500 to-green-600", 
      items: [
        "Multi-restaurant management",
        "Table & room configuration",
        "Capacity optimization",
        "Opening hours management",
        "Combined table handling",
        "Real-time status tracking"
      ]
    },
    {
      category: "Customer Experience",
      icon: Users,
      color: "from-purple-500 to-purple-600",
      items: [
        "Complete customer profiles",
        "QR code feedback collection",
        "Satisfaction surveys",
        "Automated confirmations",
        "SMS & email reminders",
        "Multi-language support"
      ]
    },
    {
      category: "Analytics & Insights",
      icon: BarChart3,
      color: "from-orange-500 to-orange-600",
      items: [
        "Booking trends & statistics",
        "Table utilization heat maps",
        "Revenue analytics",
        "Customer behavior insights",
        "Performance dashboards",
        "Detailed reporting"
      ]
    },
    {
      category: "Kitchen Operations",
      icon: ChefHat,
      color: "from-red-500 to-red-600",
      items: [
        "Kitchen order tracking",
        "Menu management system",
        "Product organization",
        "Order management",
        "Performance analytics",
        "Printable order forms"
      ]
    },
    {
      category: "Integrations",
      icon: Link2,
      color: "from-indigo-500 to-indigo-600",
      items: [
        "Google Calendar sync",
        "Stripe payment processing",
        "Email service integration",
        "Social media connections",
        "Webhook configurations",
        "Third-party app support"
      ]
    }
  ];

  const deviceShowcase = [
    {
      device: "Desktop",
      icon: Monitor,
      image: "https://images.unsplash.com/photo-1551650975-87deedd944c3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=800",
      description: "Complete restaurant management dashboard"
    },
    {
      device: "Tablet",
      icon: Tablet,
      image: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
      description: "Table-side booking and order management"
    },
    {
      device: "Mobile",
      icon: Smartphone,
      image: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=800",
      description: "On-the-go access for staff and customers"
    }
  ];

  const stats = [
    { number: "50+", label: "Features Available", icon: Target },
    { number: "99.9%", label: "Uptime Guarantee", icon: Activity },
    { number: "∞", label: "Bookings Supported", icon: Infinity },
    { number: "24/7", label: "Support Available", icon: Clock }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/5 to-pink-600/10"></div>
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl"></div>
        </div>
        <div className="relative max-w-7xl mx-auto">
          <div className="text-center">
            <Badge className="mb-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 px-6 py-2 text-sm font-medium">
              🚀 Complete Restaurant Management Platform
            </Badge>
            <h1 className="text-6xl md:text-8xl font-extrabold mb-6">
              <span className="bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
                ReadyTable
              </span>
              <span className="block text-4xl md:text-5xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mt-2">
                Restaurant Revolution
              </span>
            </h1>
            <p className="text-2xl text-gray-700 mb-8 max-w-4xl mx-auto leading-relaxed font-light">
              Transform your restaurant with our comprehensive booking and management solution. 
              <span className="font-medium text-blue-600">30+ advanced features</span> designed for modern restaurants.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12">
              <Link href="/register">
                <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
                  Start Free Trial <Sparkles className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="border-2 border-gray-300 hover:border-blue-400 px-8 py-4 text-lg font-semibold group">
                <Play className="mr-2 h-5 w-5 group-hover:text-blue-600" />
                Watch Demo
              </Button>
            </div>
            
            {/* Trust indicators */}
            <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-500" />
                <span>Enterprise Security</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span>99.9% Uptime</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-purple-500" />
                <span>Global Support</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Device Showcase Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Works Perfectly on Every Device
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Your restaurant management platform, available anywhere. Desktop, tablet, mobile - seamless experience across all devices.
            </p>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-12 items-center">
            {deviceShowcase.map((device, index) => (
              <div key={index} className="text-center group">
                <div className="relative mb-8 overflow-hidden rounded-2xl shadow-2xl group-hover:shadow-3xl transition-all duration-500 transform group-hover:scale-105">
                  <img 
                    src={device.image} 
                    alt={`ReadyTable on ${device.device}`}
                    className="w-full h-64 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <div className="flex items-center gap-2 mb-2">
                      <device.icon className="h-5 w-5" />
                      <span className="font-semibold">{device.device}</span>
                    </div>
                    <p className="text-sm opacity-90">{device.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Stats moved here */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20 pt-16 border-t border-gray-200">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl mb-4 shadow-lg">
                  <stat.icon className="h-8 w-8 text-white" />
                </div>
                <div className="text-4xl font-bold text-gray-900 mb-2">{stat.number}</div>
                <div className="text-gray-600 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Plans Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-green-100 text-green-800 hover:bg-green-200">
              Simple, Transparent Pricing
            </Badge>
            <h2 className="text-5xl font-bold text-gray-900 mb-6">
              Choose Your Perfect Plan
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Start free and scale as you grow. No hidden fees, no surprises. Cancel anytime.
            </p>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card key={index} className={`relative border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 ${
                plan.popular 
                  ? 'ring-4 ring-blue-500 ring-opacity-50 bg-gradient-to-b from-blue-50 to-white' 
                  : 'bg-white'
              }`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 text-sm font-semibold">
                      <Crown className="w-4 h-4 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pb-8 pt-8">
                  <CardTitle className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</CardTitle>
                  <div className="mb-4">
                    <span className="text-5xl font-extrabold text-gray-900">{plan.price}</span>
                    <span className="text-lg text-gray-500 ml-2">/{plan.period}</span>
                  </div>
                  <CardDescription className="text-gray-600 text-base px-4">
                    {plan.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="px-8 pb-8">
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Link href="/register">
                    <Button 
                      className={`w-full py-3 text-lg font-semibold transition-all duration-300 ${
                        plan.buttonStyle === 'default'
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg'
                          : 'border-2 border-gray-300 hover:border-blue-400 bg-white hover:bg-blue-50'
                      }`}
                      variant={plan.buttonStyle === 'default' ? 'default' : 'outline'}
                    >
                      {plan.buttonText}
                      {plan.buttonStyle === 'default' && <ArrowRight className="ml-2 h-5 w-5" />}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="text-center mt-16">
            <p className="text-gray-600 mb-4">
              Need a custom solution? We've got you covered.
            </p>
            <Link href="/contact">
              <Button variant="outline" size="lg" className="border-2 border-gray-300 hover:border-blue-400">
                Contact Sales Team
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Comprehensive Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <Badge className="mb-4 bg-purple-100 text-purple-800 hover:bg-purple-200">
              30+ Powerful Features
            </Badge>
            <h2 className="text-5xl font-bold text-gray-900 mb-6">
              Everything Your Restaurant Needs
            </h2>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto">
              From booking management to kitchen operations, analytics to customer feedback - 
              we've built every feature you need to run a successful restaurant.
            </p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:scale-105 bg-gradient-to-br from-white to-gray-50 group">
                <CardHeader className="pb-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-xl bg-gradient-to-r ${feature.color} shadow-lg group-hover:shadow-xl transition-shadow duration-300`}>
                      <feature.icon className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {feature.category}
                      </CardTitle>
                      <CardDescription className="text-lg text-gray-600">
                        {feature.items.length} integrated features
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-4">
                    {feature.items.map((item, itemIndex) => (
                      <li key={itemIndex} className="flex items-start gap-3 group-hover:translate-x-1 transition-transform duration-300">
                        <div className="mt-1">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        </div>
                        <span className="text-gray-700 font-medium leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose ReadyTable Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Why Restaurants Choose ReadyTable
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Built with enterprise-grade technology and designed for restaurants that demand excellence
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl mb-6 shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:scale-110">
                <Shield className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Enterprise Security</h3>
              <p className="text-gray-600 leading-relaxed">
                Multi-tenant isolation, role-based access control, and secure authentication with SSO support
              </p>
            </div>
            
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl mb-6 shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:scale-110">
                <Zap className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Lightning Fast</h3>
              <p className="text-gray-600 leading-relaxed">
                Real-time updates, instant notifications, and blazing-fast performance on all devices
              </p>
            </div>
            
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl mb-6 shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:scale-110">
                <Globe className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Cloud-Based</h3>
              <p className="text-gray-600 leading-relaxed">
                Access anywhere with automatic backups, scaling, and 99.9% uptime guarantee
              </p>
            </div>
            
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl mb-6 shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:scale-110">
                <HeartHandshake className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Customer-Centric</h3>
              <p className="text-gray-600 leading-relaxed">
                Seamless guest experience from booking to feedback with automated communications
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-900 via-blue-700 to-purple-800 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
          <div className="absolute top-1/4 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-purple-400/20 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-5xl mx-auto text-center">
          <Badge className="mb-6 bg-white/20 text-white hover:bg-white/30 px-6 py-2 text-sm font-medium">
            Join 1000+ Restaurants Worldwide
          </Badge>
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Ready to Transform Your Restaurant?
          </h2>
          <p className="text-xl md:text-2xl text-blue-100 mb-12 max-w-3xl mx-auto leading-relaxed">
            Start your free trial today and discover why restaurants worldwide choose ReadyTable 
            to streamline operations and delight customers.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12">
            <Link href="/register">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 px-10 py-4 text-lg font-bold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                Start Free Trial Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-blue-600 px-10 py-4 text-lg font-bold transition-all duration-300">
                Talk to Sales
              </Button>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-white mb-2">14 Days</div>
              <div className="text-blue-200">Free Trial</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-2">No Setup</div>
              <div className="text-blue-200">Fees Required</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-2">Cancel</div>
              <div className="text-blue-200">Anytime</div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
