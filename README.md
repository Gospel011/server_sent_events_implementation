# Live Auction (SSE Learning Project)

I started this project as a practical way to understand more on how server-sent events work.

At the core, the main implementation in this project is a live auction stream where connected clients
receive bidding activity in real time. Authentication is done with cookies.

## Project goal

My main goal for this project was to design and run a server-sent event pipeline with real concerns faced by real apps.
The current implementation covers:

- authenticated connections
- connection lifecycle management
- multiple tabs per user
- backpressure/slow clients
- heartbeat pings
- broadcasting events to all connected clients

I have made the bidding and auth architecture intentionally simple so I can focus more on the streaming architecture.

## High-level structure

This project contains both a backend and a frontend folder. The frontend was built with AI to simply visualize what was done on the backend (built by me), you can test the apis on postman just fine as well as postman supports SSE requests.

## Backend overview

The backend contains implementations to sign user up (POST /auth/signup), log in `POST /auth/login`, log out `POST /auth/logout`, get event stream `GET /events` and place bids `POST /bids`.

I have used an sqlite database for simplicity.

The `GET /events` endpoint is restricted to only logged in users.

## SSE architecture (core of this project)

### 1) Connection bootstrap

Once you hit the `GET /events` endpoint, the request handler (`handleSSEConnection`) picks it up and does three things:

- sets required three headers required for the SSE connection to work.
    - `text/event-stream`: Indicates that the response is a stream. This is required for SSE to work properly
    - `no-cache`: This prevents the browser from caching responses.
    - `keep-alive`: This ensures that the connection stays open. Occasional pings need to be sent over to the client to keep the connection active and prevent proxies or load balancers to closing it due to inactivity.
- wraps request and response in a custom `Connection` object
- Hands over the connection to the connection manager `SSEConnectionManager` to manage for the loggedIn user

### 2) Connection object

`Connection` stores stream-level metadata:

- `userId` to associate a connection to the user
- `id` to identify a single connection
- `canWriteToStream` to mark if the response stream can recieve more data. This is useful for handling `backpressure` where the client cannot recieve as fast as the server is pushing. In this case, we temporarily stop writing to the res stream by setting `canWriteToStream` to false and back to true once the response buffer is done draining.
- `snapshot` holds pending data when a client is temporarily not writable (i.e `canWriteToStream = false`)

This keeps protocol/runtime concerns out of controllers.

### 3) Connection manager pattern

A single sse connection manager is exported from `src/lib/sse_connection_manager.ts` and used by controllers.

The sse connection manager implementation is defined in `src/utils/sse_connection_manager.ts`.

The connections are grouped in `Map<string, Set<Connection>>` where key is `userId` and value is a set of active streams (supports multiple tabs/devices per user).

### 4) Event model

Current SSE event types:

- `new-user`
- `new-bid`

When a user connects, the manager broadcasts `new-user`.
When a bid is placed, `bidController` broadcasts `new-bid`.

### 5) Lifecycle cleanup

Each connection subscribes once to:

- `req.close`
- `req.aborted`

On either signal, the manager removes the connection and deletes empty user slots.

### 6) Heartbeat strategy

The manager starts a timer in the constructor and broadcasts a comment ping `: ping\n\n` every 15 seconds, this prevents proxies or load balancers from timing out long-lived streams. Browsers also ignore comment pings as it doesn't trigger an event listener or onmessage handler on the broser.

### 7) Backpressure handling

When `res.write` returns `false`, we mark connection as temporarily non-writable, store latest payload in `snapshot`, wait for `res.on('drain')` then resume writes and clear snapshot

This avoids blindly writing into a congested socket and filling up our buffer which can lead to out of memory issues and bringing down our server.

### 8) SSE serialization

The manager serializes events as:

```text
id: string
event: string
data: JSON string
retry: number\n\n
```

This is in accordance to the spec


## Key design considerations and trade-offs

- **Simple broadcast first:** To send to all connected clients, a future improvements can be to specify userIds to recieve a broadcast
- **Per-user connection sets:** supports multi-tab sessions without special client logic.
- **Auth before stream setup:** stream is tied to user identity from the first byte.
- **Heartbeat interval:** chosen as a practical local development default.
- **Backpressure policy:** currently keeps only latest snapshot for a blocked stream.
- **Stateless controllers:** streaming complexity stays in one manager class.

This project does not include a durable event replay (yet), right now only the snapshot is being saved.


## Brief frontend overview

- The frontend was built with React and has three pages, `/login`, `/signup` and `/`
- Auth state is kept in context.
- Network calls use one shared Axios client.
- Bid creation uses `POST /bids`.
- Activity feed uses `EventSource` and listens for `new-user` and `new-bid`.
- Dashboard visuals are inspired by NFT marketplace layouts given to the AI.


## How to run the project

### 1) Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2) Create backend env file

Create `backend/.env` with values like:

```env
PORT=8000
NODE_ENV=development
JWT_SECRET=replace-with-a-strong-secret
JWT_EXPIRES_IN=7d
SQLITE_DB_PATH=auth.sqlite
```

### 3) Start backend

```bash
cd backend
npm run dev
```

### 4) Start frontend

```bash
cd frontend
npm run dev
```

### 5) Open app

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`


## API summary

- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /events` (authenticated SSE)
- `POST /bids` (authenticated)


## Why this project matters

If you understand this codebase, you understand the practical core of SSE in Node:

- how to keep streams alive
- how to manage many long-lived connections safely
- how to bridge normal HTTP write actions (`POST /bids`) into real-time push events

That was the entire point of building it.

You can build your own frontend using this api as well
