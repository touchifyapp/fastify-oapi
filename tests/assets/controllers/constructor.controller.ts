import { FastifyRequest } from "fastify";

export = Controller;

class Controller {
    async getPathParam(req: FastifyRequest): Promise<string> {
        return "";
    }
}
