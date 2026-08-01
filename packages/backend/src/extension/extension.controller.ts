import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';

@Controller('extension')
export class ExtensionController {
  /**
   * Firefox auto-update manifest.
   * Public endpoint — Firefox checks this periodically to find new versions.
   * Returns the update manifest in Mozilla's expected format.
   */
  @Get('firefox/updates')
  getFirefoxUpdates(@Res() res: Response) {
    const ADDON_ID = process.env.FIREFOX_ADDON_ID || 'onefend@onefend.com';
    const CURRENT_VERSION = process.env.EXTENSION_VERSION || '1.0.5';
    const XPI_URL = process.env.FIREFOX_XPI_URL || '';

    const updateManifest = {
      addons: {
        [ADDON_ID]: {
          updates: [
            {
              version: CURRENT_VERSION,
              update_link: XPI_URL,
            },
          ],
        },
      },
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache 1 hour
    return res.json(updateManifest);
  }
}
