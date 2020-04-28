import * as ajvOpenApi from "ajv-openapi";

import type { FastifyInstance, ServerOptions } from "fastify";
import type { Ajv, Options as AjvOptions } from "ajv";

import parse from "./parser";
import { ControllerOptions, createHandler } from "./resolution";
import { stripResponseFormats } from "./util";

export interface FastifyOApiOptions extends ControllerOptions {
    specification: string;
    prefix?: string;
}

export async function plugin(fastify: FastifyInstance, options: FastifyOApiOptions): Promise<void> {
    const config = await parse(options.specification);
    const routeConf: RouterConfig = {};

    if (options.prefix) {
        routeConf.prefix = options.prefix;
    }
    else if (config.prefix) {
        routeConf.prefix = config.prefix;
    }

    fastify.register(generateRoutes, routeConf);

    async function generateRoutes(instance: FastifyInstance): Promise<void> {
        if (config.shared) {
            instance.addSchema(config.shared);
        }

        for (const route of config.routes) {
            if (route.schema.response) {
                stripResponseFormats(route.schema.response);
            }

            instance.route({
                ...route,
                handler: await createHandler(route, options),
                config: {
                    oapi: route.openapiSource
                }
            });
        }
    }
}

export type AjvPlugin = (ajv: Ajv) => Ajv;
export type AjvPluginInit = AjvPlugin | [AjvPlugin] | [AjvPlugin, any];

export function getAjvOptions(options?: AjvOptions, plugins?: AjvPluginInit[], useDraft04?: boolean): NonNullable<ServerOptions["ajv"]> {
    return {
        customOptions: ajvOpenApi.createOptions(options),
        plugins: [
            [ajvOpenApi, { useDraft04 }],
            ...(plugins as any[] || [])
        ]
    };
}

interface RouterConfig {
    prefix?: string;
}
