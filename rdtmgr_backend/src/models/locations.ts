import { ExecuteResult } from "https://deno.land/x/mysql@v2.7.0/src/connection.ts";
import { DataTypes, FieldProps } from "../consts.ts";
import db from "../db.ts";
import { logger } from "../logger.ts";

export class Location {
	static table = 'locations';
	static endpoint = 'locations';

	id!: number;
	name!: string;
	parentId!: number;
	enabled!: boolean;

	static fields = {
		id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true
		},
		name: {
			type: DataTypes.STRING,
			length: 20
		},
		parentId: {
			type: DataTypes.INTEGER,
			allowNull: true,
			relationship: {
				kind: "single",
				endpoint: "locations",
			}
		},
		enabled: {
			type: DataTypes.BOOLEAN
		}
	}

	static defaults = {
		enabled: true,
		parentId: null
	};

	static async getById(id: number): Promise<Location | null> {
		const query = `
			select
				id,
				name,
				parent_id parentId,
				enabled
			from locations
			where
				id = ?
				and enabled = 1
			limit 1`;

		const {rows} = await db.execute(query, [id]);
		return rows ? rows[0] : null;
	}

	static async getByName(name: string): Promise<Location | null> {
		const query = `
			select
				id,
				name,
				parent_id parentId,
				enabled
			from locations
			where
				name = ?
				and enabled = 1
			limit 1`;

		const {rows} = await db.execute(query, [name]);
		return rows ? rows[0] : null;
	}

	static async getByNameOrId(location: string | number): Promise<Location | null> {
		const locationId = Number(location);
		let actualLocation: Location | null = null;

		if (locationId) {
			try {
				// actualLocation = await Location
				// 	.where("id", locationId)
				// 	.where("enabled", true)
				// 	.first();
				actualLocation = await Location.getById(locationId);
			} catch (ex) {
				console.error(`Error while searching location by id ${locationId}: ${ex.message}`);
			}
		} else {
			const locationName = String(location);

			try {
				// actualLocation = await Location
				// 	.where("name", location)
				// 	.where("enabled", true)
				// 	.first();
				actualLocation = await Location.getByName(locationName)
			} catch (ex) {
				logger.debug(location);
				console.error(`Error while searching location by name ${locationName}: ${ex.message}`);
			}
		}

		return actualLocation;
	}

	static async getEnabled(): Promise<Location[]> {
		const query = `
			select
				id,
				name,
				parent_id parentId,
				enabled
			from locations
			where enabled = 1`;

		const {rows} = await db.execute(query);
		return rows || [];
	}

	static async all(): Promise<Location[]> {
		const query = `
			select
				id,
				name,
				parent_id parentId,
				enabled
			from locations`;

		const {rows} = await db.execute(query);
		return rows || [];
	}

	static async create(name: string, parentId: number | undefined, enabled: boolean): Promise<ExecuteResult> {
		const query = `
			insert
			into locations(name, parent_id, enabled)
			values (?, ?, ?)`;

		return await db.execute(query, [name, parentId, enabled]);
	}

	static async update(id: number, name: string, parentId: number | undefined, enabled: boolean): Promise<ExecuteResult> {
		const query = `
			update locations
			set
				name = ?,
				parent_id = ?,
				enabled = ?
			where id = ?`;

		return await db.execute(query, [name, parentId, enabled, id]);
	}

	static async disable(id: number): Promise<ExecuteResult> {
		const query = `
			update locations
			set enabled = 0
			where id = ?`;

		return await db.execute(query, [id]);
	}
}
