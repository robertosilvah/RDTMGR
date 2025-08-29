import { log, LogRecord } from "./deps.ts";
import { toSQLDateTimeString } from "./helpers.ts";

// const LogRecordFormatter = "[{datetime} - {levelName}] {msg}";

const logLevel = (Deno.env.get("LOG_LEVEL") as log.LevelName) || log.LogLevels.DEBUG;

const LogRecordFormatter = (record: LogRecord, opts = { useDate: true }) => {
	const { levelName, msg, datetime, args } = record;

	let string = opts.useDate ?
		`[${toSQLDateTimeString(datetime)} | ${levelName}] ${msg}` :
		`[${levelName}] ${msg}`;

	args.forEach(arg => {
		if (typeof arg === "object")
			string += ` ${JSON.stringify(arg, null, 4)}`;
		else
			string += ` ${arg}`;
	});

	return string;
}

const fileHandler = new log.handlers.RotatingFileHandler("DEBUG", {
	filename: "./log.txt",
	formatter: LogRecordFormatter,
	maxBytes: 4e6,
	maxBackupCount: 64
})

const opts = { useDate: false };

await log.setup({
	handlers: {
		console: new log.handlers.ConsoleHandler("DEBUG", {
			formatter: record => {
				fileHandler.flush();
				return LogRecordFormatter(record, opts);
			}
		}),

		file: fileHandler,
	},

	loggers: {
		default: {
			level: logLevel,
			handlers: ["file", "console"]
		}
	}
})

export const logger = log.getLogger();