import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";

export interface ExtMethod {
    name: string;
    returns?: string;
    signature?: string;
    description?: string;
}

export interface ExtProperty {
    name: string;
    type?: string;
    description?: string;
}

export interface ExtClass {
    name: string;
    extends?: string;
    methods: Record<string, ExtMethod>;
    properties: Record<string, ExtProperty>;
    description?: string;
}

export interface ExtIndex {
    classes: Record<string, ExtClass>;
}

function getJsFiles(
    dir: string
): string[] {
    const result: string[] = [];

    if (!fs.existsSync(dir)) {
        return result;
    }

    for (
        const entry
        of fs.readdirSync(
            dir,
            { withFileTypes: true }
        )
    ) {
        const fullPath =
            path.join(
                dir,
                entry.name
            );

        if (entry.isDirectory()) {
            result.push(
                ...getJsFiles(fullPath)
            );
        } else if (
            entry.isFile() &&
            entry.name.endsWith(".js")
        ) {
            result.push(fullPath);
        }
    }

    return result;
}

function getStringValue(
    node: ts.Expression
): string | undefined {
    if (
        ts.isStringLiteral(node) ||
        ts.isNoSubstitutionTemplateLiteral(node)
    ) {
        return node.text;
    }

    return undefined;
}

function getPropertyName(
    name: ts.PropertyName
): string | undefined {
    if (ts.isIdentifier(name)) {
        return name.text;
    }

    if (
        ts.isStringLiteral(name) ||
        ts.isNumericLiteral(name)
    ) {
        return name.text;
    }

    return undefined;
}

function getJsDocText(
    node: ts.Node
): string {
    const comments =
        ts.getJSDocCommentsAndTags(node);

    const result: string[] = [];

    for (const comment of comments) {
        if (!ts.isJSDoc(comment)) {
            continue;
        }

        if (!comment.comment) {
            continue;
        }

        if (
            typeof comment.comment === "string"
        ) {
            result.push(
                comment.comment.trim()
            );
        } else {
            result.push(
                comment.comment
                    .map(
                        part =>
                            part.getText()
                    )
                    .join("")
                    .trim()
            );
        }
    }

    return result.join("\n\n");
}

function getJsDocReturnType(
    node: ts.Node
): string | undefined {
    const tag =
        ts.getJSDocReturnTag(node);

    if (!tag?.typeExpression) {
        return undefined;
    }

    return tag.typeExpression.type.getText();
}

function createMethod(
    name: string,
    node: ts.Node
): ExtMethod {
    const description =
        getJsDocText(node);

    const returns =
        getJsDocReturnType(node);

    let signature =
        `${name}()`;

    if (
        ts.isPropertyAssignment(node)
    ) {
        const initializer =
            node.initializer;

        if (
            ts.isFunctionExpression(
                initializer
            ) ||
            ts.isArrowFunction(
                initializer
            )
        ) {
            const parameters =
                initializer.parameters
                    .map(
                        p => p.getText()
                    )
                    .join(", ");

            signature =
                `${name}(${parameters})`;
        }
    }

    return {
        name,
        returns,
        signature,
        description:
            description || undefined
    };
}

function parseConfigProperties(
    objectLiteral:
        ts.ObjectLiteralExpression
): Record<string, ExtProperty> {

    const properties:
        Record<string, ExtProperty> = {};

    for (
        const property
        of objectLiteral.properties
    ) {
        if (!property.name) {
            continue;
        }

        const name =
            getPropertyName(
                property.name
            );

        if (!name) {
            continue;
        }

        let type:
            string | undefined;

        if (
            ts.isPropertyAssignment(
                property
            )
        ) {
            const initializer =
                property.initializer;

            if (
                ts.isStringLiteral(
                    initializer
                )
            ) {
                type = "string";
            } else if (
                ts.isNumericLiteral(
                    initializer
                )
            ) {
                type = "number";
            } else if (
                initializer.kind ===
                    ts.SyntaxKind.TrueKeyword ||
                initializer.kind ===
                    ts.SyntaxKind.FalseKeyword
            ) {
                type = "boolean";
            } else if (
                ts.isArrayLiteralExpression(
                    initializer
                )
            ) {
                type = "array";
            } else if (
                ts.isObjectLiteralExpression(
                    initializer
                )
            ) {
                type = "object";
            }
        }

        properties[name] = {
            name,
            type
        };
    }

    return properties;
}

