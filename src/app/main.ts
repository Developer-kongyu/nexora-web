import { bootstrapApplication } from '@/app/bootstrapApplication';
import '@/app/styles/global.css';

void bootstrapApplication({
  document,
  loadApplication: async () => {
    const application = await import('@/app/mountApplication');
    return application.mountApplication;
  },
  onRetry: () => window.location.reload(),
  reportError: (message, error) => console.error(message, error),
});
