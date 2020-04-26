import { FastifyRequest } from "fastify";

export = factory;

function factory() {
    return {
        async getPathParam(req: FastifyRequest): Promise<string> {
            return "";
        }
    };
}
