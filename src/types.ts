/** RTL injection mode */
export type RtlMode = 'inactive' | 'active';

/** Represents a discovered IDE installation with workbench files */
export interface IdeInstallation {
    /** IDE name: "VS Code" | "Cursor" | "Antigravity" */
    ideName: string;
    /** Full path to workbench.html */
    workbenchHtmlPath: string;
    /** Directory containing workbench CSS (out/vs/workbench/) */
    workbenchDir: string;
    /** Full path to product.json */
    productJsonPath: string;
    /** Checksum key for workbench.html in product.json */
    checksumKey: string;
}

/** RTL installation status for a single IDE */
export interface RtlStatus {
    installation: IdeInstallation;
    /** Whether RTL CSS/JS are injected into workbench.html */
    isInstalled: boolean;
    /** Whether workbench.html.bak exists */
    htmlBackupExists: boolean;
    /** Whether product.json.bak exists */
    productBackupExists: boolean;
}
