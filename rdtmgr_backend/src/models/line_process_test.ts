import { assert, assertEquals } from "https://deno.land/std@0.97.0/testing/asserts.ts";

import { Location } from "../models/locations.ts";
import { LineProcess, LineProcessEvents, LineProcessIndicators, LineProcessState, StateUpdatedEvent } from "./line_process.ts";

import { TEST_SHIFT_DEFINITION } from "../models/shifts_test.ts";
import { Production, ProductionStandard } from "../models/production.ts";
import { Delay } from "../models/delays.ts";
import { LineStatus } from "../consts.ts";
import { ShiftDefinition } from "./shifts.ts";

const location = Object.assign(new Location, { id: 1, name: "Upsetter", enabled: true });
const standard = Object.assign(new ProductionStandard, { millis: 60000, productId: 21 });
const date = new Date("2021-02-14T06:00:00.000Z");
const interval = ShiftDefinition.calcMatchingInterval(date, TEST_SHIFT_DEFINITION)!;

function testLineProcess() {
	const process = new LineProcess(location, TEST_SHIFT_DEFINITION);
	return process;
}

Deno.test("LineProcess: initialize with a given date", () => {
	const process = testLineProcess();
	const date = new Date("2021-02-14T06:00:00.000Z");

	const state = process.setupState([], [], interval);
	state.handleUpdate(date);
	const { delayTime, productionTime, status, currentDelay, currentProduction } = state;

	assertEquals(delayTime, 2 * 60 * 60 * 1000);
	assertEquals(productionTime, 0);
	assertEquals(status, LineStatus.DELAYED);
	assert(currentDelay);
	assertEquals(currentDelay.endDate, date);
	assert(!currentProduction);

	// const { delayRate, delayTimeStr, lineStops, availability, performance, quality, oee, cycleTime } = state.getIndicators();
});

Deno.test("LineProcess: initialize with a given date and a delay", () => {
	const process = testLineProcess();

	const lastDelays: Delay[] = [
		Object.assign(new Delay, {
			startDate: new Date("2021-02-14T04:00:00.000Z"),
			endDate: new Date("2021-02-14T04:18:00.000Z")
		})
	];

	const state = process.setupState([], lastDelays, interval);
	state.handleUpdate(date);
	const { delayTime, productionTime, currentDelay, currentProduction } = state;

	assertEquals(delayTime, 2 * 60 * 60 * 1000);
	assertEquals(productionTime, 0);
	assert(currentDelay);
	assert(!currentProduction);
});

Deno.test("LineProcess: initialize with a given date, production and delays", () => {
	const process = testLineProcess();

	const lastDelays: Delay[] = [
		Object.assign(new Delay, {
			startDate: new Date("2021-02-14T04:00:00.000Z"),
			endDate: new Date("2021-02-14T04:58:00.000Z")
		})
	];

	const lastProductions: Production[] = [
		Object.assign(new Production(location), {
			startDate: new Date("2021-02-14T04:58:00.000Z"),
			endDate: new Date("2021-02-14T05:00:00.000Z"),
			totalPieces: 2
		})
	];

	const state = process.setupState(lastProductions, lastDelays, interval);
	state.handleUpdate(date);
	const { delayTime, productionTime, totalPieces, currentDelay, currentProduction } = state;

	assertEquals(delayTime, (60 + 58) * 60 * 1000);
	assertEquals(productionTime, 2 * 60 * 1000);
	assertEquals(totalPieces, 2);
	assert(currentDelay);
	assertEquals(currentDelay.endDate, date);
	assert(!currentProduction);
});

Deno.test("LineProcess: initialize with a given date, production and delays (don't update)", () => {
		const process = testLineProcess();
	
		const lastDelays: Delay[] = [
			Object.assign(new Delay, {
				startDate: new Date("2021-02-14T04:00:00.000Z"),
				endDate: new Date("2021-02-14T04:58:00.000Z")
			})
		];
	
		const lastProductions: Production[] = [
			Object.assign(new Production(location), {
				startDate: new Date("2021-02-14T04:58:00.000Z"),
				endDate: new Date("2021-02-14T05:00:00.000Z"),
				totalPieces: 2
			})
		];
	
		const state = process.setupState(lastProductions, lastDelays, interval);
		const { delayTime, productionTime, totalPieces, currentDelay, currentProduction } = state;
	
		assertEquals(delayTime, (58) * 60 * 1000);
		assertEquals(productionTime, 2 * 60 * 1000);
		assertEquals(totalPieces, 2);
		assert(currentDelay);
		assertEquals(currentDelay.endDate, new Date("2021-02-14T05:00:00.000Z"));
		assert(!currentProduction);
	}
);

