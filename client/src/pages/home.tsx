import Navigation from "@/components/navigation";
import Footer from "@/components/footer";
import CookieConsent from "@/components/cookie-consent";
import CookieBannerReset from "@/components/cookie-banner-reset";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "@/contexts/language-context";
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
  const t = useTranslations();

  const pricingPlans = [
    {
      name: t.pricing.starter,
      price: "$0",
      period: "forever",
      description: t.pricing.starterDesc,
      features: [
        t.pricing.features.bookings50,
        t.pricing.features.tableBasic,
        t.pricing.features.emailNotifications,
        t.pricing.features.guestForms,
        t.pricing.features.analyticsBasic,
        t.pricing.features.communitySupport
      ],
      buttonText: t.pricing.startFree,
      buttonStyle: "outline",
      popular: false
    },
    {
      name: t.pricing.professional,
      price: "$29",
      period: "per month",
      description: t.pricing.professionalDesc,
      features: [
        t.pricing.features.bookingsUnlimited,
        t.pricing.features.tableAdvanced,
        t.pricing.features.smsEmail,
        t.pricing.features.qrFeedback,
        t.pricing.features.analyticsAdvanced,
        t.pricing.features.kitchenDashboard,
        t.pricing.features.multiLocation,
        t.pricing.features.prioritySupport,
        t.pricing.features.customIntegrations
      ],
      buttonText: t.pricing.startTrial,
      buttonStyle: "default",
      popular: true
    },
    {
      name: t.pricing.enterprise,
      price: "$99",
      period: "per month",
      description: t.pricing.enterpriseDesc,
      features: [
        t.pricing.features.everythingPro,
        t.pricing.features.whiteLabel,
        t.pricing.features.advancedApi,
        t.pricing.features.customIntegrations,
        t.pricing.features.accountManager,
        t.pricing.features.phoneSupport,
        t.pricing.features.customTraining,
        t.pricing.features.slaGuarantee
      ],
      buttonText: t.pricing.contactSales,
      buttonStyle: "outline",
      popular: false
    }
  ];

  const features = [
    {
      category: t.features.bookingManagement,
      icon: Calendar,
      color: "from-blue-500 to-blue-600",
      items: t.features.bookingFeatures
    },
    {
      category: t.features.restaurantOperations,
      icon: Utensils,
      color: "from-green-500 to-green-600", 
      items: t.features.operationsFeatures
    },
    {
      category: t.features.customerExperience,
      icon: Users,
      color: "from-purple-500 to-purple-600",
      items: t.features.customerFeatures
    },
    {
      category: t.features.analyticsInsights,
      icon: BarChart3,
      color: "from-orange-500 to-orange-600",
      items: t.features.analyticsFeatures
    },
    {
      category: t.features.kitchenOperations,
      icon: ChefHat,
      color: "from-red-500 to-red-600",
      items: t.features.kitchenFeatures
    },
    {
      category: t.features.integrations,
      icon: Link2,
      color: "from-indigo-500 to-indigo-600",
      items: t.features.integrationFeatures
    }
  ];

  const deviceShowcase = [
    {
      device: t.devices.desktop,
      icon: Monitor,
      image: "https://images.unsplash.com/photo-1551650975-87deedd944c3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=800",
      description: t.devices.desktopDesc
    },
    {
      device: t.devices.tablet,
      icon: Tablet,
      image: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
      description: t.devices.tabletDesc
    },
    {
      device: t.devices.mobile,
      icon: Smartphone,
      image: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=800",
      description: t.devices.mobileDesc
    }
  ];

  const stats = [
    { number: "50+", label: t.stats.features, icon: Target },
    { number: "99.9%", label: t.stats.uptime, icon: Activity },
    { number: "∞", label: t.stats.bookings, icon: Infinity },
    { number: "24/7", label: t.stats.support, icon: Clock }
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
              {t.hero.badge}
            </Badge>
            <h1 className="text-6xl md:text-8xl font-extrabold mb-6">
              <span className="bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
                {t.hero.title}
              </span>
              <span className="block text-4xl md:text-5xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mt-2">
                {t.hero.subtitle}
              </span>
            </h1>
            <p className="text-2xl text-gray-700 mb-8 max-w-4xl mx-auto leading-relaxed font-light">
              {t.hero.description}
              <span className="font-medium text-blue-600"> 30+ advanced features</span> designed for modern restaurants.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12">
              <Link href="/login">
                <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
                  {t.hero.startTrial} <Sparkles className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-2 border-gray-300 hover:border-blue-400 px-8 py-4 text-lg font-semibold group bg-[#4059db] text-white"
                onClick={() => window.open('https://www.youtube.com/watch?v=dQw4w9WgXcQ', '_blank')}
              >
                <Play className="mr-2 h-5 w-5 text-white group-hover:text-blue-600" />
                {t.hero.watchDemo}
              </Button>
            </div>
            
            {/* Cookie Banner Demo Section */}
            <div className="max-w-md mx-auto">
              <CookieBannerReset />
            </div>
            
            {/* Trust indicators */}
            <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-500" />
                <span>{t.hero.enterpriseSecurity}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span>{t.hero.uptime}</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-purple-500" />
                <span>{t.hero.globalSupport}</span>
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
              {t.devices.title}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {t.devices.description}
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
              {t.pricing.badge}
            </Badge>
            <h2 className="text-5xl font-bold text-gray-900 mb-6">
              {t.pricing.title}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {t.pricing.description}
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
                      {t.pricing.mostPopular}
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
              {t.pricing.customSolution}
            </p>
            <Link href="/contact">
              <Button variant="outline" size="lg" className="border-2 border-gray-300 hover:border-blue-400">
                {t.pricing.contactSalesTeam}
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
              {t.features.badge}
            </Badge>
            <h2 className="text-5xl font-bold text-gray-900 mb-6">
              {t.features.title}
            </h2>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto">
              {t.features.description}
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
              {t.whyChoose.title}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {t.whyChoose.description}
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl mb-6 shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:scale-110">
                <Shield className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{t.whyChoose.enterpriseSecurity}</h3>
              <p className="text-gray-600 leading-relaxed">
                {t.whyChoose.enterpriseSecurityDesc}
              </p>
            </div>
            
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl mb-6 shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:scale-110">
                <Zap className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{t.whyChoose.lightningFast}</h3>
              <p className="text-gray-600 leading-relaxed">
                {t.whyChoose.lightningFastDesc}
              </p>
            </div>
            
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl mb-6 shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:scale-110">
                <Globe className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{t.whyChoose.cloudBased}</h3>
              <p className="text-gray-600 leading-relaxed">
                {t.whyChoose.cloudBasedDesc}
              </p>
            </div>
            
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl mb-6 shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:scale-110">
                <HeartHandshake className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{t.whyChoose.customerCentric}</h3>
              <p className="text-gray-600 leading-relaxed">
                {t.whyChoose.customerCentricDesc}
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
            {t.cta.badge}
          </Badge>
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
            {t.cta.title}
          </h2>
          <p className="text-xl md:text-2xl text-blue-100 mb-12 max-w-3xl mx-auto leading-relaxed">
            {t.cta.description}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12">
            <Link href="/login">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 px-10 py-4 text-lg font-bold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                {t.cta.startTrialNow}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="inline-flex items-center justify-center gap-2 whitespace-nowrap ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-11 rounded-md border-2 border-white text-white hover:bg-white hover:text-blue-600 px-10 py-4 text-lg font-bold transition-all duration-300 bg-[#4059db]">
                {t.cta.talkToSales}
              </Button>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-white mb-2">{t.cta.freeTrial}</div>
              <div className="text-blue-200">{t.cta.freeTrialDesc}</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-2">{t.cta.noSetup}</div>
              <div className="text-blue-200">{t.cta.noSetupDesc}</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-2">{t.cta.cancel}</div>
              <div className="text-blue-200">{t.cta.cancelDesc}</div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <CookieConsent />
    </div>
  );
}
