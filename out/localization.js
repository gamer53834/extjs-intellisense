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
exports.loadRussianIndex = loadRussianIndex;
exports.getClassDescription = getClassDescription;
exports.getMethodDescription = getMethodDescription;
exports.getPropertyDescription = getPropertyDescription;
const fs = __importStar(require("fs"));
let ruIndex = {};
/**
 * Загружает русский словарь ExtJS.
 */
function loadRussianIndex(filePath) {
    try {
        const content = fs.readFileSync(filePath, "utf8");
        ruIndex =
            JSON.parse(content);
        console.log(`[ExtJS] Loaded Russian descriptions for ${Object.keys(ruIndex).length} classes`);
        return true;
    }
    catch (error) {
        console.error("[ExtJS] Failed to load Russian index:", error);
        ruIndex = {};
        return false;
    }
}
/**
 * Возвращает описание класса.
 */
function getClassDescription(className) {
    return ruIndex[className]?.description;
}
/**
 * Возвращает описание метода.
 */
function getMethodDescription(className, methodName) {
    return ruIndex[className]?.methods?.[methodName];
}
/**
 * Возвращает описание свойства.
 */
function getPropertyDescription(className, propertyName) {
    return ruIndex[className]?.properties?.[propertyName];
}
//# sourceMappingURL=localization.js.map