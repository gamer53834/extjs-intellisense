import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

import {
    ExtJSResolver,
    ExtIndex
} from "./resolver";

import {
    buildIndex
} from "./indexer";

import {
    setCompletionResolver
} from "./providers/completion";

import {
    ExtJSHoverProvider,
    setHoverResolver
} from "./providers/hover";

import {
    loadRussianIndex
} from "./localization";


let resolver: ExtJSResolver | undefined;


/**
 * Загружает русский словарь.
 */
function loadRussianDescriptions(
    extensionPath: string
): void {

    const russianPath =
        path.join(
            extensionPath,
            "data",
            "extjs-ru.json"
        );

    console.log(
        `[ExtJS] Loading Russian descriptions: ${russianPath}`
    );

    loadRussianIndex(
        russianPath
    );
}


/**
 * Возвращает путь к ExtJS.
 */
function getExtJSPath(): string | undefined {

    const configuration =
        vscode.workspace.getConfiguration(
            "extjsIntellisense"
        );

    const configuredPath =
        configuration.get<string>(
            "extjsPath"
        );

    if (
        configuredPath &&
        configuredPath.trim()
    ) {

        return path.resolve(
            configuredPath
        );
    }

    const workspaceFolders =
        vscode.workspace.workspaceFolders;

    if (
        workspaceFolders &&
        workspaceFolders.length > 0
    ) {

        const candidate =
            path.join(
                workspaceFolders[0].uri.fsPath,
                "ext4"
            );

        if (
            fs.existsSync(candidate)
        ) {

            console.log(
                `[ExtJS] Auto detected ExtJS path: ${candidate}`
            );

            return candidate;
        }
    }

    return undefined;
}


/**
 * Строит индекс ExtJS.
 */
async function ensureIndex(
    extjsPath: string
): Promise<string | undefined> {

    const indexDirectory =
        path.join(
            extjsPath,
            ".extjs"
        );

    const indexPath =
        path.join(
            indexDirectory,
            "classes.json"
        );

    if (
        fs.existsSync(indexPath)
    ) {

        return indexPath;
    }

    console.log(
        `[ExtJS] Index not found: ${indexPath}`
    );

    console.log(
        `[ExtJS] Building index from: ${extjsPath}`
    );

    try {

        fs.mkdirSync(
            indexDirectory,
            {
                recursive: true
            }
        );

        const result =
            await buildIndex(
                extjsPath
            );

        if (
            result
        ) {

            fs.writeFileSync(
                indexPath,
                JSON.stringify(
                    result,
                    null,
                    2
                ),
                "utf8"
            );
        }

        if (
            !fs.existsSync(indexPath)
        ) {

            console.error(
                `[ExtJS] Index was not created: ${indexPath}`
            );

            return undefined;
        }

        console.log(
            `[ExtJS] Index built: ${indexPath}`
        );

        return indexPath;

    } catch (error) {

        console.error(
            "[ExtJS] Failed to build index:",
            error
        );

        return undefined;
    }
}


/**
 * Загружает classes.json.
 */
async function loadExtJSIndex(
    extjsPath: string
): Promise<boolean> {

    /*
     * Try to use bundled index first.
     */
    const bundledIndexPath =
        path.join(
            __dirname,
            "..",
            "data",
            "classes.json"
        );

    console.log(
        `[ExtJS] Looking for bundled index at: ${bundledIndexPath}`
    );

    let indexPath: string | undefined;
    let content: string;

    if (
        fs.existsSync(bundledIndexPath)
    ) {

        console.log(
            `[ExtJS] Using bundled index: ${bundledIndexPath}`
        );

        indexPath = bundledIndexPath;
        content = fs.readFileSync(
            bundledIndexPath,
            "utf8"
        );

    } else if (extjsPath) {

        indexPath =
            await ensureIndex(
                extjsPath
            );

        if (!indexPath) {
            return false;
        }

        console.log(
            `[ExtJS] Loading index: ${indexPath}`
        );

        content = fs.readFileSync(
            indexPath,
            "utf8"
        );

    } else {

        console.error(
            "[ExtJS] No index available"
        );

        return false;
    }

    try {

        const index =
            JSON.parse(
                content
            ) as ExtIndex;

        if (!index.classes) {

            console.error(
                "[ExtJS] Invalid classes.json: missing classes"
            );

            return false;
        }

        resolver =
            new ExtJSResolver(
                index
            );

        const classCount =
            Object.keys(
                index.classes
            ).length;

        console.log(
            `[ExtJS] Loaded ${classCount} classes`
        );

        setCompletionResolver(
            resolver as any
        );

        setHoverResolver(
            resolver
        );

        return true;

    } catch (error) {

        console.error(
            "[ExtJS] Failed to load index:",
            error
        );

        resolver =
            undefined;

        setCompletionResolver(
            undefined as any
        );

        setHoverResolver(
            undefined
        );

        return false;
    }
}


/**
 * Перезагружает ExtJS index.
 */
