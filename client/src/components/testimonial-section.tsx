export default function TestimonialSection() {
  return (
    <section className="relative py-16">
      {/* Restaurant dining atmosphere background */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=800')`
        }}
      />
      <div className="absolute inset-0 bg-black bg-opacity-70" />
      
      <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
        <blockquote className="text-2xl md:text-3xl font-medium text-white mb-8 leading-relaxed">
          "Streamlined reservations, fewer no-shows, and effortless booking management. It's a game-changer for our restaurant and staff."
        </blockquote>
        <div className="text-white">
          <div className="font-semibold text-lg">Sune Hai</div>
          <div className="text-gray-300">Owner, John & Woa</div>
        </div>
      </div>
    </section>
  );
}