const process = testLineProcess();

const lastDelays: Delay[] = [
	Object.assign(new Delay, {
		startDate: new Date("2021-02-14T04:00:00.000Z"),
		endDate: new Date("2021-02-14T04:58:00.000Z")
	})
];

const lastProductions: Production[] = [
	Object.assign(new Production(location), {
		startDate: new Date("2021-02-14T04:58:00.000Z"),
		endDate: new Date("2021-02-14T05:00:00.000Z"),
		totalPieces: 2,
		productId: 21
	})
];

process.setupState(lastProductions, lastDelays, interval);
process.trySetProductionStandard(standard);

Deno.test("LineProcess (initialized): message should trigger the first update, creating a delay", () => {
	const message = {
		scanner: 1,
		count: 10,
		cycleTime: 0,
		timestamp: new Date("2021-02-14T06:10:00.000Z")
	};

	const state = process.handleMessage(message);
	const { delayTime, totalPieces, zero, delays, currentDelay, standard, delayAmount, production, productionTime } = state;

	const expectedDelays: Delay[] = [
		Object.assign(new Delay, {
			startDate: new Date("2021-02-14T04:00:00.000Z"),
			endDate: new Date("2021-02-14T04:58:00.000Z")
		})
	];

	assertEquals(delays, expectedDelays);
	assertEquals(delayAmount, 2);
	assertEquals(currentDelay, Object.assign(new Delay, {
		startDate: new Date("2021-02-14T05:00:00.000Z"),
		endDate: new Date("2021-02-14T06:10:00.000Z"),
		locationId: 1
	}));
	assertEquals(delayTime, (60 + 58 + 10) * 60 * 1000);
	assertEquals(zero, 8);
	assertEquals(totalPieces, 2);
	assertEquals(standard, 60000);
	assertEquals(production.length, 1);
	assertEquals(productionTime, 2 * 60 * 1000);
});

Deno.test("LineProcess (initialized): message should update delay end date", () => {
	const message = {
		scanner: 1,
		count: 10,
		cycleTime: 0,
		timestamp: new Date("2021-02-14T06:20:00.000Z")
	};

	const state = process.handleMessage(message);
	const { delayTime, currentDelay, delays, totalPieces, delayAmount, production, productionTime } = state;

	assertEquals(delayTime, (60 + 58 + 20) * 60 * 1000);
	assertEquals(delayAmount, 2);
	assert(currentDelay, "Current delay isn't defined");
	assertEquals(currentDelay.endDate, message.timestamp);
	assert(!delays.includes(currentDelay), "Current delay shouldn't be in delays array");
	assertEquals(totalPieces, 2);
	assertEquals(production.length, 1);
	assertEquals(productionTime, 2 * 60 * 1000);
});

Deno.test("LineProcess (initialized): message should end delay and add production entry", () => {
	const message = {
		scanner: 1,
		count: 11,
		cycleTime: 0,
		timestamp: new Date("2021-02-14T06:21:00.000Z")
	};
	const state = process.handleMessage(message);
	const { count, totalPieces, status, currentProduction, currentDelay, delayTime, delayAmount, production, productionTime } = state;

	assertEquals(delayTime, (60 + 58 + 21) * 60 * 1000);
	assertEquals(delayAmount, 2);
	assertEquals(count, 11);
	assertEquals(totalPieces, 3);
	assert(currentProduction);
	assert(!currentDelay)
	assertEquals(status, LineStatus.RUNNING);
	assertEquals(production.length, 1);
	assertEquals(productionTime, 2 * 60 * 1000);
});

Deno.test("LineProcess (initialized): message should update production end date", () => {
	const message = {
		scanner: 1,
		count: 11,
		cycleTime: 0,
		timestamp: new Date("2021-02-14T06:21:59.000Z")
	};

	const state = process.handleMessage(message);
	const { count, totalPieces, status, currentProduction, currentDelay, delayTime, delayAmount, production, productionTime } = state;

	assertEquals(delayTime, (60 + 58 + 21) * 60 * 1000);
	assertEquals(delayAmount, 2);
	assertEquals(count, 11);
	assertEquals(totalPieces, 3);
	assert(currentProduction);
	assert(!currentDelay)
	assertEquals(status, LineStatus.RUNNING);
	assertEquals(production.length, 1);
	assertEquals(productionTime, (2 * 60 + 59) * 1000);
});

