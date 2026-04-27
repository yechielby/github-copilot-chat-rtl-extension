/**
 * Copilot Chat RTL — modifies IDE installations (VS Code, Cursor, Antigravity)
 * to inject RTL support into the Copilot Chat interface.
 */
import * as vscode from 'vscode';
import { findIdeInstallations } from './finder.js';
import { addRtl, removeRtl, getStatus, reinjectAssets, isFullyInstalled } from './injector.js';
import type { RtlMode } from './types.js';
import { createStatusBarItem, updateStatusBar, disposeStatusBar } from './statusBar.js';

const STATE_MODE_KEY = 'copilotRtl.mode';
const STATE_VERSION_KEY = 'copilotRtl.version';

let outputChannel: vscode.OutputChannel;
let globalState: vscode.Memento;
let currentVersion: string;

function getOutputChannel(): vscode.OutputChannel {
    if (!outputChannel) {
        outputChannel = vscode.window.createOutputChannel('Copilot Chat RTL');
    }
    return outputChannel;
}

async function saveMode(mode: RtlMode): Promise<void> {
    await globalState.update(STATE_MODE_KEY, mode);
}

function getSavedMode(): RtlMode {
    return globalState.get<RtlMode>(STATE_MODE_KEY, 'inactive');
}

/**
 * Workbench HTML/CSS/JS live on disk under the IDE app — the whole IDE must often be restarted,
 * not only the window, for those files to load reliably.
 */
