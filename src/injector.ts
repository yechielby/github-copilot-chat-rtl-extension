import * as fs from 'fs/promises';
import * as path from 'path';
import { IdeInstallation, RtlStatus } from './types.js';
import { RTL_CSS, RTL_JS, CSS_FILENAME, JS_FILENAME, HTML_LINK_MARKER } from './content.js';

/**
 * Check if a path exists.
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
 * Check if RTL is installed in workbench.html (by checking for the CSS link marker).
 */
export async function isInstalled(installation: IdeInstallation): Promise<boolean> {
    try {
        const content = await fs.readFile(installation.workbenchHtmlPath, 'utf-8');
        return content.includes(HTML_LINK_MARKER);
    } catch {
        return false;
    }
}

/** True when workbench.html has RTL link AND CSS/JS files exist on disk. */
export async function isFullyInstalled(installation: IdeInstallation): Promise<boolean> {
    if (!(await isInstalled(installation))) return false;
    const cssPath = path.join(installation.workbenchDir, CSS_FILENAME);
    const jsPath = path.join(installation.workbenchDir, JS_FILENAME);
    return (await exists(cssPath)) && (await exists(jsPath));
}

/**
 * Get RTL status for all found installations.
 */
export async function getStatus(installations: IdeInstallation[]): Promise<RtlStatus[]> {
    const statuses: RtlStatus[] = [];

    for (const inst of installations) {
        statuses.push({
            installation: inst,
            isInstalled: await isInstalled(inst),
            htmlBackupExists: await exists(inst.workbenchHtmlPath + '.bak'),
            productBackupExists: await exists(inst.productJsonPath + '.bak'),
        });
    }

    return statuses;
}

/**
 * Remove the checksum entry for workbench.html from product.json.
 */
async function removeChecksum(installation: IdeInstallation, messages: string[]): Promise<void> {
    try {
        const content = await fs.readFile(installation.productJsonPath, 'utf-8');
        const product = JSON.parse(content);

        if (product.checksums && product.checksums[installation.checksumKey]) {
            // Create backup first
            const backupPath = installation.productJsonPath + '.bak';
            if (!(await exists(backupPath))) {
                await fs.copyFile(installation.productJsonPath, backupPath);
                messages.push(`  product.json: Backup created`);
            }

            delete product.checksums[installation.checksumKey];
            await fs.writeFile(installation.productJsonPath, JSON.stringify(product, null, '\t'), 'utf-8');
            messages.push(`  product.json: Removed checksum for workbench.html`);
        } else {
            messages.push(`  product.json: Checksum already removed or not found`);
        }
    } catch (e: unknown) {
        const err = e as NodeJS.ErrnoException;
        if (err.code === 'EPERM' || err.code === 'EACCES') {
            messages.push(`  product.json: Permission denied: ${installation.productJsonPath}`);
            messages.push('       Try running with elevated privileges');
        } else {
            messages.push(`  product.json: Error: ${err.message}`);
        }
    }
}

/**
 * Restore product.json from backup.
 */
async function restoreProductJson(installation: IdeInstallation, messages: string[]): Promise<void> {
    const backupPath = installation.productJsonPath + '.bak';
    if (await exists(backupPath)) {
        try {
            await fs.copyFile(backupPath, installation.productJsonPath);
            await fs.unlink(backupPath);
            messages.push(`  product.json: Restored from backup`);
        } catch (e: unknown) {
            messages.push(`  product.json: Restore failed: ${(e as Error).message}`);
        }
    }
}

/**
 * Add RTL support to a single IDE installation.
 * Returns status messages and whether changes were made.
 */
