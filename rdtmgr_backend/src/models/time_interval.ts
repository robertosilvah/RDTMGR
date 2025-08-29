import { getUTCDayStart } from "../helpers.ts";

export type TimeRange = [Date, Date];

export class TimeInterval {
	id: number | null;
	range: TimeRange;

	constructor(range: TimeRange, id?: number | null) {
		this.range = range;
		this.id = id ?? null;
	}

	getIntervalWith(date: Date): TimeInterval {
		const start = this.getCurrentIntervalStart(date);
		const end = new Date(start.getTime() + this.getDuration());

		return new TimeInterval([start, end], this.id);
	}

	getCurrentIntervalStart(date: Date): Date {
		const [intervalStart] = this.range;

		const start = getUTCDayStart(date);
		start.setUTCHours(intervalStart.getUTCHours(), intervalStart.getUTCMinutes(), intervalStart.getUTCSeconds(), intervalStart.getUTCMilliseconds());

		return start;
	}

	getDuration(): number {
		const [start, end] = this.range;
		return end.getTime() - start.getTime();
	}

	contains(date: Date): boolean {
		const [start, end] = this.range;
		return date >= start && date <= end;
	}
}