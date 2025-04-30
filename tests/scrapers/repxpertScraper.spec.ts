import { test } from '@playwright/test';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getTextContent, getMultipleTexts } from '../utils/extractHelpers';
import { addToRetryList } from '../utils/extractHelpers';
import ConfigReader from '../utils/ConfigReader';
import { Product } from '../../types/Product';
import { Dimensions } from '../../types/Dimensions';

// Constants
const oePath = path.resolve(__dirname, '../../data/Configs/oe-references.json');
const retryFilePath = path.resolve(__dirname, '../../data/willBefixed/reTry.json');

// Helper function to check if a file exists
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Helper function to create a directory if it doesn't exist
async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    console.error(`Error creating directory at ${dirPath}:`, error);
  }
}

// Load OE numbers
let oeNumbers: string[] = [];
try {
  const oeContent = await fs.readFile(oePath, 'utf-8');
  oeNumbers = JSON.parse(oeContent);
} catch (error) {
  console.error(`Error reading OE numbers from ${oePath}:`, error);
}

// Load or initialize retry list
let retryList: string[] = [];
if (await fileExists(retryFilePath)) {
  try {
    const retryContent = await fs.readFile(retryFilePath, 'utf-8');
    retryList = JSON.parse(retryContent);
  } catch (error) {
    console.error(`Error reading retry list from ${retryFilePath}:`, error);
  }
} else {
  await ensureDirectoryExists(path.dirname(retryFilePath));
}

test.describe('REPXPERT TRW Products', () => {
  for (const oe of oeNumbers) {
    test(`Fetch TRW products for OE No: ${oe}`, async ({ page }) => {
      try {
        const filterBrand = ConfigReader.getEnvVariable('FILTER_BRAND') || 'TRW';

        await page.goto(ConfigReader.getEnvVariable('REPXPERT_URL') || '');
        await page.getByRole('textbox', { name: /OE numarası/i }).fill(oe);
        await page.getByRole('textbox', { name: /OE numarası/i }).press('Enter');

        await page.getByRole('combobox', { name: /Markalar/i }).fill(filterBrand.toLowerCase() || '');
        await page.getByRole('checkbox', { name: new RegExp(filterBrand, 'i') }).first().click();
        await page.waitForTimeout(2000);

        const productLinks = await page.getByRole('link', { name: new RegExp(filterBrand, 'i') }).all();

        if (productLinks.length === 0) {
          console.warn(`⚠️ No ${filterBrand} product found for '${oe}'.`);
          if (!retryList.includes(oe)) {
            await addToRetryList(oe);
          }
          return;
        }

        for (let i = 0; i < productLinks.length; i++) {
          console.log(`🔍 Processing product ${i + 1} for ${oe}...`);
          if (i > 0) {
            await page.goBack();
            await page.waitForLoadState('domcontentloaded');
            await page.waitForSelector(`text=${filterBrand}`);
          }

          await Promise.all([
            page.waitForLoadState('domcontentloaded'),
            page.waitForSelector('.h1'),
            productLinks[i].click(),
          ]);

          const productTitle = (await getTextContent(page.locator('.h1').nth(0))) || 'Unknown Product';
          const productId = productTitle.split(' ')[1] || `${filterBrand}_${i}`;
          const productName = (await getTextContent(page.locator('.article-number>div'))) || 'Unknown Name';
          const eanNumber = await getTextContent(page.locator('.ean-value'));
          const wvaNumbers = await getMultipleTexts(page.locator('.tradeNumbers-value > span'));
          const oeNumbers = await getMultipleTexts(page.locator('.mat-mdc-list-item-unscoped-content'));

          const dimensions: Dimensions = {
            manufacturerRestriction: await getTextContent(page.locator("(//*[.='Üretici kısıtlaması']/following-sibling::dd)[1]/span")),
            width: (await getTextContent(page.locator("(//*[contains(text(), 'Genişlik')]/following-sibling::dd)[1]/span"))).length > 0
              ? await getTextContent(page.locator("(//*[contains(text(), 'Genişlik')]/following-sibling::dd)[1]/span"))
              : await getTextContent(page.locator("(//*[contains(text(), 'Uzunluk')]/following-sibling::dd)[1]")),
            height: await getTextContent(page.locator("(//*[contains(text(), 'Yükseklik')]/following-sibling::dd)[1]/span")),
            thickness: await getTextContent(page.locator("(//*[contains(text(), 'Kalınlık')]/following-sibling::dd)[1]/span")),
            checkmark: await getTextContent(page.locator("(//*[.='Kontrol işareti']/following-sibling::dd)[1]/span")),
            SVHC: await getTextContent(page.locator("(//*[.='SVHC']/following-sibling::dd)[1]/span")),
          };

          const product: Product = {
            reference_OE: oe,
            id: productId,
            name: productName,
            brand: productTitle.split(' ')[0],
            wvaNumbers: wvaNumbers,
            oeNumbers,
            eanNumber,
            dimensions,
          };

          const brandFolderPath = path.join('data', product.brand || 'UnknownBrand');
          await ensureDirectoryExists(brandFolderPath);

          const oeFolderPath = path.join(brandFolderPath, oe);
          await ensureDirectoryExists(oeFolderPath);

          const fileName = `${product.brand}_${productId}.json`;
          const filePath = path.join(oeFolderPath, fileName);

          await fs.writeFile(filePath, JSON.stringify(product, null, 2), 'utf-8');
          console.log(`✅ Saved ${fileName} for ${oe}.`);
        }
      } catch (err) {
        console.error(`❌ Error for ${oe}:`, err);
        await addToRetryList(oe);
      }
    });
  }
});
