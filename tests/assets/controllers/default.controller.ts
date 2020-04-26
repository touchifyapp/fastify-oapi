import { FastifyRequest, FastifyReply } from "fastify";
import { ServerResponse } from "http";

export async function getPetById(req: FastifyRequest, reply: FastifyReply<ServerResponse>): Promise<void> {
    reply.status(404);
    reply.send();
}