export async function addRtl(installation: IdeInstallation): Promise<{ messages: string[]; changed: boolean }> {
    const messages: string[] = [];
    let changed = false;

    // Check if already installed
    if (await isInstalled(installation)) {
        messages.push(`  RTL already installed in ${installation.ideName}`);
        return { messages, changed };
    }

    try {
        // 1. Create backup of workbench.html
        const htmlBackupPath = installation.workbenchHtmlPath + '.bak';
        if (!(await exists(htmlBackupPath))) {
            await fs.copyFile(installation.workbenchHtmlPath, htmlBackupPath);
            messages.push(`  workbench.html: Backup created`);
        }

        // 2. Write CSS file to workbench directory
        const cssPath = path.join(installation.workbenchDir, CSS_FILENAME);
        await fs.writeFile(cssPath, RTL_CSS, 'utf-8');
        messages.push(`  CSS: Written to ${cssPath}`);

        // 3. Write JS file to workbench directory
        const jsPath = path.join(installation.workbenchDir, JS_FILENAME);
        await fs.writeFile(jsPath, RTL_JS, 'utf-8');
        messages.push(`  JS: Written to ${jsPath}`);

        // 4. Modify workbench.html to add <link> and <script> tags
        let html = await fs.readFile(installation.workbenchHtmlPath, 'utf-8');

        // Insert CSS link after existing workbench CSS link
        const cssLinkPattern = /<link[^>]*workbench\.desktop\.main\.css[^>]*>/;
        const cssLinkMatch = html.match(cssLinkPattern);

        if (cssLinkMatch) {
            const insertPos = cssLinkMatch.index! + cssLinkMatch[0].length;
            const cssLink = `\n\t<!-- Copilot Chat RTL Support -->\n\t<link rel="stylesheet" href="../../../workbench/${CSS_FILENAME}">`;
            html = html.substring(0, insertPos) + cssLink + html.substring(insertPos);
        } else {
            // Fallback: insert before </head>
            const headClose = html.indexOf('</head>');
            if (headClose !== -1) {
                const cssLink = `\t<!-- Copilot Chat RTL Support -->\n\t<link rel="stylesheet" href="../../../workbench/${CSS_FILENAME}">\n`;
                html = html.substring(0, headClose) + cssLink + html.substring(headClose);
            }
        }

        // Insert script before </html>
        const htmlClose = html.lastIndexOf('</html>');
        if (htmlClose !== -1) {
            const scriptTag = `\t<!-- Copilot Chat RTL Support -->\n\t<script src="../../../workbench/${JS_FILENAME}"></script>\n`;
            html = html.substring(0, htmlClose) + scriptTag + html.substring(htmlClose);
        }

        await fs.writeFile(installation.workbenchHtmlPath, html, 'utf-8');
        messages.push(`  workbench.html: RTL tags injected`);
        changed = true;

        // 5. Remove checksum from product.json
        await removeChecksum(installation, messages);

    } catch (e: unknown) {
        const err = e as NodeJS.ErrnoException;
        if (err.code === 'EPERM' || err.code === 'EACCES') {
            messages.push(`  Permission denied: ${installation.workbenchHtmlPath}`);
            messages.push('  Try running with elevated privileges (Run as Administrator)');
        } else {
            messages.push(`  Error: ${err.message}`);
        }
    }

    return { messages, changed };
}

/**
 * Remove RTL support from a single IDE installation.
 * Returns status messages and whether changes were made.
 */
export async function removeRtl(installation: IdeInstallation): Promise<{ messages: string[]; changed: boolean }> {
    const messages: string[] = [];
    let changed = false;

    if (!(await isInstalled(installation))) {
        messages.push(`  RTL not installed in ${installation.ideName}`);
        return { messages, changed };
    }

    // 1. Restore workbench.html from backup
    const htmlBackupPath = installation.workbenchHtmlPath + '.bak';
    let htmlRestored = false;

    if (await exists(htmlBackupPath)) {
        try {
            await fs.copyFile(htmlBackupPath, installation.workbenchHtmlPath);
            await fs.unlink(htmlBackupPath);
            messages.push(`  workbench.html: Restored from backup`);
            htmlRestored = true;
            changed = true;
        } catch (e: unknown) {
            messages.push(`  workbench.html: Backup restore failed: ${(e as Error).message}, trying manual removal...`);
        }
    }

    if (!htmlRestored) {
        // Manually remove injected lines
        try {
            let html = await fs.readFile(installation.workbenchHtmlPath, 'utf-8');

            // Remove CSS link block
            html = html.replace(/\n?\t?<!-- Copilot Chat RTL Support -->\n\t<link[^>]*copilot-chat-rtl\.css[^>]*>/g, '');

            // Remove script block
            html = html.replace(/\n?\t?<!-- Copilot Chat RTL Support -->\n\t<script[^>]*copilot-chat-rtl\.js[^>]*><\/script>\n?/g, '');

            await fs.writeFile(installation.workbenchHtmlPath, html, 'utf-8');
            messages.push(`  workbench.html: RTL tags removed manually`);
            changed = true;
        } catch (e: unknown) {
            messages.push(`  workbench.html: Error removing RTL: ${(e as Error).message}`);
        }
    }

    // 2. Restore product.json from backup
    await restoreProductJson(installation, messages);

    // 3. Delete CSS and JS files
    const cssPath = path.join(installation.workbenchDir, CSS_FILENAME);
    const jsPath = path.join(installation.workbenchDir, JS_FILENAME);

    for (const filePath of [cssPath, jsPath]) {
        if (await exists(filePath)) {
            try {
                await fs.unlink(filePath);
                messages.push(`  Deleted: ${path.basename(filePath)}`);
            } catch (e: unknown) {
                messages.push(`  Error deleting ${path.basename(filePath)}: ${(e as Error).message}`);
            }
        }
    }

    return { messages, changed };
}

/**
 * Re-write CSS/JS assets on disk without touching workbench.html.
 * Useful after IDE update overwrote the asset files.
 */
export async function reinjectAssets(
    installation: IdeInstallation,
): Promise<{ messages: string[]; changed: boolean }> {
    const messages: string[] = [];
    if (!(await isInstalled(installation))) {
        return { messages, changed: false };
    }

    try {
        const cssPath = path.join(installation.workbenchDir, CSS_FILENAME);
        const jsPath = path.join(installation.workbenchDir, JS_FILENAME);
        await fs.writeFile(cssPath, RTL_CSS, 'utf-8');
        await fs.writeFile(jsPath, RTL_JS, 'utf-8');
        messages.push(`  CSS/JS: Re-written to ${installation.workbenchDir}`);
        return { messages, changed: true };
    } catch (e: unknown) {
        messages.push(`  Reinject failed: ${(e as Error).message}`);
        return { messages, changed: false };
    }
}
