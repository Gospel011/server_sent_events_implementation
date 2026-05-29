import { Connection } from "./connection";

type UserConnection = { userId: string; connection: Connection };

export default class SSEConnectionManager {
  #connections: Map<string, Set<Connection>> = new Map();

  #removeConnection({ userId, connection }: UserConnection) {
    console.log(`Removing connection for user: ${userId}`);
    const set = this.#connections.get(userId);

    set?.delete(connection);

    if (set?.size == 0) {
      this.#connections.delete(userId);
    }

    console.log(`New connection size: ${this.#connections.size}`);
  }

  #writeToConnection({
    connection,
    data,
  }: {
    connection: Connection;
    data: string;
  }) {
    try {
      const ok = connection.res.write(data);

      if (!ok) {
        console.error(`Slow client detected ⚠️`);
        connection.res.destroy();
      }
    } catch (error) {
      console.error(`Error writing to connection: ${error}`);
    }
  }

  manageConnection({ userId, connection }: UserConnection) {
    let userConnections = this.#connections.get(userId);
    if (!userConnections) {
      userConnections = new Set();
      this.#connections.set(userId, userConnections);
    }
    userConnections.add(connection);

    connection.req.once("close", () =>
      this.#removeConnection({ userId, connection }),
    );
    connection.req.once("aborted", () =>
      this.#removeConnection({ userId, connection }),
    );
  }

  #parseSSEData(data: SSEData) {
    let sseData =
      `id: ${data.id}\n` + `event: ${data.event}\n` + `data: ${data.data}\n`;
    if (data.retry) {
      sseData += `retry: ${data.retry}\n`;
    }

    sseData += "\n";

    return sseData;
  }

  broadcast(data: SSEData) {
    let sseData = this.#parseSSEData(data);

    for (const [, connections] of this.#connections) {
      connections.forEach((connection) => {
        this.#writeToConnection({ connection, data: sseData });
      });
    }
  }

  sendToClient({ userId, data }: { userId: string; data: SSEData }) {
    let userConnections = this.#connections.get(userId);

    if (!userConnections) return false;
    let sseData = this.#parseSSEData(data);

    userConnections.forEach((connection) => {
      this.#writeToConnection({ connection, data: sseData });
    });

    return true;
  }
}
