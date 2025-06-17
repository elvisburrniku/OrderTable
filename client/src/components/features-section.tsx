import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, FileText, Star } from "lucide-react";

export default function FeaturesSection() {
  return (
    <div className="bg-white">
      {/* Restaurant Feature Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1551782450-a2132b4ba21d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600" 
                alt="Gourmet burger with fries" 
                className="rounded-xl shadow-lg w-full h-auto" 
              />
              <div className="absolute top-4 right-4 bg-black bg-opacity-80 text-white px-3 py-2 rounded-lg">
                <div className="text-sm font-semibold">Grillen Burgerbar</div>
                <div className="text-xs">Munchen, Germany</div>
              </div>
            </div>
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Meet a part of the family – Grillen Burgerbar
              </h2>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Since opening its doors in 2013, Grillen Burgerbar has become one of Denmark's most popular burger joints. See how ReadyTable has revolutionized their reservation and booking system.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  <Phone className="h-4 w-4 mr-2" />
                  Get a call from us
                </Button>
                <Button variant="outline" className="border-gray-300 text-gray-700 hover:border-green-600 hover:text-green-600">
                  Read case study
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Restaurant Logos Section */}
      <section className="py-16 bg-gray-50" id="cases">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                More than 2500 restaurants have joined the family
              </h2>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                The ReadyTable family is growing – and fast. With now over 2500 restaurants in 43 different countries, we have helped our clients serve over 140 million guests worldwide – that's quite a lot.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-8 items-center">
              {[
                "Madklubben", "FRANKIES", "BISTRO ROYAL",
                "NOTO", "HANZO", "LA ROCCA"
              ].map((brand) => (
                <Card key={brand} className="bg-white shadow-sm text-center">
                  <CardContent className="p-4">
                    <div className="text-xl font-bold text-gray-800">{brand}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          
          {/* Google Reviews */}
          <div className="mt-12 text-center">
            <Card className="bg-white shadow-sm inline-block">
              <CardContent className="p-6">
                <div className="flex items-center justify-center mb-2">
                  <div className="text-2xl text-blue-500 mr-3 font-bold">G</div>
                  <span className="text-lg font-semibold text-gray-800">Google Reviews</span>
                </div>
                <div className="flex justify-center mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="text-yellow-400 fill-current" size={16} />
                  ))}
                </div>
                <div className="text-sm text-gray-600">4.9 stars | 71 reviews</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Support Section */}
      <section className="py-16 bg-white" id="about">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                With you every step of the way
              </h2>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                From installation to troubleshooting and training, our very human team will ensure you get the most out of your ReadyTable online table booking system. We provide comprehensive human support to assure you get the help you need.
              </p>
              <Button className="bg-black hover:bg-gray-800 text-white">
                Meet the people behind ReadyTable
              </Button>
            </div>
            <div>
              <img 
                src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600" 
                alt="Professional team working in modern office" 
                className="rounded-xl shadow-lg w-full h-auto" 
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main Features Section */}
      <section className="py-16 bg-white" id="features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1551218808-94e220e084d2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600" 
                alt="Modern restaurant interior with sophisticated lighting" 
                className="rounded-xl shadow-lg w-full h-auto" 
              />
              <div className="absolute bottom-4 left-4 bg-black bg-opacity-80 text-white px-3 py-2 rounded-lg">
                <div className="text-sm font-semibold">Skybar & Grilled Alpaca Hotel</div>
                <div className="text-xs">Manila, Sweden</div>
              </div>
            </div>
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Simplifying bookings one table at a time
              </h2>
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                ReadyTable is designed to be intuitive, affordable, and easy to use. The online table booking system lets guests book directly from your site and social media platforms, as well as Google, TripAdvisor, Michelin Guide, and more, automating everything on your end.
              </p>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                A tailored and comprehensive approach makes integration into your business seamless and simple. ReadyTable is compatible with any device or platform with an internet connection and has no limits to the number of users. Making it always possible to access any reservation at any time.
              </p>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                So, start getting your team back to what they do best and start using a restaurant reservation system that can better your business one table at a time.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
