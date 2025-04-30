import * as fs from "fs/promises";
import * as path from "path";

class ConfigReader {
    private static envFilePath = path.resolve(__dirname, "../../data/Configs/.env");

    // Read a variable from the .env file
    static async getEnvVariable(key: string): Promise<string | undefined> {
        try {
            const envContent = await fs.readFile(this.envFilePath, "utf8");
            const line = envContent.split("\n").find(line => line.startsWith(`${key}=`));
            return line ? line.split("=")[1].trim() : undefined;
        } catch (error) {
            console.error(`Error reading .env file at ${this.envFilePath}:`, error);
            return undefined;
        }
    }
}

export default ConfigReader;
