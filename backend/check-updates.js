import { exec } from "child_process";
import fs from "fs";
import path from "path";
import readline from "readline";

// Create a readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const checkForUpdates = async () => {
    try {
        console.log("Starting update check...");

        // Step 1: Check for package.json
        const packageJsonPath = path.join(process.cwd(), "package.json");
        if (!fs.existsSync(packageJsonPath)) {
            console.error("Error: package.json not found in the current directory.");
            return;
        }

        console.log("package.json found. Checking for updates...");

        // Step 2: Run npm-check-updates to check if updates are available (without -u to avoid modifying package.json)
        exec("npx npm-check-updates", (error, stdout, stderr) => {
            if (error) {
                console.error("Error during npm-check-updates:", error.message);
                return;
            }

            // Step 3: Check if there is any meaningful output
            if (stdout.trim() && !stdout.includes("All dependencies match the latest package versions")) {
                console.log("Updates Found in package.json:\n", stdout);
                askForConfirmation(); // Ask to install if updates were found
            } else {
                console.log("No updates found. package.json is already up to date.");
                rl.close(); // Close the readline interface if no updates were found
            }
        });
    } catch (error) {
        console.error("Unexpected error:", error);
    }
};

// Function to ask user for confirmation to install updates
const askForConfirmation = () => {
    rl.question("Updates found. Do you want to install them? (yes/no): ", (answer) => {
        if (answer.toLowerCase() === "yes") {
            console.log("Installing updated dependencies...");
            // Step 3: Run npm-check-updates with -u flag to update package.json and install dependencies
            exec("npx npm-check-updates -u", (updateError, updateStdout, updateStderr) => {
                if (updateError) {
                    console.error("Error during npm-check-updates (with -u):", updateError.message);
                    rl.close();
                    return;
                }

                console.log("package.json updated successfully:\n", updateStdout);
                
                // Step 4: Install the updated dependencies
                exec("npm install", (installError, installStdout, installStderr) => {
                    if (installError) {
                        console.error("Error during npm install:", installError.message);
                        rl.close();
                        return;
                    }

                    console.log("Dependencies installed successfully:\n", installStdout);
                    console.log("Your project is now up to date!");
                    rl.close();
                });
            });
        } else if (answer.toLowerCase() === "no") {
            console.log("Installation canceled. No changes made.");
            console.log("To update your packages manually, you can run the following commands:");
            console.log("1. Run `npx npm-check-updates -u` to update your package.json with the latest versions.");
            console.log("2. Run `npm install` to install the updates.");
            rl.close();
        } else {
            console.log("Invalid input. Please type 'yes' or 'no'.");
            askForConfirmation(); // Ask again if input is invalid
        }
    });
};

// Run the update checker
checkForUpdates();