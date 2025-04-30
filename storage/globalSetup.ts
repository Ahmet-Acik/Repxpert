import { Browser, Page, chromium, expect } from "@playwright/test";
import ConfigReader from "../tests/utils/ConfigReader";

const STORAGE_STATE_PATH = "storage/LoginAuth.json";

async function globalSetup() {
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page: Page = await context.newPage();

    console.log("Navigating to the login page...");
    await page.goto(ConfigReader.getEnvVariable("REPXPERT_URL") || "");
    await page.getByRole("button", { name: "Tüm Tanımlama Bilgilerini" }).click();
    await page.getByRole("link", { name: "Oturum Aç | Kaydol" }).click();

    console.log("Filling in login credentials...");
    await page.getByRole("textbox", { name: "E-posta adresi" })
      .fill(ConfigReader.getEnvVariable("REPXPERT_EMAIL") || "");
    await page.getByRole("textbox", { name: "Şifre" })
      .fill(ConfigReader.getEnvVariable("REPXPERT_PASSWORD") || "");
    await page.getByRole("button", { name: "Oturum Açın" }).click();

    console.log("Verifying login...");
    await expect(page.getByRole("link", { name: ConfigReader.getEnvVariable("NAME") })).toBeVisible({ timeout: 5000 });

    console.log("Saving storage state...");
    await page.context().storageState({ path: STORAGE_STATE_PATH });

    console.log("Global setup completed successfully.");
  } catch (error) {
    console.error("Error during global setup:", error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export default globalSetup;