Deno.test("LineProcess (initialized): message should create a new delay", () => {
	const message = {
		scanner: 1,
		count: 11,
		cycleTime: 0,
		timestamp: new Date("2021-02-14T06:23:00.000Z")
	};

	const state = process.handleMessage(message);
	const { count, totalPieces, status, currentProduction, currentDelay, delayTime, delayAmount, production, productionTime } = state;

	assertEquals(delayTime, (60 + 58 + 22) * 60 * 1000);
	assertEquals(delayAmount, 3);
	assertEquals(count, 11);
	assertEquals(totalPieces, 3);
	assert(!currentProduction);
	assert(currentDelay);
	assertEquals(status, LineStatus.DELAYED);
	assertEquals(production.length, 2);
	assertEquals(productionTime, 3 * 60 * 1000);
});

Deno.test("LineProcess (initialized): message should trigger a delay end update", () => {
	const message = {
		scanner: 1,
		count: 11,
		cycleTime: 0,
		timestamp: new Date("2021-02-14T06:24:00.000Z")
	};

	const state = process.handleMessage(message);
	const { count, totalPieces, status, currentProduction, currentDelay, delayTime, delayAmount, production, productionTime } = state;

	assertEquals(delayTime, (60 + 58 + 23) * 60 * 1000);
	assertEquals(delayAmount, 3);
	assertEquals(count, 11);
	assertEquals(totalPieces, 3);
	assert(!currentProduction);
	assert(currentDelay);
	assertEquals(status, LineStatus.DELAYED);
	assertEquals(production.length, 2);
	assertEquals(productionTime, 3 * 60 * 1000);
});

Deno.test("LineProcess (initialized): message should end delay and add production entry", () => {
	const message = {
		scanner: 1,
		count: 12,
		cycleTime: 0,
		timestamp: new Date("2021-02-14T06:24:00.000Z")
	};
	const state = process.handleMessage(message);
	const { count, totalPieces, status, currentProduction, currentDelay, delayTime, delayAmount, production, productionTime } = state;

	assertEquals(delayTime, (60 + 58 + 23) * 60 * 1000);
	assertEquals(delayAmount, 3);
	assertEquals(count, 12);
	assertEquals(totalPieces, 4);
	assert(currentProduction);
	assert(!currentDelay);
	assertEquals(status, LineStatus.RUNNING);
	assertEquals(production.length, 2);
	assertEquals(productionTime, 3 * 60 * 1000);
});

Deno.test("LineProcess (initialized): message should finish production early and add production entry", () => {
	const message = {
		scanner: 1,
		count: 13,
		cycleTime: 0,
		timestamp: new Date("2021-02-14T06:24:30.000Z")
	};

	const state = process.handleMessage(message);
	const { count, totalPieces, status, currentProduction, currentDelay, delayTime, delayAmount, production, productionTime } = state;

	assertEquals(delayTime, (60 + 58 + 23) * 60 * 1000);
	assertEquals(delayAmount, 3);
	assertEquals(count, 13);
	assertEquals(totalPieces, 5);
	assert(currentProduction);
	assert(!currentDelay)
	assertEquals(status, LineStatus.RUNNING);
	assertEquals(production.length, 3);
	assertEquals(productionTime, (3 * 60 + 30) * 1000);
});

Deno.test("LineProcess (initialized): message should finish production early and add production entry (reset counter)", () => {
	const message = {
		scanner: 1,
		count: 0,
		cycleTime: 0,
		timestamp: new Date("2021-02-14T06:25:00.000Z")
	};

	const state = process.handleMessage(message);
	const { count, totalPieces, status, currentProduction, currentDelay, delayTime, delayAmount, production, productionTime } = state;

	assertEquals(delayTime, (60 + 58 + 23) * 60 * 1000);
	assertEquals(delayAmount, 3);
	assertEquals(count, 0);
	assertEquals(totalPieces, 6);
	assert(currentProduction);
	assert(!currentDelay)
	assertEquals(status, LineStatus.RUNNING);
	assertEquals(production.length, 4);
	assertEquals(productionTime, (4 * 60) * 1000);
});

