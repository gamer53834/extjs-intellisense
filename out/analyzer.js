"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectVariables = detectVariables;
exports.extractExpression = extractExpression;
function detectVariables(document, resolver) {
    const variables = {};
    const text = document.getText();
    const createRegex = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*Ext\.create\s*\(\s*["']([^"']+)["']/g;
    let match;
    while ((match = createRegex.exec(text)) !== null) {
        variables[match[1]] = match[2];
    }
    const newRegex = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*new\s+(Ext\.[A-Za-z_$][\w$.]*)\s*\(/g;
    while ((match = newRegex.exec(text)) !== null) {
        variables[match[1]] = match[2];
    }
    const assignmentRegex = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([^;\n]+?)(?:;|\n|$)/g;
    const assignments = [];
    while ((match = assignmentRegex.exec(text)) !== null) {
        const variable = match[1];
        const expression = match[2].trim();
        if (/^Ext\.create\s*\(/.test(expression) ||
            /^new\s+Ext\./.test(expression)) {
            continue;
        }
        assignments.push({
            variable,
            expression
        });
    }
    for (let pass = 0; pass < 10; pass++) {
        let changed = false;
        for (const assignment of assignments) {
            if (variables[assignment.variable]) {
                continue;
            }
            const type = resolver.resolveExpression(assignment.expression, variables);
            if (type.kind === "class" ||
                type.kind === "array" ||
                type.kind === "primitive") {
                variables[assignment.variable] =
                    type.kind === "array"
                        ? (type.elementType
                            ? `${type.elementType}[]`
                            : type.name)
                        : type.name;
                changed = true;
            }
        }
        if (!changed) {
            break;
        }
    }
    console.log("[ExtJS] Detected variables:", variables);
    return variables;
}
function extractExpression(beforeCursor) {
    const value = beforeCursor.replace(/\s*$/g, "");
    const match = value.match(/([A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*\s*(?:\([^)]*\))?|\s*\[\s*\d+\s*\])*)$/);
    if (!match) {
        return undefined;
    }
    return match[1].trim();
}
//# sourceMappingURL=analyzer.js.map