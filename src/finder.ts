import * as path from 'path';
import * as vscode from 'vscode';
import { IdeInstallation } from './types.js';
import { exists } from './utils.js';

/** Electron subdirectories to check for workbench.html, in priority order. */
const ELECTRON_DIRS = ['electron-sandbox', 'electron-browser'] as const;

/**
 * Find the running IDE installation using vscode.env.appRoot.
 * Returns an array with 0 or 1 entries (array for API compatibility).
 */
export async function findIdeInstallations(): Promise<IdeInstallation[]> {
    const resourcesApp = vscode.env.appRoot;

    const productJsonPath = path.join(resourcesApp, 'product.json');
    if (!(await exists(productJsonPath))) return [];

    const workbenchDir = path.join(resourcesApp, 'out', 'vs', 'workbench');
    if (!(await exists(workbenchDir))) return [];

    for (const electronDir of ELECTRON_DIRS) {
        const workbenchHtmlPath = path.join(
            resourcesApp, 'out', 'vs', 'code', electronDir, 'workbench', 'workbench.html'
        );
        if (!(await exists(workbenchHtmlPath))) continue;

        return [{
            ideName: vscode.env.appName,
            workbenchHtmlPath,
            workbenchDir,
            productJsonPath,
            checksumKey: `vs/code/${electronDir}/workbench/workbench.html`,
        }];
    }

    return [];
}
