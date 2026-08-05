import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/domains/auth';
import { RequireCompletedOnboarding, RequireOnboarding } from './guards';

const user = {
  id: 'user-1',
  handle: 'tester',
  displayName: 'Tester',
  avatarUrl: null,
};

function LocationProbe() {
  return <span>{useLocation().pathname}</span>;
}

afterEach(() => useAuthStore.getState().setAnonymous());

describe('onboarding route guards', () => {
  it('resumes an incomplete session at the backend-reported step', async () => {
    useAuthStore.setState({
      status: 'authenticated',
      user,
      onboardingCompleted: false,
      onboardingStatus: 'PENDING_RECOMMENDED_USERS',
    });

    render(
      <MemoryRouter initialEntries={['/home']}>
        <Routes>
          <Route
            path="/home"
            element={
              <RequireCompletedOnboarding>
                <LocationProbe />
              </RequireCompletedOnboarding>
            }
          />
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('/onboarding/follow')).toBeInTheDocument();
  });

  it('prevents skipping ahead within onboarding', async () => {
    useAuthStore.setState({
      status: 'authenticated',
      user,
      onboardingCompleted: false,
      onboardingStatus: 'PENDING_RECOMMENDED_COMMUNITIES',
    });

    render(
      <MemoryRouter initialEntries={['/onboarding/interests']}>
        <Routes>
          <Route
            path="/onboarding/interests"
            element={
              <RequireOnboarding>
                <LocationProbe />
              </RequireOnboarding>
            }
          />
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('/onboarding/communities')).toBeInTheDocument();
  });

  it('redirects completed users away from onboarding', async () => {
    useAuthStore.setState({
      status: 'authenticated',
      user,
      onboardingCompleted: true,
      onboardingStatus: 'COMPLETED',
    });

    render(
      <MemoryRouter initialEntries={['/onboarding/interests']}>
        <Routes>
          <Route
            path="/onboarding/interests"
            element={
              <RequireOnboarding>
                <LocationProbe />
              </RequireOnboarding>
            }
          />
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('/home')).toBeInTheDocument();
  });
});
