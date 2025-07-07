import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Globe, 
  Calculator, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Search,
  Phone,
  MapPin
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CountryPricing {
  iso: string;
  country: string;
  price: number;
}

interface PricingStats {
  cheapest: CountryPricing;
  expensive: CountryPricing;
  average: number;
}

interface PhoneNumberInfo {
  country: string;
  iso: string;
  price: number;
  formattedNumber: string;
}

export function SMSPricingDisplay() {
  const [searchTerm, setSearchTerm] = useState("");
  const [testPhoneNumber, setTestPhoneNumber] = useState("");
  const [phoneNumberInfo, setPhoneNumberInfo] = useState<PhoneNumberInfo | null>(null);

  const { data: countries, isLoading: loadingCountries } = useQuery({
    queryKey: ["/api/sms-pricing/countries"],
    queryFn: async () => {
      const response = await fetch("/api/sms-pricing/countries");
      if (!response.ok) throw new Error("Failed to fetch countries");
      return response.json() as CountryPricing[];
    }
  });

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ["/api/sms-pricing/stats"],
    queryFn: async () => {
      const response = await fetch("/api/sms-pricing/stats");
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json() as PricingStats;
    }
  });

  const filteredCountries = countries?.filter(country =>
    country.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.iso.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calculatePhoneNumberCost = async () => {
    if (!testPhoneNumber) return;
    
    try {
      const response = await fetch("/api/sms-pricing/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: testPhoneNumber })
      });
      
      if (response.ok) {
        const info = await response.json();
        setPhoneNumberInfo(info);
      }
    } catch (error) {
      console.error("Error calculating phone number cost:", error);
    }
  };

  const formatPrice = (price: number) => `$${price.toFixed(4)}`;

  const getPriceColor = (price: number, stats?: PricingStats) => {
    if (!stats) return "bg-gray-100 text-gray-800";
    
    const average = stats.average;
    if (price <= average * 0.5) return "bg-green-100 text-green-800";
    if (price <= average) return "bg-yellow-100 text-yellow-800";
    if (price <= average * 1.5) return "bg-orange-100 text-orange-800";
    return "bg-red-100 text-red-800";
  };

  if (loadingCountries || loadingStats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            SMS Pricing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Overview */}
      {stats && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <TrendingUp className="w-5 h-5" />
              SMS Pricing Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-white rounded-lg border border-blue-100">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingDown className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-gray-600">Cheapest</span>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {formatPrice(stats.cheapest.price)}
                </div>
                <div className="text-sm text-gray-500">{stats.cheapest.country}</div>
              </div>
              
              <div className="text-center p-4 bg-white rounded-lg border border-blue-100">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-gray-600">Average</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {formatPrice(stats.average)}
                </div>
                <div className="text-sm text-gray-500">Global average</div>
              </div>
              
              <div className="text-center p-4 bg-white rounded-lg border border-blue-100">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-gray-600">Most Expensive</span>
                </div>
                <div className="text-2xl font-bold text-red-600">
                  {formatPrice(stats.expensive.price)}
                </div>
                <div className="text-sm text-gray-500">{stats.expensive.country}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phone Number Cost Calculator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Cost Calculator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="test-phone">Phone Number</Label>
                <Input
                  id="test-phone"
                  placeholder="+1234567890"
                  value={testPhoneNumber}
                  onChange={(e) => setTestPhoneNumber(e.target.value)}
                />
              </div>
              <Button onClick={calculatePhoneNumberCost} className="mt-6">
                <Calculator className="w-4 h-4 mr-2" />
                Calculate
              </Button>
            </div>
            
            {phoneNumberInfo && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-blue-600 mt-1" />
                  <div className="flex-1">
                    <div className="font-semibold text-blue-900">
                      {phoneNumberInfo.formattedNumber}
                    </div>
                    <div className="text-sm text-blue-700 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {phoneNumberInfo.country} ({phoneNumberInfo.iso})
                    </div>
                    <div className="text-lg font-bold text-blue-900 mt-2">
                      Cost: {formatPrice(phoneNumberInfo.price)} per SMS
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Country Pricing Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Country Pricing ({countries?.length || 0} countries)
          </CardTitle>
          <div className="flex items-center gap-2 mt-2">
            <Search className="w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search countries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredCountries?.map((country) => (
              <div key={country.iso} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="font-mono text-xs">
                    {country.iso}
                  </Badge>
                  <span className="font-medium">{country.country}</span>
                </div>
                <Badge className={cn("font-mono", getPriceColor(country.price, stats))}>
                  {formatPrice(country.price)}
                </Badge>
              </div>
            ))}
          </div>
          
          {filteredCountries?.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No countries found matching "{searchTerm}"
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}