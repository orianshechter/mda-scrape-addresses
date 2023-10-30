import { ScraperService } from './modules/scraper/scraper.service';
import * as dotenv from 'dotenv';

dotenv.config();
const scraperService = new ScraperService(30);
scraperService.start().then();