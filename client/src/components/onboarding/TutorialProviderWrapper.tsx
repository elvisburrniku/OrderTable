import { ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { TutorialProvider } from './TutorialProvider';

interface TutorialProviderWrapperProps {
  children: ReactNode;
}

export function TutorialProviderWrapper({ children }: TutorialProviderWrapperProps) {
  const { restaurant } = useAuth();
  const { tenant } = useTenant();

  return (
    <TutorialProvider 
      tenantId={tenant?.id || restaurant?.tenantId} 
      restaurantId={restaurant?.id}
    >
      {children}
    </TutorialProvider>
  );
}