function parseClass(
    sourceFile: ts.SourceFile
): ExtClass[] {

    const classes: ExtClass[] = [];

    function visit(node: ts.Node): void {

        if (
            !ts.isCallExpression(node)
        ) {
            ts.forEachChild(
                node,
                visit
            );
            return;
        }

        const expression =
            node.expression;

        if (
            !ts.isPropertyAccessExpression(
                expression
            ) ||
            expression.name.text !== "define" ||
            expression.expression.getText(
                sourceFile
            ) !== "Ext"
        ) {
            ts.forEachChild(
                node,
                visit
            );
            return;
        }

        if (
            node.arguments.length < 2
        ) {
            ts.forEachChild(
                node,
                visit
            );
            return;
        }

        const classNameArg =
            node.arguments[0];

        const classBodyArg =
            node.arguments[1];

        if (
            !ts.isStringLiteral(
                classNameArg
            ) ||
            !ts.isObjectLiteralExpression(
                classBodyArg
            )
        ) {
            ts.forEachChild(
                node,
                visit
            );
            return;
        }

        const className =
            classNameArg.text;

        let parentClass:
            string | undefined;

        const methods:
            Record<string, ExtMethod> = {};

        const properties:
            Record<string, ExtProperty> = {};

        for (
            const property
            of classBodyArg.properties
        ) {
            if (!property.name) {
                continue;
            }

            const name =
                getPropertyName(
                    property.name
                );

            if (!name) {
                continue;
            }

            if (
                name === "extend" &&
                ts.isPropertyAssignment(
                    property
                )
            ) {
                const value =
                    getStringValue(
                        property.initializer
                    );

                if (value) {
                    parentClass = value;
                }

                continue;
            }

            if (
                name === "config" &&
                ts.isPropertyAssignment(
                    property
                ) &&
                ts.isObjectLiteralExpression(
                    property.initializer
                )
            ) {
                Object.assign(
                    properties,
                    parseConfigProperties(
                        property.initializer
                    )
                );

                continue;
            }

            if (
                ts.isPropertyAssignment(
                    property
                )
            ) {
                const initializer =
                    property.initializer;

                if (
                    ts.isFunctionExpression(
                        initializer
                    ) ||
                    ts.isArrowFunction(
                        initializer
                    )
                ) {
                    methods[name] =
                        createMethod(
                            name,
                            property
                        );
                }
            }

            if (
                ts.isMethodDeclaration(
                    property
                )
            ) {
                methods[name] =
                    createMethod(
                        name,
                        property
                    );
            }
        }

        classes.push({
            name: className,
            extends: parentClass,
            methods,
            properties
        });

        console.log(
            `[ExtJS] Parsed class: ${className}`
        );

        ts.forEachChild(
            node,
            visit
        );
    }

    visit(sourceFile);

    return classes;
}

export function buildIndex(
    extjsPath: string
): ExtIndex {

    const srcPath =
        path.join(
            extjsPath,
            "src"
        );

    if (!fs.existsSync(srcPath)) {
        throw new Error(
            `ExtJS src directory not found: ${srcPath}`
        );
    }

    const files =
        getJsFiles(srcPath);

    console.log(
        `[ExtJS] Found ${files.length} JS files`
    );

    console.log(
        `[ExtJS] Store.js exists:`,
        files.some(
            file =>
                file.endsWith(
                    `${path.sep}data${path.sep}Store.js`
                )
        )
    );

    const index: ExtIndex = {
        classes: {}
    };

    for (
        const file
        of files
    ) {
        let content: string;

        try {
            content =
                fs.readFileSync(
                    file,
                    "utf8"
                );
        } catch (error) {
            console.error(
                `[ExtJS] Cannot read ${file}`,
                error
            );

            continue;
        }

        const sourceFile =
            ts.createSourceFile(
                file,
                content,
                ts.ScriptTarget.Latest,
                true,
                ts.ScriptKind.JS
            );

        const parsedClasses =
            parseClass(
                sourceFile
            );

        for (
            const extClass
            of parsedClasses
        ) {
            index.classes[
                extClass.name
            ] = extClass;
        }
    }

    console.log(
        `[ExtJS] Indexed ${
            Object.keys(index.classes).length
        } classes`
    );

    return index;
}

export function saveIndex(
    index: ExtIndex,
    outputFile: string
): void {

    fs.mkdirSync(
        path.dirname(outputFile),
        {
            recursive: true
        }
    );

    fs.writeFileSync(
        outputFile,
        JSON.stringify(
            index,
            null,
            2
        ),
        "utf8"
    );
}