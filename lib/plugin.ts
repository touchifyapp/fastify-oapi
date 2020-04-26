import type { FastifyInstance, RequestHandler, RouteOptions, ServerOptions } from "fastify";
import parse, { ParsedRoute } from "./parser";
import { stripResponseFormats } from "./util";

export interface FastifyOApiOptions {
    controller: Record<string, RequestHandler<any, any, any, any, any, any>>;
    specification: string;
    prefix?: string;
}

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
        if (config.shared) {
            instance.addSchema(config.shared);
        }

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