async function showPermissionError(workbenchPath: string): Promise<void> {
    const isMac = vscode.env.appHost === 'desktop' && workbenchPath.includes('.app/');
    if (isMac) {
        const appMatch = workbenchPath.match(/\/[^/]+\.app\//);
        const appPath = appMatch ? workbenchPath.substring(0, appMatch.index! + appMatch[0].length - 1) : '/Applications/Visual Studio Code.app';
        const cmd = `sudo chown -R $(whoami) "${appPath}"`;
        const action = await vscode.window.showErrorMessage(
            'Copilot Chat RTL: Permission denied. This is normal on macOS — a one-time fix is needed.',
            'Copy Fix Command',
        );
        if (action === 'Copy Fix Command') {
            await vscode.env.clipboard.writeText(cmd);
            vscode.window.showInformationMessage('Command copied! Paste it in Terminal, then fully quit and reopen the IDE.');
        }
    } else {
        vscode.window.showErrorMessage(
            'Copilot Chat RTL: Permission DENIED. Try running VS Code as Administrator.',
        );
    }
}

async function promptRestartIfChanged(changed: boolean): Promise<void> {
    if (!changed) return;
    await updateStatusBar();
    const action = await vscode.window.showInformationMessage(
        'Copilot Chat RTL: Changes will take effect after restarting the IDE.',
        'Quit Now',
        'Later',
    );
    if (action === 'Quit Now') {
        await vscode.commands.executeCommand('workbench.action.quit');
    }
}

async function handleAdd(): Promise<void> {
    const installations = await findIdeInstallations();
    if (installations.length === 0) {
        vscode.window.showWarningMessage('Could not locate IDE installation files.');
        return;
    }

    const channel = getOutputChannel();
    channel.clear();
    channel.appendLine('Activating Copilot Chat RTL support...\n');

    let anyChanged = false;
    let anyPermissionError = false;
    for (const inst of installations) {
        channel.appendLine(`[${inst.ideName}]`);
        const result = await addRtl(inst);
        result.messages.forEach(m => channel.appendLine(m));
        channel.appendLine('');
        if (result.changed) anyChanged = true;
        if (result.permissionError) anyPermissionError = true;
    }

    channel.show(true);
    await saveMode('active');

    if (anyPermissionError) {
        showPermissionError(installations[0].workbenchHtmlPath);
    } else {
        await promptRestartIfChanged(anyChanged);
        if (!anyChanged) {
            vscode.window.showInformationMessage('Copilot Chat RTL is already active.');
        }
    }
}

async function handleRemove(): Promise<void> {
    const installations = await findIdeInstallations();
    if (installations.length === 0) {
        vscode.window.showWarningMessage('Could not locate IDE installation files.');
        return;
    }

    const channel = getOutputChannel();
    channel.clear();
    channel.appendLine('Deactivating Copilot Chat RTL support...\n');

    let anyChanged = false;
    for (const inst of installations) {
        channel.appendLine(`[${inst.ideName}]`);
        const result = await removeRtl(inst);
        result.messages.forEach(m => channel.appendLine(m));
        channel.appendLine('');
        if (result.changed) anyChanged = true;
    }

    channel.show(true);
    await saveMode('inactive');
    await promptRestartIfChanged(anyChanged);

    if (!anyChanged) {
        vscode.window.showInformationMessage('Copilot Chat RTL is already inactive.');
    }
}

async function handleStatus(): Promise<void> {
    const installations = await findIdeInstallations();
    if (installations.length === 0) {
        vscode.window.showWarningMessage('Could not locate IDE installation files.');
        return;
    }

    const statuses = await getStatus(installations);
    const channel = getOutputChannel();
    channel.clear();

    const ideName = vscode.env.appName;
    channel.appendLine(`Current IDE: ${ideName}`);
    channel.appendLine(`Saved mode: ${getSavedMode()}`);
    channel.appendLine(`Found ${installations.length} IDE installation(s):\n`);

    for (const s of statuses) {
        channel.appendLine(`  [${s.installation.ideName}]`);
        channel.appendLine(`    RTL:     ${s.isInstalled ? 'INSTALLED' : 'Not installed'}`);
        channel.appendLine(`    Backup:  ${s.htmlBackupExists ? 'workbench.html.bak exists' : 'No backup'}`);
        channel.appendLine(`    Product: ${s.productBackupExists ? 'product.json.bak exists' : 'No backup'}`);
        channel.appendLine(`    Path:    ${s.installation.workbenchHtmlPath}\n`);
    }

    channel.show(true);
    await updateStatusBar();
}

async function handleToggle(): Promise<void> {
    const installations = await findIdeInstallations();
    if (installations.length === 0) {
            vscode.window.showWarningMessage('Could not locate IDE installation files.');
        return;
    }

    const statuses = await getStatus(installations);
    const isOn = statuses.some(s => s.isInstalled);

    if (isOn) {
        const answer = await vscode.window.showInformationMessage(
            'Copilot Chat RTL is active. Do you want to turn it off?',
            'Turn Off',
            'Cancel',
        );
        if (answer === 'Turn Off') {
            await vscode.commands.executeCommand('copilot-rtl.remove');
        }
    } else {
        const answer = await vscode.window.showInformationMessage(
            'Copilot Chat RTL is inactive. Do you want to turn it on?',
            'Turn On',
            'Cancel',
        );
        if (answer === 'Turn On') {
            await vscode.commands.executeCommand('copilot-rtl.add');
        }
    }
}

async function saveVersion(): Promise<void> {
    await globalState.update(STATE_VERSION_KEY, currentVersion);
}

async function silentInject(): Promise<boolean> {
    const installations = await findIdeInstallations();
    let anyChanged = false;
    for (const inst of installations) {
        const result = await addRtl(inst);
        if (result.changed) anyChanged = true;
        if (result.permissionError) showPermissionError(inst.workbenchHtmlPath);
    }
    return anyChanged;
}

async function silentReinjectVersion(): Promise<boolean> {
    const installations = await findIdeInstallations();
    let anyChanged = false;
    for (const inst of installations) {
        const installed = await isFullyInstalled(inst);
        if (!installed) {
            const result = await addRtl(inst);
            if (result.changed) anyChanged = true;
            if (result.permissionError) showPermissionError(inst.workbenchHtmlPath);
        } else {
            const result = await reinjectAssets(inst);
            if (result.changed) anyChanged = true;
            if (result.permissionError) showPermissionError(inst.workbenchHtmlPath);
        }
    }
    return anyChanged;
}

/**
 * Keep RTL injected after IDE updates and refresh assets on extension upgrade.
 */
async function autoReactivate(): Promise<void> {
    const savedVersion = globalState.get<string>(STATE_VERSION_KEY);
    const savedMode = getSavedMode();

    if (!savedVersion) {
        await saveVersion();
        await handleAdd();
        return;
    }

    if (savedMode !== 'active') {
        if (savedVersion !== currentVersion) {
            await saveVersion();
        }
        return;
    }

    if (savedVersion !== currentVersion) {
        await saveVersion();
        await promptRestartIfChanged(await silentReinjectVersion());
        return;
    }

    const installations = await findIdeInstallations();
    if (installations.length === 0) return;

    let needsFull = false;
    for (const inst of installations) {
        if (!(await isFullyInstalled(inst))) {
            needsFull = true;
            break;
        }
    }

    if (needsFull) {
        await promptRestartIfChanged(await silentInject());
    }
}

export function activate(context: vscode.ExtensionContext): void {
    globalState = context.globalState;
    currentVersion = context.extension.packageJSON.version ?? '0.0.0';

    const explained = globalState.get<boolean>('copilotRtl.usageExplained');
    if (!explained) {
        void globalState.update('copilotRtl.usageExplained', true);
        const ch = getOutputChannel();
        ch.appendLine('Copilot Chat RTL — what this does');
        ch.appendLine('This extension patches IDE workbench files on disk (workbench.html + CSS/JS).');
        ch.appendLine('Installing the extension alone does nothing until you run a command.');
        ch.appendLine('');
        ch.appendLine('Steps: Command Palette (Ctrl+Shift+P) → "Copilot Chat RTL: Activate RTL" → then fully quit the IDE and reopen (Reload Window is not always enough).');
        ch.appendLine('Then open Output → "Copilot Chat RTL" if a command fails (e.g. permission denied).');
        ch.appendLine('');
    }

    const statusBar = createStatusBarItem();
    context.subscriptions.push(statusBar);

    context.subscriptions.push(
        vscode.commands.registerCommand('copilot-rtl.add', handleAdd),
        vscode.commands.registerCommand('copilot-rtl.remove', handleRemove),
        vscode.commands.registerCommand('copilot-rtl.status', handleStatus),
        vscode.commands.registerCommand('copilot-rtl.toggle', handleToggle),
    );

    autoReactivate().catch(err => getOutputChannel().appendLine(`Auto-reactivate error: ${err}`));
    updateStatusBar().catch(err => getOutputChannel().appendLine(`Status bar error: ${err}`));
}

export function deactivate(): void {
    disposeStatusBar();
    outputChannel?.dispose();
}
