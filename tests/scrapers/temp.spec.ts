import { test } from "@playwright/test";
import ConfigReader from "../utils/ConfigReader";

test("ConfigReader", async ({ page }) => {
  try {
    const result = ConfigReader.getEnvVariable("REPXPERT_EMAIL");
    if (!result) {
      throw new Error("REPXPERT_EMAIL is not defined in the environment variables.");
    }
    console.log("Result:", result);
  } catch (error) {
    console.error("Error in ConfigReader test:", error);
  }
});

test("Repxpert login auth", async ({ page, context }) => {
  try {
    const repxpertUrl = ConfigReader.getEnvVariable("REPXPERT_URL");
    const email = ConfigReader.getEnvVariable("REPXPERT_EMAIL");
    const password = ConfigReader.getEnvVariable("REPXPERT_PASSWORD");

    if (!repxpertUrl || !email || !password) {
      throw new Error("One or more required environment variables (REPXPERT_URL, REPXPERT_EMAIL, REPXPERT_PASSWORD) are not defined.");
    }

    await context.clearCookies();
    await page.goto(repxpertUrl);
    console.log("Navigated to REPXPERT_URL");

    await page.getByRole("button", { name: "Tüm Tanımlama Bilgilerini" }).click();
    console.log("Accepted cookies");

    await page.getByRole("link", { name: "Oturum Aç | Kaydol" }).click();
    console.log("Navigated to login page");

    await page.getByRole("textbox", { name: "E-posta adresi" }).fill(email);
    console.log("Filled email");

    await page.getByRole("textbox", { name: "Şifre" }).fill(password);
    console.log("Filled password");

    await page.getByRole("button", { name: "Oturum Açın" }).click();
    console.log("Clicked login button");

    await page.pause();
  } catch (error) {
    console.error("Error in Repxpert login auth test:", error);
  }
});