async function reloadExtJS(
    extjsPath: string
): Promise<boolean> {

    return loadExtJSIndex(
        extjsPath
    );
}


/**
 * Полностью пересоздаёт index.
 */
async function rebuildExtJSIndex(
    extjsPath: string
): Promise<boolean> {

    const indexDirectory =
        path.join(
            extjsPath,
            ".extjs"
        );

    const indexPath =
        path.join(
            indexDirectory,
            "classes.json"
        );

    console.log(
        `[ExtJS] Rebuilding index from: ${extjsPath}`
    );

    try {

        fs.mkdirSync(
            indexDirectory,
            {
                recursive: true
            }
        );

        console.log(
            "[ExtJS] Building index..."
        );

        const index =
            await buildIndex(
                extjsPath
            );

        console.log(
            `[ExtJS] Built ${Object.keys(index.classes).length} classes`
        );

        fs.writeFileSync(
            indexPath,
            JSON.stringify(
                index,
                null,
                2
            ),
            "utf8"
        );

        console.log(
            `[ExtJS] Index saved: ${indexPath}`
        );

        resolver =
            new ExtJSResolver(
                index
            );

        setCompletionResolver(
            resolver as any
        );

        setHoverResolver(
            resolver
        );

        console.log(
            `[ExtJS] Rebuild completed: ${Object.keys(index.classes).length} classes`
        );

        return true;

    } catch (error) {

        console.error(
            "[ExtJS] Rebuild failed:",
            error
        );

        return false;
    }
}


/**
 * activate().
 */
export async function activate(
    context: vscode.ExtensionContext
): Promise<void> {

    console.log(
        "[ExtJS] Extension activated"
    );

    loadRussianDescriptions(
        context.extensionPath
    );

    const extjsPath =
        getExtJSPath();

    if (!extjsPath) {

        vscode.window.showWarningMessage(
            "ExtJS: Please configure extjsIntellisense.extjsPath."
        );

    } else {

        await loadExtJSIndex(
            extjsPath
        );
    }

    const completionModule =
        require("./providers/completion");

    const completionProvider =
        vscode.languages.registerCompletionItemProvider(
            [
                { language: "javascript" },
                { language: "javascriptreact" },
                { language: "typescript" },
                { language: "typescriptreact" }
            ],
            completionModule.createCompletionProvider(),
            ".",
            '"',
            "'"
        );

    context.subscriptions.push(
        completionProvider
    );

    console.log(
        "[ExtJS] Completion provider registered"
    );

    const hoverProvider =
        vscode.languages.registerHoverProvider(
            [
                { language: "javascript" },
                { language: "javascriptreact" },
                { language: "typescript" },
                { language: "typescriptreact" }
            ],
            new ExtJSHoverProvider()
        );

    context.subscriptions.push(
        hoverProvider
    );

    console.log(
        "[ExtJS] Hover provider registered"
    );

    const reloadCommand =
        vscode.commands.registerCommand(
            "extjsIntellisense.reload",
            async () => {

                const currentPath =
                    getExtJSPath();

                if (!currentPath) {

                    vscode.window.showWarningMessage(
                        "ExtJS: Please configure extjsIntellisense.extjsPath."
                    );

                    return;
                }

                const success =
                    await reloadExtJS(
                        currentPath
                    );

                if (success) {

                    vscode.window.showInformationMessage(
                        "ExtJS IntelliSense: индекс загружен."
                    );

                } else {

                    vscode.window.showErrorMessage(
                        "ExtJS IntelliSense: не удалось загрузить индекс."
                    );
                }
            }
        );

    context.subscriptions.push(
        reloadCommand
    );

    console.log(
        "[ExtJS] Reload command registered"
    );

    const rebuildCommand =
        vscode.commands.registerCommand(
            "extjsIntellisense.rebuildIndex",
            async () => {

                console.log(
                    "[ExtJS] REBUILD COMMAND CALLED"
                );

                const currentPath =
                    getExtJSPath();

                if (!currentPath) {

                    vscode.window.showWarningMessage(
                        "ExtJS: Please configure extjsIntellisense.extjsPath."
                    );

                    return;
                }

                try {

                    const success =
                        await rebuildExtJSIndex(
                            currentPath
                        );

                    if (success) {

                        vscode.window.showInformationMessage(
                            "ExtJS IntelliSense: индекс пересоздан."
                        );

                    } else {

                        vscode.window.showErrorMessage(
                            "ExtJS IntelliSense: не удалось пересоздать индекс."
                        );
                    }

                } catch (error) {

                    console.error(
                        "[ExtJS] Rebuild failed:",
                        error
                    );

                    vscode.window.showErrorMessage(
                        "ExtJS IntelliSense: ошибка перестроения индекса."
                    );
                }
            }
        );

    context.subscriptions.push(
        rebuildCommand
    );

    console.log(
        "[ExtJS] Rebuild command registered"
    );
}


/**
 * deactivate().
 */
export function deactivate(): void {

    resolver =
        undefined;

    setCompletionResolver(
        undefined as any
    );

    setHoverResolver(
        undefined
    );
}