// Internationalization system for ReadyTable
export type Language = 'en' | 'de' | 'es' | 'fr' | 'it' | 'no' | 'da' | 'sv' | 'cs' | 'nl';

export interface Translations {
  // Navigation
  nav: {
    features: string;
    pricing: string;
    contact: string;
    login: string;
    register: string;
  };
  
  // Hero Section
  hero: {
    badge: string;
    title: string;
    subtitle: string;
    description: string;
    startTrial: string;
    watchDemo: string;
    enterpriseSecurity: string;
    uptime: string;
    globalSupport: string;
  };
  
  // Device Showcase
  devices: {
    title: string;
    description: string;
    desktop: string;
    tablet: string;
    mobile: string;
    desktopDesc: string;
    tabletDesc: string;
    mobileDesc: string;
  };
  
  // Pricing
  pricing: {
    badge: string;
    title: string;
    description: string;
    starter: string;
    professional: string;
    enterprise: string;
    starterDesc: string;
    professionalDesc: string;
    enterpriseDesc: string;
    mostPopular: string;
    startFree: string;
    startTrial: string;
    contactSales: string;
    customSolution: string;
    contactSalesTeam: string;
    features: {
      bookings50: string;
      bookingsUnlimited: string;
      tableBasic: string;
      tableAdvanced: string;
      emailNotifications: string;
      smsEmail: string;
      guestForms: string;
      qrFeedback: string;
      analyticsBasic: string;
      analyticsAdvanced: string;
      communitySupport: string;
      kitchenDashboard: string;
      multiLocation: string;
      prioritySupport: string;
      customIntegrations: string;
      everythingPro: string;
      whiteLabel: string;
      advancedApi: string;
      accountManager: string;
      phoneSupport: string;
      customTraining: string;
      slaGuarantee: string;
    };
  };
  
  // Features
  features: {
    badge: string;
    title: string;
    description: string;
    bookingManagement: string;
    restaurantOperations: string;
    customerExperience: string;
    analyticsInsights: string;
    kitchenOperations: string;
    integrations: string;
    bookingFeatures: string[];
    operationsFeatures: string[];
    customerFeatures: string[];
    analyticsFeatures: string[];
    kitchenFeatures: string[];
    integrationFeatures: string[];
  };
  
  // Why Choose
  whyChoose: {
    title: string;
    description: string;
    enterpriseSecurity: string;
    enterpriseSecurityDesc: string;
    lightningFast: string;
    lightningFastDesc: string;
    cloudBased: string;
    cloudBasedDesc: string;
    customerCentric: string;
    customerCentricDesc: string;
  };
  
  // CTA
  cta: {
    badge: string;
    title: string;
    description: string;
    startTrialNow: string;
    talkToSales: string;
    freeTrial: string;
    noSetup: string;
    cancel: string;
    freeTrialDesc: string;
    noSetupDesc: string;
    cancelDesc: string;
  };
  
  // Footer
  footer: {
    company: string;
    product: string;
    resources: string;
    legal: string;
    description: string;
    rights: string;
    // Company links
    about: string;
    careers: string;
    blog: string;
    press: string;
    // Product links
    features: string;
    pricing: string;
    security: string;
    integrations: string;
    // Resources
    documentation: string;
    support: string;
    community: string;
    statusPage: string;
    // Legal
    privacy: string;
    terms: string;
    cookies: string;
    gdpr: string;
  };
  
  // Stats
  stats: {
    features: string;
    uptime: string;
    bookings: string;
    support: string;
  };
}

