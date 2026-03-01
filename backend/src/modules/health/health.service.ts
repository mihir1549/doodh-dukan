import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class HealthService {
    private readonly logger = new Logger(HealthService.name);

    /**
     * Keep-Alive Ping
     * Runs every 10 minutes to prevent Render Free Tier from spinning down (15 min idle timeout).
     * 
     * Note on Render Limits:
     * 1 month = 744 hours. Render Free Tier allows 750 hours.
     * If this is your ONLY free service, it will stay under the limit.
     */
    @Cron(CronExpression.EVERY_10_MINUTES)
    async handleCron() {
        const appUrl = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL || `http://localhost:${process.env.PORT || 4000}`;

        // Skip pinging localhost in production-like environments if external URL is missing
        if (appUrl.includes('localhost') && process.env.NODE_ENV === 'production') {
            this.logger.warn('Keep-alive ping skipped: RENDER_EXTERNAL_URL or APP_URL not set in production.');
            return;
        }

        try {
            this.logger.log(`Sending keep-alive ping to: ${appUrl}/health`);
            const response = await fetch(`${appUrl}/health`);
            if (response.ok) {
                this.logger.log('Keep-alive ping successful');
            } else {
                this.logger.warn(`Keep-alive ping failed with status: ${response.status}`);
            }
        } catch (error) {
            this.logger.error(`Error during keep-alive ping: ${error.message}`);
        }
    }
}
