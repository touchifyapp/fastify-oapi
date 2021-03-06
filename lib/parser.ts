import { FastifySchema, RouteHandler, HTTPMethods } from "fastify";

import * as $RefParser from "@apidevtools/json-schema-ref-parser";

import {
    OpenAPIObject,
    PathItemObject,
    OperationObject,
    ParameterObject,
    RequestBodyObject,
    ResponseObject,
    SchemaObject,
    ReferenceObject
} from "openapi3-ts";

import { omit } from "./util";

const HttpOperations = new Set([
    "delete",
    "get",
    "head",
    "patch",
    "post",
    "put",
    "options"
]);

export interface ParsedConfig {
    $refs: $RefParser.$Refs;
    shared: SchemaObject | undefined;
    generic: Omit<OpenAPIObject, "paths">;
    routes: ParsedRoute[];
    prefix?: string;
}

export interface ParsedRoute {
    method: HTTPMethods;
    url: string;
    schema: FastifySchema;
    operationId: string;
    openapiSource: OperationObject;
    wildcard?: string;
    handler?: RouteHandler;
}

export default async function parse(specOrPath: string | OpenAPIObject): Promise<ParsedConfig> {
    const spec = await bundleSpecification(specOrPath); //await dereference(specOrPath);

    if (!spec?.openapi?.startsWith("3.0")) {
        throw new Error("The 'specification' parameter must contain a valid version 3.0.x specification");
    }

    const $refs = await $RefParser.resolve(spec);
    const config: ParsedConfig = {
        $refs,
        shared: createSharedSchema(spec, $refs),
        generic: {} as any,
        routes: [],
    };

    const keys = Object.keys(spec) as Array<keyof OpenAPIObject>;
    keys.forEach(key => {
        if (key === "paths") {
            processPaths(config, spec.paths);
        }
        else {
            config.generic[key] = spec[key];
        }
    });

    return config;
}

//#region Parser

function createSharedSchema(spec: OpenAPIObject, $refs: $RefParser.$Refs): SchemaObject | undefined {
    if (!spec.definitions && !spec.components?.schemas) {
        return;
    }

    return {
        $id: "urn:schema:api",
        definitions: parseSchemaItems(spec.definitions, { $refs }),
        components: {
            schemas: parseSchemaItems(spec.components?.schemas, { $refs })
        }
    };
}

/** Process OpenAPI Paths. */
function processPaths(config: ParsedConfig, paths: Record<string, PathItemObject>): void {
    const copyItems = ["summary", "description"];

    for (const path in paths) {
        const genericSchema = {};
        const pathItem = paths[path];

        copyProps(pathItem, genericSchema, copyItems);

        if (Array.isArray(pathItem.parameters)) {
            parseParameters(config, genericSchema, pathItem.parameters);
        }

        Object.keys(pathItem).forEach(verb => {
            const operation = pathItem[verb];
            if (isHttpVerb(verb) && operation) {
                processOperation(config, path, verb, operation, pathItem, genericSchema);
            }
        });
    }
}

/** Build fastify RouteSchema and add it to routes. */
function processOperation(config: ParsedConfig, path: string, method: string, operation: OperationObject, pathItem: PathItemObject, genericSchema: FastifySchema): void {
    if (!operation) {
        return;
    }

    const route: ParsedRoute = {
        method: method.toUpperCase() as HTTPMethods,
        ...makeURL(path, pathItem, operation, config),
        schema: parseOperationSchema(config, genericSchema, operation),
        operationId: operation.operationId || makeOperationId(method, path),
        openapiSource: operation
    };

    config.routes.push(route);
}

/** Build fastify RouteSchema based on OpenAPI Operation */
function parseOperationSchema(config: ParsedConfig, genericSchema: FastifySchema, operation: OperationObject): FastifySchema {
    const schema = Object.assign({}, genericSchema);

    copyProps(operation, schema, ["tags", "summary", "description", "operationId"]);

    if (operation.parameters) {
        parseParameters(config, schema, operation.parameters);
    }

    const body = parseBody(config, operation.requestBody);
    if (body) {
        schema.body = body;
    }

    const response = parseResponses(config, operation.responses);
    if (response) {
        schema.response = response;
    }

    return schema;
}

/** Parse Open API params for Query/Params/Headers and include them into FastifySchema. */
function parseParameters(config: ParsedConfig, schema: FastifySchema, parameters: Array<ParameterObject | ReferenceObject>): void {
    const params: ParameterObject[] = [];
    const querystring: ParameterObject[] = [];
    const headers: ParameterObject[] = [];

    parameters.forEach(item => {
        item = resolveReference(item, config);
        switch (item.in) {
            case "path":
                params.push(item);
                break;
            case "query":
                querystring.push(item);
                break;
            case "header":
                headers.push(item);
                break;
        }
    });

    if (params.length > 0) {
        schema.params = parseParams(config, schema.params as SchemaObject, params);
    }

    if (querystring.length > 0) {
        schema.querystring = parseParams(config, schema.querystring as SchemaObject, querystring);
    }

    if (headers.length > 0) {
        schema.headers = parseParams(config, schema.headers as SchemaObject, headers);
    }
}

