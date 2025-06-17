import { useState, useEffect } from 'react';
import { Clock, Sparkles, Star, Heart, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Particle {
  id: number;
  x: number;
  y: number;
  icon: typeof Clock;
  color: string;
  duration: number;
  delay: number;
}

interface FloatingTimeParticlesProps {
  isUrgent: boolean;
  particleCount?: number;
  className?: string;
}

const ParticleIcon = ({ particle }: { particle: Particle }) => {
  const IconComponent = particle.icon;
  
  return (
    <div
      className={cn(
        "absolute pointer-events-none transition-all duration-1000 ease-out",
        "animate-bounce opacity-70"
      )}
      style={{
        left: `${particle.x}%`,
        top: `${particle.y}%`,
        animationDelay: `${particle.delay}ms`,
        animationDuration: `${particle.duration}ms`,
        color: particle.color,
      }}
    >
      <IconComponent className="w-3 h-3" />
    </div>
  );
};

export default function FloatingTimeParticles({ 
  isUrgent, 
  particleCount = 6, 
  className 
}: FloatingTimeParticlesProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  const urgentIcons = [Zap, Star, Heart];
  const normalIcons = [Clock, Sparkles, Star];
  const urgentColors = ['#ef4444', '#f97316', '#eab308'];
  const normalColors = ['#3b82f6', '#8b5cf6', '#06b6d4'];

  useEffect(() => {
    const icons = isUrgent ? urgentIcons : normalIcons;
    const colors = isUrgent ? urgentColors : normalColors;

    const newParticles: Particle[] = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * 80 + 10, // Keep particles within 10-90% of container
      y: Math.random() * 60 + 20, // Keep particles within 20-80% of container
      icon: icons[Math.floor(Math.random() * icons.length)],
      color: colors[Math.floor(Math.random() * colors.length)],
      duration: 2000 + Math.random() * 1000, // 2-3 seconds
      delay: i * 200, // Stagger animations
    }));

    setParticles(newParticles);

    // Regenerate particles periodically
    const interval = setInterval(() => {
      const regeneratedParticles: Particle[] = Array.from({ length: particleCount }, (_, i) => ({
        id: Date.now() + i,
        x: Math.random() * 80 + 10,
        y: Math.random() * 60 + 20,
        icon: icons[Math.floor(Math.random() * icons.length)],
        color: colors[Math.floor(Math.random() * colors.length)],
        duration: 2000 + Math.random() * 1000,
        delay: i * 150,
      }));
      setParticles(regeneratedParticles);
    }, isUrgent ? 3000 : 5000); // Faster regeneration for urgent

    return () => clearInterval(interval);
  }, [isUrgent, particleCount]);

  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
      {particles.map((particle) => (
        <ParticleIcon key={particle.id} particle={particle} />
      ))}
    </div>
  );
}