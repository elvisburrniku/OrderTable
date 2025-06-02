
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { Link } from "wouter";

export default function PricingSection() {
  const { data: plans = [] } = useQuery({
    queryKey: ['/api/subscription-plans']
  });

  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Choose the perfect plan for your restaurant. Start with our free trial and upgrade as you grow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Free Trial */}
          <Card className="relative border-2 border-gray-200">
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-xl font-bold">Free Trial</CardTitle>
              <div className="mt-4">
                <span className="text-4xl font-bold">Free</span>
                <span className="text-gray-600 ml-2">for 14 days</span>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-3" />
                  <span className="text-sm">Up to 3 tables</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-3" />
                  <span className="text-sm">20 bookings/month</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-3" />
                  <span className="text-sm">Basic booking management</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-3" />
                  <span className="text-sm">Email notifications</span>
                </li>
              </ul>
              <Link href="/login">
                <Button className="w-full" variant="outline">
                  Start Free Trial
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Paid Plans */}
          {plans.map((plan: any, index: number) => (
            <Card
              key={plan.id}
              className={`relative border-2 ${
                index === 1 ? 'border-green-500 transform scale-105' : 'border-gray-200'
              }`}
            >
              {index === 1 && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-green-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">${(plan.price / 100).toFixed(0)}</span>
                  <span className="text-gray-600 ml-2">/month</span>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center">
                    <Check className="h-4 w-4 text-green-500 mr-3" />
                    <span className="text-sm">Up to {plan.maxTables} tables</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-4 w-4 text-green-500 mr-3" />
                    <span className="text-sm">{plan.maxBookingsPerMonth} bookings/month</span>
                  </li>
                  {JSON.parse(plan.features).slice(0, 3).map((feature: string, featureIndex: number) => (
                    <li key={featureIndex} className="flex items-center">
                      <Check className="h-4 w-4 text-green-500 mr-3" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/login">
                  <Button
                    className={`w-full ${
                      index === 1
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : ''
                    }`}
                    variant={index === 1 ? 'default' : 'outline'}
                  >
                    Get Started
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <p className="text-gray-600 mb-4">
            All plans include 24/7 support and 30-day money-back guarantee
          </p>
          <div className="flex justify-center items-center space-x-8 text-sm text-gray-500">
            <span>✓ No setup fees</span>
            <span>✓ Cancel anytime</span>
            <span>✓ Secure payments with Stripe</span>
          </div>
        </div>
      </div>
    </section>
  );
}
