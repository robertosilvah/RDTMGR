import { ExecuteResult } from "https://deno.land/x/mysql@v2.7.0/src/connection.ts";
import { DataTypes, FieldProps } from "../consts.ts";
import db from "../db.ts";
import { toSQLDateTimeString } from "../helpers.ts";

export class DelayTypes {
	static table = 'delay_types';
	static endpoint = 'delayTypes';

	static fields: {[field: string]: FieldProps} = {
		id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true
		},
		description: DataTypes.string(50)
	}
}

export class Delay {
	static table = 'delays';

	static fields = {
		id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true
		},
		description: {
			type: DataTypes.STRING,
			allowNull: true
		},
		locationId: {
			type: DataTypes.INTEGER,
			allowNull: true,
			relationship: {
				kind: "single",
				endpoint: "location",
			}
		},
		delayTypeId: {
			type: DataTypes.INTEGER,
			allowNull: true,
			relationship: {
				kind: "single",
				model: DelayTypes
			}
		},
		startDate: DataTypes.TIMESTAMP,
		endDate: DataTypes.TIMESTAMP
	}

	static defaults = {
		enabled: true,
		locationId: null,
		delayTypeId: null
	};

	id?: number;
	startDate: Date;
	endDate: Date;
	description!: string;
	locationId!: number;
	delayTypeId?: number;
	shiftId?: number;

	constructor(start?: Date | null, end?: Date | null, locationId?: number) {
		// super();

		if (start)
			this.startDate = start;
		else
			this.startDate = new Date();

		if (end)
			this.endDate = end;
		else
			this.endDate = new Date();

		if (locationId)
			this.locationId = locationId;
	}

	static async getLast(locationId: number, startDate: Date): Promise<Delay | null> {
		const query = `
			select
				id,
				location_id locationId,
				start_date startDate,
				end_date endDate,
				description
			from delays
			where
				location_id = ?
				and start_date >= ?
			order by
				start_date desc
			limit 1`;

		const start = toSQLDateTimeString(startDate);
		const {rows} = await db.execute(query, [locationId, start]);

		return rows ? rows[0] : null;
	}

	static async getById(id: number): Promise<Delay | null> {
		const query = `
			select
				id,
				location_id locationId,
				start_date startDate,
				end_date endDate,
				description
			from delays
			where id = ?
			limit 1`;

		const {rows} = await db.execute(query, [id]);
		return rows ? rows[0] : null;
	}

	static async update(id: number, startDate: Date, endDate: Date): Promise<ExecuteResult> {
		const query = `update delays
			set
				start_date = ?,
				end_date = ?
			where id = ?`;

		const start = toSQLDateTimeString(startDate);
		const end = toSQLDateTimeString(endDate);

		return await db.execute(query, [start, end, id]);
	}

	static async create(locationId: number, startDate: Date, endDate: Date, shiftId: number): Promise<ExecuteResult> {
		const query = `insert
			into delays(location_id, start_date, end_date, shift_id)
			values (?, ?, ?, ?)`;

		const start = toSQLDateTimeString(startDate);
		const end = toSQLDateTimeString(endDate);

		return await db.execute(query, [locationId, start, end, shiftId]);
	}

	static async delete(id: number): Promise<ExecuteResult> {
		const query = `delete from delays where id = ?`;
		return await db.execute(query, [id]);
	}

	static async getByTimeRange(locationId: number, startDate: Date, endDate: Date): Promise<Delay[]> {
		let query = `
			select
				id,
				location_id locationId,
				start_date startDate,
				end_date endDate,
				description
			from delays
			where
				location_id = ? and
				((? is null) or start_date >= ?) and
				((? is null) or end_date <= ?)
			order by start_date`;

		const start = toSQLDateTimeString(startDate);
		const end = toSQLDateTimeString(endDate);

		const { rows } = await db.execute(query, [locationId, start, start, end, end]);

		return rows?.map(r => Delay.from(r)) || [];
	}

	static from(from: Partial<Delay>): Delay {
		return Object.assign(new Delay, from);
	}
}
