import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Sparkles, 
  Coffee, 
  Clock, 
  Users, 
  TrendingUp,
  Calendar,
  ChefHat,
  Heart
} from "lucide-react";

interface WelcomeAnimationProps {
  restaurant?: any;
  todayBookings?: any[];
  onAnimationComplete?: () => void;
}

export default function WelcomeAnimation({ 
  restaurant, 
  todayBookings = [], 
  onAnimationComplete 
}: WelcomeAnimationProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [showWelcome, setShowWelcome] = useState(true);

  const currentHour = new Date().getHours();
  const userName = user?.email?.split('@')[0] || 'Chef';
  
  // Determine greeting based on time of day
  const getGreeting = () => {
    if (currentHour < 12) return "Good Morning";
    if (currentHour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  // Get personalized message based on restaurant data and time
  const getPersonalizedMessage = () => {
    const baseMessages = [
      `Welcome back to ${restaurant?.name || 'your restaurant'}!`,
      `You have ${todayBookings.length} ${todayBookings.length === 1 ? 'booking' : 'bookings'} today`,
      `Let's make today amazing for your guests!`
    ];

    // Add contextual messages based on booking count and time
    if (currentStep === 1) {
      if (todayBookings.length === 0) {
        return "Ready to welcome your first guests today";
      } else if (todayBookings.length > 10) {
        return `Busy day ahead - ${todayBookings.length} bookings to manage!`;
      } else if (todayBookings.length > 5) {
        return `Great day planned - ${todayBookings.length} bookings confirmed`;
      }
    }

    if (currentStep === 2) {
      if (currentHour < 12) {
        return "Fresh start to a successful day!";
      } else if (currentHour < 17) {
        return "Afternoon service is ready to shine!";
      } else {
        return "Evening service - let's create memorable experiences!";
      }
    }

    return baseMessages[currentStep] || baseMessages[0];
  };

  // Animation sequence
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentStep < 2) {
        setCurrentStep(currentStep + 1);
      } else {
        // Complete animation after showing all steps
        setTimeout(() => {
          setShowWelcome(false);
          onAnimationComplete?.();
        }, 1500);
      }
    }, 1800);

    return () => clearTimeout(timer);
  }, [currentStep, onAnimationComplete]);

  // Skip animation if user clicks
  const handleSkip = () => {
    setShowWelcome(false);
    onAnimationComplete?.();
  };

  if (!showWelcome) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-orange-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900"
        onClick={handleSkip}
      >
        <Card className="w-full max-w-md mx-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-none shadow-2xl">
          <CardContent className="p-8 text-center">
            {/* Animated Icons */}
            <div className="relative mb-6 h-20 flex items-center justify-center">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 260, 
                  damping: 20,
                  delay: 0.2 
                }}
                className="absolute"
              >
                {currentStep === 0 && (
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-8 h-8 text-orange-500" />
                    <ChefHat className="w-10 h-10 text-orange-600" />
                    <Sparkles className="w-8 h-8 text-orange-500" />
                  </div>
                )}
                {currentStep === 1 && (
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-8 h-8 text-blue-500" />
                    <Users className="w-10 h-10 text-blue-600" />
                    <TrendingUp className="w-8 h-8 text-green-500" />
                  </div>
                )}
                {currentStep === 2 && (
                  <div className="flex items-center space-x-2">
                    <Coffee className="w-8 h-8 text-amber-500" />
                    <Heart className="w-10 h-10 text-red-500" />
                    <Clock className="w-8 h-8 text-purple-500" />
                  </div>
                )}
              </motion.div>
            </div>

            {/* Greeting Text */}
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mb-4"
            >
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                {getGreeting()}, {userName}!
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                {getPersonalizedMessage()}
              </p>
            </motion.div>

            {/* Progress dots */}
            <div className="flex justify-center space-x-2 mb-4">
              {[0, 1, 2].map((step) => (
                <motion.div
                  key={step}
                  initial={{ scale: 0.5, opacity: 0.3 }}
                  animate={{ 
                    scale: currentStep === step ? 1.2 : 0.8,
                    opacity: currentStep >= step ? 1 : 0.3
                  }}
                  transition={{ duration: 0.3 }}
                  className={`w-2 h-2 rounded-full ${
                    currentStep >= step 
                      ? 'bg-orange-500' 
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                />
              ))}
            </div>

            {/* Skip button */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              whileHover={{ opacity: 1, scale: 1.05 }}
              onClick={handleSkip}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              Click anywhere to continue
            </motion.button>
          </CardContent>
        </Card>

        {/* Floating background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ 
                opacity: 0, 
                scale: 0,
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight
              }}
              animate={{ 
                opacity: [0, 0.1, 0],
                scale: [0, 1, 0],
                rotate: [0, 360]
              }}
              transition={{ 
                duration: 3,
                delay: i * 0.5,
                repeat: Infinity,
                repeatDelay: 2
              }}
              className="absolute w-4 h-4 bg-orange-200 dark:bg-orange-800 rounded-full"
            />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}