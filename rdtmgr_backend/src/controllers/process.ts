import { Router, Status } from '../deps.ts';
import { LineProcess, LineProcessState, StateUpdatedEvent } from "../models/line_process.ts";
import { logger } from "../logger.ts";
import { Location } from "../models/locations.ts";
import { TimeInterval, TimeRange } from "../models/time_interval.ts";
import { ProductionStandard } from "../models/production.ts";
import { WebSocketClients } from "../ws_server.ts";
import { Shift, ShiftDefinition } from "../models/shifts.ts";

const router = new Router({ prefix: "/api" });

router.get("/process", async (ctx) => {
	const { response } = ctx;

	const locations: Location[] = await Location.getEnabled();
	const processes = [];

	for (const location of locations) {
		const { state, shiftDefinition } = await LineProcess.getByLocation(location);

		if (state) {
			const { lastTimestamp, location, interval, productionStandard: standard } = state;
			const shifts = ShiftDefinition.calcIntervalsFrom(lastTimestamp, shiftDefinition!);
			processes.push({ location, standard, shifts, lastTimestamp, interval, indicators: state.getIndicators() });
		}
	}

	if (processes.length > 0) {
		response.body = processes;
	} else {
		const error = `Couldn't find any process`;

		response.status = Status.NotFound;
		response.body = {error}

		logger.error(error);
	}
});

type LineProcessRequestBody = {
	start: string,
	end: string,
	date?: string,
	shift?: number,
	clientId: number
}

router.post("/process/:locationId", async (ctx) => {
	const { response, params, request } = ctx;
	const locationId = Number(params.locationId);
	const body = request.body({ type: "json" });
	const { start, end, date, shift: shiftPos, clientId } = (await body.value) as LineProcessRequestBody;
	const hasShift = Number.isInteger(shiftPos);
	const hasRange = start && end;

	if (locationId) {
		let state: LineProcessState | null = null;
		const process = await LineProcess.getById(locationId);
		let shifts = await Shift.getIntervals(locationId, date ?? start);
		let interval: TimeInterval | null = null;

		if (!shifts)
			shifts = ShiftDefinition.calcIntervalsFrom(date ?? start, process.shiftDefinition!);

		if (hasShift && shifts) {
			interval = Shift.getFromIntervals(shiftPos!, shifts);
		} else if (hasRange) {
			const timeRange: TimeRange = [new Date(start), new Date(end)];
			interval = new TimeInterval(timeRange, shiftPos);
		}

		if (interval) {
			WebSocketClients.updateRealtimeState(clientId, locationId, interval.range);
			state = await process.getStateFromTimeInterval(interval);
		} else {
			state = process.state!;
		}

		if (state) {
			const { lastTimestamp, location, interval, productionStandard: standard } = state;

			response.body = { standard, location, shifts, lastTimestamp, interval, indicators: state.getIndicators() };
		} else {
			response.status = Status.NotFound;
			response.body = {
				error: `Couldn't find process state with locationId ${locationId}`
			}
		}
	} else {
		const error = `locationId ${locationId} is not valid`;

		response.status = Status.BadRequest;
		response.body = {error}

		logger.error(error);
	}
});

router.post("/process/:locationId/product/:productId", async (ctx) => {
	const { response, params } = ctx;
	const { locationId, productId } = params;

	if (locationId && productId) {
		const process = await LineProcess.getById(Number(locationId));

		if (productId) {
			try {
				const standard = await ProductionStandard.get(Number(productId), Number(locationId));
				process.trySetProductionStandard(standard!);
				response.body = standard;
			} catch (error) {
				logger.error(`${process.location.name}: couldn't set standard;`, error)
				response.status = Status.BadRequest;
				return;
			}
		}
	}
});

router.post("/process/:locationId/scrap/:amount", async (ctx) => {
	const { response, params } = ctx;
	const locationId = Number(params.locationId);
	const amount = Number(params.amount);

	if (Number.isInteger(locationId) && Number.isInteger(amount)) {
		const process = await LineProcess.getById(locationId);

		if (process) {
			if (amount >= 0) {
				try {
					process.setScrap(amount);
					WebSocketClients.forceUpdateAction(locationId);
					response.status = Status.OK;
				} catch (error) {
					const message = `${process.location.name}: couldn't set bad pieces. Error: ${error.message}`;
					logger.error(message);
					response.body = { error: message };
					response.status = Status.BadRequest;
				}
			}
		}
	}
});

export const routes = router.routes();
