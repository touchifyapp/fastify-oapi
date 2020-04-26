import { FastifyRequest, FastifyReply } from "fastify";
import { ServerResponse } from "http";

export async function addPet(req: FastifyRequest, reply: FastifyReply<ServerResponse>): Promise<void> {
    reply.status(201);
    reply.send();
}

export async function updatePet(req: FastifyRequest, reply: FastifyReply<ServerResponse>): Promise<void> {
    reply.status(200);
    reply.send();
}

export async function findPetsByStatus(req: FastifyRequest, reply: FastifyReply<ServerResponse>): Promise<void> {
    reply.send([]);
}

export async function findPetsByTags(req: FastifyRequest, reply: FastifyReply<ServerResponse>): Promise<void> {
    reply.send([]);
}

export async function getPetById(req: FastifyRequest, reply: FastifyReply<ServerResponse>): Promise<void> {
    reply.send({
        id: 1,
        name: "cat",
        photoUrls: []
    });
}

export async function updatePetWithForm(req: FastifyRequest, reply: FastifyReply<ServerResponse>): Promise<void> {
    reply.status(200);
    reply.send();
}

export async function deletePet(req: FastifyRequest, reply: FastifyReply<ServerResponse>): Promise<void> {
    reply.status(200);
    reply.send();
}

export async function uploadFile(req: FastifyRequest, reply: FastifyReply<ServerResponse>): Promise<void> {
    reply.status(200);
    reply.send();
}
