import { useEffect } from 'react';
import { useLocation } from 'wouter';

export default function VoiceAgents() {
  const [, navigate] = useLocation();

  useEffect(() => {
    // Get current tenant and restaurant from URL
    const pathParts = window.location.pathname.split('/');
    const tenantIndex = pathParts.findIndex(part => part === 'tenants');
    const restaurantIndex = pathParts.findIndex(part => part === 'restaurants');
    
    if (tenantIndex !== -1 && restaurantIndex !== -1) {
      const tenantId = pathParts[tenantIndex + 1];
      const restaurantId = pathParts[restaurantIndex + 1];
      
      // Redirect to new voice agent request system
      navigate(`/${tenantId}/restaurants/${restaurantId}/voice-agent-request`);
    } else {
      // Fallback redirect
      navigate('/dashboard');
    }
  }, [navigate]);

  return (
    <div className="h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
}