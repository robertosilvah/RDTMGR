import { assertEquals } from "https://deno.land/std@0.97.0/testing/asserts.ts";

import { ShiftDefinition } from "./shifts.ts";
import { TimeInterval } from "./time_interval.ts";

export const SHIFT_DEFINITIONS: ShiftDefinition[] = [
	{
		id: 1,
		startDate: new Date("2020-11-03T12:00:00.000Z"),
		endDate: new Date("2020-11-03T20:00:00.000Z"),
		description: "First"
	},
	{
		id: 2,
		startDate: new Date("2020-11-03T20:00:00.000Z"),
		endDate: new Date("2020-11-04T04:00:00.000Z"),
		description: "Second"
	},
	{
		id: 3,
		startDate: new Date("2020-11-04T04:00:00.000Z"),
		endDate: new Date("2020-11-04T12:00:00.000Z"),
		description: "Third"
	}
].map(o => Object.assign(new ShiftDefinition, o));

export const SHIFT_DEFINITIONS2: ShiftDefinition[] = [
	{
		id: 1,
		startDate: new Date("2020-11-03T10:00:00.000Z"),
		endDate: new Date("2020-11-03T18:00:00.000Z"),
		description: "First"
	},
	{
		id: 2,
		startDate: new Date("2020-11-03T18:00:00.000Z"),
		endDate: new Date("2020-11-04T02:00:00.000Z"),
		description: "Second"
	},
	{
		id: 3,
		startDate: new Date("2020-11-04T02:00:00.000Z"),
		endDate: new Date("2020-11-04T10:00:00.000Z"),
		description: "Third"
	}
].map(o => Object.assign(new ShiftDefinition, o));

// const test = await ShiftDefinition.getByLocationId(1);
// console.log(test);

export const TEST_SHIFT_DEFINITION: ShiftDefinition = {
  startTime: new Date("1970-01-01T12:00:00.000Z"),
  amount: 3,
};

export const TEST_SHIFT_DEFINITION_2: ShiftDefinition = {
	startTime: new Date("1970-01-01T10:00:00.000Z"),
	amount: 3
}

Deno.test("TimeInterval: calculate multiple intervals from a given date and shift definitions", () => {
	const date = new Date("2021-02-14T05:00:00.000Z");
	const actual = ShiftDefinition.calcIntervalsFrom(date, TEST_SHIFT_DEFINITION);

	const expected: TimeInterval[] = [
		new TimeInterval([
			new Date("2021-02-13T12:00:00.000Z"),
			new Date("2021-02-13T20:00:00.000Z")
		], 0),
		new TimeInterval([
			new Date("2021-02-13T20:00:00.000Z"),
			new Date("2021-02-14T04:00:00.000Z")
		], 1),
		new TimeInterval([
			new Date("2021-02-14T04:00:00.000Z"),
			new Date("2021-02-14T12:00:00.000Z")
		], 2)
	];

	assertEquals(actual, expected);
});

Deno.test("TimeInterval: calculate interval from a given date and shift definitions", () => {
	const date = new Date("2021-02-14T05:00:00.000Z");
	const actual = ShiftDefinition.calcMatchingInterval(date, TEST_SHIFT_DEFINITION);

	const expected = new TimeInterval([
		new Date("2021-02-14T04:00:00.000Z"),
		new Date("2021-02-14T12:00:00.000Z")
	], 2);

	assertEquals(actual, expected);
});

Deno.test("TimeInterval: calculate interval from a given date and shift definitions 2", () => {
	const date = new Date("2021-02-14T05:00:00.000Z");
	const actual = ShiftDefinition.calcMatchingInterval(date, TEST_SHIFT_DEFINITION_2);

	const expected = new TimeInterval([
		new Date("2021-02-14T02:00:00.000Z"),
		new Date("2021-02-14T10:00:00.000Z")
	], 2);

	assertEquals(actual, expected);
});

Deno.test("TimeInterval: calculate interval from a given date and shift definitions 3", () => {
	const date = new Date("2021-02-13T19:00:00.000Z");
	const actual = ShiftDefinition.calcMatchingInterval(date, TEST_SHIFT_DEFINITION_2);

	const expected = new TimeInterval([
		new Date("2021-02-13T18:00:00.000Z"),
		new Date("2021-02-14T02:00:00.000Z")
	], 1);

	assertEquals(actual, expected);
});

Deno.test({
	name: "TimeInterval: calculate interval from a given date and shift definitions 4",
	fn: () => {
		const date = new Date("2021-02-18T00:37:00.000Z");
		const actual = ShiftDefinition.calcMatchingInterval(date, TEST_SHIFT_DEFINITION_2);
	
		const expected = new TimeInterval([
			new Date("2021-02-17T18:00:00.000Z"),
			new Date("2021-02-18T02:00:00.000Z")
		], 1);
	
		assertEquals(actual, expected);
	},
	// only: true
	// ignore: true
});

Deno.test({
	name: "TimeInterval: calculate interval from a given date and shift definitions 5",
	fn: () => {
		const date = new Date("2021-02-18T02:37:00.000Z");
		const actual = ShiftDefinition.calcMatchingInterval(date, TEST_SHIFT_DEFINITION_2);
	
		const expected = new TimeInterval([
			new Date("2021-02-18T02:00:00.000Z"),
			new Date("2021-02-18T10:00:00.000Z")
		], 2);
	
		assertEquals(actual, expected);
	},
	// only: true
	// ignore: true
});

Deno.test("TimeInterval: calculate multiple intervals from a given date and shift definitions 2", () => {
	const date = new Date("2021-02-14T07:00:00.000Z");
	const actual = ShiftDefinition.calcIntervalsFrom(date, TEST_SHIFT_DEFINITION_2);

	const expected: TimeInterval[] = [
		new TimeInterval([
			new Date("2021-02-13T10:00:00.000Z"),
			new Date("2021-02-13T18:00:00.000Z")
		], 0),
		new TimeInterval([
			new Date("2021-02-13T18:00:00.000Z"),
			new Date("2021-02-14T02:00:00.000Z")
		], 1),
		new TimeInterval([
			new Date("2021-02-14T02:00:00.000Z"),
			new Date("2021-02-14T10:00:00.000Z")
		], 2)
	];

	assertEquals(actual, expected);
});
