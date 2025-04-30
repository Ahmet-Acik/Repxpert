import { Locator } from '@playwright/test';
import * as fs from 'fs/promises';
import path from 'path';

export async function getTextContent(locator: Locator): Promise<string> {
  try {
    const count = await locator.count();
    if (count > 0) {
      const text = await locator.first().textContent();
      return text?.trim() || '';
    }
    return ''; // Return empty if the element is not found
  } catch (error) {
    console.error('Error in getTextContent:', error);
    return '';
  }
}

export async function getMultipleTexts(locator: Locator): Promise<string[]> {
  try {
    const elements = await locator.all();
    const texts = await Promise.all(
      elements.map(async (el) => {
        const text = await el.textContent();
        return text?.trim();
      })
    );
    return Array.from(new Set(texts.filter(Boolean) as string[]));
  } catch (error) {
    console.error('Error in getMultipleTexts:', error);
    return [];
  }
}

const retryFilePath = path.resolve(__dirname, '../../data/willBefixed/reTry.json');

// Add OE to the retry list
export async function addToRetryList(oe: string): Promise<void> {
  try {
    let currentList: string[] = [];

    if (await fileExists(retryFilePath)) {
      const fileContent = await fs.readFile(retryFilePath, 'utf-8');
      currentList = JSON.parse(fileContent);
    }

    if (!currentList.includes(oe)) {
      currentList.push(oe);
      await fs.writeFile(retryFilePath, JSON.stringify(currentList, null, 2), 'utf-8');
      console.log(`➕ ${oe} added to the retry list.`);
    }
  } catch (error) {
    console.error('Error in addToRetryList:', error);
  }
}

// Helper function to check if a file exists
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
