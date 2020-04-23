import { RouteSchema, RequestHandler } from "fastify";

import * as $RefParser from "@apidevtools/json-schema-ref-parser";

import {
    OpenAPIObject,
    PathItemObject,
    OperationObject,
    ParameterObject,
    RequestBodyObject,
    ResponseObject,
    SchemaObject
} from "openapi3-ts";

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
    generic: Omit<OpenAPIObject, "paths">;
    routes: ParsedRoute[];
    prefix?: string;
}

export interface ParsedRoute {
    method: string;
    url: string;
    schema: RouteSchema;
    operationId: string;
    openapiSource: OperationObject;
    handler?: RequestHandler;
}

export default async function parse(specOrPath: string | OpenAPIObject): Promise<ParsedConfig> {
    const spec = await dereference(specOrPath);

    if (!spec?.openapi?.startsWith("3.0")) {
        throw new Error("The 'specification' parameter must contain a valid version 3.0.x specification");
    }

    const config: ParsedConfig = {
        generic: {} as any,
        routes: []
    };

    const keys = Object.keys(spec) as Array<keyof OpenAPIObject>;
    keys.forEach(key => {
        if (key === "paths") {
            processPaths(config, spec.paths);
        }
        else {
            config.generic[key] = (spec as any)[key];
        }
    });

    return config;
}

//#region Parser

async function dereference(spec: string | OpenAPIObject): Promise<OpenAPIObject> {
    return await $RefParser.dereference(spec) as OpenAPIObject;
}

/** Process OpenAPI Paths. */
function processPaths(config: ParsedConfig, paths: Record<string, PathItemObject>): void {
    const copyItems = ["summary", "description"];

    for (const path in paths) {
        const genericSchema = {};
        const pathItem = paths[path];

        copyProps(pathItem, genericSchema, copyItems);

        if (Array.isArray(pathItem.parameters)) {
            parseParameters(genericSchema, pathItem.parameters as ParameterObject[]);
        }

        for (const operation in pathItem) {
            if (isHttpVerb(operation) && pathItem[operation]) {
                processOperation(config, path, operation, pathItem[operation] as OperationObject, genericSchema);
            }
        }
    }
}

/** Build fastify RouteSchema and add it to routes. */
function processOperation(config: ParsedConfig, path: string, method: string, operation: OperationObject, genericSchema: RouteSchema): void {
    if (!operation) {
        return;
    }

    const route = {
        method: method.toUpperCase(),
        url: makeURL(path),
        schema: parseOperationSchema(genericSchema, operation),
        operationId: operation.operationId || makeOperationId(method, path),
        openapiSource: operation
    };

    config.routes.push(route);
}

/** Build fastify RouteSchema based on OpenAPI Operation */
function parseOperationSchema(genericSchema: RouteSchema, operation: OperationObject): RouteSchema {
    const schema = Object.assign({}, genericSchema);

    copyProps(operation, schema, ["tags", "summary", "description", "operationId"]);

    if (operation.parameters) {
        parseParameters(schema, operation.parameters as ParameterObject[]);
    }

    const body = parseBody(operation.requestBody as RequestBodyObject);
    if (body) {
        schema.body = body;
    }

    const response = parseResponses(operation.responses);
    if (response) {
        schema.response = response;
    }

    return schema;
}

/** Parse Open API params for Query/Params/Headers and include them into RouteSchema. */
function parseParameters(schema: RouteSchema, parameters: ParameterObject[]): void {
    const params: ParameterObject[] = [];
    const querystring: ParameterObject[] = [];
    const headers: ParameterObject[] = [];

    parameters.forEach(item => {
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
        schema.params = parseParams(schema.params, params);
    }

    if (querystring.length > 0) {
        schema.querystring = parseParams(schema.querystring, querystring);
    }

    if (headers.length > 0) {
        schema.headers = parseParams(schema.headers, headers);
    }
}

/** Parse Open API params for Query/Params/Headers. */
function parseParams(base: SchemaObject | undefined, parameters: ParameterObject[]): SchemaObject {
    const properties: Record<string, SchemaObject> = {};

    const required: string[] = [];
    const baseRequired = new Set(base?.required ?? []);

    parameters.forEach(item => {
        properties[item.name] = item.schema as SchemaObject;

        copyProps(item, properties[item.name], ["description"]);

        if (baseRequired.has(item.name)) {
            baseRequired.delete(item.name);
        }

        if (item.required) {
            required.push(item.name);
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
function parseResponses(responses?: Record<string, RequestBodyObject | ResponseObject>): Record<string, SchemaObject> | null {
    const result: Record<string, SchemaObject> = {};

    let hasResponse = false;
    for (const httpCode in responses) {
        const body = parseBody(responses[httpCode]);
        if (body !== undefined) {
            result[httpCode] = body;
            hasResponse = true;
        }
    }

    return hasResponse ? result : null;
}

/** Parse Open API content contract to prepare RouteSchema */
function parseBody(body?: RequestBodyObject | ResponseObject): SchemaObject | undefined {
    let schema: SchemaObject | undefined;
    if (body?.content?.["application/json"]) {
        schema = body.content["application/json"].schema;
    }

    return schema;
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

/** Adjust URLs from OpenAPI to fastify. (openapi: 'path/{param}' => fastify: 'path/:param'). */
function makeURL(path: string): string {
    return path.replace(/{(\w+)}/g, ":$1");
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

//#endregion
