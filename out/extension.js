"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const resolver_1 = require("./resolver");
const indexer_1 = require("./indexer");
const completion_1 = require("./providers/completion");
const hover_1 = require("./providers/hover");
const localization_1 = require("./localization");
let resolver;
/**
 * Загружает русский словарь.
 */
function loadRussianDescriptions(extensionPath) {
    const russianPath = path.join(extensionPath, "data", "extjs-ru.json");
    console.log(`[ExtJS] Loading Russian descriptions: ${russianPath}`);
    (0, localization_1.loadRussianIndex)(russianPath);
}
/**
 * Возвращает путь к ExtJS.
 */
function getExtJSPath() {
    const configuration = vscode.workspace.getConfiguration("extjsIntellisense");
    const configuredPath = configuration.get("extjsPath");
    if (configuredPath &&
        configuredPath.trim()) {
        return path.resolve(configuredPath);
    }
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders &&
        workspaceFolders.length > 0) {
        const candidate = path.join(workspaceFolders[0].uri.fsPath, "ext4");
        if (fs.existsSync(candidate)) {
            console.log(`[ExtJS] Auto detected ExtJS path: ${candidate}`);
            return candidate;
        }
    }
    return undefined;
}
/**
 * Строит индекс ExtJS.
 */
async function ensureIndex(extjsPath) {
    const indexDirectory = path.join(extjsPath, ".extjs");
    const indexPath = path.join(indexDirectory, "classes.json");
    if (fs.existsSync(indexPath)) {
        return indexPath;
    }
    console.log(`[ExtJS] Index not found: ${indexPath}`);
    console.log(`[ExtJS] Building index from: ${extjsPath}`);
    try {
        fs.mkdirSync(indexDirectory, {
            recursive: true
        });
        const result = await (0, indexer_1.buildIndex)(extjsPath);
        if (result) {
            fs.writeFileSync(indexPath, JSON.stringify(result, null, 2), "utf8");
        }
        if (!fs.existsSync(indexPath)) {
            console.error(`[ExtJS] Index was not created: ${indexPath}`);
            return undefined;
        }
        console.log(`[ExtJS] Index built: ${indexPath}`);
        return indexPath;
    }
    catch (error) {
        console.error("[ExtJS] Failed to build index:", error);
        return undefined;
    }
}
/**
 * Загружает classes.json.
 */
async function loadExtJSIndex(extjsPath) {
    const indexPath = await ensureIndex(extjsPath);
    if (!indexPath) {
        return false;
    }
    console.log(`[ExtJS] Loading index: ${indexPath}`);
    try {
        const content = fs.readFileSync(indexPath, "utf8");
        const index = JSON.parse(content);
        if (!index.classes) {
            console.error("[ExtJS] Invalid classes.json: missing classes");
            return false;
        }
        resolver =
            new resolver_1.ExtJSResolver(index);
        const classCount = Object.keys(index.classes).length;
        console.log(`[ExtJS] Loaded ${classCount} classes`);
        (0, completion_1.setCompletionResolver)(resolver);
        (0, hover_1.setHoverResolver)(resolver);
        return true;
    }
    catch (error) {
        console.error("[ExtJS] Failed to load index:", error);
        resolver =
            undefined;
        (0, completion_1.setCompletionResolver)(undefined);
        (0, hover_1.setHoverResolver)(undefined);
        return false;
    }
}
/**
 * Перезагружает ExtJS index.
 */
async function reloadExtJS(extjsPath) {
    return loadExtJSIndex(extjsPath);
}
/**
 * Полностью пересоздаёт index.
 */
async function rebuildExtJSIndex(extjsPath) {
    const indexDirectory = path.join(extjsPath, ".extjs");
    const indexPath = path.join(indexDirectory, "classes.json");
    console.log(`[ExtJS] Rebuilding index from: ${extjsPath}`);
    try {
        fs.mkdirSync(indexDirectory, {
            recursive: true
        });
        console.log("[ExtJS] Building index...");
        const index = await (0, indexer_1.buildIndex)(extjsPath);
        console.log(`[ExtJS] Built ${Object.keys(index.classes).length} classes`);
        fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), "utf8");
        console.log(`[ExtJS] Index saved: ${indexPath}`);
        resolver =
            new resolver_1.ExtJSResolver(index);
        (0, completion_1.setCompletionResolver)(resolver);
        (0, hover_1.setHoverResolver)(resolver);
        console.log(`[ExtJS] Rebuild completed: ${Object.keys(index.classes).length} classes`);
        return true;
    }
    catch (error) {
        console.error("[ExtJS] Rebuild failed:", error);
        return false;
    }
}
/**
 * activate().
 */
async function activate(context) {
    console.log("[ExtJS] Extension activated");
    loadRussianDescriptions(context.extensionPath);
    const extjsPath = getExtJSPath();
    if (!extjsPath) {
        vscode.window.showWarningMessage("ExtJS: Please configure extjsIntellisense.extjsPath.");
    }
    else {
        await loadExtJSIndex(extjsPath);
    }
    const completionModule = require("./providers/completion");
    const completionProvider = vscode.languages.registerCompletionItemProvider([
        { language: "javascript" },
        { language: "javascriptreact" },
        { language: "typescript" },
        { language: "typescriptreact" }
    ], completionModule.createCompletionProvider(), ".", '"', "'");
    context.subscriptions.push(completionProvider);
    console.log("[ExtJS] Completion provider registered");
    const hoverProvider = vscode.languages.registerHoverProvider([
        { language: "javascript" },
        { language: "javascriptreact" },
        { language: "typescript" },
        { language: "typescriptreact" }
    ], new hover_1.ExtJSHoverProvider());
    context.subscriptions.push(hoverProvider);
    console.log("[ExtJS] Hover provider registered");
    const reloadCommand = vscode.commands.registerCommand("extjsIntellisense.reload", async () => {
        const currentPath = getExtJSPath();
        if (!currentPath) {
            vscode.window.showWarningMessage("ExtJS: Please configure extjsIntellisense.extjsPath.");
            return;
        }
        const success = await reloadExtJS(currentPath);
        if (success) {
            vscode.window.showInformationMessage("ExtJS IntelliSense: индекс загружен.");
        }
        else {
            vscode.window.showErrorMessage("ExtJS IntelliSense: не удалось загрузить индекс.");
        }
    });
    context.subscriptions.push(reloadCommand);
    console.log("[ExtJS] Reload command registered");
    const rebuildCommand = vscode.commands.registerCommand("extjsIntellisense.rebuildIndex", async () => {
        console.log("[ExtJS] REBUILD COMMAND CALLED");
        const currentPath = getExtJSPath();
        if (!currentPath) {
            vscode.window.showWarningMessage("ExtJS: Please configure extjsIntellisense.extjsPath.");
            return;
        }
        try {
            const success = await rebuildExtJSIndex(currentPath);
            if (success) {
                vscode.window.showInformationMessage("ExtJS IntelliSense: индекс пересоздан.");
            }
            else {
                vscode.window.showErrorMessage("ExtJS IntelliSense: не удалось пересоздать индекс.");
            }
        }
        catch (error) {
            console.error("[ExtJS] Rebuild failed:", error);
            vscode.window.showErrorMessage("ExtJS IntelliSense: ошибка перестроения индекса.");
        }
    });
    context.subscriptions.push(rebuildCommand);
    console.log("[ExtJS] Rebuild command registered");
}
/**
 * deactivate().
 */
function deactivate() {
    resolver =
        undefined;
    (0, completion_1.setCompletionResolver)(undefined);
    (0, hover_1.setHoverResolver)(undefined);
}
//# sourceMappingURL=extension.js.map