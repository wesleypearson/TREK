import { http, HttpResponse } from 'msw';
import { buildBudgetItem } from '../../factories';

export const budgetHandlers = [
  http.get('/api/trips/:id/budget', ({ params }) => {
    return HttpResponse.json({
      items: [buildBudgetItem({ trip_id: Number(params.id) })],
    });
  }),

  http.post('/api/trips/:id/budget', async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>;
    const item = buildBudgetItem({ trip_id: Number(params.id), ...body });
    return HttpResponse.json({ item });
  }),

  http.put('/api/trips/:id/budget/:itemId', async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>;
    const item = buildBudgetItem({ id: Number(params.itemId), trip_id: Number(params.id), ...body });
    return HttpResponse.json({ item });
  }),

  http.delete('/api/trips/:id/budget/:itemId', () => {
    return HttpResponse.json({ success: true });
  }),

  http.put('/api/trips/:id/budget/:itemId/members', async ({ params, request }) => {
    const body = await request.json() as { user_ids: number[] };
    const members = body.user_ids.map(uid => ({ user_id: uid, paid: 0, username: `user${uid}` }));
    const item = buildBudgetItem({ id: Number(params.itemId), trip_id: Number(params.id), persons: body.user_ids.length, members });
    return HttpResponse.json({ members, item });
  }),

  http.put('/api/trips/:id/budget/:itemId/members/:userId/paid', async ({ params, request }) => {
    const body = await request.json() as { paid: boolean };
    return HttpResponse.json({ success: true, paid: body.paid });
  }),

  http.post('/api/trips/:id/budget/receipt-scan', ({ params }) => {
    return HttpResponse.json({
      file: { id: 77, trip_id: Number(params.id), original_name: 'receipt.jpg', url: `/api/trips/${params.id}/files/77/download` },
      receipt: {
        merchant: 'SuperMart',
        date: '2025-06-15',
        currency: 'EUR',
        total: 12.5,
        items: [
          { name: 'Apples', price: 3.5 },
          { name: 'Beer', price: 9, quantity: 2 },
        ],
      },
      warnings: [],
    });
  }),
];
