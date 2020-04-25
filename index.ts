import { FastifyInstance, RequestHandler, RouteOptions } from "fastify";
import * as fp from "fastify-plugin";

import parse, { ParsedRoute } from "./lib/parser";
import { stripResponseFormats } from "./lib/util";

export interface FastifyOApiOptions {
    controller: Record<string, RequestHandler<any, any, any, any, any, any>>;
    specification: string;
    prefix?: string;
}

export default fp(plugin, {
    fastify: ">=2.0.0",
    name: "fastify-oapi"
});

export async function plugin(fastify: FastifyInstance, options: FastifyOApiOptions): Promise<void> {
    const { controller, specification } = options;

    if (!controller || typeof controller !== "object") {
        throw new TypeError("The `controller` parameter must be an object");
    }

    const config = await parse(specification);
    const routeConf: RouterConfig = {};

    if (options.prefix) {
        routeConf.prefix = options.prefix;
    }
    else if (config.prefix) {
        routeConf.prefix = config.prefix;
    }

    fastify.register(generateRoutes, routeConf);

    async function generateRoutes(instance: FastifyInstance): Promise<void> {
        // Object.values(config.shared)
        //     .forEach(schema => instance.addSchema(schema));

        config.routes.forEach((item: ParsedRoute) => {
            if (item.schema.response) {
                stripResponseFormats(item.schema.response);
            }

            if (controller[item.operationId]) {
                item.handler = controller[item.operationId];
            }
            else {
                item.handler = async () => {
                    throw new Error(`Operation ${item.operationId} not implemented!`);
                };
            }

            instance.route(item as RouteOptions);
        });
    }
}

interface RouterConfig {
    prefix?: string;
}
