import * as cheerio from 'cheerio';

export const parseGoogleSheets = (html: string) => {
  const $ = cheerio.load(html);
};