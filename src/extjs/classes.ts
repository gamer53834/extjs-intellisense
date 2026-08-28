export interface ExtMethod {
    name: string;
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
    methods: ExtMethod[];
    properties: ExtProperty[];
}

export const classes: Record<string, ExtClass> = {
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
                name: "getAt",
                signature: "getAt(index: number): Ext.data.Model",
                description: "Returns the record at the specified index."
            },
            {
                name: "getById",
                signature: "getById(id: any): Ext.data.Model",
                description: "Returns the record with the specified id."
            },
            {
                name: "getRange",
                signature: "getRange(start?: number, end?: number): Ext.data.Model[]",
                description: "Returns a range of records."
            },
            {
                name: "first",
                signature: "first(): Ext.data.Model",
                description: "Returns the first record."
            },
            {
                name: "last",
                signature: "last(): Ext.data.Model",
                description: "Returns the last record."
            },
            {
                name: "getByInternalId",
                signature: "getByInternalId(internalId: string): Ext.data.Model",
                description: "Returns the record by internal id."
            },
            {
                name: "getData",
                signature: "getData(): Ext.util.Collection",
                description: "Returns all data in the store."
            },
            {
                name: "getProxy",
                signature: "getProxy(): Ext.data.proxy.Proxy",
                description: "Returns the proxy."
            },
            {
                name: "sync",
                signature: "sync(options?): void",
                description: "Synchronizes the data with the server."
            },
            {
                name: "each",
                signature: "each(fn: Function, scope?: object): void",
                description: "Executes a function for each record."
            },
            {
                name: "add",
                signature: "add(record): void"
            },
            {
                name: "remove",
                signature: "remove(record): void"
            },
            {
                name: "removeAll",
                signature: "removeAll(): void",
                description: "Removes all records."
            },
            {
                name: "clearFilter",
                signature: "clearFilter(suppressEvent?: boolean): void",
                description: "Clears all filters."
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
            },
            {
                name: "totalCount",
                type: "number",
                description: "Total number of records."
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

    "Ext.selection.Model": {
        name: "Ext.selection.Model",
        extends: "Ext.util.Observable",

        methods: [
            {
                name: "getSelection",
                signature: "getSelection(): Ext.data.Model[]",
                description: "Returns the selected records."
            },
            {
                name: "selectAll",
                signature: "selectAll(): void",
                description: "Selects all records."
            },
            {
                name: "deselectAll",
                signature: "deselectAll(): void",
                description: "Deselects all records."
            },
            {
                name: "select",
                signature: "select(records): void",
                description: "Selects the specified records."
            },
            {
                name: "deselect",
                signature: "deselect(records): void",
                description: "Deselects the specified records."
            },
            {
                name: "isSelected",
                signature: "isSelected(record: Ext.data.Model): boolean",
                description: "Checks if a record is selected."
            },
            {
                name: "getCount",
                signature: "getCount(): number",
                description: "Returns the number of selected records."
            }
        ],

        properties: [
            {
                name: "selected",
                type: "Ext.util.MixedCollection",
                description: "Collection of selected records."
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