/** Parse Open API params for Query/Params/Headers. */
function parseParams(config: ParsedConfig, base: SchemaObject | undefined, parameters: ParameterObject[]): SchemaObject {
    const properties: Record<string, SchemaObject | ReferenceObject> = {};

    const required: string[] = [];
    const baseRequired = new Set(base?.required ?? []);

    parameters.forEach(item => {
        let itemName = item.name;
        if (item["x-wildcard"] === true) {
            itemName = "*";
        }

        properties[itemName] = parseSchema(item.schema, config);

        copyProps(item, properties[itemName], ["description"]);

        if (baseRequired.has(itemName)) {
            baseRequired.delete(itemName);
        }

        if (item.required) {
            required.push(itemName);
        }
    });

    return base ?
        {
            type: "object",
            properties: Object.assign({}, base.properties, properties),
            required: [...baseRequired, ...required]
        } :
        {
            type: "object",
            properties, required
        };
}

/** Parse Open API responses */
function parseResponses(config: ParsedConfig, responses?: Record<string, ResponseObject | ReferenceObject>): Record<string, SchemaObject> | null {
    const result: Record<string, SchemaObject> = {};

    let hasResponse = false;
    for (let httpCode in responses) {
        const body = parseBody(config, responses[httpCode]);

        if (httpCode === "default") {
            httpCode = "xxx";
        }

        if (body) {
            result[httpCode] = body;
            hasResponse = true;
        }
    }

    return hasResponse ? result : null;
}

/** Parse Open API content contract to prepare RouteSchema */
function parseBody(config: ParsedConfig, body?: RequestBodyObject | ResponseObject | ReferenceObject): SchemaObject | ReferenceObject | undefined {
    body = resolveReference(body, config);

    if (body?.content?.["application/json"]) {
        return parseSchema(body.content["application/json"].schema, config);
    }
}

/** Parse a schema and inject shared reference if needed. */
function parseSchema(schema: SchemaObject | ReferenceObject | undefined, config: { $refs: $RefParser.$Refs }): SchemaObject | ReferenceObject {
    if (!schema) return {};
    return parseSchemaItems(schema, config);
}

function parseSchemaItems(item: any, config: { $refs: $RefParser.$Refs }): any {
    if (!item) {
        return item;
    }

    if (Array.isArray(item)) {
        return item.map(c => parseSchemaItems(c, config));
    }

    if (typeof item === "object") {
        const {
            "x-partial": xPartial,
            ...itemSchema
        } = item;

        if (xPartial) {
            const schema = isReference(itemSchema) ?
                resolveReference(itemSchema, config) :
                itemSchema;

            if (schema.required) {
                item = omit(schema, ["required"]);
            }
            else {
                item = itemSchema;
            }
        }

        if (isReference(item)) {
            return { $ref: "urn:schema:api" + item.$ref }; //item.$ref.replace("#/components/schemas", "urn:schema:api#/definitions") };
        }

        const res: any = {};
        for (const key in item) {
            res[key] = parseSchemaItems(item[key], config);
        }

        return res;
    }

    return item;
}

//#endregion

//#region Utilities

/**
 * Make human-readable operation id.
 * @example get /user/{name}  becomes getUserByName
 */
function makeOperationId(method: string, path: string): string {
    const parts = path.split("/").slice(1);

    return method + parts
        .map(firstUpper)
        .join("")
        .replace(/{(\w+)}/g, (_, p1) => "By" + firstUpper(p1))
        .replace(/[^a-z]/gi, "");
}

/** Bundle Specification file. */
async function bundleSpecification(spec: string | OpenAPIObject): Promise<OpenAPIObject> {
    return await $RefParser.bundle(spec) as OpenAPIObject;
}

/** Resolves external reference */
function resolveReference<T>(obj: T | ReferenceObject, { $refs }: { $refs: $RefParser.$Refs }): T {
    if (!isReference(obj)) {
        return obj;
    }

    return $refs.get(obj.$ref) as unknown as T;
}

/** Check if specified Object is a reference. */
function isReference(obj: any): obj is ReferenceObject {
    return obj && "$ref" in obj;
}

/** Adjust URLs from OpenAPI to fastify. (openapi: 'path/{param}' => fastify: 'path/:param'). */
function makeURL(path: string, pathItem: PathItemObject, operation: OperationObject, config: ParsedConfig): { url: string; wildcard?: string } {
    let wildcard: string | undefined;

    const url = path.replace(/{(\w+)}/g, (_, paramName) => {
        const param = findParameter(paramName, pathItem, operation, config);
        if (param?.["x-wildcard"] === true) {
            wildcard = paramName;
            return "*";
        }

        return `:${paramName}`;
    });

    return { url, wildcard };
}

/** Copy the given list of properties from source to target. */
function copyProps(source: Record<string, any>, target: Record<string, any>, list: string[]): void {
    list.forEach(item => {
        if (source[item]) {
            target[item] = source[item];
        }
    });
}

function firstUpper(str: string): string {
    return str.substr(0, 1).toUpperCase() + str.substr(1);
}

function isHttpVerb(str: string): str is ("get" | "put" | "post" | "delete" | "options" | "head" | "trace") {
    return HttpOperations.has(str);
}

function findParameter(paramName: string, pathItem: PathItemObject, operation: OperationObject, config: ParsedConfig): ParameterObject | undefined {
    const parameters = [
        ...pathItem.parameters || [],
        ...operation.parameters || [],
    ]

    return parameters
        .map(p => resolveReference(p, config))
        .find(p => p.in === "path" && p.name === paramName);
}

//#endregion
