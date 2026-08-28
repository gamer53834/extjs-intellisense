import * as vscode from "vscode";

import {
    ExtJSResolver,
    ExtClass,
    ResolvedMember,
    ExtType
} from "../resolver";

let resolver:
    ExtJSResolver | undefined;

export function setCompletionResolver(
    value: ExtJSResolver
): void {
    resolver = value;

    console.log(
        "[ExtJS Completion] Resolver: SET",
        resolver ? "OK" : "UNDEFINED"
    );

    if (resolver) {
        const testType = resolver.resolveExpression(
            "grid.getStore()",
            { grid: "Ext.grid.Panel" }
        );
        console.log(
            "[ExtJS Completion] Test resolve 'grid.getStore()':",
            testType
        );

        if (testType.kind === "class") {
            const members = resolver.getMembers(testType.name);
            console.log(
                `[ExtJS Completion] Store has ${members.length} members`,
                members.slice(0, 5).map(m => m.name)
            );
        }
    }
}

function getClass(
    className: string
): ExtClass | undefined {
    return resolver?.getClass(
        className
    );
}

function getAllClasses(): ExtClass[] {
    return (
        resolver?.getAllClasses() ||
        []
    );
}

/**
 * Extract variables from the whole document.
 *
 * Examples:
 *
 *   const grid = Ext.create('Ext.grid.Panel');
 *   const store = grid.getStore();
 *   const model = store.getAt(0);
 */
