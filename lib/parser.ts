import { RouteSchema, RequestHandler, HTTPMethod } from "fastify";

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
    method: HTTPMethod;
    url: string;
    schema: RouteSchema;
    operationId: string;
    openapiSource: OperationObject;
    handler?: RequestHandler;
}

export default async function parse(specOrPath: string | OpenAPIObject): Promise<ParsedConfig> {
    const spec = await bundleSpecification(specOrPath); //await dereference(specOrPath);

    if (!spec?.openapi?.startsWith("3.0")) {
        throw new Error("The 'specification' parameter must contain a valid version 3.0.x specification");
    }

    const config: ParsedConfig = {
        $refs: await $RefParser.resolve(spec),
        shared: createSharedSchema(spec),
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

function createSharedSchema(spec: OpenAPIObject): SchemaObject | undefined {
    if (!spec.definitions && !spec.components?.schemas) {
        return;
    }

    return {
        $id: "urn:schema:api",
        definitions: parseSchemaItems(spec.definitions),
        components: {
            schemas: parseSchemaItems(spec.components?.schemas)
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
                processOperation(config, path, verb, operation, genericSchema);
            }
        });
    }
}

/** Build fastify RouteSchema and add it to routes. */
function processOperation(config: ParsedConfig, path: string, method: string, operation: OperationObject, genericSchema: RouteSchema): void {
    if (!operation) {
        return;
    }

    const route: ParsedRoute = {
        method: method.toUpperCase() as HTTPMethod,
        url: makeURL(path),
        schema: parseOperationSchema(config, genericSchema, operation),
        operationId: operation.operationId || makeOperationId(method, path),
        openapiSource: operation
    };

    config.routes.push(route);
}

/** Build fastify RouteSchema based on OpenAPI Operation */
function parseOperationSchema(config: ParsedConfig, genericSchema: RouteSchema, operation: OperationObject): RouteSchema {
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

/** Parse Open API params for Query/Params/Headers and include them into RouteSchema. */
function parseParameters(config: ParsedConfig, schema: RouteSchema, parameters: Array<ParameterObject | ReferenceObject>): void {
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
    const properties: Record<string, SchemaObject | ReferenceObject> = {};

    const required: string[] = [];
    const baseRequired = new Set(base?.required ?? []);

    parameters.forEach(item => {
        properties[item.name] = parseSchema(item.schema);

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
        return parseSchema(body.content["application/json"].schema);
    }
}

/** Parse a schema and inject shared reference if needed. */
function parseSchema(schema: SchemaObject | ReferenceObject | undefined): SchemaObject | ReferenceObject {
    if (!schema) return {};
    return parseSchemaItems(schema);
}

function parseSchemaItems(item: any): any {
    if (!item) {
        return item;
    }

    if (Array.isArray(item)) {
        return item.map(parseSchemaItems);
    }

    if (typeof item === "object") {
        if (isReference(item)) {
            return { $ref: "urn:schema:api" + item.$ref }; //item.$ref.replace("#/components/schemas", "urn:schema:api#/definitions") };
        }

        const res: any = {};
        for (const key in item) {
            res[key] = parseSchemaItems(item[key]);
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
function resolveReference<T>(obj: T | ReferenceObject, config: ParsedConfig): T {
    if (!isReference(obj)) {
        return obj;
    }

    return config.$refs.get(obj.$ref) as unknown as T;
}

/** Check if specified Object is a reference. */
function isReference(obj: any): obj is ReferenceObject {
    return obj && "$ref" in obj;
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
