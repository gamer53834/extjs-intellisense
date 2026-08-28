import * as fs from "fs";


export interface ExtRuClass {

    description?: string;

    methods?: Record<string, string>;

    properties?: Record<string, string>;
}


export type ExtRuIndex =
    Record<string, ExtRuClass>;


let ruIndex:
    ExtRuIndex = {};


/**
 * Загружает русский словарь ExtJS.
 */
export function loadRussianIndex(
    filePath: string
): boolean {


    try {

        const content =
            fs.readFileSync(
                filePath,
                "utf8"
            );

        ruIndex =
            JSON.parse(
                content
            ) as ExtRuIndex;

        console.log(
            `[ExtJS] Loaded Russian descriptions for ${Object.keys(ruIndex).length} classes`
        );

        return true;

    } catch (error) {

        console.error(
            "[ExtJS] Failed to load Russian index:",
            error
        );

        ruIndex = {};

        return false;
    }
}


/**
 * Возвращает описание класса.
 */
export function getClassDescription(
    className: string
): string | undefined {

    return ruIndex[
        className
    ]?.description;
}


/**
 * Возвращает описание метода.
 */
export function getMethodDescription(
    className: string,
    methodName: string
): string | undefined {

    return ruIndex[
        className
    ]?.methods?.[
        methodName
    ];
}


/**
 * Возвращает описание свойства.
 */
export function getPropertyDescription(
    className: string,
    propertyName: string
): string | undefined {

    return ruIndex[
        className
    ]?.properties?.[
        propertyName
    ];
}