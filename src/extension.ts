import * as vscode from "vscode";
import axios from "axios";
import * as AdmZip from "adm-zip";
import * as fs from "fs";
import { join } from "path";

async function collectInput() {
  // Project name
  const projectName = await vscode.window.showInputBox({
    prompt: "Project Name",
  }) || "app";

  
  // Framework
  const framework = await vscode.window.showQuickPick(["Flow", "Hilla"], {
    placeHolder: "Select a Framework",
  });

  // Frontend (only if Framework = Hilla)
  let frontend;
  if (framework === "Hilla") {
    frontend = await vscode.window.showQuickPick(["React", "Lit"], {
      placeHolder: "Select a Frontend",
    });
  }

  // Example views
  const exampleViews =
    (await vscode.window.showQuickPick(["Yes", "No"], {
      placeHolder: "Add example views?",
    })) === "Yes";

  // Authentication
  const authentication =
    (await vscode.window.showQuickPick(["Yes", "No"], {
      placeHolder: "Add authentication?",
    })) === "Yes";

  // Version
  const version = await vscode.window.showQuickPick(["Latest", "Prerelease"], {
    placeHolder: "Select a Version",
  });

  // Project location
  const locationUri = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    title: "Select the folder to create the project in",
    openLabel: "Create here"
  });
  const location = locationUri ? locationUri[0].fsPath : undefined;

  return {
    projectName,
    location,
    framework,
    frontend,
    exampleViews,
    authentication,
    version,
  };
}

async function downloadAndExtractZip({
  projectName,
  location,
  framework,
  frontend,
  exampleViews,
  authentication,
  version,
}: any) {
  let preset;
  if (framework === "Flow") {
    preset = exampleViews ? "default" : "empty";
  } else if (framework === "Hilla") {
    if (frontend === "Lit") {
      preset = exampleViews ? "hilla" : "hilla-empty";
    } else if (frontend === "React") {
      preset = exampleViews ? "react" : "react-empty";
    }
  }

  if (authentication) {
    preset += "&preset=partial-auth";
  }
  if (version === "Prerelease") {
    preset += "&preset=partial-prerelease";
  }

  const url = `https://start.vaadin.com/dl?preset=${preset}&projectName=${projectName}`;

  const response = await axios.get(url, { responseType: "arraybuffer" });
  const zipBuffer = Buffer.from(response.data, "binary");

  const zip = new AdmZip(zipBuffer);
  zip.extractAllTo(location, /*overwrite*/ true);

  // Open the newly created project folder in a new VS Code window
  const projectPath = join(
    location,
    projectName.replace(/\s/g, "-").toLowerCase()
  );
  const uri = vscode.Uri.file(projectPath);
  vscode.commands.executeCommand("vscode.openFolder", uri, true);
}

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    "extension.luoja",
    async () => {
      const input = await collectInput();

      if (input) {
        await downloadAndExtractZip(input);
        vscode.window.showInformationMessage("Project created successfully!");
      } else {
        vscode.window.showErrorMessage(
          "Project creation cancelled or an error occurred."
        );
      }
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}
