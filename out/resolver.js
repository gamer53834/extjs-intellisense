"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtJSResolver = void 0;
const localization_1 = require("./localization");
/**
 * Resolves ExtJS expressions using the generated ExtJS index.
 *
 * Examples:
 *
 *   grid
 *   grid.getStore()
 *   grid.getStore().getAt(0)
 *   grid.getSelectionModel().getSelection()[0]
 *   Ext.grid.Panel
 *   Ext.data.Store
 */
class ExtJSResolver {
    index;
    constructor(index) {
        this.index = index;
    }
    getClass(name) {
        return this.index.classes[name];
    }
    getAllClasses() {
        return Object.values(this.index.classes);
    }
    hasClass(name) {
        return Boolean(this.index.classes[name]);
    }
    isNamespace(name) {
        const prefix = `${name}.`;
        return Object.keys(this.index.classes).some(className => className.startsWith(prefix));
    }
    getClassDescription(className) {
        return (0, localization_1.getClassDescription)(className);
    }
    /**
     * Resolve an arbitrary expression to its ExtJS type.
     *
     * Examples:
     *
     *   grid
     *   grid.getStore()
     *   grid.getStore().getAt(0)
     *   grid.getSelectionModel().getSelection()[0]
     */
    resolveExpression(expression, variables = {}) {
        let value = this.normalizeExpression(expression);
        if (!value) {
            return this.unknown();
        }
        const baseMatch = value.match(/^([A-Za-z_$][\w$]*)/);
        if (!baseMatch) {
            return this.unknown();
        }
        const baseName = baseMatch[1];
        let current = this.resolveBaseToken(baseName, variables);
        if (current.kind === "unknown") {
            return current;
        }
        const rest = value.substring(baseMatch[0].length);
        const tokens = this.tokenize(rest);
        for (const token of tokens) {
            if (token.kind === "index") {
                current =
                    this.resolveIndex(current);
            }
            else if (token.kind === "method") {
                current =
                    this.resolveMethod(current, token.name);
            }
            else {
                current =
                    this.resolveProperty(current, token.name);
            }
            if (current.kind === "unknown") {
                return current;
            }
        }
        return current;
    }
    /**
     * Returns all members of a class including inherited members.
     *
     * Child class members override parent members with the same name.
     */
    getMembers(className) {
        const result = [];
        const seen = new Set();
        const visited = new Set();
        let current = this.index.classes[className];
        while (current &&
            !visited.has(current.name)) {
            visited.add(current.name);
            for (const method of Object.values(current.methods || {})) {
                if (seen.has(method.name)) {
                    continue;
                }
                seen.add(method.name);
                result.push(this.methodToMember(current, method));
            }
            for (const property of Object.values(current.properties || {})) {
                if (seen.has(property.name)) {
                    continue;
                }
                seen.add(property.name);
                result.push(this.propertyToMember(current, property));
            }
            if (!current.extends) {
                break;
            }
            current =
                this.index.classes[current.extends];
        }
        return result;
    }
    /**
     * Find one member in a class or one of its parents.
     */
    findMember(className, memberName) {
        let current = this.index.classes[className];
        const visited = new Set();
        while (current &&
            !visited.has(current.name)) {
            visited.add(current.name);
            const method = current.methods?.[memberName];
            if (method) {
                return this.methodToMember(current, method);
            }
            const property = current.properties?.[memberName];
            if (property) {
                return this.propertyToMember(current, property);
            }
            if (!current.extends) {
                break;
            }
            current =
                this.index.classes[current.extends];
        }
        return undefined;
    }
    /**
     * Returns immediate namespace/class children.
     *
     * Ext.
     * Ext.data.
     * Ext.grid.
     */
    getNamespaceMembers(namespace) {
        const prefix = namespace === "Ext"
            ? "Ext."
            : `${namespace}.`;
        const result = new Set();
        for (const className of Object.keys(this.index.classes)) {
            if (!className.startsWith(prefix)) {
                continue;
            }
            const remainder = className.substring(prefix.length);
            if (!remainder) {
                continue;
            }
            result.add(remainder.split(".")[0]);
        }
        return Array.from(result).sort();
    }
    /**
     * Resolve a base identifier.
     */
    resolveBaseToken(token, variables) {
        const variableType = variables[token];
        if (variableType) {
            return this.parseType(variableType);
        }
        if (token === "Ext") {
            return {
                kind: "namespace",
                name: "Ext"
            };
        }
        if (this.hasClass(token)) {
            return {
                kind: "class",
                name: token
            };
        }
        if (this.isNamespace(token)) {
            return {
                kind: "namespace",
                name: token
            };
        }
        return this.unknown();
    }
    /**
     * Resolve array indexing:
     *
     *   Model[] [0]
     *
     * becomes:
     *
     *   Model
     */
    resolveIndex(current) {
        if (current.kind !== "array" ||
            !current.elementType) {
            return this.unknown();
        }
        return this.parseType(current.elementType);
    }
    /**
     * Resolve method invocation.
     */
    resolveMethod(current, methodName) {
        if (current.kind === "array") {
            return this.resolveArrayMethod(current, methodName);
        }
        if (current.kind !== "class") {
            return this.unknown();
        }
        const member = this.findMember(current.name, methodName);
        if (member?.kind === "method" &&
            member.type) {
            return this.parseType(member.type);
        }
        const knownType = this.resolveKnownMethod(current.name, methodName);
        if (knownType) {
            return this.parseType(knownType);
        }
        return this.unknown();
    }
    /**
     * JavaScript array methods with useful return types.
     */
    resolveArrayMethod(current, methodName) {
        switch (methodName) {
            case "slice":
            case "concat":
                return {
                    kind: "array",
                    name: current.name,
                    elementType: current.elementType
                };
            case "join":
                return {
                    kind: "primitive",
                    name: "string"
                };
            case "pop":
            case "shift":
                return current.elementType
                    ? this.parseType(current.elementType)
                    : this.unknown();
            case "find":
                return current.elementType
                    ? this.parseType(current.elementType)
                    : this.unknown();
            case "filter":
                return {
                    kind: "array",
                    name: current.name,
                    elementType: current.elementType
                };
            case "map":
                return {
                    kind: "array",
                    name: "any[]",
                    elementType: "any"
                };
            default:
                return this.unknown();
        }
    }
    /**
     * Known ExtJS method return types.
     *
     * These are fallbacks for cases where ExtJS JSDoc
     * does not expose a usable @return type.
     */
    resolveKnownMethod(className, methodName) {
        const map = {
            "Ext.grid.Panel.getStore": "Ext.data.Store",
            "Ext.grid.Panel.getSelectionModel": "Ext.selection.Model",
            "Ext.grid.Panel.getView": "Ext.view.Table",
            "Ext.grid.Panel.getColumnManager": "Ext.grid.ColumnManager",
            "Ext.form.Panel.getForm": "Ext.form.Basic",
            "Ext.form.field.ComboBox.getStore": "Ext.data.Store",
            "Ext.data.Store.getProxy": "Ext.data.proxy.Proxy",
            "Ext.data.Store.getRange": "Ext.data.Model[]",
            "Ext.data.Store.getAt": "Ext.data.Model",
            "Ext.data.Store.first": "Ext.data.Model",
            "Ext.data.Store.last": "Ext.data.Model",
            "Ext.data.Store.getById": "Ext.data.Model",
            "Ext.data.Store.getByInternalId": "Ext.data.Model",
            "Ext.selection.Model.getSelection": "Ext.data.Model[]",
            "Ext.selection.RowModel.getSelection": "Ext.data.Model[]",
            "Ext.selection.CellModel.getSelection": "Ext.data.Model[]",
            "Ext.data.Model.get": "object",
            "Ext.data.proxy.Proxy.getReader": "Ext.data.reader.Reader",
            "Ext.data.proxy.Proxy.getWriter": "Ext.data.writer.Writer",
            "Ext.data.reader.Reader.getRoot": "string",
            "Ext.form.Basic.getRecord": "Ext.data.Model"
        };
        return map[`${className}.${methodName}`];
    }
    /**
     * Resolve a property.
     */
    resolveProperty(current, propertyName) {
        if (current.kind === "namespace") {
            const fullName = `${current.name}.${propertyName}`;
            if (this.hasClass(fullName)) {
                return {
                    kind: "class",
                    name: fullName
                };
            }
            if (this.isNamespace(fullName)) {
                return {
                    kind: "namespace",
                    name: fullName
                };
            }
            return this.unknown();
        }
        if (current.kind !== "class") {
            return this.unknown();
        }
        const member = this.findMember(current.name, propertyName);
        if (!member?.type) {
            return this.unknown();
        }
        return this.parseType(member.type);
    }
    /**
     * Parse ExtJS/JSDoc type notation.
     */
    parseType(type) {
        let normalized = type
            .trim()
            .replace(/^\?/, "")
            .replace(/^!/, "");
        if (!normalized) {
            return this.unknown();
        }
        /*
         * {Ext.data.Store}
         */
        if (normalized.startsWith("{") &&
            normalized.endsWith("}")) {
            normalized =
                normalized.substring(1, normalized.length - 1).trim();
        }
        /*
         * Union:
         *
         * Ext.data.Model|null
         * Ext.data.Model|undefined
         */
        if (normalized.includes("|")) {
            const candidate = normalized
                .split("|")
                .map(value => value.trim())
                .find(value => value !== "null" &&
                value !== "undefined" &&
                value !== "void");
            if (candidate) {
                normalized =
                    candidate;
            }
        }
        /*
         * Model[]
         */
        if (normalized.endsWith("[]")) {
            const elementType = normalized.substring(0, normalized.length - 2).trim();
            return {
                kind: "array",
                name: `${elementType}[]`,
                elementType
            };
        }
        /*
         * Array<Model>
         */
        const arrayMatch = normalized.match(/^Array\s*<\s*(.+)\s*>$/i);
        if (arrayMatch) {
            const elementType = arrayMatch[1].trim();
            return {
                kind: "array",
                name: `${elementType}[]`,
                elementType
            };
        }
        /*
         * JavaScript primitive types.
         */
        const primitives = new Set([
            "string",
            "String",
            "number",
            "Number",
            "boolean",
            "Boolean",
            "object",
            "Object",
            "function",
            "Function",
            "void",
            "Void",
            "any",
            "*",
            "mixed"
        ]);
        if (primitives.has(normalized)) {
            return {
                kind: "primitive",
                name: normalized
            };
        }
        /*
         * ExtJS class.
         */
        if (this.hasClass(normalized)) {
            return {
                kind: "class",
                name: normalized
            };
        }
        /*
         * ExtJS namespace.
         */
        if (this.isNamespace(normalized)) {
            return {
                kind: "namespace",
                name: normalized
            };
        }
        /*
         * Do not pretend an unknown Ext.* name
         * is a real class.
         */
        if (normalized.startsWith("Ext.")) {
            return this.unknown();
        }
        /*
         * Unknown custom primitive/object type.
         *
         * Keeping the name is useful for display,
         * but it must not be treated as an ExtJS class.
         */
        return {
            kind: "unknown",
            name: normalized
        };
    }
    /**
     * Tokenize:
     *
     *   .getStore()
     *   .getAt(0)
     *   [0]
     *   .foo
     */
    tokenize(expression) {
        const result = [];
        let index = 0;
        while (index < expression.length) {
            /*
             * Property / method:
             *
             * .foo
             * .foo(...)
             */
            if (expression[index] === ".") {
                index++;
                while (index < expression.length &&
                    /\s/.test(expression[index])) {
                    index++;
                }
                const nameMatch = expression
                    .substring(index)
                    .match(/^([A-Za-z_$][\w$]*)/);
                if (!nameMatch) {
                    continue;
                }
                const name = nameMatch[1];
                index +=
                    name.length;
                while (index < expression.length &&
                    /\s/.test(expression[index])) {
                    index++;
                }
                if (expression[index] === "(") {
                    index =
                        this.skipParentheses(expression, index);
                    result.push({
                        kind: "method",
                        name
                    });
                }
                else {
                    result.push({
                        kind: "property",
                        name
                    });
                }
                continue;
            }
            /*
             * Array index:
             *
             * [0]
             * [ 0 ]
             */
            if (expression[index] === "[") {
                const end = expression.indexOf("]", index + 1);
                if (end === -1) {
                    break;
                }
                const content = expression
                    .substring(index + 1, end)
                    .trim();
                if (/^\d+$/.test(content)) {
                    result.push({
                        kind: "index",
                        name: content
                    });
                }
                index =
                    end + 1;
                continue;
            }
            index++;
        }
        return result;
    }
    skipParentheses(expression, start) {
        let depth = 0;
        let quote;
        for (let index = start; index < expression.length; index++) {
            const char = expression[index];
            if (quote) {
                if (char === quote &&
                    expression[index - 1] !== "\\") {
                    quote = undefined;
                }
                continue;
            }
            if (char === "'" ||
                char === '"' ||
                char === "`") {
                quote = char;
                continue;
            }
            if (char === "(") {
                depth++;
                continue;
            }
            if (char === ")") {
                depth--;
                if (depth <= 0) {
                    return index + 1;
                }
            }
        }
        return expression.length;
    }
    normalizeExpression(expression) {
        return expression
            .trim()
            .replace(/\s+/g, " ")
            .replace(/;+\s*$/, "");
    }
    methodToMember(owner, method) {
        return {
            name: method.name,
            kind: "method",
            type: method.returns,
            signature: method.signature,
            description: (0, localization_1.getMethodDescription)(owner.name, method.name) ??
                method.description,
            ownerClass: owner.name
        };
    }
    propertyToMember(owner, property) {
        return {
            name: property.name,
            kind: "property",
            type: property.type,
            description: (0, localization_1.getPropertyDescription)(owner.name, property.name) ??
                property.description,
            ownerClass: owner.name
        };
    }
    unknown() {
        return {
            kind: "unknown",
            name: "unknown"
        };
    }
}
exports.ExtJSResolver = ExtJSResolver;
//# sourceMappingURL=resolver.js.map