import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="relative h-96 flex items-center justify-center">
      {/* Background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-gray-800"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=800')`
        }}
      />
      <div className="absolute inset-0 bg-black bg-opacity-60" />
      
      <div className="relative z-10 text-center max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-center mb-4">
          <h1 className="text-4xl md:text-5xl font-bold text-white mr-3">
            Your data is your data
          </h1>
          <div className="bg-white bg-opacity-20 rounded-full p-2">
            <Shield className="text-white" size={32} />
          </div>
        </div>
        <p className="text-lg text-gray-200 max-w-3xl mx-auto leading-relaxed">
          You own 100% of your data—no exceptions. With ReadyTable, the choice of what your guests receive is your decision, not ours. Get accurate booking data from our restaurant reservation system so you can tailor marketing campaigns. And with no account creation requirements, we ensure your customers aren't flooded with competitor-promoting emails.
        </p>
      </div>
    </section>
  );
}