export const translations: Record<Language, Translations> = {
  en: {
    nav: {
      features: "Features",
      pricing: "Pricing",
      contact: "Contact",
      login: "Login",
      register: "Sign Up"
    },
    hero: {
      badge: "🚀 Complete Restaurant Management Platform",
      title: "ReadyTable",
      subtitle: "Restaurant Revolution",
      description: "Transform your restaurant with our comprehensive booking and management solution.",
      startTrial: "Start Free Trial",
      watchDemo: "Watch Demo",
      enterpriseSecurity: "Enterprise Security",
      uptime: "99.9% Uptime",
      globalSupport: "Global Support"
    },
    devices: {
      title: "Works Perfectly on Every Device",
      description: "Your restaurant management platform, available anywhere. Desktop, tablet, mobile - seamless experience across all devices.",
      desktop: "Desktop",
      tablet: "Tablet",
      mobile: "Mobile",
      desktopDesc: "Complete restaurant management dashboard",
      tabletDesc: "Table-side booking and order management",
      mobileDesc: "On-the-go access for staff and customers"
    },
    pricing: {
      badge: "Simple, Transparent Pricing",
      title: "Choose Your Perfect Plan",
      description: "Start free and scale as you grow. No hidden fees, no surprises. Cancel anytime.",
      starter: "Starter",
      professional: "Professional",
      enterprise: "Enterprise",
      starterDesc: "Perfect for small restaurants getting started",
      professionalDesc: "Everything you need to run a successful restaurant",
      enterpriseDesc: "Advanced features for restaurant chains and enterprises",
      mostPopular: "Most Popular",
      startFree: "Start Free",
      startTrial: "Start 14-Day Free Trial",
      contactSales: "Contact Sales",
      customSolution: "Need a custom solution? We've got you covered.",
      contactSalesTeam: "Contact Sales Team",
      features: {
        bookings50: "Up to 50 bookings per month",
        bookingsUnlimited: "Unlimited bookings",
        tableBasic: "Basic table management",
        tableAdvanced: "Advanced table management",
        emailNotifications: "Email notifications",
        smsEmail: "SMS & email notifications",
        guestForms: "Guest booking forms",
        qrFeedback: "QR code feedback system",
        analyticsBasic: "Basic analytics",
        analyticsAdvanced: "Advanced analytics & reports",
        communitySupport: "Community support",
        kitchenDashboard: "Kitchen dashboard",
        multiLocation: "Multi-location support",
        prioritySupport: "Priority support",
        customIntegrations: "Custom integrations",
        everythingPro: "Everything in Professional",
        whiteLabel: "White-label solution",
        advancedApi: "Advanced API access",
        accountManager: "Dedicated account manager",
        phoneSupport: "24/7 phone support",
        customTraining: "Custom training sessions",
        slaGuarantee: "SLA guarantee"
      }
    },
    features: {
      badge: "30+ Powerful Features",
      title: "Everything Your Restaurant Needs",
      description: "From booking management to kitchen operations, analytics to customer feedback - we've built every feature you need to run a successful restaurant.",
      bookingManagement: "Booking Management",
      restaurantOperations: "Restaurant Operations",
      customerExperience: "Customer Experience",
      analyticsInsights: "Analytics & Insights",
      kitchenOperations: "Kitchen Operations",
      integrations: "Integrations",
      bookingFeatures: [
        "Real-time availability checking",
        "Smart table assignment",
        "Booking modifications & cancellations",
        "Walk-in management",
        "Conflict detection & resolution",
        "Custom booking forms"
      ],
      operationsFeatures: [
        "Multi-restaurant management",
        "Table & room configuration",
        "Capacity optimization",
        "Opening hours management",
        "Combined table handling",
        "Real-time status tracking"
      ],
      customerFeatures: [
        "Complete customer profiles",
        "QR code feedback collection",
        "Satisfaction surveys",
        "Automated confirmations",
        "SMS & email reminders",
        "Multi-language support"
      ],
      analyticsFeatures: [
        "Booking trends & statistics",
        "Table utilization heat maps",
        "Revenue analytics",
        "Customer behavior insights",
        "Performance dashboards",
        "Detailed reporting"
      ],
      kitchenFeatures: [
        "Kitchen order tracking",
        "Menu management system",
        "Product organization",
        "Order management",
        "Performance analytics",
        "Printable order forms"
      ],
      integrationFeatures: [
        "Google Calendar sync",
        "Stripe payment processing",
        "Email service integration",
        "Social media connections",
        "Webhook configurations",
        "Third-party app support"
      ]
    },
    whyChoose: {
      title: "Why Restaurants Choose ReadyTable",
      description: "Built with enterprise-grade technology and designed for restaurants that demand excellence",
      enterpriseSecurity: "Enterprise Security",
      enterpriseSecurityDesc: "Multi-tenant isolation, role-based access control, and secure authentication with SSO support",
      lightningFast: "Lightning Fast",
      lightningFastDesc: "Real-time updates, instant notifications, and blazing-fast performance on all devices",
      cloudBased: "Cloud-Based",
      cloudBasedDesc: "Access anywhere with automatic backups, scaling, and 99.9% uptime guarantee",
      customerCentric: "Customer-Centric",
      customerCentricDesc: "Seamless guest experience from booking to feedback with automated communications"
    },
    cta: {
      badge: "Join 1000+ Restaurants Worldwide",
      title: "Ready to Transform Your Restaurant?",
      description: "Start your free trial today and discover why restaurants worldwide choose ReadyTable to streamline operations and delight customers.",
      startTrialNow: "Start Free Trial Now",
      talkToSales: "Talk to Sales",
      freeTrial: "14 Days",
      noSetup: "No Setup",
      cancel: "Cancel",
      freeTrialDesc: "Free Trial",
      noSetupDesc: "Fees Required",
      cancelDesc: "Anytime"
    },
    footer: {
      company: "Company",
      product: "Product",
      resources: "Resources",
      legal: "Legal",
      description: "ReadyTable is the complete restaurant management platform trusted by restaurants worldwide to streamline operations and delight customers.",
      rights: "All rights reserved.",
      about: "About Us",
      careers: "Careers",
      blog: "Blog",
      press: "Press",
      features: "Features",
      pricing: "Pricing",
      security: "Security",
      integrations: "Integrations",
      documentation: "Documentation",
      support: "Support Center",
      community: "Community",
      statusPage: "Status Page",
      privacy: "Privacy Policy",
      terms: "Terms of Service",
      cookies: "Cookie Policy",
      gdpr: "GDPR"
    },
    stats: {
      features: "Features Available",
      uptime: "Uptime Guarantee",
      bookings: "Bookings Supported",
      support: "Support Available"
    }
  },
  de: {
    nav: {
      features: "Funktionen",
      pricing: "Preise",
      contact: "Kontakt",
      login: "Anmelden",
      register: "Registrieren"
    },
    hero: {
      badge: "🚀 Komplette Restaurant-Management-Plattform",
      title: "ReadyTable",
      subtitle: "Restaurant Revolution",
      description: "Transformieren Sie Ihr Restaurant mit unserer umfassenden Buchungs- und Verwaltungslösung.",
      startTrial: "Kostenlose Testversion starten",
      watchDemo: "Demo ansehen",
      enterpriseSecurity: "Unternehmenssicherheit",
      uptime: "99,9% Verfügbarkeit",
      globalSupport: "Globaler Support"
    },
    devices: {
      title: "Funktioniert perfekt auf jedem Gerät",
      description: "Ihre Restaurant-Management-Plattform, überall verfügbar. Desktop, Tablet, Mobil - nahtlose Erfahrung auf allen Geräten.",
      desktop: "Desktop",
      tablet: "Tablet",
      mobile: "Mobil",
      desktopDesc: "Komplettes Restaurant-Management-Dashboard",
      tabletDesc: "Tischseitige Buchungs- und Bestellverwaltung",
      mobileDesc: "Mobiler Zugang für Personal und Kunden"
    },
    pricing: {
      badge: "Einfache, transparente Preise",
      title: "Wählen Sie Ihren perfekten Plan",
      description: "Kostenlos starten und wachsen. Keine versteckten Gebühren, keine Überraschungen. Jederzeit kündbar.",
      starter: "Starter",
      professional: "Professional",
      enterprise: "Enterprise",
      starterDesc: "Perfekt für kleine Restaurants, die anfangen",
      professionalDesc: "Alles was Sie brauchen für ein erfolgreiches Restaurant",
      enterpriseDesc: "Erweiterte Funktionen für Restaurant-Ketten und Unternehmen",
      mostPopular: "Beliebteste",
      startFree: "Kostenlos starten",
      startTrial: "14-Tage kostenlose Testversion starten",
      contactSales: "Vertrieb kontaktieren",
      customSolution: "Brauchen Sie eine maßgeschneiderte Lösung? Wir haben Sie abgedeckt.",
      contactSalesTeam: "Vertriebsteam kontaktieren",
      features: {
        bookings50: "Bis zu 50 Buchungen pro Monat",
        bookingsUnlimited: "Unbegrenzte Buchungen",
        tableBasic: "Grundlegende Tischverwaltung",
        tableAdvanced: "Erweiterte Tischverwaltung",
        emailNotifications: "E-Mail-Benachrichtigungen",
        smsEmail: "SMS & E-Mail-Benachrichtigungen",
        guestForms: "Gast-Buchungsformulare",
        qrFeedback: "QR-Code-Feedback-System",
        analyticsBasic: "Grundlegende Analysen",
        analyticsAdvanced: "Erweiterte Analysen & Berichte",
        communitySupport: "Community-Support",
        kitchenDashboard: "Küchen-Dashboard",
        multiLocation: "Multi-Standort-Unterstützung",
        prioritySupport: "Priority-Support",
        customIntegrations: "Benutzerdefinierte Integrationen",
        everythingPro: "Alles in Professional",
        whiteLabel: "White-Label-Lösung",
        advancedApi: "Erweiterte API-Zugang",
        accountManager: "Dedicated Account Manager",
        phoneSupport: "24/7 Telefon-Support",
        customTraining: "Benutzerdefinierte Schulungen",
        slaGuarantee: "SLA-Garantie"
      }
    },
    features: {
      badge: "30+ Leistungsstarke Funktionen",
      title: "Alles was Ihr Restaurant braucht",
      description: "Von Buchungsverwaltung bis Küchenbetrieb, Analysen bis Kundenfeedback - wir haben jede Funktion entwickelt, die Sie für ein erfolgreiches Restaurant brauchen.",
      bookingManagement: "Buchungsverwaltung",
      restaurantOperations: "Restaurant-Betrieb",
      customerExperience: "Kundenerfahrung",
      analyticsInsights: "Analysen & Einblicke",
      kitchenOperations: "Küchenbetrieb",
      integrations: "Integrationen",
      bookingFeatures: [
        "Echtzeit-Verfügbarkeitsprüfung",
        "Intelligente Tischzuweisung",
        "Buchungsänderungen & Stornierungen",
        "Walk-in-Verwaltung",
        "Konflikterkennung & -lösung",
        "Benutzerdefinierte Buchungsformulare"
      ],
      operationsFeatures: [
        "Multi-Restaurant-Verwaltung",
        "Tisch- & Raumkonfiguration",
        "Kapazitätsoptimierung",
        "Öffnungszeitenverwaltung",
        "Kombinierte Tischverwaltung",
        "Echtzeit-Statusverfolgung"
      ],
      customerFeatures: [
        "Vollständige Kundenprofile",
        "QR-Code-Feedback-Sammlung",
        "Zufriedenheitsumfragen",
        "Automatisierte Bestätigungen",
        "SMS & E-Mail-Erinnerungen",
        "Mehrsprachige Unterstützung"
      ],
      analyticsFeatures: [
        "Buchungstrends & Statistiken",
        "Tischauslastungs-Heatmaps",
        "Umsatzanalysen",
        "Kundenverhalten-Einblicke",
        "Leistungs-Dashboards",
        "Detaillierte Berichte"
      ],
      kitchenFeatures: [
        "Küchen-Bestellverfolgung",
        "Menüverwaltungssystem",
        "Produktorganisation",
        "Bestellverwaltung",
        "Leistungsanalysen",
        "Druckbare Bestellformulare"
      ],
      integrationFeatures: [
        "Google Calendar-Synchronisation",
        "Stripe-Zahlungsverarbeitung",
        "E-Mail-Service-Integration",
        "Social Media-Verbindungen",
        "Webhook-Konfigurationen",
        "Drittanbieter-App-Unterstützung"
      ]
    },
    whyChoose: {
      title: "Warum Restaurants ReadyTable wählen",
      description: "Gebaut mit Unternehmenstechnologie und für Restaurants entwickelt, die Exzellenz verlangen",
      enterpriseSecurity: "Unternehmenssicherheit",
      enterpriseSecurityDesc: "Multi-Tenant-Isolation, rollenbasierte Zugriffskontrolle und sichere Authentifizierung mit SSO-Unterstützung",
      lightningFast: "Blitzschnell",
      lightningFastDesc: "Echtzeit-Updates, sofortige Benachrichtigungen und blitzschnelle Leistung auf allen Geräten",
      cloudBased: "Cloud-basiert",
      cloudBasedDesc: "Überall zugänglich mit automatischen Backups, Skalierung und 99,9% Verfügbarkeitsgarantie",
      customerCentric: "Kundenorientiert",
      customerCentricDesc: "Nahtlose Gäste-Erfahrung von Buchung bis Feedback mit automatisierter Kommunikation"
    },
    cta: {
      badge: "Über 1000 Restaurants weltweit",
      title: "Bereit, Ihr Restaurant zu transformieren?",
      description: "Starten Sie heute Ihre kostenlose Testversion und entdecken Sie, warum Restaurants weltweit ReadyTable wählen, um Abläufe zu optimieren und Kunden zu begeistern.",
      startTrialNow: "Kostenlose Testversion jetzt starten",
      talkToSales: "Mit Vertrieb sprechen",
      freeTrial: "14 Tage",
      noSetup: "Keine Einrichtung",
      cancel: "Kündigen",
      freeTrialDesc: "Kostenlose Testversion",
      noSetupDesc: "Gebühren erforderlich",
      cancelDesc: "Jederzeit"
    },
    footer: {
      company: "Unternehmen",
      product: "Produkt",
      resources: "Ressourcen",
      legal: "Rechtliches",
      description: "ReadyTable ist die komplette Restaurant-Management-Plattform, der Restaurants weltweit vertrauen, um Abläufe zu optimieren und Kunden zu begeistern.",
      rights: "Alle Rechte vorbehalten.",
      about: "Über uns",
      careers: "Karriere",
      blog: "Blog",
      press: "Presse",
      features: "Funktionen",
      pricing: "Preise",
      security: "Sicherheit",
      integrations: "Integrationen",
      documentation: "Dokumentation",
      support: "Support-Center",
      community: "Community",
      statusPage: "Status-Seite",
      privacy: "Datenschutzrichtlinie",
      terms: "Nutzungsbedingungen",
      cookies: "Cookie-Richtlinie",
      gdpr: "DSGVO"
    },
    stats: {
      features: "Verfügbare Funktionen",
      uptime: "Verfügbarkeitsgarantie",
      bookings: "Unterstützte Buchungen",
      support: "Support verfügbar"
    }
  },
  // Add more languages (es, fr, it, no, da, sv, cs, nl) with similar structure...
  es: {
    nav: {
      features: "Características",
      pricing: "Precios",
      contact: "Contacto",
      login: "Iniciar Sesión",
      register: "Registrarse"
    },
    hero: {
      badge: "🚀 Plataforma Completa de Gestión de Restaurantes",
      title: "ReadyTable",
      subtitle: "Revolución Restaurante",
      description: "Transforma tu restaurante con nuestra solución integral de reservas y gestión.",
      startTrial: "Iniciar Prueba Gratuita",
      watchDemo: "Ver Demo",
      enterpriseSecurity: "Seguridad Empresarial",
      uptime: "99.9% Disponibilidad",
      globalSupport: "Soporte Global"
    },
    devices: {
      title: "Funciona Perfectamente en Todos los Dispositivos",
      description: "Tu plataforma de gestión de restaurantes, disponible en cualquier lugar. Escritorio, tablet, móvil - experiencia perfecta en todos los dispositivos.",
      desktop: "Escritorio",
      tablet: "Tablet",
      mobile: "Móvil",
      desktopDesc: "Panel completo de gestión de restaurantes",
      tabletDesc: "Gestión de reservas y pedidos junto a la mesa",
      mobileDesc: "Acceso móvil para personal y clientes"
    },
    pricing: {
      badge: "Precios Simples y Transparentes",
      title: "Elige Tu Plan Perfecto",
      description: "Comienza gratis y escala mientras creces. Sin tarifas ocultas, sin sorpresas. Cancela en cualquier momento.",
      starter: "Inicial",
      professional: "Profesional",
      enterprise: "Empresarial",
      starterDesc: "Perfecto para restaurantes pequeños que empiezan",
      professionalDesc: "Todo lo que necesitas para administrar un restaurante exitoso",
      enterpriseDesc: "Características avanzadas para cadenas de restaurantes y empresas",
      mostPopular: "Más Popular",
      startFree: "Comenzar Gratis",
      startTrial: "Iniciar Prueba Gratuita de 14 Días",
      contactSales: "Contactar Ventas",
      customSolution: "¿Necesitas una solución personalizada? Te tenemos cubierto.",
      contactSalesTeam: "Contactar Equipo de Ventas",
      features: {
        bookings50: "Hasta 50 reservas por mes",
        bookingsUnlimited: "Reservas ilimitadas",
        tableBasic: "Gestión básica de mesas",
        tableAdvanced: "Gestión avanzada de mesas",
        emailNotifications: "Notificaciones por correo",
        smsEmail: "Notificaciones SMS y correo",
        guestForms: "Formularios de reserva para huéspedes",
        qrFeedback: "Sistema de feedback con códigos QR",
        analyticsBasic: "Análisis básicos",
        analyticsAdvanced: "Análisis avanzados e informes",
        communitySupport: "Soporte de la comunidad",
        kitchenDashboard: "Panel de cocina",
        multiLocation: "Soporte multi-ubicación",
        prioritySupport: "Soporte prioritario",
        customIntegrations: "Integraciones personalizadas",
        everythingPro: "Todo en Profesional",
        whiteLabel: "Solución de marca blanca",
        advancedApi: "Acceso avanzado a API",
        accountManager: "Gerente de cuenta dedicado",
        phoneSupport: "Soporte telefónico 24/7",
        customTraining: "Sesiones de entrenamiento personalizadas",
        slaGuarantee: "Garantía SLA"
      }
    },
    features: {
      badge: "30+ Características Poderosas",
      title: "Todo lo que Tu Restaurante Necesita",
      description: "Desde gestión de reservas hasta operaciones de cocina, análisis hasta feedback de clientes - hemos construido cada característica que necesitas para administrar un restaurante exitoso.",
      bookingManagement: "Gestión de Reservas",
      restaurantOperations: "Operaciones del Restaurante",
      customerExperience: "Experiencia del Cliente",
      analyticsInsights: "Análisis e Insights",
      kitchenOperations: "Operaciones de Cocina",
      integrations: "Integraciones",
      bookingFeatures: [
        "Verificación de disponibilidad en tiempo real",
        "Asignación inteligente de mesas",
        "Modificaciones y cancelaciones de reservas",
        "Gestión de walk-ins",
        "Detección y resolución de conflictos",
        "Formularios de reserva personalizados"
      ],
      operationsFeatures: [
        "Gestión multi-restaurante",
        "Configuración de mesas y salas",
        "Optimización de capacidad",
        "Gestión de horarios de apertura",
        "Manejo de mesas combinadas",
        "Seguimiento de estado en tiempo real"
      ],
      customerFeatures: [
        "Perfiles completos de clientes",
        "Recolección de feedback con códigos QR",
        "Encuestas de satisfacción",
        "Confirmaciones automatizadas",
        "Recordatorios SMS y correo",
        "Soporte multiidioma"
      ],
      analyticsFeatures: [
        "Tendencias y estadísticas de reservas",
        "Mapas de calor de utilización de mesas",
        "Análisis de ingresos",
        "Insights de comportamiento del cliente",
        "Paneles de rendimiento",
        "Informes detallados"
      ],
      kitchenFeatures: [
        "Seguimiento de pedidos de cocina",
        "Sistema de gestión de menús",
        "Organización de productos",
        "Gestión de pedidos",
        "Análisis de rendimiento",
        "Formularios de pedidos imprimibles"
      ],
      integrationFeatures: [
        "Sincronización con Google Calendar",
        "Procesamiento de pagos con Stripe",
        "Integración de servicios de correo",
        "Conexiones de redes sociales",
        "Configuraciones de webhook",
        "Soporte de aplicaciones de terceros"
      ]
    },
    whyChoose: {
      title: "Por Qué los Restaurantes Eligen ReadyTable",
      description: "Construido con tecnología de nivel empresarial y diseñado para restaurantes que exigen excelencia",
      enterpriseSecurity: "Seguridad Empresarial",
      enterpriseSecurityDesc: "Aislamiento multi-tenant, control de acceso basado en roles y autenticación segura con soporte SSO",
      lightningFast: "Súper Rápido",
      lightningFastDesc: "Actualizaciones en tiempo real, notificaciones instantáneas y rendimiento súper rápido en todos los dispositivos",
      cloudBased: "Basado en la Nube",
      cloudBasedDesc: "Acceso desde cualquier lugar con respaldos automáticos, escalamiento y garantía de 99.9% de disponibilidad",
      customerCentric: "Centrado en el Cliente",
      customerCentricDesc: "Experiencia perfecta para huéspedes desde reserva hasta feedback con comunicaciones automatizadas"
    },
    cta: {
      badge: "Únete a 1000+ Restaurantes en Todo el Mundo",
      title: "¿Listo para Transformar Tu Restaurante?",
      description: "Comienza tu prueba gratuita hoy y descubre por qué restaurantes en todo el mundo eligen ReadyTable para optimizar operaciones y deleitar clientes.",
      startTrialNow: "Iniciar Prueba Gratuita Ahora",
      talkToSales: "Hablar con Ventas",
      freeTrial: "14 Días",
      noSetup: "Sin Configuración",
      cancel: "Cancelar",
      freeTrialDesc: "Prueba Gratuita",
      noSetupDesc: "Tarifas Requeridas",
      cancelDesc: "En Cualquier Momento"
    },
    footer: {
      company: "Empresa",
      product: "Producto",
      resources: "Recursos",
      legal: "Legal",
      description: "ReadyTable es la plataforma completa de gestión de restaurantes en la que confían restaurantes de todo el mundo para optimizar operaciones y deleitar clientes.",
      rights: "Todos los derechos reservados.",
      about: "Acerca de",
      careers: "Carreras",
      blog: "Blog",
      press: "Prensa",
      features: "Características",
      pricing: "Precios",
      security: "Seguridad",
      integrations: "Integraciones",
      documentation: "Documentación",
      support: "Centro de Soporte",
      community: "Comunidad",
      statusPage: "Página de Estado",
      privacy: "Política de Privacidad",
      terms: "Términos de Servicio",
      cookies: "Política de Cookies",
      gdpr: "RGPD"
    },
    stats: {
      features: "Características Disponibles",
      uptime: "Garantía de Disponibilidad",
      bookings: "Reservas Soportadas",
      support: "Soporte Disponible"
    }
  },
  fr: {
    nav: {
      features: "Fonctionnalités",
      pricing: "Tarifs",
      contact: "Contact",
      login: "Connexion",
      register: "S'inscrire"
    },
    hero: {
      badge: "🚀 Plateforme complète de gestion de restaurant",
      title: "ReadyTable",
      subtitle: "Révolution Restaurant",
      description: "Transformez votre restaurant avec notre solution complète de réservation et de gestion.",
      startTrial: "Commencer l'essai gratuit",
      watchDemo: "Voir la démo",
      enterpriseSecurity: "Sécurité d'entreprise",
      uptime: "99,9% de disponibilité",
      globalSupport: "Support mondial"
    },
    devices: {
      title: "Fonctionne parfaitement sur tous les appareils",
      description: "Votre plateforme de gestion de restaurant, disponible partout. Bureau, tablette, mobile - expérience parfaite sur tous les appareils.",
      desktop: "Bureau",
      tablet: "Tablette",
      mobile: "Mobile",
      desktopDesc: "Tableau de bord complet de gestion de restaurant",
      tabletDesc: "Gestion des réservations et commandes à table",
      mobileDesc: "Accès mobile pour le personnel et les clients"
    },
    pricing: {
      badge: "Tarifs simples et transparents",
      title: "Choisissez votre plan parfait",
      description: "Commencez gratuitement et évoluez en grandissant. Pas de frais cachés, pas de surprises. Annulez à tout moment.",
      starter: "Débutant",
      professional: "Professionnel",
      enterprise: "Entreprise",
      starterDesc: "Parfait pour les petits restaurants qui démarrent",
      professionalDesc: "Tout ce dont vous avez besoin pour gérer un restaurant prospère",
      enterpriseDesc: "Fonctionnalités avancées pour les chaînes de restaurants et entreprises",
      mostPopular: "Le plus populaire",
      startFree: "Commencer gratuitement",
      startTrial: "Commencer l'essai gratuit de 14 jours",
      contactSales: "Contacter les ventes",
      customSolution: "Besoin d'une solution personnalisée ? Nous vous couvrons.",
      contactSalesTeam: "Contacter l'équipe de vente",
      features: {
        bookings50: "Jusqu'à 50 réservations par mois",
        bookingsUnlimited: "Réservations illimitées",
        tableBasic: "Gestion de table de base",
        tableAdvanced: "Gestion de table avancée",
        emailNotifications: "Notifications par email",
        smsEmail: "Notifications SMS et email",
        guestForms: "Formulaires de réservation client",
        qrFeedback: "Système de feedback par QR code",
        analyticsBasic: "Analyses de base",
        analyticsAdvanced: "Analyses avancées et rapports",
        communitySupport: "Support communautaire",
        kitchenDashboard: "Tableau de bord cuisine",
        multiLocation: "Support multi-établissement",
        prioritySupport: "Support prioritaire",
        customIntegrations: "Intégrations personnalisées",
        everythingPro: "Tout en Professionnel",
        whiteLabel: "Solution en marque blanche",
        advancedApi: "Accès API avancé",
        accountManager: "Gestionnaire de compte dédié",
        phoneSupport: "Support téléphonique 24/7",
        customTraining: "Sessions de formation personnalisées",
        slaGuarantee: "Garantie SLA"
      }
    },
    features: {
      badge: "30+ Fonctionnalités puissantes",
      title: "Tout ce dont votre restaurant a besoin",
      description: "De la gestion des réservations aux opérations de cuisine, analyses aux commentaires clients - nous avons construit chaque fonctionnalité dont vous avez besoin pour gérer un restaurant prospère.",
      bookingManagement: "Gestion des réservations",
      restaurantOperations: "Opérations du restaurant",
      customerExperience: "Expérience client",
      analyticsInsights: "Analyses et insights",
      kitchenOperations: "Opérations de cuisine",
      integrations: "Intégrations",
      bookingFeatures: [
        "Vérification de disponibilité en temps réel",
        "Attribution intelligente des tables",
        "Modifications et annulations de réservations",
        "Gestion des clients sans réservation",
        "Détection et résolution de conflits",
        "Formulaires de réservation personnalisés"
      ],
      operationsFeatures: [
        "Gestion multi-restaurant",
        "Configuration des tables et salles",
        "Optimisation de la capacité",
        "Gestion des heures d'ouverture",
        "Gestion des tables combinées",
        "Suivi de statut en temps réel"
      ],
      customerFeatures: [
        "Profils clients complets",
        "Collecte de feedback par QR code",
        "Enquêtes de satisfaction",
        "Confirmations automatisées",
        "Rappels SMS et email",
        "Support multilingue"
      ],
      analyticsFeatures: [
        "Tendances et statistiques de réservations",
        "Cartes de chaleur d'utilisation des tables",
        "Analyses de revenus",
        "Insights sur le comportement client",
        "Tableaux de bord de performance",
        "Rapports détaillés"
      ],
      kitchenFeatures: [
        "Suivi des commandes de cuisine",
        "Système de gestion de menu",
        "Organisation des produits",
        "Gestion des commandes",
        "Analyses de performance",
        "Formulaires de commande imprimables"
      ],
      integrationFeatures: [
        "Synchronisation Google Calendar",
        "Traitement des paiements Stripe",
        "Intégration de service email",
        "Connexions réseaux sociaux",
        "Configurations webhook",
        "Support d'applications tierces"
      ]
    },
    whyChoose: {
      title: "Pourquoi les restaurants choisissent ReadyTable",
      description: "Construit avec une technologie de niveau entreprise et conçu pour les restaurants qui exigent l'excellence",
      enterpriseSecurity: "Sécurité d'entreprise",
      enterpriseSecurityDesc: "Isolation multi-tenant, contrôle d'accès basé sur les rôles et authentification sécurisée avec support SSO",
      lightningFast: "Ultra rapide",
      lightningFastDesc: "Mises à jour en temps réel, notifications instantanées et performance ultra rapide sur tous les appareils",
      cloudBased: "Basé sur le cloud",
      cloudBasedDesc: "Accès partout avec sauvegardes automatiques, mise à l'échelle et garantie de 99,9% de disponibilité",
      customerCentric: "Centré sur le client",
      customerCentricDesc: "Expérience client parfaite de la réservation au feedback avec communications automatisées"
    },
    cta: {
      badge: "Rejoignez 1000+ restaurants dans le monde",
      title: "Prêt à transformer votre restaurant ?",
      description: "Commencez votre essai gratuit aujourd'hui et découvrez pourquoi les restaurants du monde entier choisissent ReadyTable pour rationaliser les opérations et ravir les clients.",
      startTrialNow: "Commencer l'essai gratuit maintenant",
      talkToSales: "Parler aux ventes",
      freeTrial: "14 jours",
      noSetup: "Pas de configuration",
      cancel: "Annuler",
      freeTrialDesc: "Essai gratuit",
      noSetupDesc: "Frais requis",
      cancelDesc: "À tout moment"
    },
    footer: {
      company: "Entreprise",
      product: "Produit",
      resources: "Ressources",
      legal: "Légal",
      description: "ReadyTable est la plateforme complète de gestion de restaurant à laquelle font confiance les restaurants du monde entier pour rationaliser les opérations et ravir les clients.",
      rights: "Tous droits réservés.",
      about: "À propos",
      careers: "Carrières",
      blog: "Blog",
      press: "Presse",
      features: "Fonctionnalités",
      pricing: "Tarifs",
      security: "Sécurité",
      integrations: "Intégrations",
      documentation: "Documentation",
      support: "Centre de support",
      community: "Communauté",
      statusPage: "Page de statut",
      privacy: "Politique de confidentialité",
      terms: "Conditions de service",
      cookies: "Politique des cookies",
      gdpr: "RGPD"
    },
    stats: {
      features: "Fonctionnalités disponibles",
      uptime: "Garantie de disponibilité",
      bookings: "Réservations supportées",
      support: "Support disponible"
    }
  },
  it: {
    nav: {
      features: "Funzionalità",
      pricing: "Prezzi",
      contact: "Contatto",
      login: "Accedi",
      register: "Registrati"
    },
    hero: {
      badge: "🚀 Piattaforma completa di gestione ristorante",
      title: "ReadyTable",
      subtitle: "Rivoluzione Ristorante",
      description: "Trasforma il tuo ristorante con la nostra soluzione completa di prenotazione e gestione.",
      startTrial: "Inizia prova gratuita",
      watchDemo: "Guarda demo",
      enterpriseSecurity: "Sicurezza aziendale",
      uptime: "99,9% di uptime",
      globalSupport: "Supporto globale"
    },
    devices: {
      title: "Funziona perfettamente su ogni dispositivo",
      description: "La tua piattaforma di gestione ristorante, disponibile ovunque. Desktop, tablet, mobile - esperienza perfetta su tutti i dispositivi.",
      desktop: "Desktop",
      tablet: "Tablet",
      mobile: "Mobile",
      desktopDesc: "Dashboard completa di gestione ristorante",
      tabletDesc: "Gestione prenotazioni e ordini al tavolo",
      mobileDesc: "Accesso mobile per staff e clienti"
    },
    pricing: {
      badge: "Prezzi semplici e trasparenti",
      title: "Scegli il tuo piano perfetto",
      description: "Inizia gratis e scala mentre cresci. Nessun costo nascosto, nessuna sorpresa. Cancella in qualsiasi momento.",
      starter: "Starter",
      professional: "Professionale",
      enterprise: "Enterprise",
      starterDesc: "Perfetto per piccoli ristoranti che iniziano",
      professionalDesc: "Tutto quello che serve per gestire un ristorante di successo",
      enterpriseDesc: "Funzionalità avanzate per catene di ristoranti e aziende",
      mostPopular: "Più popolare",
      startFree: "Inizia gratis",
      startTrial: "Inizia prova gratuita di 14 giorni",
      contactSales: "Contatta vendite",
      customSolution: "Hai bisogno di una soluzione personalizzata? Ti copriamo noi.",
      contactSalesTeam: "Contatta il team vendite",
      features: {
        bookings50: "Fino a 50 prenotazioni al mese",
        bookingsUnlimited: "Prenotazioni illimitate",
        tableBasic: "Gestione tavoli base",
        tableAdvanced: "Gestione tavoli avanzata",
        emailNotifications: "Notifiche email",
        smsEmail: "Notifiche SMS ed email",
        guestForms: "Moduli prenotazione ospiti",
        qrFeedback: "Sistema feedback QR code",
        analyticsBasic: "Analytics di base",
        analyticsAdvanced: "Analytics avanzati e report",
        communitySupport: "Supporto community",
        kitchenDashboard: "Dashboard cucina",
        multiLocation: "Supporto multi-location",
        prioritySupport: "Supporto prioritario",
        customIntegrations: "Integrazioni personalizzate",
        everythingPro: "Tutto in Professionale",
        whiteLabel: "Soluzione white-label",
        advancedApi: "Accesso API avanzato",
        accountManager: "Account manager dedicato",
        phoneSupport: "Supporto telefonico 24/7",
        customTraining: "Sessioni di formazione personalizzate",
        slaGuarantee: "Garanzia SLA"
      }
    },
    features: {
      badge: "30+ Funzionalità potenti",
      title: "Tutto quello che serve al tuo ristorante",
      description: "Dalla gestione prenotazioni alle operazioni cucina, analytics al feedback clienti - abbiamo costruito ogni funzionalità di cui hai bisogno per gestire un ristorante di successo.",
      bookingManagement: "Gestione prenotazioni",
      restaurantOperations: "Operazioni ristorante",
      customerExperience: "Esperienza cliente",
      analyticsInsights: "Analytics e insights",
      kitchenOperations: "Operazioni cucina",
      integrations: "Integrazioni",
      bookingFeatures: [
        "Controllo disponibilità in tempo reale",
        "Assegnazione intelligente tavoli",
        "Modifiche e cancellazioni prenotazioni",
        "Gestione walk-in",
        "Rilevamento e risoluzione conflitti",
        "Moduli prenotazione personalizzati"
      ],
      operationsFeatures: [
        "Gestione multi-ristorante",
        "Configurazione tavoli e sale",
        "Ottimizzazione capacità",
        "Gestione orari apertura",
        "Gestione tavoli combinati",
        "Tracking stato in tempo reale"
      ],
      customerFeatures: [
        "Profili clienti completi",
        "Raccolta feedback QR code",
        "Sondaggi soddisfazione",
        "Conferme automatizzate",
        "Promemoria SMS ed email",
        "Supporto multilingua"
      ],
      analyticsFeatures: [
        "Trend e statistiche prenotazioni",
        "Mappe di calore utilizzo tavoli",
        "Analytics ricavi",
        "Insights comportamento clienti",
        "Dashboard performance",
        "Report dettagliati"
      ],
      kitchenFeatures: [
        "Tracking ordini cucina",
        "Sistema gestione menu",
        "Organizzazione prodotti",
        "Gestione ordini",
        "Analytics performance",
        "Moduli ordine stampabili"
      ],
      integrationFeatures: [
        "Sincronizzazione Google Calendar",
        "Elaborazione pagamenti Stripe",
        "Integrazione servizi email",
        "Connessioni social media",
        "Configurazioni webhook",
        "Supporto app di terze parti"
      ]
    },
    whyChoose: {
      title: "Perché i ristoranti scelgono ReadyTable",
      description: "Costruito con tecnologia enterprise-grade e progettato per ristoranti che richiedono eccellenza",
      enterpriseSecurity: "Sicurezza aziendale",
      enterpriseSecurityDesc: "Isolamento multi-tenant, controllo accessi basato su ruoli e autenticazione sicura con supporto SSO",
      lightningFast: "Fulmineo",
      lightningFastDesc: "Aggiornamenti in tempo reale, notifiche istantanee e prestazioni fulminee su tutti i dispositivi",
      cloudBased: "Basato su cloud",
      cloudBasedDesc: "Accesso ovunque con backup automatici, scaling e garanzia uptime 99,9%",
      customerCentric: "Centrato sul cliente",
      customerCentricDesc: "Esperienza ospite perfetta dalla prenotazione al feedback con comunicazioni automatizzate"
    },
    cta: {
      badge: "Unisciti a 1000+ ristoranti nel mondo",
      title: "Pronto a trasformare il tuo ristorante?",
      description: "Inizia la tua prova gratuita oggi e scopri perché i ristoranti in tutto il mondo scelgono ReadyTable per snellire le operazioni e deliziare i clienti.",
      startTrialNow: "Inizia prova gratuita ora",
      talkToSales: "Parla con vendite",
      freeTrial: "14 giorni",
      noSetup: "Nessun setup",
      cancel: "Cancella",
      freeTrialDesc: "Prova gratuita",
      noSetupDesc: "Commissioni richieste",
      cancelDesc: "In qualsiasi momento"
    },
    footer: {
      company: "Azienda",
      product: "Prodotto",
      resources: "Risorse",
      legal: "Legale",
      description: "ReadyTable è la piattaforma completa di gestione ristorante di cui si fidano i ristoranti in tutto il mondo per snellire le operazioni e deliziare i clienti.",
      rights: "Tutti i diritti riservati.",
      about: "Chi siamo",
      careers: "Carriere",
      blog: "Blog",
      press: "Stampa",
      features: "Funzionalità",
      pricing: "Prezzi",
      security: "Sicurezza",
      integrations: "Integrazioni",
      documentation: "Documentazione",
      support: "Centro supporto",
      community: "Community",
      statusPage: "Pagina stato",
      privacy: "Informativa privacy",
      terms: "Termini di servizio",
      cookies: "Policy cookie",
      gdpr: "GDPR"
    },
    stats: {
      features: "Funzionalità disponibili",
      uptime: "Garanzia uptime",
      bookings: "Prenotazioni supportate",
      support: "Supporto disponibile"
    }
  },
  no: {
    nav: {
      features: "Funksjoner",
      pricing: "Priser",
      contact: "Kontakt",
      login: "Logg inn",
      register: "Registrer deg"
    },
    hero: {
      badge: "🚀 Komplett restaurantstyringssystem",
      title: "ReadyTable",
      subtitle: "Restaurant Revolusjon",
      description: "Transformer restauranten din med vår omfattende booking- og styringsløsning.",
      startTrial: "Start gratis prøveperiode",
      watchDemo: "Se demo",
      enterpriseSecurity: "Bedriftssikkerhet",
      uptime: "99,9% oppetid",
      globalSupport: "Global støtte"
    },
    devices: {
      title: "Fungerer perfekt på alle enheter",
      description: "Din restaurantstyringssystem, tilgjengelig overalt. Desktop, tablet, mobil - sømløs opplevelse på alle enheter.",
      desktop: "Desktop",
      tablet: "Tablet",
      mobile: "Mobil",
      desktopDesc: "Komplett restaurantstyrings-dashboard",
      tabletDesc: "Bordside booking og bestillingsstyring",
      mobileDesc: "Mobil tilgang for ansatte og kunder"
    },
    pricing: {
      badge: "Enkle, transparente priser",
      title: "Velg din perfekte plan",
      description: "Start gratis og skaler mens du vokser. Ingen skjulte avgifter, ingen overraskelser. Avbryt når som helst.",
      starter: "Starter",
      professional: "Profesjonell",
      enterprise: "Bedrift",
      starterDesc: "Perfekt for små restauranter som starter",
      professionalDesc: "Alt du trenger for å drive en vellykket restaurant",
      enterpriseDesc: "Avanserte funksjoner for restaurantkjeder og bedrifter",
      mostPopular: "Mest populære",
      startFree: "Start gratis",
      startTrial: "Start 14-dagers gratis prøveperiode",
      contactSales: "Kontakt salg",
      customSolution: "Trenger du en tilpasset løsning? Vi har deg dekket.",
      contactSalesTeam: "Kontakt salgsteam",
      features: {
        bookings50: "Opptil 50 bookinger per måned",
        bookingsUnlimited: "Ubegrensede bookinger",
        tableBasic: "Grunnleggende bordstyring",
        tableAdvanced: "Avansert bordstyring",
        emailNotifications: "E-postvarsler",
        smsEmail: "SMS og e-postvarsler",
        guestForms: "Gjeste-bookingskjemaer",
        qrFeedback: "QR-kode tilbakemeldingssystem",
        analyticsBasic: "Grunnleggende analyse",
        analyticsAdvanced: "Avansert analyse og rapporter",
        communitySupport: "Fellesskapsstøtte",
        kitchenDashboard: "Kjøkken-dashboard",
        multiLocation: "Flerstedsstøtte",
        prioritySupport: "Prioritetsstøtte",
        customIntegrations: "Tilpassede integrasjoner",
        everythingPro: "Alt i Profesjonell",
        whiteLabel: "White-label løsning",
        advancedApi: "Avansert API-tilgang",
        accountManager: "Dedikert kontoadministrator",
        phoneSupport: "24/7 telefonstøtte",
        customTraining: "Tilpassede treningssesjoner",
        slaGuarantee: "SLA-garanti"
      }
    },
    features: {
      badge: "30+ Kraftige funksjoner",
      title: "Alt restauranten din trenger",
      description: "Fra bookingstyring til kjøkkenoperasjoner, analyse til kundetilbakemeldinger - vi har bygget hver funksjon du trenger for å drive en vellykket restaurant.",
      bookingManagement: "Bookingstyring",
      restaurantOperations: "Restaurantoperasjoner",
      customerExperience: "Kundeopplevelse",
      analyticsInsights: "Analyse og innsikt",
      kitchenOperations: "Kjøkkenoperasjoner",
      integrations: "Integrasjoner",
      bookingFeatures: [
        "Sanntids tilgjengelighetssjekk",
        "Smart bordtildeling",
        "Bookingendringer og kanselleringer",
        "Walk-in styring",
        "Konfliktdeteksjon og løsning",
        "Tilpassede bookingskjemaer"
      ],
      operationsFeatures: [
        "Multi-restaurant styring",
        "Bord- og romkonfigurasjon",
        "Kapasitetsoptimering",
        "Åpningstidsstyring",
        "Kombinert bordhåndtering",
        "Sanntids statussporing"
      ],
      customerFeatures: [
        "Komplette kundeprofiler",
        "QR-kode tilbakemeldingsinnsamling",
        "Tilfredshetsmålinger",
        "Automatiserte bekreftelser",
        "SMS og e-postpåminnelser",
        "Flerspråklig støtte"
      ],
      analyticsFeatures: [
        "Bookingtrender og statistikk",
        "Bordbruk varmekart",
        "Inntektsanalyse",
        "Kundeadferdinnsikt",
        "Ytelsesdashboard",
        "Detaljerte rapporter"
      ],
      kitchenFeatures: [
        "Kjøkkenbestillingssporing",
        "Menystyringssystem",
        "Produktorganisering",
        "Bestillingsstyring",
        "Ytelsesanalyse",
        "Utskrivbare bestillingsskjemaer"
      ],
      integrationFeatures: [
        "Google Calendar synkronisering",
        "Stripe betalingsbehandling",
        "E-posttjenesteintegrasjon",
        "Sosiale medier tilkoblinger",
        "Webhook konfigurasjoner",
        "Tredjeparts app-støtte"
      ]
    },
    whyChoose: {
      title: "Hvorfor restauranter velger ReadyTable",
      description: "Bygget med bedriftsnivå teknologi og designet for restauranter som krever eksellens",
      enterpriseSecurity: "Bedriftssikkerhet",
      enterpriseSecurityDesc: "Multi-tenant isolering, rollebasert tilgangskontroll og sikker autentisering med SSO-støtte",
      lightningFast: "Lynrask",
      lightningFastDesc: "Sanntidsoppdateringer, øyeblikkelige varsler og lynrask ytelse på alle enheter",
      cloudBased: "Skybasert",
      cloudBasedDesc: "Tilgang overalt med automatiske sikkerhetskopier, skalering og 99,9% oppetidsgaranti",
      customerCentric: "Kundesentrert",
      customerCentricDesc: "Sømløs gjesteopplevelse fra booking til tilbakemelding med automatisert kommunikasjon"
    },
    cta: {
      badge: "Bli med 1000+ restauranter verden over",
      title: "Klar til å transformere restauranten din?",
      description: "Start din gratis prøveperiode i dag og oppdag hvorfor restauranter verden over velger ReadyTable for å strømlinjeforme operasjoner og glede kunder.",
      startTrialNow: "Start gratis prøveperiode nå",
      talkToSales: "Snakk med salg",
      freeTrial: "14 dager",
      noSetup: "Ingen oppsett",
      cancel: "Avbryt",
      freeTrialDesc: "Gratis prøveperiode",
      noSetupDesc: "Avgifter påkrevd",
      cancelDesc: "Når som helst"
    },
    footer: {
      company: "Selskap",
      product: "Produkt",
      resources: "Ressurser",
      legal: "Juridisk",
      description: "ReadyTable er den komplette restaurantstyringssystem som restauranter verden over stoler på for å strømlinjeforme operasjoner og glede kunder.",
      rights: "Alle rettigheter forbeholdt.",
      about: "Om oss",
      careers: "Karrierer",
      blog: "Blogg",
      press: "Presse",
      features: "Funksjoner",
      pricing: "Priser",
      security: "Sikkerhet",
      integrations: "Integrasjoner",
      documentation: "Dokumentasjon",
      support: "Støttesenter",
      community: "Fellesskap",
      statusPage: "Statusside",
      privacy: "Personvernpolicy",
      terms: "Tjenestevilkår",
      cookies: "Cookie-policy",
      gdpr: "GDPR"
    },
    stats: {
      features: "Tilgjengelige funksjoner",
      uptime: "Oppetidsgaranti",
      bookings: "Støttede bookinger",
      support: "Støtte tilgjengelig"
    }
  },
  da: {
    nav: {
      features: "Funktioner",
      pricing: "Priser",
      contact: "Kontakt",
      login: "Log ind",
      register: "Tilmeld"
    },
    hero: {
      badge: "🚀 Komplet restaurantstyringssystem",
      title: "ReadyTable",
      subtitle: "Restaurant Revolution",
      description: "Transformer din restaurant med vores omfattende booking- og styringsløsning.",
      startTrial: "Start gratis prøveperiode",
      watchDemo: "Se demo",
      enterpriseSecurity: "Virksomhedssikkerhed",
      uptime: "99,9% oppetid",
      globalSupport: "Global support"
    },
    devices: {
      title: "Fungerer perfekt på alle enheder",
      description: "Din restaurantstyringssystem, tilgængelig overalt. Desktop, tablet, mobil - problemfri oplevelse på alle enheder.",
      desktop: "Desktop",
      tablet: "Tablet",
      mobile: "Mobil",
      desktopDesc: "Komplet restaurantstyrings-dashboard",
      tabletDesc: "Bordside booking og bestillingsstyring",
      mobileDesc: "Mobil adgang for personale og kunder"
    },
    pricing: {
      badge: "Simple, transparente priser",
      title: "Vælg din perfekte plan",
      description: "Start gratis og skaler mens du vokser. Ingen skjulte gebyrer, ingen overraskelser. Opsig når som helst.",
      starter: "Starter",
      professional: "Professionel",
      enterprise: "Virksomhed",
      starterDesc: "Perfekt til små restauranter der starter",
      professionalDesc: "Alt hvad du behøver for at drive en succesfuld restaurant",
      enterpriseDesc: "Avancerede funktioner til restaurantkæder og virksomheder",
      mostPopular: "Mest populære",
      startFree: "Start gratis",
      startTrial: "Start 14-dages gratis prøveperiode",
      contactSales: "Kontakt salg",
      customSolution: "Brug for en tilpasset løsning? Vi har dig dækket.",
      contactSalesTeam: "Kontakt salgsteam",
      features: {
        bookings50: "Op til 50 bookinger om måneden",
        bookingsUnlimited: "Ubegrænsede bookinger",
        tableBasic: "Grundlæggende bordstyring",
        tableAdvanced: "Avanceret bordstyring",
        emailNotifications: "E-mail notifikationer",
        smsEmail: "SMS og e-mail notifikationer",
        guestForms: "Gæste-bookingformularer",
        qrFeedback: "QR-kode feedback system",
        analyticsBasic: "Grundlæggende analyse",
        analyticsAdvanced: "Avanceret analyse og rapporter",
        communitySupport: "Fællesskabssupport",
        kitchenDashboard: "Køkken-dashboard",
        multiLocation: "Multi-lokation support",
        prioritySupport: "Prioritetssupport",
        customIntegrations: "Tilpassede integrationer",
        everythingPro: "Alt i Professionel",
        whiteLabel: "White-label løsning",
        advancedApi: "Avanceret API-adgang",
        accountManager: "Dedikeret kontoadministrator",
        phoneSupport: "24/7 telefonsupport",
        customTraining: "Tilpassede træningssessioner",
        slaGuarantee: "SLA-garanti"
      }
    },
    features: {
      badge: "30+ Kraftfulde funktioner",
      title: "Alt din restaurant har brug for",
      description: "Fra bookingstyring til køkkenoperationer, analyse til kundefeedback - vi har bygget hver funktion du har brug for til at drive en succesfuld restaurant.",
      bookingManagement: "Bookingstyring",
      restaurantOperations: "Restaurantoperationer",
      customerExperience: "Kundeoplevelse",
      analyticsInsights: "Analyse og indsigt",
      kitchenOperations: "Køkkenoperationer",
      integrations: "Integrationer",
      bookingFeatures: [
        "Realtids tilgængelighedstjek",
        "Smart bordtildeling",
        "Bookingændringer og aflysninger",
        "Walk-in styring",
        "Konfliktdetektering og løsning",
        "Tilpassede bookingformularer"
      ],
      operationsFeatures: [
        "Multi-restaurant styring",
        "Bord- og rumkonfiguration",
        "Kapacitetsoptimering",
        "Åbningstidsstyring",
        "Kombineret bordhåndtering",
        "Realtids statussporing"
      ],
      customerFeatures: [
        "Komplette kundeprofiler",
        "QR-kode feedback indsamling",
        "Tilfredshedsmålinger",
        "Automatiserede bekræftelser",
        "SMS og e-mail påmindelser",
        "Flersproget support"
      ],
      analyticsFeatures: [
        "Bookingtendenser og statistik",
        "Bordudnyttelse varmekort",
        "Omsætningsanalyse",
        "Kundeadfærdsindsigt",
        "Ydeevne dashboards",
        "Detaljerede rapporter"
      ],
      kitchenFeatures: [
        "Køkkenbestillingssporing",
        "Menustyringssystem",
        "Produktorganisering",
        "Bestillingsstyring",
        "Ydeevneanalyse",
        "Printbare bestillingsformularer"
      ],
      integrationFeatures: [
        "Google Calendar synkronisering",
        "Stripe betalingsbehandling",
        "E-mail tjeneste integration",
        "Sociale medier forbindelser",
        "Webhook konfigurationer",
        "Tredjepartsapp support"
      ]
    },
    whyChoose: {
      title: "Hvorfor restauranter vælger ReadyTable",
      description: "Bygget med virksomhedsniveau teknologi og designet til restauranter der kræver excellence",
      enterpriseSecurity: "Virksomhedssikkerhed",
      enterpriseSecurityDesc: "Multi-tenant isolering, rollebaseret adgangskontrol og sikker autentificering med SSO-support",
      lightningFast: "Lynhurtig",
      lightningFastDesc: "Realtidsopdateringer, øjeblikkelige notifikationer og lynhurtig ydeevne på alle enheder",
      cloudBased: "Cloud-baseret",
      cloudBasedDesc: "Adgang overalt med automatiske backups, skalering og 99,9% oppetidsgaranti",
      customerCentric: "Kundecentreret",
      customerCentricDesc: "Problemfri gæsteoplevelse fra booking til feedback med automatiseret kommunikation"
    },
    cta: {
      badge: "Tilslut dig 1000+ restauranter verden over",
      title: "Klar til at transformere din restaurant?",
      description: "Start din gratis prøveperiode i dag og oplev hvorfor restauranter verden over vælger ReadyTable til at strømline operationer og glæde kunder.",
      startTrialNow: "Start gratis prøveperiode nu",
      talkToSales: "Tal med salg",
      freeTrial: "14 dage",
      noSetup: "Ingen opsætning",
      cancel: "Opsig",
      freeTrialDesc: "Gratis prøveperiode",
      noSetupDesc: "Gebyrer påkrævet",
      cancelDesc: "Når som helst"
    },
    footer: {
      company: "Virksomhed",
      product: "Produkt",
      resources: "Ressourcer",
      legal: "Juridisk",
      description: "ReadyTable er det komplette restaurantstyringssystem som restauranter verden over stoler på til at strømline operationer og glæde kunder.",
      rights: "Alle rettigheder forbeholdt.",
      about: "Om os",
      careers: "Karrierer",
      blog: "Blog",
      press: "Presse",
      features: "Funktioner",
      pricing: "Priser",
      security: "Sikkerhed",
      integrations: "Integrationer",
      documentation: "Dokumentation",
      support: "Supportcenter",
      community: "Fællesskab",
      statusPage: "Statusside",
      privacy: "Privatlivspolitik",
      terms: "Servicevilkår",
      cookies: "Cookie-politik",
      gdpr: "GDPR"
    },
    stats: {
      features: "Tilgængelige funktioner",
      uptime: "Oppetidsgaranti",
      bookings: "Understøttede bookinger",
      support: "Support tilgængelig"
    }
  },
  sv: {
    nav: {
      features: "Funktioner",
      pricing: "Priser",
      contact: "Kontakt",
      login: "Logga in",
      register: "Registrera"
    },
    hero: {
      badge: "🚀 Komplett restauranghanteringssystem",
      title: "ReadyTable",
      subtitle: "Restaurant Revolution",
      description: "Transformera din restaurang med vår omfattande boknings- och hanteringslösning.",
      startTrial: "Starta gratis provperiod",
      watchDemo: "Se demo",
      enterpriseSecurity: "Företagssäkerhet",
      uptime: "99,9% drifttid",
      globalSupport: "Global support"
    },
    devices: {
      title: "Fungerar perfekt på alla enheter",
      description: "Din restauranghanteringssystem, tillgänglig överallt. Desktop, surfplatta, mobil - sömlös upplevelse på alla enheter.",
      desktop: "Desktop",
      tablet: "Surfplatta",
      mobile: "Mobil",
      desktopDesc: "Komplett restauranghanteringsdashboard",
      tabletDesc: "Bordssida bokning och beställningshantering",
      mobileDesc: "Mobil åtkomst för personal och kunder"
    },
    pricing: {
      badge: "Enkla, transparenta priser",
      title: "Välj din perfekta plan",
      description: "Börja gratis och skala medan du växer. Inga dolda avgifter, inga överraskningar. Avbryt när som helst.",
      starter: "Nybörjare",
      professional: "Professionell",
      enterprise: "Företag",
      starterDesc: "Perfekt för små restauranger som börjar",
      professionalDesc: "Allt du behöver för att driva en framgångsrik restaurang",
      enterpriseDesc: "Avancerade funktioner för restaurangkedjor och företag",
      mostPopular: "Mest populär",
      startFree: "Börja gratis",
      startTrial: "Starta 14-dagars gratis provperiod",
      contactSales: "Kontakta försäljning",
      customSolution: "Behöver du en anpassad lösning? Vi har dig täckt.",
      contactSalesTeam: "Kontakta säljteam",
      features: {
        bookings50: "Upp till 50 bokningar per månad",
        bookingsUnlimited: "Obegränsade bokningar",
        tableBasic: "Grundläggande bordhantering",
        tableAdvanced: "Avancerad bordhantering",
        emailNotifications: "E-postmeddelanden",
        smsEmail: "SMS och e-postmeddelanden",
        guestForms: "Gäst-bokningsformulär",
        qrFeedback: "QR-kod feedback system",
        analyticsBasic: "Grundläggande analys",
        analyticsAdvanced: "Avancerad analys och rapporter",
        communitySupport: "Communitysupport",
        kitchenDashboard: "Kök-dashboard",
        multiLocation: "Multi-plats support",
        prioritySupport: "Prioritetssupport",
        customIntegrations: "Anpassade integrationer",
        everythingPro: "Allt i Professionell",
        whiteLabel: "White-label lösning",
        advancedApi: "Avancerad API-åtkomst",
        accountManager: "Dedikerad kontoadministratör",
        phoneSupport: "24/7 telefonsupport",
        customTraining: "Anpassade utbildningssessioner",
        slaGuarantee: "SLA-garanti"
      }
    },
    features: {
      badge: "30+ Kraftfulla funktioner",
      title: "Allt din restaurang behöver",
      description: "Från bokningshantering till köksdrift, analys till kundfeedback - vi har byggt varje funktion du behöver för att driva en framgångsrik restaurang.",
      bookingManagement: "Bokningshantering",
      restaurantOperations: "Restaurangoperationer",
      customerExperience: "Kundupplevelse",
      analyticsInsights: "Analys och insikter",
      kitchenOperations: "Köksoperationer",
      integrations: "Integrationer",
      bookingFeatures: [
        "Realtids tillgänglighetskontroll",
        "Smart bordstilldelning",
        "Bokningsändringar och avbokningar",
        "Walk-in hantering",
        "Konfliktdetektering och lösning",
        "Anpassade bokningsformulär"
      ],
      operationsFeatures: [
        "Multi-restaurang hantering",
        "Bord- och rumkonfiguration",
        "Kapacitetsoptimering",
        "Öppettiderhantering",
        "Kombinerad bordhantering",
        "Realtids statusspårning"
      ],
      customerFeatures: [
        "Kompletta kundprofiler",
        "QR-kod feedback insamling",
        "Nöjdhetsmätningar",
        "Automatiserade bekräftelser",
        "SMS och e-postpåminnelser",
        "Flerspråkigt stöd"
      ],
      analyticsFeatures: [
        "Bokningstrender och statistik",
        "Bordanvändning värmekarta",
        "Intäktsanalys",
        "Kundbeteendeinsikter",
        "Prestationsdashboards",
        "Detaljerade rapporter"
      ],
      kitchenFeatures: [
        "Köksbeställningsspårning",
        "Menyhanteringssystem",
        "Produktorganisation",
        "Beställningshantering",
        "Prestationsanalys",
        "Utskrivbara beställningsformulär"
      ],
      integrationFeatures: [
        "Google Calendar synkronisering",
        "Stripe betalningsbehandling",
        "E-posttjänst integration",
        "Sociala medier anslutningar",
        "Webhook konfigurationer",
        "Tredjepartsapp support"
      ]
    },
    whyChoose: {
      title: "Varför restauranger väljer ReadyTable",
      description: "Byggd med företagsnivå teknologi och designad för restauranger som kräver excellens",
      enterpriseSecurity: "Företagssäkerhet",
      enterpriseSecurityDesc: "Multi-tenant isolering, rollbaserad åtkomstkontroll och säker autentisering med SSO-support",
      lightningFast: "Blixtsnabb",
      lightningFastDesc: "Realtidsuppdateringar, ögonblickliga meddelanden och blixtsnabb prestanda på alla enheter",
      cloudBased: "Molnbaserad",
      cloudBasedDesc: "Åtkomst överallt med automatiska säkerhetskopior, skalning och 99,9% drifttidsgaranti",
      customerCentric: "Kundcentrerad",
      customerCentricDesc: "Sömlös gästupplevelse från bokning till feedback med automatiserad kommunikation"
    },
    cta: {
      badge: "Gå med 1000+ restauranger världen över",
      title: "Redo att transformera din restaurang?",
      description: "Starta din gratis provperiod idag och upptäck varför restauranger världen över väljer ReadyTable för att effektivisera verksamheten och glädja kunder.",
      startTrialNow: "Starta gratis provperiod nu",
      talkToSales: "Prata med försäljning",
      freeTrial: "14 dagar",
      noSetup: "Ingen installation",
      cancel: "Avbryt",
      freeTrialDesc: "Gratis provperiod",
      noSetupDesc: "Avgifter krävs",
      cancelDesc: "När som helst"
    },
    footer: {
      company: "Företag",
      product: "Produkt",
      resources: "Resurser",
      legal: "Juridiskt",
      description: "ReadyTable är det kompletta restauranghanteringssystem som restauranger världen över litar på för att effektivisera verksamheten och glädja kunder.",
      rights: "Alla rättigheter förbehållna.",
      about: "Om oss",
      careers: "Karriärer",
      blog: "Blogg",
      press: "Press",
      features: "Funktioner",
      pricing: "Priser",
      security: "Säkerhet",
      integrations: "Integrationer",
      documentation: "Dokumentation",
      support: "Supportcenter",
      community: "Community",
      statusPage: "Statussida",
      privacy: "Integritetspolicy",
      terms: "Tjänstevillkor",
      cookies: "Cookie-policy",
      gdpr: "GDPR"
    },
    stats: {
      features: "Tillgängliga funktioner",
      uptime: "Drifttidsgaranti",
      bookings: "Bokningar som stöds",
      support: "Support tillgänglig"
    }
  },
  cs: {
    nav: {
      features: "Funkce",
      pricing: "Ceny",
      contact: "Kontakt",
      login: "Přihlásit",
      register: "Registrovat"
    },
    hero: {
      badge: "🚀 Kompletní systém pro správu restaurace",
      title: "ReadyTable",
      subtitle: "Revoluce v restauracích",
      description: "Transformujte svou restauraci s naším komplexním řešením pro rezervace a správu.",
      startTrial: "Začít bezplatnou zkušební verzi",
      watchDemo: "Sledovat demo",
      enterpriseSecurity: "Podniková bezpečnost",
      uptime: "99,9% dostupnost",
      globalSupport: "Globální podpora"
    },
    devices: {
      title: "Funguje perfektně na všech zařízeních",
      description: "Váš systém pro správu restaurace, dostupný kdekoli. Desktop, tablet, mobil - bezproblémový zážitek na všech zařízeních.",
      desktop: "Desktop",
      tablet: "Tablet",
      mobile: "Mobil",
      desktopDesc: "Kompletní dashboard pro správu restaurace",
      tabletDesc: "Správa rezervací a objednávek u stolu",
      mobileDesc: "Mobilní přístup pro personál a zákazníky"
    },
    pricing: {
      badge: "Jednoduché, transparentní ceny",
      title: "Vyberte si svůj dokonalý plán",
      description: "Začněte zdarma a škálujte podle růstu. Žádné skryté poplatky, žádná překvapení. Zrušte kdykoli.",
      starter: "Začátečník",
      professional: "Profesionální",
      enterprise: "Podnikový",
      starterDesc: "Perfektní pro malé restaurace, které začínají",
      professionalDesc: "Vše, co potřebujete pro provoz úspěšné restaurace",
      enterpriseDesc: "Pokročilé funkce pro řetězce restaurací a podniky",
      mostPopular: "Nejpopulárnější",
      startFree: "Začít zdarma",
      startTrial: "Začít 14denní bezplatnou zkušební verzi",
      contactSales: "Kontaktovat prodej",
      customSolution: "Potřebujete vlastní řešení? Máme vás pokryté.",
      contactSalesTeam: "Kontaktovat prodejní tým",
      features: {
        bookings50: "Až 50 rezervací měsíčně",
        bookingsUnlimited: "Neomezené rezervace",
        tableBasic: "Základní správa stolů",
        tableAdvanced: "Pokročilá správa stolů",
        emailNotifications: "E-mailové notifikace",
        smsEmail: "SMS a e-mailové notifikace",
        guestForms: "Formuláře pro rezervace hostů",
        qrFeedback: "QR kód feedback systém",
        analyticsBasic: "Základní analýzy",
        analyticsAdvanced: "Pokročilé analýzy a reporty",
        communitySupport: "Komunitní podpora",
        kitchenDashboard: "Kuchyňský dashboard",
        multiLocation: "Podpora více míst",
        prioritySupport: "Prioritní podpora",
        customIntegrations: "Vlastní integrace",
        everythingPro: "Vše v Profesionální",
        whiteLabel: "White-label řešení",
        advancedApi: "Pokročilý přístup k API",
        accountManager: "Dedikovaný account manager",
        phoneSupport: "24/7 telefonní podpora",
        customTraining: "Vlastní tréninkové sezení",
        slaGuarantee: "SLA záruka"
      }
    },
    features: {
      badge: "30+ Mocných funkcí",
      title: "Vše, co vaše restaurace potřebuje",
      description: "Od správy rezervací po kuchyňské operace, analýzy až po zákaznickou zpětnou vazbu - vytvořili jsme každou funkci, kterou potřebujete pro provoz úspěšné restaurace.",
      bookingManagement: "Správa rezervací",
      restaurantOperations: "Restaurační operace",
      customerExperience: "Zákaznická zkušenost",
      analyticsInsights: "Analýzy a poznatky",
      kitchenOperations: "Kuchyňské operace",
      integrations: "Integrace",
      bookingFeatures: [
        "Kontrola dostupnosti v reálném čase",
        "Inteligentní přiřazování stolů",
        "Změny a zrušení rezervací",
        "Správa walk-in",
        "Detekce a řešení konfliktů",
        "Vlastní rezervační formuláře"
      ],
      operationsFeatures: [
        "Správa více restaurací",
        "Konfigurace stolů a místností",
        "Optimalizace kapacity",
        "Správa otevírací doby",
        "Správa kombinovaných stolů",
        "Sledování stavu v reálném čase"
      ],
      customerFeatures: [
        "Kompletní zákaznické profily",
        "Sběr zpětné vazby QR kódem",
        "Průzkumy spokojenosti",
        "Automatizovaná potvrzení",
        "SMS a e-mailové připomínky",
        "Vícejazyčná podpora"
      ],
      analyticsFeatures: [
        "Trendy rezervací a statistiky",
        "Tepelné mapy využití stolů",
        "Analýzy příjmů",
        "Poznatky o chování zákazníků",
        "Výkonnostní dashboardy",
        "Detailní reporty"
      ],
      kitchenFeatures: [
        "Sledování kuchyňských objednávek",
        "Systém správy menu",
        "Organizace produktů",
        "Správa objednávek",
        "Analýzy výkonu",
        "Tisknutelné formuláře objednávek"
      ],
      integrationFeatures: [
        "Synchronizace Google Calendar",
        "Stripe zpracování plateb",
        "Integrace e-mailových služeb",
        "Propojení sociálních médií",
        "Konfigurace webhook",
        "Podpora aplikací třetích stran"
      ]
    },
    whyChoose: {
      title: "Proč si restaurace vybírají ReadyTable",
      description: "Postaveno na podnikové technologii a navrženo pro restaurace, které vyžadují dokonalost",
      enterpriseSecurity: "Podniková bezpečnost",
      enterpriseSecurityDesc: "Multi-tenant izolace, řízení přístupu založené na rolích a bezpečná autentizace s SSO podporou",
      lightningFast: "Bleskově rychlé",
      lightningFastDesc: "Aktualizace v reálném čase, okamžité notifikace a bleskový výkon na všech zařízeních",
      cloudBased: "Cloudové",
      cloudBasedDesc: "Přístup odkudkoli s automatickými zálohami, škálováním a 99,9% zárukou dostupnosti",
      customerCentric: "Zaměřené na zákazníka",
      customerCentricDesc: "Bezproblémová zkušenost hostů od rezervace po zpětnou vazbu s automatizovanou komunikací"
    },
    cta: {
      badge: "Připojte se k 1000+ restauracím po celém světě",
      title: "Připraveni transformovat svou restauraci?",
      description: "Začněte svou bezplatnou zkušební verzi dnes a objevte, proč si restaurace po celém světě vybírají ReadyTable pro zefektivnění operací a potěšení zákazníků.",
      startTrialNow: "Začít bezplatnou zkušební verzi nyní",
      talkToSales: "Mluvit s prodejem",
      freeTrial: "14 dní",
      noSetup: "Žádné nastavení",
      cancel: "Zrušit",
      freeTrialDesc: "Bezplatná zkušební verze",
      noSetupDesc: "Poplatky vyžadovány",
      cancelDesc: "Kdykoli"
    },
    footer: {
      company: "Společnost",
      product: "Produkt",
      resources: "Zdroje",
      legal: "Právní",
      description: "ReadyTable je kompletní systém pro správu restaurace, kterému důvěřují restaurace po celém světě pro zefektivnění operací a potěšení zákazníků.",
      rights: "Všechna práva vyhrazena.",
      about: "O nás",
      careers: "Kariéra",
      blog: "Blog",
      press: "Tisk",
      features: "Funkce",
      pricing: "Ceny",
      security: "Bezpečnost",
      integrations: "Integrace",
      documentation: "Dokumentace",
      support: "Centrum podpory",
      community: "Komunita",
      statusPage: "Stránka stavu",
      privacy: "Zásady ochrany osobních údajů",
      terms: "Podmínky služby",
      cookies: "Zásady cookies",
      gdpr: "GDPR"
    },
    stats: {
      features: "Dostupné funkce",
      uptime: "Záruka dostupnosti",
      bookings: "Podporované rezervace",
      support: "Dostupná podpora"
    }
  },
  nl: {
    nav: {
      features: "Functies",
      pricing: "Prijzen",
      contact: "Contact",
      login: "Inloggen",
      register: "Registreren"
    },
    hero: {
      badge: "🚀 Compleet restaurantbeheersysteem",
      title: "ReadyTable",
      subtitle: "Restaurant Revolutie",
      description: "Transformeer uw restaurant met onze uitgebreide reserverings- en beheeroplossing.",
      startTrial: "Start gratis proefperiode",
      watchDemo: "Bekijk demo",
      enterpriseSecurity: "Bedrijfsbeveiliging",
      uptime: "99,9% uptime",
      globalSupport: "Wereldwijde ondersteuning"
    },
    devices: {
      title: "Werkt perfect op alle apparaten",
      description: "Uw restaurantbeheersysteem, overal beschikbaar. Desktop, tablet, mobiel - naadloze ervaring op alle apparaten.",
      desktop: "Desktop",
      tablet: "Tablet",
      mobile: "Mobiel",
      desktopDesc: "Compleet restaurantbeheer dashboard",
      tabletDesc: "Tafelzijde reservering en bestellingsbeheer",
      mobileDesc: "Mobiele toegang voor personeel en klanten"
    },
    pricing: {
      badge: "Eenvoudige, transparante prijzen",
      title: "Kies uw perfecte plan",
      description: "Begin gratis en schaal op terwijl u groeit. Geen verborgen kosten, geen verrassingen. Annuleer op elk moment.",
      starter: "Starter",
      professional: "Professioneel",
      enterprise: "Enterprise",
      starterDesc: "Perfect voor kleine restaurants die beginnen",
      professionalDesc: "Alles wat u nodig heeft om een succesvol restaurant te runnen",
      enterpriseDesc: "Geavanceerde functies voor restaurantketens en ondernemingen",
      mostPopular: "Meest populair",
      startFree: "Begin gratis",
      startTrial: "Start 14-dagen gratis proefperiode",
      contactSales: "Contact verkoop",
      customSolution: "Heeft u een aangepaste oplossing nodig? Wij hebben u gedekt.",
      contactSalesTeam: "Contact verkoopteam",
      features: {
        bookings50: "Tot 50 reserveringen per maand",
        bookingsUnlimited: "Onbeperkte reserveringen",
        tableBasic: "Basis tafelbeheer",
        tableAdvanced: "Geavanceerd tafelbeheer",
        emailNotifications: "E-mail notificaties",
        smsEmail: "SMS en e-mail notificaties",
        guestForms: "Gast-reserveringsformulieren",
        qrFeedback: "QR-code feedback systeem",
        analyticsBasic: "Basis analytics",
        analyticsAdvanced: "Geavanceerde analytics en rapporten",
        communitySupport: "Community ondersteuning",
        kitchenDashboard: "Keuken dashboard",
        multiLocation: "Multi-locatie ondersteuning",
        prioritySupport: "Priority ondersteuning",
        customIntegrations: "Aangepaste integraties",
        everythingPro: "Alles in Professioneel",
        whiteLabel: "White-label oplossing",
        advancedApi: "Geavanceerde API toegang",
        accountManager: "Toegewijde accountmanager",
        phoneSupport: "24/7 telefoonondersteuning",
        customTraining: "Aangepaste trainingsessies",
        slaGuarantee: "SLA garantie"
      }
    },
    features: {
      badge: "30+ Krachtige functies",
      title: "Alles wat uw restaurant nodig heeft",
      description: "Van reserveringsbeheer tot keukenoperaties, analytics tot klantfeedback - wij hebben elke functie gebouwd die u nodig heeft om een succesvol restaurant te runnen.",
      bookingManagement: "Reserveringsbeheer",
      restaurantOperations: "Restaurantoperaties",
      customerExperience: "Klantervaring",
      analyticsInsights: "Analytics en inzichten",
      kitchenOperations: "Keukenoperaties",
      integrations: "Integraties",
      bookingFeatures: [
        "Real-time beschikbaarheidscontrole",
        "Slimme tafeltoewijzing",
        "Reserveringswijzigingen en annuleringen",
        "Walk-in beheer",
        "Conflictdetectie en oplossing",
        "Aangepaste reserveringsformulieren"
      ],
      operationsFeatures: [
        "Multi-restaurant beheer",
        "Tafel- en ruimteconfiguratie",
        "Capaciteitsoptimalisatie",
        "Openingstijdenbeheer",
        "Gecombineerd tafelmanagement",
        "Real-time statustracking"
      ],
      customerFeatures: [
        "Complete klantprofielen",
        "QR-code feedback verzameling",
        "Tevredenheidsonderzoeken",
        "Geautomatiseerde bevestigingen",
        "SMS en e-mail herinneringen",
        "Meertalige ondersteuning"
      ],
      analyticsFeatures: [
        "Reserveringstrends en statistieken",
        "Tafelgebruik heatmaps",
        "Omzet analytics",
        "Klantgedrag inzichten",
        "Prestatie dashboards",
        "Gedetailleerde rapporten"
      ],
      kitchenFeatures: [
        "Keukenbestellingen tracking",
        "Menu beheersysteem",
        "Product organisatie",
        "Bestellingsbeheer",
        "Prestatie analytics",
        "Afdrukbare bestellingsformulieren"
      ],
      integrationFeatures: [
        "Google Calendar synchronisatie",
        "Stripe betalingsverwerking",
        "E-mail service integratie",
        "Social media verbindingen",
        "Webhook configuraties",
        "Derde partij app ondersteuning"
      ]
    },
    whyChoose: {
      title: "Waarom restaurants kiezen voor ReadyTable",
      description: "Gebouwd met enterprise-grade technologie en ontworpen voor restaurants die excellentie eisen",
      enterpriseSecurity: "Bedrijfsbeveiliging",
      enterpriseSecurityDesc: "Multi-tenant isolatie, rol-gebaseerde toegangscontrole en veilige authenticatie met SSO ondersteuning",
      lightningFast: "Bliksemsnelheid",
      lightningFastDesc: "Real-time updates, directe notificaties en bliksemsnelle prestaties op alle apparaten",
      cloudBased: "Cloud-gebaseerd",
      cloudBasedDesc: "Toegang overal met automatische back-ups, schaling en 99,9% uptime garantie",
      customerCentric: "Klantgericht",
      customerCentricDesc: "Naadloze gastervaring van reservering tot feedback met geautomatiseerde communicatie"
    },
    cta: {
      badge: "Sluit je aan bij 1000+ restaurants wereldwijd",
      title: "Klaar om uw restaurant te transformeren?",
      description: "Start vandaag uw gratis proefperiode en ontdek waarom restaurants wereldwijd kiezen voor ReadyTable om operaties te stroomlijnen en klanten te verrukken.",
      startTrialNow: "Start gratis proefperiode nu",
      talkToSales: "Praat met verkoop",
      freeTrial: "14 dagen",
      noSetup: "Geen installatie",
      cancel: "Annuleren",
      freeTrialDesc: "Gratis proefperiode",
      noSetupDesc: "Kosten vereist",
      cancelDesc: "Op elk moment"
    },
    footer: {
      company: "Bedrijf",
      product: "Product",
      resources: "Bronnen",
      legal: "Juridisch",
      description: "ReadyTable is het complete restaurantbeheersysteem dat restaurants wereldwijd vertrouwen om operaties te stroomlijnen en klanten te verrukken.",
      rights: "Alle rechten voorbehouden.",
      about: "Over ons",
      careers: "Carrières",
      blog: "Blog",
      press: "Pers",
      features: "Functies",
      pricing: "Prijzen",
      security: "Beveiliging",
      integrations: "Integraties",
      documentation: "Documentatie",
      support: "Ondersteuningscentrum",
      community: "Community",
      statusPage: "Statuspagina",
      privacy: "Privacybeleid",
      terms: "Servicevoorwaarden",
      cookies: "Cookie beleid",
      gdpr: "AVG"
    },
    stats: {
      features: "Beschikbare functies",
      uptime: "Uptime garantie",
      bookings: "Ondersteunde reserveringen",
      support: "Ondersteuning beschikbaar"
    }
  }
};

