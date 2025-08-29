import { ExecuteResult } from "../deps.ts";
import { DataTypes, FieldProps } from "../consts.ts";
import db from "../db.ts";
import { toSQLDateTimeString } from "../helpers.ts";
import { Location } from "./locations.ts";

export class Product {
	static table = 'products';
	static endpoint = 'products';

	name!: string;

	static fields: {[field: string]: FieldProps} = {
		id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true
		},
		name: {
			type: DataTypes.STRING,
			length: 20
		},
		enabled: DataTypes.BOOLEAN
	}

	static defaults = {
		enabled: true
	};

	static async getById(id: number): Promise<Product | null> {
		const query = `
			select *
			from products
			where
				id = ?`;

		const {rows} = await db.execute(query, [id]);
		return rows ? rows[0] : null;
	}

	static async getEnabled(): Promise<Product[]> {
		const query = `
			select *
			from products
			where enabled = 1`;

		const {rows} = await db.execute(query);
		return rows || [];
	}

	static async all(): Promise<Product[]> {
		const query = `
			select *
			from products`;

		const {rows} = await db.execute(query);
		return rows || [];
	}

	static async update(id: number, name: string, enabled: boolean): Promise<ExecuteResult> {
		const query = `update products
			set
				name = ?,
				enabled = ?
			where id = ?`;

		return await db.execute(query, [name, enabled, id]);
	}

	static async create(name: string, enabled: boolean): Promise<ExecuteResult> {
		const query = `insert
			into products(name, enabled)
			values (?, ?)`;

		return await db.execute(query, [name, enabled]);
	}

	static async disable(id: number): Promise<ExecuteResult> {
		const query = `update products
			set enabled = 0
			where id = ?`;

		return await db.execute(query, [id]);
	}
}

export class ProductionStandard {
	static table = 'production_standards';
	static endpoint = 'production/standards';

	value!: number;
	unit!: string;
	productId!: number;
	private millis?: number;

	static fields = {
		id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true
		},
		productId: {
			type: DataTypes.INTEGER,
			relationship: {
				kind: "single",
				endpoint: "products",
			}
		},
		locationId: {
			type: DataTypes.INTEGER,
			relationship: {
				kind: "single",
				endpoint: "locations",
			}
		},
		value: DataTypes.FLOAT,
		unit: {
			type: DataTypes.STRING,
			length: 20
		},
		enabled: DataTypes.BOOLEAN
	}

	static defaults = {
		enabled: true
	}

	static async getById(id: number): Promise<ProductionStandard | null> {
		const query = `
			select
				id,
				location_id locationId,
				product_id productId,
				value,
				unit,
				enabled
			from production_standards
			where
				id = ?
				and enabled = 1`;

		const {rows} = await db.execute(query, [id]);
		return rows && rows[0] ? ProductionStandard.from(rows[0]) : null;
	}

	static async get(productId: number, locationId: number): Promise<ProductionStandard | null> {
		const query = `
			select
				id,
				location_id locationId,
				product_id productId,
				value,
				unit,
				enabled
			from production_standards
			where
				location_id = ?
				and product_id = ?
			limit 1`;

		const {rows} = await db.execute(query, [locationId, productId]);
		return rows && rows[0] ? ProductionStandard.from(rows[0]) : null;
	}

	static async getEnabled(): Promise<ProductionStandard[]> {
		const query = `
			select
				id,
				location_id locationId,
				product_id productId,
				value,
				unit,
				enabled
			from production_standards
			where enabled = 1`;

		const {rows} = await db.execute(query);
		return rows ? rows.map(i => ProductionStandard.from(i)) : [];
	}

	static async all(): Promise<ProductionStandard[]> {
		const query = `
			select
				id,
				location_id locationId,
				product_id productId,
				value,
				unit,
				enabled
			from production_standards`;

		const {rows} = await db.execute(query);
		return rows ? rows.map(i => ProductionStandard.from(i)) : [];
	}

	static async update(
		id: number,
		locationId: number,
		productId: number,
		value: number,
		unit: string,
		enabled: boolean
	): Promise<ExecuteResult> {
		const query = `
			update production_standards
			set
				location_id = ?,
				product_id = ?,
				value = ?,
				unit = ?,
				enabled = ?
			where id = ?`;

		return await db.execute(query, [locationId, productId, value, unit, enabled, id]);
	}

	static async create(
		locationId: number,
		productId: number,
		value: number,
		unit: string,
		enabled: boolean
	): Promise<ExecuteResult> {
		const query = `
			insert
			into production_standards(location_id, product_id, value, unit, enabled)
			values (?, ?, ?, ?, ?)`;

		return await db.execute(query, [locationId, productId, value, unit, enabled]);
	}

	static async disable(id: number): Promise<ExecuteResult> {
		const query = `
			update production_standards
			set enabled = 0
			where id = ${id}`;

		return await db.execute(query);
	}

	static from(from: Partial<ProductionStandard>): ProductionStandard {
		return Object.assign(new ProductionStandard, from);
	}

	getStandardInMillis(): number {
		if (!this.millis)
			this.millis = 3600 * 1000 / this.value;

		return this.millis;
	}
}

export class Production {
	static table = 'production';
	static endpoint = 'production';

