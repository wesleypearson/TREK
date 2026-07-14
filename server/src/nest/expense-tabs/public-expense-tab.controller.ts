import { Body, Controller, Get, HttpCode, HttpException, Param, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { createReadStream, existsSync } from 'node:fs';
import path from 'node:path';
import { resolveFilePath } from '../../services/fileService';
import { RateLimitService } from '../auth/rate-limit.service';
import { ExpenseTabsService } from './expense-tabs.service';

const RL_WINDOW = 15 * 60 * 1000;

// Only render receipt types inline on the public page; anything else the
// owner might have linked as a "receipt" is forced to download so a stray
// HTML/SVG upload can never execute on this origin.
const INLINE_MIMES = /^(image\/(jpeg|png|webp|gif|heic|heif)|application\/pdf)$/;

/**
 * /api/public/tabs/:token — the no-account side of expense tabs (custom).
 *
 * Deliberately NOT behind a guard: the 192-bit token in the URL is the whole
 * credential, mirroring /api/shared/:token. Invalid and revoked tokens are
 * indistinguishable (404), every route is rate-limited per IP to blunt
 * probing, and the payload exposes only what the hosted repayment page needs:
 * names, frozen line items, payments, balance, the owner's payment methods
 * and a one-use join link.
 */
@Controller('api/public/tabs')
export class PublicExpenseTabController {
  constructor(private readonly tabs: ExpenseTabsService, private readonly rl: RateLimitService) {}

  private limit(bucket: string, req: Request, max: number): void {
    if (!this.rl.check(bucket, req.ip || 'unknown', max, RL_WINDOW, Date.now())) {
      throw new HttpException({ error: 'Too many attempts. Please try again later.' }, 429);
    }
  }

  @Get(':token')
  read(@Param('token') token: string, @Req() req: Request) {
    this.limit('tab_read', req, 120);
    const tab = this.tabs.getPublicTab(token);
    if (!tab) throw new HttpException({ error: 'Invalid or expired link' }, 404);
    return tab;
  }

  /** One-time visitor name capture ("who is actually looking at this tab"). */
  @Post(':token/claim')
  @HttpCode(200)
  claim(@Param('token') token: string, @Body() body: { first_name?: string; last_name?: string }, @Req() req: Request) {
    this.limit('tab_claim', req, 10);
    const result = this.tabs.claim(token, String(body?.first_name || ''), String(body?.last_name || ''));
    if ('error' in result) throw new HttpException({ error: result.error }, result.status);
    return { success: true };
  }

  /**
   * Original receipt/invoice bytes — only for items the owner explicitly
   * shared, only while the tab is live. Streaming mirrors the shared
   * place-photo proxy; the resolveFilePath guard pins reads to uploads/.
   */
  @Get(':token/items/:itemId/receipt')
  receipt(@Param('token') token: string, @Param('itemId') itemId: string, @Req() req: Request, @Res() res: Response): void {
    this.limit('tab_receipt', req, 120);
    const file = this.tabs.getPublicReceiptFile(token, itemId);
    if (!file) {
      res.status(404).json({ error: 'Receipt not found' });
      return;
    }
    const { resolved, safe } = resolveFilePath(file.filename);
    if (!safe || !existsSync(resolved)) {
      res.status(404).json({ error: 'Receipt not found' });
      return;
    }
    const inline = INLINE_MIMES.test(file.mime_type || '');
    const name = (file.original_name || path.basename(resolved)).replace(/[\r\n"]/g, '');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.type(inline ? (file.mime_type as string) : 'application/octet-stream');
    res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="${name}"`);
    const stream = createReadStream(resolved);
    stream.on('error', () => {
      if (!res.headersSent) res.status(404).json({ error: 'Receipt not found' });
    });
    stream.pipe(res);
  }
}
