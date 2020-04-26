import { FastifyRequest, FastifyReply } from "fastify";
import { ServerResponse } from "http";

export async function getInventory(req: FastifyRequest, reply: FastifyReply<ServerResponse>): Promise<void> {
    reply.send({
        1: 100,
        2: 50
    });
}

export async function placeOrder(req: FastifyRequest, reply: FastifyReply<ServerResponse>): Promise<void> {
    reply.send({
        id: 1,
        petId: 1,
        quantity: 2,
        shipDate: new Date(),
        status: "placed",
        complete: true
    });
}

export async function getOrderById(req: FastifyRequest, reply: FastifyReply<ServerResponse>): Promise<void> {
    reply.send({
        id: 1,
        petId: 1,
        quantity: 2,
        shipDate: new Date(),
        status: "placed",
        complete: true
    });
}

export async function deleteOrder(req: FastifyRequest, reply: FastifyReply<ServerResponse>): Promise<void> {
    reply.status(200);
    reply.send();
}

export async function getPetById(req: FastifyRequest, reply: FastifyReply<ServerResponse>): Promise<void> {
    reply.send({
        id: req.params.id,
        name: "cat",
        photoUrls: []
    });
}
