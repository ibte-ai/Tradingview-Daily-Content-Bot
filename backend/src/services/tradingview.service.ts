import { captureChart } from '../playwright/capture';
import { loginTradingView } from '../playwright/login';
import { logger } from '../config/logger';

export class TradingViewService {
  /**
   * Run the TradingView login automation script.
   */
  async login(): Promise<void> {
    logger.info('Triggering TradingView signin automation...');
    await loginTradingView();
  }

  /**
   * Run the chart capture automation script.
   */
  async capture(symbol: string): Promise<string> {
    logger.info(`Triggering TradingView chart capture for: ${symbol}`);
    return await captureChart(symbol);
  }
}

export const tradingViewService = new TradingViewService();
export default tradingViewService;