	id: number | null = null;
	productId!: number;
	locationId!: number;
	shiftId!: number;
	totalPieces = 0;
	goodPieces = 0;
	badPieces = 0;
	startDate: Date;
	endDate!: Date;
	cycleTime!: number;
	insertDate!: Date;
	enabled!: boolean;

	constructor(location?: Location) {
		// super();
		this.startDate = new Date();
		this.endDate = new Date();

		if (location)
			this.locationId = location.id;
	}

	static fields = {
		id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true
		},
		productId: {
			type: DataTypes.INTEGER,
			relationship: {
				kind: 'single',
				model: Product,
			},
			allowNull: true
		},
		locationId: {
			type: DataTypes.INTEGER,
			relationship: {
				kind: 'single',
				endpoint: "location"
			}
		},
		shiftId: {
			type: DataTypes.INTEGER,
			relationship: {
				kind: 'single',
				endpoint: "shift",
			}
		},
		totalPieces: {
			type: DataTypes.INTEGER
		},
		goodPieces: {
			type: DataTypes.INTEGER
		},
		badPieces: {
			type: DataTypes.INTEGER
		},
		startDate: {
			type: DataTypes.TIMESTAMP
		},
		endDate: {
			type: DataTypes.TIMESTAMP
		},
		insertDate: {
			type: DataTypes.TIMESTAMP
		},
		cycleTime: {
			type: DataTypes.FLOAT
		}
	}

	static defaults = {
		enabled: true,
		totalPieces: 0,
		goodPieces: 0,
		badPieces: 0
	}

	static async getByTimeRange(locationId: number, startDate: Date, endDate: Date): Promise<Production[]> {
		const query = `
			select
				id,
				start_date startDate,
				end_date endDate,
				product_id productId,
				location_id locationId,
				shift_id shiftId,
				total_pieces totalPieces,
				good_pieces goodPieces,
				bad_pieces badPieces,
				cycle_time cycleTime
			from production
			where
				location_id = ? and
				((? is null) or start_date >= ?) and
				((? is null) or end_date <= ?)
			order by start_date, end_date, id`;

		const start = toSQLDateTimeString(startDate);
		const end = toSQLDateTimeString(endDate);
		
		const {rows} = await db.execute(query, [locationId, start, start, end, end]);

		return rows || [];
	}

	static async getLast(locationId: number, startDate: Date): Promise<Production | null> {
		const query = `
			select
				id,
				start_date startDate,
				end_date endDate,
				product_id productId,
				location_id locationId,
				shift_id shiftId,
				total_pieces totalPieces,
				good_pieces goodPieces,
				bad_pieces badPieces,
				cycle_time cycleTime
			from production
			where
				location_id = ?
				and start_date >= ?
			order by start_date desc
			limit 1`;

		const start = toSQLDateTimeString(startDate);
		const {rows} = await db.execute(query, [locationId, start]);

		return rows ? rows[0] : null;
	}

	static async updateProduct(locationId: number, startDate: Date, endDate: Date, productId: number): Promise<ExecuteResult> {
		const query = `
			update production
			set product_id = ?
			where
				location_id = ?
				and product_id != ?
				and start_date >= ?
				and end_date <= ?`;

		const start = toSQLDateTimeString(startDate);
		const end = toSQLDateTimeString(endDate);

		return await db.execute(query, [productId, locationId, productId, start, end]);
	}

	static async update(
		id: number,
		startDate: Date,
		endDate: Date,
		productId: number,
		locationId: number,
		shiftId: number,
		totalPieces: number,
		badPieces: number,
		cycleTime: number
	): Promise<ExecuteResult> {
		const query = `update production
			set
				start_date = ?,
				end_date = ?,
				product_id = ?,
				location_id = ?,
				shift_id = ?,
				total_pieces = ?,
				good_pieces = ?,
				bad_pieces = ?,
				cycle_time = ?
			where id = ?`;

		const start = toSQLDateTimeString(startDate);
		const end = toSQLDateTimeString(endDate);
		const goodPieces = totalPieces - badPieces;

		return await db.execute(query, [start, end, productId, locationId, shiftId, totalPieces, goodPieces, badPieces, cycleTime, id]);
	}

	static async create(
		startDate: Date,
		endDate: Date,
		productId: number,
		locationId: number,
		shiftId: number,
		totalPieces: number,
		badPieces: number,
		cycleTime: number
	): Promise<ExecuteResult> {
		const query = `insert
			into production(start_date, end_date, product_id, location_id, shift_id, total_pieces,
				good_pieces, bad_pieces, cycle_time)
			values (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

		const start = toSQLDateTimeString(startDate);
		const end = toSQLDateTimeString(endDate);
		const goodPieces = totalPieces - badPieces;

		return await db.execute(query, [start, end, productId, locationId, shiftId, totalPieces, goodPieces, badPieces, cycleTime]);
	}

	static async findById(id: number): Promise<Production | null> {
		const query = `
			select
				id,
				location_id locationId,
				start_date startDate,
				end_date endDate,
				product_id productId,
				location_id locationId,
				shift_id shiftId,
				total_pieces totalPieces,
				good_pieces goodPieces,
				bad_pieces badPieces,
				cycle_time cycleTime
			from production
			where id = ?
			limit 1`;

		const {rows} = await db.execute(query, [id]);
		return rows ? rows[0] : null;
	}
}
