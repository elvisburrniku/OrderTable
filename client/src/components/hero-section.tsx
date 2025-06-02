import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="relative h-96 bg-gray-900 overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=800')`
        }}
      >
        <div className="absolute inset-0 hero-overlay"></div>
      </div>
      
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
        <div className="text-center text-white">
          <div className="flex items-center justify-center mb-4">
            <h1 className="text-4xl md:text-5xl font-bold">Your data is your data</h1>
            <div className="ml-3 w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <Shield className="text-white" size={16} />
            </div>
          </div>
          <p className="text-lg md:text-xl max-w-3xl mx-auto leading-relaxed">
            You own 100% of your data—no exceptions. With easyTable, the choice of what your guests receive is your decision, not ours. Get accurate booking data from our restaurant reservation system so you can tailor marketing campaigns. And with no account creation requirements, we ensure your customers aren't flooded with competitor-promoting emails.
          </p>
        </div>
      </div>
    </section>
  );
}