Deno.test("LineProcess (initialized): message should create a new delay", () => {
	const message = {
		scanner: 1,
		count: 0,
		cycleTime: 0,
		timestamp: new Date("2021-02-14T06:26:00.000Z")
	};

	const state = process.handleMessage(message);
	const { count, totalPieces, status, currentProduction, currentDelay, delayTime, delayAmount, production, productionTime } = state;

	assertEquals(delayTime, (60 + 58 + 23) * 60 * 1000);
	assertEquals(delayAmount, 4);
	assertEquals(count, 0);
	assertEquals(totalPieces, 6);
	assert(!currentProduction);
	assert(currentDelay)
	assertEquals(status, LineStatus.DELAYED);
	assertEquals(production.length, 5);
	assertEquals(productionTime, (5 * 60) * 1000);
});

Deno.test("LineProcess (initialized): message should create a new state (shift change)", async () => {
	const message = {
		scanner: 1,
		count: 13,
		cycleTime: 0,
		timestamp: new Date("2021-02-14T12:05:00.000Z")
	};

	let stateEventPromise: Promise<LineProcessState | null>;

	addEventListener(LineProcessEvents.OnStateUpdate, (e) => {
		const { detail: { state } } = e as StateUpdatedEvent;
		stateEventPromise = (async () => state)();
	})

	const expectedDelay = new Delay(new Date("2021-02-14T12:00:00.000Z"), message.timestamp, 1);

	const state = process.handleMessage(message);
	const eventState = await stateEventPromise!;

	const { count, totalPieces, status, currentProduction, currentDelay, delayTime, delayAmount, production, productionTime } = state;

	assertEquals(eventState, state);
	assertEquals(delayTime, 5 * 60 * 1000);
	assertEquals(delayAmount, 1);
	assertEquals(count, 13);
	assertEquals(totalPieces, 0);
	assert(!currentProduction);
	assertEquals(currentDelay, expectedDelay);
	assertEquals(status, LineStatus.DELAYED);
	assertEquals(production.length, 0);
	assertEquals(productionTime, 0);
});

Deno.test("LineProcess.getPieces method", () => {
	const production: Production[] = [
		Object.assign(new Production(), {
			shiftId: 1,
			totalPieces: 1
		}),
		Object.assign(new Production(), {
			shiftId: 1,
			totalPieces: 2
		}),
		Object.assign(new Production(), {
			shiftId: 2,
			totalPieces: 1
		}),
		Object.assign(new Production(), {
			shiftId: 2,
			totalPieces: 2,
			badPieces: 2
		}),
		Object.assign(new Production(), {
			shiftId: 1,
			totalPieces: 2
		}),
		Object.assign(new Production(), {
			shiftId: 2,
			totalPieces: 1
		}),
		Object.assign(new Production(), {
			shiftId: 2,
			totalPieces: 2,
			badPieces: 2
		}),
	];

	const { totalPieces, badPieces } = LineProcessState.getPieces(production);
	assertEquals(totalPieces, 8);
	assertEquals(badPieces, 4);
});

Deno.test("LineProcessIndicators.groupProductions method", () => {
	const production: Production[] = [
		Object.assign(new Production(), {
			totalPieces: 3,
			startDate: new Date("2021-05-03T18:00:00.000Z"),
			endDate: new Date("2021-05-03T18:10:00.000Z"),
		}),
		Object.assign(new Production(), {
			totalPieces: 4,
			startDate: new Date("2021-05-03T18:10:00.000Z"),
			endDate: new Date("2021-05-03T18:20:00.000Z"),
		}),
		Object.assign(new Production(), {
			totalPieces: 5,
			startDate: new Date("2021-05-03T18:20:00.000Z"),
			endDate: new Date("2021-05-03T18:30:00.000Z"),
		}),
		Object.assign(new Production(), {
			totalPieces: 6,
			startDate: new Date("2021-05-03T18:40:00.000Z"),
			endDate: new Date("2021-05-03T18:50:00.000Z"),
		}),
		Object.assign(new Production(), {
			totalPieces: 7,
			startDate: new Date("2021-05-03T18:50:00.000Z"),
			endDate: new Date("2021-05-03T19:00:00.000Z"),
		}),
	];

	const expected: Production[] = [
		Object.assign(new Production(), {
			totalPieces: 5,
			startDate: new Date("2021-05-03T18:00:00.000Z"),
			endDate: new Date("2021-05-03T18:30:00.000Z"),
		}),
		Object.assign(new Production(), {
			totalPieces: 2,
			startDate: new Date("2021-05-03T18:40:00.000Z"),
			endDate: new Date("2021-05-03T19:00:00.000Z"),
		}),
	]

	const result = LineProcessIndicators.groupProductions(production);

	assertEquals(result, expected);
	assertEquals(result.length, 2);
});
