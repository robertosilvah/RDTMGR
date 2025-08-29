import db from "../db.ts";
import { DataTypes } from "../consts.ts";
import { getDayStart, getUTCTimeFromDate, toSQLDateString, toSQLDateTimeString, toSQLTimeString } from "../helpers.ts";
import { ExecuteResult } from "https://deno.land/x/mysql@v2.7.0/src/connection.ts";
import { TimeInterval, TimeRange } from "./time_interval.ts";

export enum ShiftDefinitionEvents {
	OnShiftDefinitionUpdated = "OnShiftDefinitionUpdated",
}

export class ShiftDefinitionUpdated extends CustomEvent<ShiftDefinition> {
	constructor(detail: ShiftDefinition, eventInitDict?: CustomEventInit<ShiftDefinition>) {
		super(ShiftDefinitionEvents.OnShiftDefinitionUpdated, { ...eventInitDict, detail });
	}
}

export class ShiftDefinition {
	static table = 'shift_definitions';
	static endpoint = 'shifts/definitions';

	id?: number;
	locationId?: number;
	startTime!: Date;
	amount!: number;
	enabled?: boolean;

	static fields = {
		id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true
		},
		locationId: {
			type: DataTypes.INTEGER,
			relationship: {
				kind: "single",
				endpoint: "locations",
			}
		},
		startTime: DataTypes.TIME,
		amount: DataTypes.INTEGER,
		enabled: DataTypes.BOOLEAN
	}

	static defaults = {
		enabled: true
	};

	static from(from: Partial<ShiftDefinition>): ShiftDefinition {
		let startTime;

		if (typeof from.startTime === "string") {
			const [hours, min, sec] = (from.startTime as unknown as string).split(":").map(s => Number(s));
			startTime = new Date(0);
			startTime.setUTCHours(hours, min, sec);
		} else {
			startTime = from.startTime;
		}

		return Object.assign(new ShiftDefinition(), { ...from, startTime });
	}

	static async getEnabled(): Promise<ShiftDefinition[]> {
		const query = `
			select
				id,
				location_id locationId,
				start_time startTime,
				amount,
				enabled
			from ${this.table}
			where enabled = true`;

		const { rows } = await db.execute(query);
		return rows ? rows.map(i => ShiftDefinition.from(i)) : [];
	}

	static async getById(id: number): Promise<ShiftDefinition | null> {
		const query = `
			select
				id,
				location_id locationId,
				start_time startTime,
				amount,
				enabled
			from ${this.table}
			where id = ?`;

		const { rows } = await db.execute(query, [id]);

		if (rows && rows[0])
			return ShiftDefinition.from(rows[0]);

		return null;
	}

	static async getByLocationId(locationId: number): Promise<ShiftDefinition | null> {
		const query = `
			select
				id,
				location_id locationId,
				start_time startTime,
				amount,
				enabled
			from ${this.table}
			where
				enabled = true and
				location_id = ?`;

		const { rows } = await db.execute(query, [locationId]);

		if (rows && rows[0])
			return ShiftDefinition.from(rows[0]);

		return null;
	}

	static async getEnabledByLocationId(locationId: number): Promise<ShiftDefinition[]> {
		const query = `
			select
				id,
				location_id locationId,
				start_time startTime,
				amount,
				enabled
			from ${this.table}
			where
				location_id = ?
				and enabled = true`;

		const { rows } = await db.execute(query, [locationId]);
		return rows ? rows.map(i => ShiftDefinition.from(i)) : [];
	}

	static async all(): Promise<ShiftDefinition[]> {
		const query = `
			select
				id,
				location_id locationId,
				start_time startTime,
				amount,
				enabled
			from ${this.table}
			order by location_id`;

		const { rows } = await db.execute(query);
		return rows ? rows.map(i => ShiftDefinition.from(i)) : [];
	}

	static async update(
		id: number,
		locationId: number,
		startTime: Date,
		amount: number,
		enabled: boolean
	): Promise<ExecuteResult> {
		const query = `
			update ${this.table}
			set
				location_id = ?,
				start_time = ?,
				amount = ?,
				enabled = ?
			where id = ?`;

		const start = getUTCTimeFromDate(startTime);

		return await db.execute(query, [locationId, start, amount, enabled, id]);
	}

	static async create(
		locationId: number,
		startTime: Date,
		amount: number,
		enabled: boolean
	): Promise<ExecuteResult> {
		const query = `insert
			into ${this.table}(location_id, start_date, amount, enabled)
			values (?, ?, ?, ?)`;

		const start = toSQLTimeString(startTime);

		return await db.execute(query, [locationId, start, amount, enabled]);
	}

	static async disable(id: number): Promise<ExecuteResult> {
		const query = `update ${this.table}
			set enabled = 0
			where id = ?`;

		return await db.execute(query, [id]);
	}

	static calcMatchingInterval(date: Date, definition: ShiftDefinition): TimeInterval | null {
		const intervals = ShiftDefinition.calcIntervalsFrom(date, definition);
		for (const i of intervals) {
			if (i.contains(date))
				return i;
		}

		return null;
	}

	static calcIntervalsFrom(timestamp: Date | string, definition: ShiftDefinition): TimeInterval[] {
		const { startTime, amount } = definition;
		const shiftDuration = 864e5 / amount;
		const corrected = ShiftDefinition.getCorrectedDate(new Date(timestamp), definition);
		const shiftStart = ShiftDefinition.getUTCDayStart(corrected);
		shiftStart.setUTCHours(startTime.getUTCHours(), startTime.getUTCMinutes());

		const intervals = Array(amount).fill(null).map((_, i) => {
			const start = new Date(shiftStart.getTime() + shiftDuration * i);
			const end = new Date(shiftStart.getTime() + shiftDuration * (i + 1));

			return new TimeInterval([start, end], i);
		});

		return intervals;
	}

	static getCorrectedDate(date: Date, shiftDefinition: ShiftDefinition): Date {
		const firstShiftHours = shiftDefinition.startTime.getUTCHours();

		if (date.getUTCHours() < firstShiftHours) {
			const correctedDate = new Date(date);
			correctedDate.setDate(date.getDate() - 1);
			return correctedDate;
		}

		return date;
	}

	static getUTCDayStart(startDate: Date): Date {
		const startingDay = new Date(startDate);
		startingDay.setUTCHours(0, 0, 0, 0);
		return startingDay;
	}
}

