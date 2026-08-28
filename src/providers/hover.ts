
import * as vscode from "vscode";

import {
    ExtJSResolver,
    ResolvedMember
} from "../resolver";

import {
    detectVariables
} from "../analyzer";

import {
    getMethodDescription,
    getPropertyDescription
} from "../localization";


let resolver:
    ExtJSResolver | undefined;


/**
 * Устанавливает Resolver.
 */
export function setHoverResolver(
    value: ExtJSResolver | undefined
): void {

    resolver = value;
}


/**
 * Извлекает выражение перед курсором.
 *
 * Например:
 *
 * grid.getStore
 * grid.getStore()
 * store.getProxy
 * Ext.grid.Panel
 */
function extractHoverExpression(
    line: string,
    position: number
): string | undefined {

    const left =
        line.substring(
            0,
            position
        );


    /*
     * Убираем скобки после вызова:
     *
     * grid.getStore()
     *
     * превращается в:
     *
     * grid.getStore
     */
    const normalized =
        left
            .replace(
                /\(\s*$/,
                ""
            )
            .replace(
                /\s+$/,
                ""
            );


    const match =
        normalized.match(
            /([A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*)*)$/
        );


    if (!match) {
        return undefined;
    }


    return match[1]
        .replace(
            /\s+/g,
            ""
        );
}


/**
 * Находит слово под курсором.
 */
function getWord(
    document: vscode.TextDocument,
    position: vscode.Position
): {
    word: string;
    range: vscode.Range;
} | undefined {

    const range =
        document.getWordRangeAtPosition(
            position,
            /[A-Za-z_$][\w$]*/
        );


    if (!range) {
        return undefined;
    }


    return {
        word:
            document.getText(
                range
            ),

        range
    };
}


/**
 * Создаёт Hover для метода / property.
 */
function createMemberHover(
    member: ResolvedMember
): vscode.MarkdownString {

    const markdown =
        new vscode.MarkdownString();


    /*
     * Сигнатура метода.
     *
     * Например:
     *
     * getStore()
     */
    if (
        member.kind === "method"
    ) {

        markdown.appendCodeblock(
            member.signature ??
            `${member.name}()`,
            "javascript"
        );

    } else {

        /*
         * Property.
         */
        markdown.appendCodeblock(
            member.type
                ? `${member.name}: ${member.type}`
                : member.name,
            "javascript"
        );
    }


    /*
     * Описание.
     *
     * Только русское описание,
     * если оно существует.
     */
    let description:
        string | undefined;


    if (
        member.ownerClass
    ) {

        if (
            member.kind === "method"
        ) {

            description =
                getMethodDescription(
                    member.ownerClass,
                    member.name
                );

        } else {

            description =
                getPropertyDescription(
                    member.ownerClass,
                    member.name
                );
        }
    }


    /*
     * Если русского перевода нет —
     * используем оригинальный JSDoc.
     */
    if (!description) {

        description =
            member.description;
    }


    if (description) {

        markdown.appendMarkdown(
            `\n${description}\n`
        );
    }


    /*
     * Входные параметры метода.
     *
     * ResolvedMember в текущем проекте
     * может содержать args/params/parameters.
     *
     * Поэтому читаем их безопасно через unknown.
     */
    if (
        member.kind === "method"
    ) {

        const rawMember =
            member as unknown as {
                args?: unknown;
                params?: unknown;
                parameters?: unknown;
            };


        const parameters =
            rawMember.parameters ??
            rawMember.params ??
            rawMember.args;


        if (
            Array.isArray(
                parameters
            ) &&
            parameters.length > 0
        ) {

            markdown.appendMarkdown(
                `\n**Параметры:**\n`
            );


            for (
                const parameter
                of parameters
            ) {

                if (
                    typeof parameter === "string"
                ) {

                    markdown.appendMarkdown(
                        `- \`${parameter}\`\n`
                    );

                    continue;
                }


                if (
                    typeof parameter !== "object" ||
                    parameter === null
                ) {
                    continue;
                }


                const p =
                    parameter as {
                        name?: unknown;
                        type?: unknown;
                        description?: unknown;
                    };


                const name =
                    typeof p.name === "string"
                        ? p.name
                        : "parameter";


                const type =
                    typeof p.type === "string"
                        ? p.type
                        : undefined;


                const parameterDescription =
                    typeof p.description === "string"
                        ? p.description
                        : undefined;


                let line =
                    `- \`${name}`;

                if (type) {

                    line +=
                        `: ${type}`;
                }

                line += "`";


                if (
                    parameterDescription
                ) {

                    line +=
                        ` — ${parameterDescription}`;
                }


                markdown.appendMarkdown(
                    `${line}\n`
                );
            }
        }
    }


    return markdown;
}


/**
 * Hover provider.
 */
export class ExtJSHoverProvider
    implements vscode.HoverProvider {

    provideHover(
        document: vscode.TextDocument,
        position: vscode.Position
    ): vscode.Hover | undefined {

        if (!resolver) {
            return undefined;
        }


        const wordInfo =
            getWord(
                document,
                position
            );


        if (!wordInfo) {
            return undefined;
        }


        const line =
            document.lineAt(
                position.line
            ).text;


        const expression =
            extractHoverExpression(
                line,
                position.character
            );


        if (!expression) {
            return undefined;
        }


        console.log(
            `[ExtJS Hover] Word: ${wordInfo.word}`
        );

        console.log(
            `[ExtJS Hover] Expression: ${expression}`
        );


        const variables =
            detectVariables(
                document,
                resolver
            );


        console.log(
            "[ExtJS Hover] Variables:",
            variables
        );


        /*
         * -----------------------------------------------
         * Если курсор на переменной:
         *
         * const grid = Ext.create('Ext.grid.Panel');
         *
         *              ^^^^
         * -----------------------------------------------
         */
        if (
            expression === wordInfo.word
        ) {

            const type =
                resolver.resolveExpression(
                    expression,
                    variables
                );


            if (
                type.kind !== "class"
            ) {
                return undefined;
            }


            return undefined;
        }


        /*
         * -----------------------------------------------
         * Expression:
         *
         * grid.getStore
         *
         * или:
         *
         * grid.getStore()
         * -----------------------------------------------
         */
        const lastDot =
            expression.lastIndexOf(".");


        if (
            lastDot < 0
        ) {
            return undefined;
        }


        const memberName =
            expression.substring(
                lastDot + 1
            );


        if (
            memberName !== wordInfo.word
        ) {
            return undefined;
        }


        const parentExpression =
            expression.substring(
                0,
                lastDot
            );


        console.log(
            `[ExtJS Hover] Parent: ${parentExpression}`
        );

        console.log(
            `[ExtJS Hover] Member: ${memberName}`
        );


        /*
         * Определяем тип объекта.
         *
         * grid
         * grid.getStore()
         */
        const parentType =
            resolver.resolveExpression(
                parentExpression,
                variables
            );


        console.log(
            "[ExtJS Hover] Parent type:",
            parentType
        );


        if (
            parentType.kind !== "class"
        ) {
            return undefined;
        }


        /*
         * Ищем member с inheritance.
         */
        const member =
            resolver.findMember(
                parentType.name,
                memberName
            );


        console.log(
            "[ExtJS Hover] Member:",
            member
        );


        if (!member) {
            return undefined;
        }


        return new vscode.Hover(
            createMemberHover(
                member
            ),
            wordInfo.range
        );
    }
}