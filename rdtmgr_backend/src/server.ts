#!/usr/bin/env -S deno run --allow-net --allow-read=./ --allow-env --allow-write=./

import { Application, Router, cors, MqttClient } from "./deps.ts";

import { logger } from "./logger.ts";
import * as Controllers from "./controllers/mod.ts";
import { DelayFinishedEvent, DelayUpdatedEvent, LineProcess, LineProcessEvents, LineProcessMessageDefinitions, ProductionFinishedEvent, ProductionUpdatedEvent, StateUpdatedEvent } from "./models/line_process.ts";
import { Location } from "./models/locations.ts";
import { Production, ProductionStandard } from "./models/production.ts";
import { WebSocketClients as wsClients } from "./ws_server.ts";
import { varAsBoolean } from "./helpers.ts";
import { Delay } from "./models/delays.ts";
import { Shift } from "./models/shifts.ts";

const notifyWsClients = varAsBoolean(Deno.env.get("NOTIFY_CLIENTS"));
const saveOnDb = varAsBoolean(Deno.env.get("SAVE_ON_DB"));

//#region setup API server

const api = new Application();

api.use(cors({
	origin: "*"
}));

api.use(Controllers.Shifts);
api.use(Controllers.Locations);
api.use(Controllers.Products);
api.use(Controllers.ProductionStandards);
api.use(Controllers.LineProcesses);

//#endregion

//#region setup LineProcesses

const defaultProduct = await ProductionStandard.getById(21);
if (!defaultProduct)
	throw new Error("Default product not defined.");

const msgDefinitionsString = Deno.readTextFileSync('./lines.config.json');
const msgDefinitions: LineProcessMessageDefinitions = JSON.parse(msgDefinitionsString);

const locations: Location[] = await Location.getEnabled();
for (const location of locations) {
	const process = await LineProcess.getByLocation(location);
	const definition = msgDefinitions[String(location.id)];
	process.setupMessageParser(definition);
	process.trySetProductionStandard(defaultProduct);
}

if (notifyWsClients) {
	addEventListener(LineProcessEvents.OnUpdateDelay, e => {
		const evt = e as DelayUpdatedEvent;
		const action = evt.asAction();

		wsClients.forEach(async (client, clientId) => {
			if (client.isRealtimeLocation(evt.detail.location.id)) {
				try {
					const payload = JSON.stringify({ ...action, clientId });
					await client.socket.send(payload);
				} catch (error) {
					logger.error(error);
				}
			}
		});
	});

	addEventListener(LineProcessEvents.OnUpdateProduction, e => {
		const evt = e as ProductionUpdatedEvent;
		const action = evt.asAction();

		wsClients.forEach(async (client, clientId) => {
			if (client.isRealtimeLocation(evt.detail.location.id)) {
				try {
					const payload = JSON.stringify({ ...action, clientId });
					await client.socket.send(payload);
				} catch (error) {
					logger.error(error);
				}
			}
		});
	});
}

addEventListener(LineProcessEvents.OnStateUpdate, async e => {

	const evt = e as StateUpdatedEvent;
	const action = evt.asAction();
	const { state, location } = evt.detail;
	const interval = state!.interval;

	if (saveOnDb) {
		try {
			if (interval) {
				const { id, range } = interval;
				const shift = await Shift.getByTimeRange(location.id, range);

				if (!Number.isInteger(id))
					throw new Error(`No interval id ${JSON.stringify(interval)}`);

				if (!shift) {
					const { lastInsertId } = await Shift.create(location.id, range, id!);
					state!.shiftId = lastInsertId!;
					logger.debug(`${location.name}: created shift record with id ${lastInsertId}.`);
				} else {
					logger.info(`${location.name}: found shift:`, shift);
				}
			} else {
				logger.error(`${location.name}: invalid interval:`, interval);
			}
		} catch (ex) {
			logger.error(`${location.name}: couldn't create shift record`, JSON.stringify(interval));
			logger.error(ex);
		}
	} else {
		logger.warning(`${location.name}: SAVE_ON_DB = false; couldn't create shift record`, JSON.stringify(interval));
	}

	if (notifyWsClients) {
		wsClients.forEach(async (client, clientId) => {
			if (client.isRealtimeLocation(location.id)) {
				try {
					const payload = JSON.stringify({ ...action, clientId });
					await client.socket.send(payload);
				} catch (error) {
					logger.error(error);
				}
			}
		});
	}
});

addEventListener(LineProcessEvents.OnFinishDelay, async e => {
	const state = (e as DelayFinishedEvent).detail;
	const delay = state.getLastDelay()!;

	if (saveOnDb) {
		try {
			const { id, startDate, endDate } = delay;
			const { shiftId } = state;

			if (!shiftId)
				throw new Error("LineProcessEvents.OnFinishDelay - shiftId is invalid.");

			if (!Number.isInteger(id)) {
				const { lastInsertId } = await Delay.create(state.location.id, startDate, endDate, shiftId);
				delay.id = lastInsertId!;

				logger.debug(`${state.location.name}: created delay record with id ${lastInsertId}.`);
			} else {
				await Delay.update(id!, startDate, endDate);
				logger.debug(`${state.location.name}: updated delay record with id ${id}.`);
			}
		} catch (ex) {
			logger.error(`${state.location.name}: couldn't create delay record`, JSON.stringify(delay));
			logger.error(ex);
		}
	} else {
		logger.warning(`${state.location.name}: SAVE_ON_DB = false; couldn't create delay record`, JSON.stringify(delay));
	}
});

addEventListener(LineProcessEvents.OnFinishProduction, async e => {
	const state = (e as ProductionFinishedEvent).detail;
	const production = state.getLastProduction()!;

	if (saveOnDb) {
		try {
			const { startDate, endDate, productId, totalPieces, badPieces, cycleTime, shiftId } = production;
			const { lastInsertId } = await Production.create(startDate, endDate, productId, state.location.id, shiftId, totalPieces, badPieces, cycleTime);
			production.id = lastInsertId!;
			logger.debug(`${state.location.name}: created production record with id ${lastInsertId}.`)
		} catch (ex) {
			logger.error(`${state.location.name}: couldn't create production record`, JSON.stringify(production));
			logger.error(ex);
		}
	} else {
		logger.warning(`${state.location.name}: SAVE_ON_DB = false; couldn't create production record`, JSON.stringify(production));
	}
});

//#endregion

//#region setup MQTT subscription

(async () => {
	const client = new MqttClient({url: `mqtt://${Deno.env.get("MQTT_ADDRESS") || "127.0.0.1"}`});

	logger.info("Connecting to message broker...");
	await client.connect();
	logger.info("Connected to message broker");
	await client.subscribe("iot-2/downtime");

	client.on("message", async (topic: string, payload: Uint8Array) => {
		const decoder = new TextDecoder();

		try {
			const d: Record<string, number> = JSON.parse(decoder.decode(payload)).d;

			for (const location of locations) {
				const process = await LineProcess.getById(location.id);
				process.parseAndHandleMessage(d);
			}
		} catch (ex) {
			logger.error(ex);
		}
	});
})();

//#endregion

api.use(new Router().allowedMethods());
const address = `${Deno.env.get("ADDRESS")}:${Deno.env.get("PORT")}`;
logger.info('API server listening at', address);
await api.listen(address);
