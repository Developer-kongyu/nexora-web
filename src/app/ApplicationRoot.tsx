import { StrictMode } from 'react';
import { AppProviders } from '@/app/providers/AppProviders';
import { AppRouter } from '@/app/router/router';

export function ApplicationRoot() {
  return (
    <StrictMode>
      <AppProviders>
        <AppRouter />
      </AppProviders>
    </StrictMode>
  );
}