export class Shift {
	static table = "shifts";

	id!: number;
	locationId!: number;
	startDate!: Date;
	endDate!: Date;
	position!: number;

	get range(): TimeRange {
		return [ this.startDate, this.endDate ];
	}

	static fromRange([ start, end ]: TimeRange) {
		const duration = end.getTime() - start.getTime();
		const amount = 864e5 / duration;
		const startTime = new Date(0);
		startTime.setUTCHours(start.getUTCHours(), start.getUTCMinutes());

		return ShiftDefinition.from({
			amount,
			startTime
		});
	}

	static from(obj: Partial<Shift> & { startDate: string | Date, endDate: string | Date }): Shift {
		const startDate = new Date(obj.startDate);
		const endDate = new Date(obj.endDate);
		return Object.assign(new Shift(), { ...obj, startDate, endDate });
	}

	static async create(locationId: number, [ startDate, endDate ]: TimeRange, position: number): Promise<ExecuteResult> {
		const query = `insert
			into ${this.table}(location_id, start_date, end_date, position)
			values (?, ?, ?, ?)`;

		const start = toSQLDateTimeString(startDate);
		const end = toSQLDateTimeString(endDate);

		return await db.execute(query, [ locationId, start, end, position ]);
	}

	static async getByTimeRange(locationId: number, [ startDate, endDate ]: TimeRange): Promise<Shift | null> {
		let query = `
			select
				id,
				start_date startDate,
				end_date endDate,
				position
			from shifts
			where
				location_id = ? and
				start_date >= ? and
				end_date <= ?`;

		const start = toSQLDateTimeString(startDate);
		const end = toSQLDateTimeString(endDate);

		const { rows } = await db.execute(query, [ locationId, start, end ]);

		return rows && rows[0] ? Shift.from(rows[0]) : null;
	}

	/** Gets a shift interval for the given date (no time) and position. */
	static async getInterval(locationId: number, date: Date | string, position: number): Promise<TimeInterval | null> {
		let query = `
			select
				id,
				location_id locationId,
				start_date startDate,
				end_date endDate,
				position
			from shifts
			where
				location_id = ? and
				start_date >= ? and
				end_date <= ? and
				position = ?`;

		const startDate = getDayStart(date);
		const start = toSQLDateString(startDate);

		const endDate = new Date(startDate);
		endDate.setDate(endDate.getDate() + 1);
		const end = toSQLDateString(endDate);

		const { rows } = await db.execute(query, [ locationId, start, end, position ]);

		if (rows && rows[0]) {
			const { startDate, endDate } = Shift.from(rows[0]);
			return new TimeInterval([ startDate, endDate ]);
		}

		return null;
	}

	static getFromIntervals(position: number, intervals: TimeInterval[]): TimeInterval | null {
		for (let i = position; i >= 0; i--) {
			const shift: TimeInterval | null = intervals[i];
			if (shift)
				return shift;
		}

		return null;
	}

	/** Gets the shift intervals for the given date (no time). */
	static async getIntervals(locationId: number, date: Date | string): Promise<TimeInterval[] | null> {
		let query = `
			select
				start_date startDate,
				end_date endDate,
				position
			from shifts
			where
				location_id = ? and
				start_date >= ? and
				end_date <= ? and
				position = 0`;

		date = new Date(date);
		const start = toSQLDateString(date);

		const endDate = new Date(date);
		endDate.setDate(endDate.getDate() + 1);
		const end = toSQLDateString(endDate);
		const { rows } = await db.execute(query, [locationId, start, end]);

		if (rows && rows[0]) {
			const { range } = this.from(rows[0]);
			const definition = this.fromRange(range);
			const shifts = ShiftDefinition.calcIntervalsFrom(range[0], definition);
			return shifts;
		}

		return null;
	}
}