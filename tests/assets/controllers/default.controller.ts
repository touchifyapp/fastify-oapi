import { FastifyRequest, FastifyReply } from "fastify";

export async function getPetById(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.status(404);
    reply.send();
}
