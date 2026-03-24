import * as vscode from 'vscode';
import { findIdeInstallations } from './finder.js';
import { getStatus } from './injector.js';

let statusBarItem: vscode.StatusBarItem;

export function createStatusBarItem(): vscode.StatusBarItem {
    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        99, // Priority 99 (Claude RTL uses 100, so this appears next to it)
    );
    statusBarItem.command = 'copilot-rtl.toggle';
    statusBarItem.show();
    return statusBarItem;
}

export async function updateStatusBar(): Promise<void> {
    if (!statusBarItem) return;

    const installations = await findIdeInstallations();

    if (installations.length === 0) {
        statusBarItem.text = '$(globe) Copilot RTL: N/A';
        statusBarItem.tooltip = 'No IDE installations found';
        return;
    }

    const statuses = await getStatus(installations);
    const anyInstalled = statuses.some(s => s.isInstalled);

    if (anyInstalled) {
        statusBarItem.text = '$(globe) Copilot RTL: On';
        statusBarItem.tooltip = 'Copilot Chat RTL is active. Click to toggle.';
    } else {
        statusBarItem.text = '$(globe) Copilot RTL: Off';
        statusBarItem.tooltip = 'Copilot Chat RTL is inactive. Click to toggle.';
    }
}

export function disposeStatusBar(): void {
    statusBarItem?.dispose();
}
