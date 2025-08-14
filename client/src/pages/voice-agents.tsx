import { useEffect } from 'react';
import { useLocation, useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';

export default function VoiceAgents() {
  const [, navigate] = useLocation();
  const params = useParams();
  const tenantId = params.tenantId;

  // Fetch available restaurants for the tenant
  const { data: restaurants, isLoading } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants`],
    enabled: !!tenantId,
  });

  useEffect(() => {
    if (!tenantId) {
      navigate('/dashboard');
      return;
    }

    // If we're still loading restaurants, wait
    if (isLoading) return;

    // Get the current restaurant ID from URL path or localStorage
    const pathParts = window.location.pathname.split('/');
    const restaurantIndex = pathParts.findIndex(part => part === 'restaurants');
    let restaurantId = null;
    
    if (restaurantIndex !== -1) {
      restaurantId = pathParts[restaurantIndex + 1];
    } else {
      // Try to get restaurant ID from localStorage or context
      const storedRestaurant = localStorage.getItem('currentRestaurant');
      if (storedRestaurant) {
        try {
          const restaurant = JSON.parse(storedRestaurant);
          restaurantId = restaurant.id;
        } catch (e) {
          console.warn('Failed to parse stored restaurant:', e);
        }
      }
    }

    // If no restaurant ID found, use the first available restaurant
    if (!restaurantId && restaurants && restaurants.length > 0) {
      restaurantId = restaurants[0].id;
    }
    
    if (restaurantId) {
      // Redirect to new voice agent request system
      navigate(`/${tenantId}/restaurants/${restaurantId}/voice-agent-request`);
    } else {
      // If no restaurants available, redirect to dashboard
      console.warn('No restaurants found for tenant');
      navigate(`/${tenantId}/dashboard`);
    }
  }, [navigate, tenantId, restaurants, isLoading]);

  return (
    <div className="h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
}