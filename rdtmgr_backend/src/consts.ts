export type FieldTypes =
| "BIG_INTEGER"
| "INTEGER"
| "DECIMAL"
| "FLOAT"
| "UUID"
| "BOOLEAN"
| "BINARY"
| "ENUM"
| "STRING"
| "TEXT"
| "DATE"
| "DATETIME"
| "TIME"
| "TIMESTAMP"
| "JSON"
| "JSONB";

export type Fields =
& {
	[key in FieldTypes]: FieldTypeString;
}
& {
	decimal: (precision: number, scale?: number) => {
		type: FieldTypeString;
		precision: number;
		scale?: number;
	};
	string: (length: number) => { type: FieldTypeString; length: number };
	enum: (
		values: (number | string)[],
	) => { type: FieldTypeString; values: (number | string)[] };
};

export const DataTypes: Fields = {
	INTEGER: "integer",
	BIG_INTEGER: "bigInteger",
	DECIMAL: "decimal",
	FLOAT: "float",
	UUID: "uuid",

	BOOLEAN: "boolean",
	BINARY: "binary",

	ENUM: "enu",
	STRING: "string",
	TEXT: "text",

	DATE: "date",
	DATETIME: "datetime",
	TIME: "time",
	TIMESTAMP: "timestamp",

	JSON: "json",
	JSONB: "jsonb",

	decimal(precision: number, scale?: number) {
		return {
			type: this.DECIMAL,
			precision,
			scale,
		};
	},

	string(length: number) {
		return {
			type: this.STRING,
			length,
		};
	},

	enum(values: (number | string)[]) {
		return {
			type: this.ENUM,
			values,
		};
	},
};

export type FieldTypeString =
  | "bigInteger"
  | "integer"
  | "decimal"
  | "float"
  | "uuid"
  | "boolean"
  | "binary"
  | "enu"
  | "string"
  | "text"
  | "date"
  | "datetime"
  | "time"
  | "timestamp"
  | "json"
  | "jsonb";

export type FieldProps = {
	type?: FieldTypeString;
	as?: string;
	primaryKey?: boolean;
	unique?: boolean;
	autoIncrement?: boolean;
	length?: number;
	allowNull?: boolean;
	precision?: number;
	scale?: number;
	values?: (number | string)[];
	relationship?: Relationship;
};

export type Relationship = {
	kind: "single" | "multiple";
	model: & { endpoint: string };
};

export type RelationshipType = {
	type: FieldTypeString;
	relationship: Relationship;
};

export enum LineStatus {
	INITIALIZING = "Initializing",
	LOST_MQTT_CONNECTION = "Lost broker connection",
	RUNNING = "Running",
	DELAYED = "Delayed",
}
