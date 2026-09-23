import { createFixtures } from '../fixtures/factory';

export let fixtureState = createFixtures();

export function resetFixtureState(): void {
  fixtureState = createFixtures();
}
