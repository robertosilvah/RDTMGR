import { WebSocket, WebSocketServer as Server } from './deps.ts';
import { logger } from "./logger.ts";
import { LineProcesses } from "./models/line_process.ts";
import { TimeInterval, TimeRange } from "./models/time_interval.ts";

export const WS_PORT = Number(Deno.env.get("WS_PORT") || 3001);

export const WebSocketServer = new Server(WS_PORT);
logger.info('WebSocket server listening at port', WS_PORT);

export class WebSocketClient {
	private realtimeLocations = new Map<number, boolean>();

	constructor(readonly socket: WebSocket) { }

	isRealtimeLocation(locationId: number): boolean {
		if (this.realtimeLocations.has(locationId))
			return !!this.realtimeLocations.get(locationId);

		return true;
	}

	setRealtimeLocation(isRealtime: boolean, locationId: number) {
		this.realtimeLocations.set(locationId, isRealtime);
	}
}

export class WebSocketClients {
	private static clients = new Map<number, WebSocketClient>();

	static set(id: number, client: WebSocketClient): void {
		this.clients.set(id, client);
	}

	static delete(id: number): boolean {
		return this.clients.delete(id);
	}

	static get(id: number): WebSocketClient | undefined {
		return this.clients.get(id);
	}

	static updateRealtimeState(id: number, locationId: number, timeRange: TimeRange): void {
		const client = this.get(id);
		const isInCurrentInterval = new TimeInterval(timeRange).contains(new Date());
		client?.setRealtimeLocation(isInCurrentInterval, locationId);
	}

	static forEach(callback: (v: WebSocketClient, i: number) => Promise<void> | void) {
		this.clients.forEach(callback);
	}

	static forceUpdateAction(locationId: number) {
		const process = LineProcesses.get(locationId);

		if (process) {
			const action = process.asStateUpdatedAction();

			Array.from(this.clients.values()).forEach(async (client) => {
				if (client.isRealtimeLocation(locationId)) {
					try {
						const payload = JSON.stringify(action);
						client.socket.send(payload);
					} catch (ex) {
						logger.error(ex);
					}
				}
			});
		}
	}
}

let wsCounter = 0;
WebSocketServer.on('connection', (ws: WebSocket) => {
	wsCounter++;

	const id = wsCounter;

	logger.info('WebSocket connection established, id', id);
	WebSocketClients.set(id, new WebSocketClient(ws));

	ws.on('close', () => {
		logger.info('WebSocket client disconnected', id);
		WebSocketClients.delete(id);
	});
});