// Detect user's language from browser or country
export function detectLanguage(): Language {
  // Try to get language from browser
  const browserLang = navigator.language.toLowerCase();
  
  // Map browser languages to our supported languages
  const languageMap: Record<string, Language> = {
    'en': 'en',
    'en-us': 'en',
    'en-gb': 'en',
    'de': 'de',
    'de-de': 'de',
    'de-at': 'de',
    'de-ch': 'de',
    'es': 'es',
    'es-es': 'es',
    'es-mx': 'es',
    'fr': 'fr',
    'fr-fr': 'fr',
    'fr-ca': 'fr',
    'it': 'it',
    'it-it': 'it',
    'no': 'no',
    'nb': 'no',
    'nn': 'no',
    'da': 'da',
    'da-dk': 'da',
    'sv': 'sv',
    'sv-se': 'sv',
    'cs': 'cs',
    'cs-cz': 'cs',
    'nl': 'nl',
    'nl-nl': 'nl',
    'nl-be': 'nl'
  };
  
  // Check exact match first
  if (languageMap[browserLang]) {
    return languageMap[browserLang];
  }
  
  // Check language prefix (e.g., 'de' from 'de-at')
  const langPrefix = browserLang.split('-')[0];
  if (languageMap[langPrefix]) {
    return languageMap[langPrefix];
  }
  
  // Default to English
  return 'en';
}

// Hook for using translations (legacy - use context version instead)
export function useTranslations(): Translations {
  const language = detectLanguage();
  return translations[language];
}

// Export translations object for context
export { translations };

// Get specific translation
export function getTranslation(key: string, language?: Language): string {
  const lang = language || detectLanguage();
  const t = translations[lang];
  
  // Simple key path resolution (e.g., 'nav.features')
  const keys = key.split('.');
  let value: any = t;
  
  for (const k of keys) {
    value = value?.[k];
  }
  
  return typeof value === 'string' ? value : key;
}