import { http } from 'msw';
import { ok } from './http';
import { permissionsState } from '../state/permissions.state';

export const permissionsHandlers = [
  http.get('/api/permissions/me/policy', () => ok(permissionsState.mockPermissionPolicy)),
  http.patch('/api/permissions/me/policy', async ({ request }) => {
    const patch = (await request.json()) as Partial<typeof permissionsState.mockPermissionPolicy>;
    permissionsState.mockPermissionPolicy = { ...permissionsState.mockPermissionPolicy, ...patch };
    return ok({ snapshot: permissionsState.mockPermissionPolicy });
  }),
  http.post('/api/permissions/me/policy/preview', async ({ request }) => {
    const patch = (await request.json()) as Partial<typeof permissionsState.mockPermissionPolicy>;
    return ok({ previewPolicy: { ...permissionsState.mockPermissionPolicy, ...patch } });
  }),
];