function extractVariables(
    document: vscode.TextDocument
): Record<string, string> {
    const variables:
        Record<string, string> = {};

    if (!resolver) {
        return variables;
    }

    const text =
        document.getText();

    /*
     * We intentionally iterate several times.
     *
     * This allows:
     *
     *   grid -> Ext.grid.Panel
     *   store -> grid.getStore()
     *   model -> store.getAt(0)
     *   ...
     */
    const maxPasses = 10;

    for (
        let pass = 0;
        pass < maxPasses;
        pass++
    ) {
        let changed = false;

        /*
         * Ext.create()
         *
         * const grid =
         *     Ext.create('Ext.grid.Panel');
         */
        const createRegex =
            /\b(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*Ext\.create\s*\(\s*['"]([^'"]+)['"]/g;

        let match:
            RegExpExecArray | null;

        while (
            (
                match =
                    createRegex.exec(
                        text
                    )
            ) !== null
        ) {
            const variableName =
                match[1];

            const className =
                match[2];

            if (
                resolver.hasClass(
                    className
                ) &&
                variables[
                    variableName
                ] !== className
            ) {
                variables[
                    variableName
                ] = className;

                changed = true;
            }
        }

        /*
         * Standard variable assignments:
         *
         * const store = grid.getStore();
         * const model = store.getAt(0);
         *
         * We deliberately stop at ; or newline.
         */
        const assignmentRegex =
            /\b(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*([^;\n]+)/g;

        while (
            (
                match =
                    assignmentRegex.exec(
                        text
                    )
            ) !== null
        ) {
            const variableName =
                match[1];

            const expression =
                match[2]
                    .trim();

            /*
             * Don't try to resolve object literals,
             * strings, numbers etc.
             */
            if (
                !looksLikeExpression(
                    expression
                )
            ) {
                continue;
            }

            const type =
                resolver.resolveExpression(
                    expression,
                    variables
                );

            const typeName =
                typeToVariableName(
                    type
                );

            if (
                typeName &&
                variables[
                    variableName
                ] !== typeName
            ) {
                variables[
                    variableName
                ] = typeName;

                changed = true;
            }
        }

        /*
         * Assignment without declaration:
         *
         * store = grid.getStore();
         */
        const reassignmentRegex =
            /(?:^|[;\n])\s*([A-Za-z_$][\w$]*)\s*=\s*([^;\n]+)/g;

        while (
            (
                match =
                    reassignmentRegex.exec(
                        text
                    )
            ) !== null
        ) {
            const variableName =
                match[1];

            const expression =
                match[2]
                    .trim();

            if (
                !looksLikeExpression(
                    expression
                )
            ) {
                continue;
            }

            const type =
                resolver.resolveExpression(
                    expression,
                    variables
                );

            const typeName =
                typeToVariableName(
                    type
                );

            if (
                typeName &&
                variables[
                    variableName
                ] !== typeName
            ) {
                variables[
                    variableName
                ] = typeName;

                changed = true;
            }
        }

        if (!changed) {
            break;
        }
    }

    console.log(
        "[ExtJS Completion] Variables:",
        variables
    );

    if (resolver && Object.keys(variables).length > 0) {
        for (const [varName, varType] of Object.entries(variables)) {
            console.log(
                `[ExtJS Completion] Variable '${varName}' = ${varType}`
            );
            
            const cls = resolver.getClass(varType);
            if (cls) {
                const methodCount = Object.keys(cls.methods || {}).length;
                const propertyCount = Object.keys(cls.properties || {}).length;
                console.log(
                    `[ExtJS Completion] Class '${varType}' has ${methodCount} methods, ${propertyCount} properties`
                );
            }
        }
    }

    return variables;
}

function looksLikeExpression(
    expression: string
): boolean {
    const value =
        expression.trim();

    if (!value) {
        return false;
    }

    /*
     * Ignore obvious literals.
     */
    if (
        /^["'`]/.test(value)
    ) {
        return false;
    }

    if (
        /^\d+(?:\.\d+)?$/.test(
            value
        )
    ) {
        return false;
    }

    if (
        /^(true|false|null|undefined)$/.test(
            value
        )
    ) {
        return false;
    }

    /*
     * We are interested in identifiers,
     * property chains and function calls.
     */
    return /^[A-Za-z_$][\w$]*(?:[\s.\[\]'"(),0-9_$-]|$)+/.test(
        value
    );
}

function typeToVariableName(
    type: ExtType
): string | undefined {
    if (
        type.kind === "class"
    ) {
        return type.name;
    }

    if (
        type.kind === "array"
    ) {
        return type.name;
    }

    return undefined;
}

function expressionToType(
    expression: string,
    document: vscode.TextDocument
): ExtType | undefined {
    if (!resolver) {
        return undefined;
    }

    const value =
        expression.trim();

    if (!value) {
        return undefined;
    }

    const variables =
        extractVariables(
            document
        );

    const type =
        resolver.resolveExpression(
            value,
            variables
        );

    if (
        type.kind === "unknown"
    ) {
        return undefined;
    }

    return type;
}

function expressionToClassName(
    expression: string,
    document: vscode.TextDocument
): string | undefined {
    const type =
        expressionToType(
            expression,
            document
        );

    if (
        type?.kind === "class"
    ) {
        return type.name;
    }

    return undefined;
}

function createCompletionItem(
    member: ResolvedMember
): vscode.CompletionItem {
    const item =
        new vscode.CompletionItem(
            member.name,
            member.kind === "method"
                ? vscode.CompletionItemKind.Method
                : vscode.CompletionItemKind.Property
        );

    if (
        member.kind === "method"
    ) {
        item.detail =
            member.signature ||
            `${member.name}()`;
    } else {
        item.detail =
            member.type ||
            "ExtJS property";
    }

    if (
        member.ownerClass
    ) {
        item.detail +=
            ` — ${member.ownerClass}`;
    }

    if (
        member.description
    ) {
        item.documentation =
            new vscode.MarkdownString(
                member.description
            );
    }

    /*
     * Methods first, then properties.
     */
    item.sortText =
        member.kind === "method"
            ? `1_${member.name}`
            : `2_${member.name}`;

    return item;
}

function provideCreateCompletion(
    beforeCursor: string
): vscode.CompletionItem[] {
    const result:
        vscode.CompletionItem[] = [];

    if (!resolver) {
        return result;
    }

    const match =
        beforeCursor.match(
            /Ext\.create\s*\(\s*['"]([^'"]*)$/
        );

    if (!match) {
        return result;
    }

    const prefix =
        match[1];

    for (
        const cls
        of getAllClasses()
    ) {
        if (!cls?.name) {
            continue;
        }

        if (
            prefix &&
            !cls.name
                .toLowerCase()
                .startsWith(
                    prefix.toLowerCase()
                )
        ) {
            continue;
        }

        const item =
            new vscode.CompletionItem(
                cls.name,
                vscode.CompletionItemKind.Class
            );

        item.detail =
            "ExtJS class";

        const description =
            resolver.getClassDescription(
                cls.name
            ) ??
            cls.description;

        if (description) {
            item.documentation =
                new vscode.MarkdownString(
                    description
                );
        }

        item.insertText =
            cls.name;

        item.sortText =
            `1_${cls.name}`;

        result.push(
            item
        );
    }

    return result;
}

function provideNamespaceCompletion(
    expression: string,
    prefix: string
): vscode.CompletionItem[] {
    const result:
        vscode.CompletionItem[] = [];

    if (!resolver) {
        return result;
    }

    const names =
        new Set<string>();

    const members =
        resolver.getNamespaceMembers(
            expression
        );

    for (
        const name
        of members
    ) {
        if (
            prefix &&
            !name
                .toLowerCase()
                .startsWith(
                    prefix.toLowerCase()
                )
        ) {
            continue;
        }

        names.add(
            name
        );
    }

    for (
        const name
        of Array.from(
            names
        ).sort()
    ) {
        const fullName =
            `${expression}.${name}`;

        const item =
            new vscode.CompletionItem(
                name,
                vscode.CompletionItemKind.Module
            );

        if (
            resolver.hasClass(
                fullName
            )
        ) {
            item.kind =
                vscode.CompletionItemKind.Class;

            item.detail =
                "ExtJS class";

            const description =
                resolver.getClassDescription(
                    fullName
                );

            if (description) {
                item.documentation =
                    new vscode.MarkdownString(
                        description
                    );
            }
        } else {
            item.detail =
                "ExtJS namespace";
        }

        item.sortText =
            `1_${name}`;

        result.push(
            item
        );
    }

    return result;
}

function provideObjectCompletion(
    document: vscode.TextDocument,
    beforeCursor: string
): vscode.CompletionItem[] {
    const result:
        vscode.CompletionItem[] = [];

    /*
     * Capture:
     *
     *   grid.
     *   grid.getStore().
     *   grid.getStore().getAt(0).
     *   Ext.data.
     */
    const dotMatch =
        beforeCursor.match(
            /^(.*?)(?:\.([A-Za-z_$][\w$]*))?$/
        );

    if (!dotMatch) {
        return result;
    }

    /*
     * Only proceed if we have a trailing dot.
     */
    if (
        !dotMatch[1].endsWith(".")
    ) {
        return result;
    }

    const expression =
        dotMatch[1].slice(0, -1).trim();

    const prefix =
        dotMatch[2] || "";

    /*
     * Ext namespace.
     *
     * Ext.
     * Ext.data.
     * Ext.grid.
     */
    if (
        expression === "Ext" ||
        expression.startsWith(
            "Ext."
        )
    ) {
        const cls =
            getClass(
                expression
            );

        if (!cls) {
            return provideNamespaceCompletion(
                expression,
                prefix
            );
        }
    }

    const type =
        expressionToType(
            expression,
            document
        );

    if (!type) {
        return result;
    }

    /*
     * We currently provide members for classes.
     */
    if (
        type.kind !== "class"
    ) {
        return result;
    }

    const members =
        resolver?.getMembers(
            type.name
        ) || [];

    for (
        const member
        of members
    ) {
        if (
            prefix &&
            !member.name
                .toLowerCase()
                .startsWith(
                    prefix.toLowerCase()
                )
        ) {
            continue;
        }

        result.push(
            createCompletionItem(
                member
            )
        );
    }

    return result;
}

export function createCompletionProvider():
    vscode.CompletionItemProvider {
    return {
        provideCompletionItems(
            document:
                vscode.TextDocument,
            position:
                vscode.Position
        ):
            vscode.CompletionItem[] {

            /*
             * Use the complete text before cursor
             * rather than only the current line.
             *
             * This is important for multiline expressions.
             */
            const text =
                document.getText(
                    new vscode.Range(
                        new vscode.Position(
                            0,
                            0
                        ),
                        position
                    )
                );

            /*
             * Ext.create('...')
             */
            const createItems =
                provideCreateCompletion(
                    text
                );

            if (
                createItems.length > 0
            ) {
                return createItems;
            }

            /*
             * Object / namespace completion.
             *
             * We only need the text of the current
             * logical expression, so use the current line
             * here for the final dot detection.
             */
            const line =
                document.lineAt(
                    position.line
                ).text;

            const beforeCursor =
                line.substring(
                    0,
                    position.character
                );

            return provideObjectCompletion(
                document,
                beforeCursor
            );
        }
    };
}

export function registerCompletionProvider(
    context:
        vscode.ExtensionContext
): vscode.Disposable {
    const provider =
        createCompletionProvider();

    const disposable =
        vscode.languages.registerCompletionItemProvider(
            [
                {
                    language:
                        "javascript",
                    scheme:
                        "file"
                },
                {
                    language:
                        "javascript",
                    scheme:
                        "untitled"
                }
            ],
            provider,
            ".",
            '"',
            "'",
            "["
        );

    context.subscriptions.push(
        disposable
    );

    console.log(
        "[ExtJS] Completion provider registered"
    );

    return disposable;
}