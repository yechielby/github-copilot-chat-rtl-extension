import * as path from 'path';
import * as fs from 'fs/promises';
import * as vscode from 'vscode';
import { IdeInstallation } from './types.js';

/**
 * IDE configuration: name, install directory patterns, workbench subdirectory, checksum key.
 */
interface IdeConfig {
    name: string;
    /** Possible base directories (platform-specific) */
    baseDirs: string[];
    /** Subdirectories under electron-browser or electron-sandbox for workbench.html */
    electronDirs: string[];
    /** Checksum keys per electron dir type */
    checksumKeys: Record<string, string>;
}

/**
 * Check if a path exists (file or directory).
 */
async function exists(p: string): Promise<boolean> {
    try {
        await fs.access(p);
        return true;
    } catch {
        return false;
    }
}

/**
 * Detect which IDE is currently running.
 */
function detectIde(): 'VS Code' | 'Cursor' | 'Antigravity' {
    const appName = vscode.env.appName.toLowerCase();
    if (appName.includes('antigravity')) return 'Antigravity';
    if (appName.includes('cursor')) return 'Cursor';
    return 'VS Code';
}

/**
 * Get IDE configurations for the current platform.
 * Only returns the config for the currently running IDE.
 */
function getIdeConfigs(): IdeConfig[] {
    const platform = process.platform;
    const currentIde = detectIde();
    const configs: IdeConfig[] = [];

    if (platform === 'win32') {
        const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Local');

        if (currentIde === 'VS Code') {
            configs.push({
                name: 'VS Code',
                baseDirs: [path.join(localAppData, 'Programs', 'Microsoft VS Code')],
                electronDirs: ['electron-browser'],
                checksumKeys: {
                    'electron-browser': 'vs/code/electron-browser/workbench/workbench.html',
                },
            });
        }

        if (currentIde === 'Cursor') {
            configs.push({
                name: 'Cursor',
                baseDirs: [path.join(localAppData, 'Programs', 'cursor')],
                electronDirs: ['electron-sandbox', 'electron-browser'],
                checksumKeys: {
                    'electron-sandbox': 'vs/code/electron-sandbox/workbench/workbench.html',
                    'electron-browser': 'vs/code/electron-browser/workbench/workbench.html',
                },
            });
        }

        if (currentIde === 'Antigravity') {
            configs.push({
                name: 'Antigravity',
                baseDirs: [path.join(localAppData, 'Programs', 'Antigravity')],
                electronDirs: ['electron-browser'],
                checksumKeys: {
                    'electron-browser': 'vs/code/electron-browser/workbench/workbench.html',
                },
            });
        }
    } else if (platform === 'darwin') {
        if (currentIde === 'VS Code') {
            configs.push({
                name: 'VS Code',
                baseDirs: ['/Applications/Visual Studio Code.app/Contents'],
                electronDirs: ['electron-browser', 'electron-sandbox'],
                checksumKeys: {
                    'electron-browser': 'vs/code/electron-browser/workbench/workbench.html',
                    'electron-sandbox': 'vs/code/electron-sandbox/workbench/workbench.html',
                },
            });
        }

        if (currentIde === 'Cursor') {
            configs.push({
                name: 'Cursor',
                baseDirs: ['/Applications/Cursor.app/Contents'],
                electronDirs: ['electron-sandbox', 'electron-browser'],
                checksumKeys: {
                    'electron-sandbox': 'vs/code/electron-sandbox/workbench/workbench.html',
                    'electron-browser': 'vs/code/electron-browser/workbench/workbench.html',
                },
            });
        }
    } else {
        // Linux
        if (currentIde === 'VS Code') {
            configs.push({
                name: 'VS Code',
                baseDirs: [
                    '/usr/share/code',
                    '/usr/lib/code',
                    '/opt/visual-studio-code',
                    `/snap/code/current/usr/share/code`,
                ],
                electronDirs: ['electron-browser', 'electron-sandbox'],
                checksumKeys: {
                    'electron-browser': 'vs/code/electron-browser/workbench/workbench.html',
                    'electron-sandbox': 'vs/code/electron-sandbox/workbench/workbench.html',
                },
            });
        }

        if (currentIde === 'Cursor') {
            configs.push({
                name: 'Cursor',
                baseDirs: [
                    '/opt/Cursor',
                    '/usr/share/cursor',
                ],
                electronDirs: ['electron-sandbox', 'electron-browser'],
                checksumKeys: {
                    'electron-sandbox': 'vs/code/electron-sandbox/workbench/workbench.html',
                    'electron-browser': 'vs/code/electron-browser/workbench/workbench.html',
                },
            });
        }
    }

    return configs;
}

/**
 * On Windows, VS Code may be installed inside a version hash subdirectory.
 * e.g. "Microsoft VS Code/072586267e/resources/app/"
 * This function finds the actual resources/app path.
 */
async function findResourcesApp(baseDir: string): Promise<string | null> {
    // Direct path: baseDir/resources/app
    const directPath = path.join(baseDir, 'resources', 'app');
    if (await exists(directPath)) {
        return directPath;
    }

    // Check for macOS .app bundle
    const macPath = path.join(baseDir, 'Resources', 'app');
    if (await exists(macPath)) {
        return macPath;
    }

    // Windows: check for hash subdirectory
    try {
        const entries = await fs.readdir(baseDir);
        for (const entry of entries) {
            const subPath = path.join(baseDir, entry, 'resources', 'app');
            if (await exists(subPath)) {
                return subPath;
            }
        }
    } catch { /* not readable */ }

    return null;
}

/**
 * Find all IDE installations that have workbench.html files.
 */
export async function findIdeInstallations(): Promise<IdeInstallation[]> {
    const configs = getIdeConfigs();
    const found: IdeInstallation[] = [];

    for (const config of configs) {
        for (const baseDir of config.baseDirs) {
            if (!(await exists(baseDir))) continue;

            const resourcesApp = await findResourcesApp(baseDir);
            if (!resourcesApp) continue;

            const productJsonPath = path.join(resourcesApp, 'product.json');
            if (!(await exists(productJsonPath))) continue;

            const workbenchDir = path.join(resourcesApp, 'out', 'vs', 'workbench');
            if (!(await exists(workbenchDir))) continue;

            // Find workbench.html in the electron subdirectories
            for (const electronDir of config.electronDirs) {
                const workbenchHtmlPath = path.join(
                    resourcesApp, 'out', 'vs', 'code', electronDir, 'workbench', 'workbench.html'
                );

                if (!(await exists(workbenchHtmlPath))) continue;

                const checksumKey = config.checksumKeys[electronDir];
                if (!checksumKey) continue;

                found.push({
                    ideName: config.name,
                    workbenchHtmlPath,
                    workbenchDir,
                    productJsonPath,
                    checksumKey,
                });

                // Found workbench.html for this IDE, skip other electron dirs
                break;
            }
        }
    }

    return found;
}
