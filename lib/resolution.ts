import * as path from "path";
import { ok } from "assert";

import { RequestHandler } from "fastify";
import { ParsedRoute } from "./parser";

export type Controller = Record<string, RequestHandler>;
export type ControllerConstructor = { new(): Controller };
export type ControllerFactory = () => Controller | Promise<Controller>;

export type ControllerResolution = "per-route" | "per-operation" | "manual" | "unique";
export type ControllerConfig = string | Controller | ControllerConstructor | ControllerFactory;

export interface ControllerOptions {
    controller?: ControllerConfig;
    controllersDir?: string;
    resolution?: ControllerResolution | ControllerResolution[];
    resolutionConfig?: Record<string, ControllerConfig>;
}

export async function createHandler(route: ParsedRoute, options: ControllerOptions): Promise<RequestHandler> {
    const resolutions = getDefaultResolution(options);
    if (!Array.isArray(resolutions)) {
        return await createControllerHandler(resolutions, route, options) ||
            createControllerDefaultHandler(route);
    }

    for (const resolution of resolutions) {
        const handler = await createControllerHandler(resolution, route, options);
        if (handler) {
            return handler;
        }
    }

    return createControllerDefaultHandler(route);
}

export async function createController(config: ControllerConfig, options: ControllerOptions): Promise<Controller> {
    if (typeof config === "string") {
        return createController(importController(config, options), options);
    }

    if (typeof config === "function") {
        if (isControllerConstructor(config)) {
            return createController(new config(), options);
        }
        else {
            return createController(await resolvePromise(config), options);
        }
    }

    if (typeof config === "object" && config !== null) {
        return config;
    }

    throw new Error("The controller should be an `object`, a `function` or a `constructor`");
}

async function createControllerHandler(resolution: ControllerResolution, route: ParsedRoute, options: ControllerOptions): Promise<RequestHandler | void> {
    switch (resolution) {
        case "manual":
            return createControllerManualHandler(route, options);
        case "unique":
            return createControllerUniqueHandler(route, options);
        case "per-operation":
            return createControllerPerOperationHandler(route, options);
        case "per-route":
            return createControllerPerRouteHandler(route, options);
    }
}

async function createControllerManualHandler(route: ParsedRoute, options: ControllerOptions): Promise<RequestHandler | void> {
    const config = options.resolutionConfig;
    assert(config, "The `manual` resolution mode needs a `resolutionConfig` option");

    if (config[route.url]) {
        const controller = await createController(config[route.url], options);
        return controller[route.operationId];
    }

    const keys = Object.keys(config);
    for (const key of keys) {
        if (route.url.startsWith(key)) {
            const controller = await createController(config[key], options);
            return controller[route.operationId];
        }
        if (new RegExp(key).test(route.url)) {
            const controller = await createController(config[key], options);
            return controller[route.operationId];
        }
    }

    if (config.default) {
        const controller = await createController(config.default, options);
        return controller[route.operationId];
    }
}

async function createControllerUniqueHandler(route: ParsedRoute, options: ControllerOptions): Promise<RequestHandler | void> {
    const controller = options.controller;
    assert(controller, "The `unique` resolution mode needs a `controller` option");

    const built = await createController(controller, options);
    return built[route.operationId];
}

async function createControllerPerOperationHandler(route: ParsedRoute, options: ControllerOptions): Promise<RequestHandler | void> {
    assert(options.controllersDir, "The `per-operation` resolution mode needs a `controllersDir` option");

    const xController = route.openapiSource["x-controller"];
    if (xController) {
        const controller = await createController(xController, options);
        return controller[route.operationId];
    }
}

async function createControllerPerRouteHandler(route: ParsedRoute, options: ControllerOptions): Promise<RequestHandler | void> {
    assert(options.controllersDir, "The `per-route` resolution mode needs a `controllersDir` option");

    let [scope] = route.url.replace(/^\//, "").split("/");
    if (!scope || scope.startsWith(":")) {
        scope = "root";
    }

    const controller = await createController(`${scope}.controller`, options);
    return controller[route.operationId];
}

function createControllerDefaultHandler(route: ParsedRoute): RequestHandler {
    return async (_, reply) => {
        reply.status(501);
        throw new Error(`Operation ${route.operationId} not implemented!`);
    };
}

function getDefaultResolution(options: ControllerOptions): ControllerResolution | ControllerResolution[] {
    if (options.resolution) {
        return options.resolution;
    }

    if (options.controller) {
        return "unique";
    }

    if (options.resolutionConfig) {
        return "manual";
    }

    if (options.controllersDir) {
        return "per-route";
    }

    throw new Error("Cannot determine the default controller resolution mode");
}

function importController(name: string, options: ControllerOptions): Controller | ControllerFactory | ControllerConstructor {
    try {
        if (name.startsWith("./")) {
            return require(name);
        }

        if (options.controllersDir) {
            return require(path.join(options.controllersDir, name));
        }

        return require(name);
    }
    catch (err) {
        throw new Error(`Error while importing controller "${name}": ${err.message}`);
    }
}

function resolvePromise<T>(cfg: () => T | Promise<T>): Promise<T> {
    const val = cfg();
    if (isPromise(val)) return val;
    return Promise.resolve(val);
}

function isPromise(obj: any): obj is Promise<any> {
    return !!obj && typeof obj.then === "function";
}

function isControllerConstructor(obj: any): obj is ControllerConstructor {
    return !!obj.prototype && !!obj.prototype.constructor.name;
}

function assert(condition: any, message: string): asserts condition {
    ok(condition, message);
}
