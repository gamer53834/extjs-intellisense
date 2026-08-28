"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classes = void 0;
exports.classes = {
    "Ext.Component": {
        name: "Ext.Component",
        methods: [
            {
                name: "show",
                signature: "show(): void",
                description: "Shows the component."
            },
            {
                name: "hide",
                signature: "hide(): void",
                description: "Hides the component."
            },
            {
                name: "destroy",
                signature: "destroy(): void",
                description: "Destroys the component."
            }
        ],
        properties: [
            {
                name: "id",
                type: "string",
                description: "Component identifier."
            },
            {
                name: "width",
                type: "number"
            },
            {
                name: "height",
                type: "number"
            }
        ]
    },
    "Ext.data.Store": {
        name: "Ext.data.Store",
        extends: "Ext.data.AbstractStore",
        methods: [
            {
                name: "load",
                signature: "load(options?): void",
                description: "Loads the store data."
            },
            {
                name: "reload",
                signature: "reload(options?): void",
                description: "Reloads the store."
            },
            {
                name: "filter",
                signature: "filter(filters): void",
                description: "Filters the store."
            },
            {
                name: "sort",
                signature: "sort(sorters): void",
                description: "Sorts the store."
            },
            {
                name: "getCount",
                signature: "getCount(): number",
                description: "Returns the number of records."
            },
            {
                name: "add",
                signature: "add(record): void"
            },
            {
                name: "remove",
                signature: "remove(record): void"
            }
        ],
        properties: [
            {
                name: "data",
                type: "Ext.util.Collection"
            },
            {
                name: "model",
                type: "Ext.data.Model"
            },
            {
                name: "proxy",
                type: "Ext.data.proxy.Proxy"
            }
        ]
    },
    "Ext.panel.Panel": {
        name: "Ext.panel.Panel",
        extends: "Ext.container.Container",
        methods: [
            {
                name: "setTitle",
                signature: "setTitle(title: string): void"
            },
            {
                name: "getTitle",
                signature: "getTitle(): string"
            },
            {
                name: "collapse",
                signature: "collapse(): void"
            },
            {
                name: "expand",
                signature: "expand(): void"
            }
        ],
        properties: [
            {
                name: "title",
                type: "string"
            },
            {
                name: "collapsed",
                type: "boolean"
            }
        ]
    },
    "Ext.grid.Panel": {
        name: "Ext.grid.Panel",
        extends: "Ext.panel.Table",
        methods: [
            {
                name: "getStore",
                signature: "getStore(): Ext.data.Store",
                description: "Returns the grid store."
            },
            {
                name: "reconfigure",
                signature: "reconfigure(store?, columns?): void",
                description: "Reconfigures the grid."
            },
            {
                name: "getSelectionModel",
                signature: "getSelectionModel(): Ext.selection.Model"
            },
            {
                name: "getView",
                signature: "getView(): Ext.grid.View"
            }
        ],
        properties: [
            {
                name: "store",
                type: "Ext.data.Store"
            },
            {
                name: "columns",
                type: "Ext.grid.column.Column[]"
            },
            {
                name: "selModel",
                type: "Ext.selection.Model"
            }
        ]
    },
    "Ext.window.Window": {
        name: "Ext.window.Window",
        extends: "Ext.panel.Panel",
        methods: [
            {
                name: "show",
                signature: "show(): void"
            },
            {
                name: "hide",
                signature: "hide(): void"
            },
            {
                name: "close",
                signature: "close(): void"
            }
        ],
        properties: [
            {
                name: "modal",
                type: "boolean"
            },
            {
                name: "resizable",
                type: "boolean"
            }
        ]
    }
};
//# sourceMappingURL=classes.js.map