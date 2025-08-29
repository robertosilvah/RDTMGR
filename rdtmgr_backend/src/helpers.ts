export const getFields = (model: any) => {
	const fields = JSON.parse(JSON.stringify(model.fields));
	const defaults = model.defaults as any;

	Object.keys(fields).forEach(name => {
		let field = fields[name];
		
		if (typeof field === 'string') {
			field = {type: field}
			fields[name] = field;
		}

		const value = defaults[name];

		if (value)
			field.default = value;
	});

	return fields;
}

export function toSQLDateString(date: Date | string) {
	if (date) {
		const d = new Date(date);
		d.setTime(d.getTime() - d.getTimezoneOffset() * 60000);
		return `${d.toISOString().slice(0, 10)}`;
	}
}

export function toSQLDateTimeString(date: Date) {
	if (date) {
		const d = new Date(date);
		d.setTime(d.getTime() - d.getTimezoneOffset() * 60000);
		return `${d.toISOString().slice(0, 19).replace('T', ' ')}`;
	}
}

export function toSQLTimeString(d: Date) {
	if (d) {
		const hours = d.getUTCHours();
		const min = d.getUTCMinutes();
		const sec = d.getUTCSeconds();
		return `${hours}:${min}:${sec}`;
	}
}

export function getStack(error: { stack?: string }) {
	return error?.stack?.toString().replace("Error", "") || "";
}

export function getDayStart(date: Date | string): Date {
	const dayStart = new Date(date);
	dayStart.setHours(0, 0, 0, 0);
	return dayStart;
}

export function getUTCDayStart(date: Date): Date {
	const dayStart = getDayStart(date);
	dayStart.setUTCHours(0, 0, 0, 0);
	return dayStart;
}

export function varAsBoolean(variable?: string | null): boolean {
	if (!variable)
		return false;

	return (
		String(variable).toLocaleLowerCase() === "true" ||
		Number(variable) === 1
	);
}

export function getUTCTimeFromDate(date: Date | string): string {
	const d = new Date(date);
	const hours = String(d.getUTCHours()).padStart(2, "0");
	const min = String(d.getUTCMinutes()).padStart(2, "0");
	return `${hours}:${min}`;
}

export function msToTimeString(duration: number) {
	const remainingMin = duration % 36e5;
	const hours = (duration - remainingMin) / 36e5;
	const remainingSec = remainingMin % 6e4;
	const minutes = (remainingMin - remainingSec) / 6e4;
	const remainingMs = remainingSec % 1e3;
	const seconds = (remainingSec - remainingMs) / 1e3;

	const paddedHours = String(hours).padStart(2, "0");
	const paddedMinutes = String(minutes).padStart(2, "0");
	const paddedSeconds = String(seconds).padStart(2, "0");

	return `${paddedHours}:${paddedMinutes}:${paddedSeconds}`;
}
