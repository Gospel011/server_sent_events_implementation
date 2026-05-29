import { Connection } from "./connection";

type UserConnection = { connection: Connection; fullName?: string };

export default class SSEConnectionManager {
  constructor() {
    console.log("Starting heartbeat intervals for connections");
    setInterval(() => {
      this.broadcast({ ping: true });
    }, 15 * 1000);
  }
  #connections: Map<string, Set<Connection>> = new Map();

  #removeConnection({ connection }: UserConnection) {
    const userId = connection.userId;
    console.log(`Removing connection for user: ${userId}`);
    const set = this.#connections.get(userId);

    const deleted = set?.delete(connection);

    if (set?.size == 0) {
      this.#connections.delete(userId);
    }

    if (deleted == false) {
      console.log(`User ${userId} has already been removed from the pool`);
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
    if (!connection.canWriteToStream) {
      connection.snapshot = data;
      console.error(
        `Cannot write to this connection ${connection.id}. Returning...`,
      );
      return;
    }
    try {
      const ok = connection.res.write(data);

      if (!ok) {
        connection.canWriteToStream = false;
        connection.snapshot = data;
        console.error(`Slow client detected ⚠️`);

        connection.res.once("drain", () => {
          console.log("Connection is writable again");
          connection.canWriteToStream = true;

          connection.res.write(data);
          connection.snapshot = undefined;
        });
      }
    } catch (error) {
      console.error(`Error writing to connection: ${error}`);
    }
  }

  manageConnection({ connection, fullName }: UserConnection) {
    const userId = connection.userId;
    let userConnections = this.#connections.get(userId);
    if (!userConnections) {
      userConnections = new Set();
      this.#connections.set(userId, userConnections);
    }
    userConnections.add(connection);
    this.broadcast({
      data: {
        id: crypto.randomUUID(),
        data: `${fullName} joined`,
        event: "new-user",
      },
    });
    console.log(
      `Added user: ${userId} to pool.\nNew pool size for user: ${userConnections.size}`,
    );

    connection.req.once("close", () => this.#removeConnection({ connection }));
    connection.req.once("aborted", () =>
      this.#removeConnection({ connection }),
    );
  }

  #parseSSEData({ data, ping }: { data?: SSEData; ping?: boolean }) {
    let sseData: string = "";

    if (ping) {
      sseData = ": ping\n";
    } else if (data) {
      sseData =
        `id: ${data.id}\n` +
        `event: ${data.event}\n` +
        `data: ${JSON.stringify(data.data)}\n`;
      if (data.retry) {
        sseData += `retry: ${data.retry}\n`;
      }
    }

    if (sseData.trim().length == 0) {
      return null;
    }

    sseData += "\n";

    return sseData;
  }

  broadcast({ data, ping }: { data?: SSEData; ping?: boolean }) {
    let sseData = this.#parseSSEData({ data, ping });
    if (!sseData) {
      console.error("Cannot send empty sse data");
      return;
    }

    const connectionSize = this.#connections.size;

    if (connectionSize == 0) {
      console.error("No connected clients");
      return;
    }

    let totalClient = 0;

    for (const [, connections] of this.#connections) {
      connections.forEach((connection) => {
        totalClient++;
        this.#writeToConnection({ connection, data: sseData });
      });
    }

    console.log(
      `${ping ? "Pinged" : `Broadcasted data to`} ${totalClient} client${totalClient == 1 ? "" : "s"}`,
    );
  }

  sendToClient({ userId, data }: { userId: string; data: SSEData }) {
    let userConnections = this.#connections.get(userId);

    if (!userConnections) return false;
    let sseData = this.#parseSSEData({ data });

    if (!sseData) {
      console.error("Cannot send empty sse data");
      return;
    }

    userConnections.forEach((connection) => {
      this.#writeToConnection({ connection, data: sseData });
    });

    return true;
  }
}
