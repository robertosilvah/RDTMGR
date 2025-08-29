import { TimeInterval } from "./components/filters/TimeFilter";
import { GanttDatum } from "./components/reports/Gantt";
import { TimeRange } from "./Context";
import { getUTCDayStart } from "./Helpers";

export interface LineProcess {
	lastTimestamp: string;
	location: Location;
	interval: TimeInterval;
	shifts: TimeInterval[];
	standard: ProductionStandard;
	indicators: LineProcessIndicators;
}

export interface LineProcessIndicators {
	status: string;
	cycleTime: string;
	lineStops: number;
	delayTimeStr: string;
	delayRate: string;
	availability: string;
	performance: string;
	quality: number;
	oee: number;
	gantt: GanttDatum[];
	totalPieces: number;
}

export type LineProcessState = Partial<LineProcess> & { realtime: boolean };
export type LineProcesses = Map<string | number, LineProcessState>;

export interface Location {
	id: number;
	name: string;
	parentId: number;
	enabled: boolean;
}

export class ShiftDefinition {
	id: number;
	locationId: number;
	startDate: string;
	endDate: string;
	description: string;
	enabled: boolean;

	static new(from: Partial<ShiftDefinition>): ShiftDefinition {
		return Object.assign(new ShiftDefinition(), from);
	}

	static getMatchingInterval(date: Date, shifts: ShiftDefinition[]): TimeInterval | null {
		const intervals = ShiftDefinition.getCalculatedIntervalsFrom(date, shifts);
		for (const i of intervals) {
			if (i.contains(date))
				return i;
		}

		return null;
	}

	getIntervalWith(date: Date): TimeInterval {
		const interval = new TimeInterval(this.getDateRange(), this.id);
		return interval.getIntervalWith(date);
	}

	getDateRange(): TimeRange {
		return [new Date(this.startDate), new Date(this.endDate)];
	}

	static getIntervalsWith(date: Date, shiftDefinitions: ShiftDefinition[]) {
		return shiftDefinitions.map(({ id, startDate, endDate }) => {
			const interval = new TimeInterval([new Date(startDate), new Date(endDate)], id);
			return interval.getIntervalWith(date);
		});
	}

	static getCalculatedIntervalsFrom(date: Date, shiftDefinitions: ShiftDefinition[]): TimeInterval[] {
		const reference = ShiftDefinition.getStartingDay(shiftDefinitions);
		const correctedDate = ShiftDefinition.getCorrectedDate(date, shiftDefinitions);
		const dayStart = getUTCDayStart(correctedDate);
		const intervals = shiftDefinitions.map(shift => shift.getOffsetedIntervalFrom(dayStart, reference));
		return intervals;
	}

	static getStartingDay(shifts: ShiftDefinition[]): Date {
		const { startDate } = shifts[0];
		const startingDay = new Date(startDate);
		startingDay.setUTCHours(0, 0, 0, 0);
		return startingDay;
	}

	static getCorrectedDate(date: Date, shiftDefinitions: ShiftDefinition[]): Date {
		const firstShiftHours = new Date(shiftDefinitions[0].startDate).getHours();

		if (date.getHours() < firstShiftHours) {
			const correctedDate = new Date(date);
			correctedDate.setDate(date.getDate() - 1);
			return correctedDate;
		}

		return date;
	}

	getOffsetedIntervalFrom(date: Date, reference: Date): TimeInterval {
		const refToIntervalStartDelta = new Date(this.startDate).getTime() - reference.getTime();
		const refToIntervalEndDelta = new Date(this.endDate).getTime() - reference.getTime();

		const start = new Date(date.getTime() + refToIntervalStartDelta);
		const end = new Date(date.getTime() + refToIntervalEndDelta);
		return new TimeInterval([start, end], this.id);
	}
}

export interface Delay {
	id?: number;
	startDate: Date;
	endDate?: Date;
	description: string;
	locationId: number;
	delayTypeId?: number;
}

export interface Production {
	id: number;
	productId: number;
	locationId: number;
	shiftId: number;
	totalPieces: number;
	goodPieces: number;
	badPieces: number;
	startDate: Date;
	endDate: Date;
	cycleTime: number;
	insertDate: Date;
	enabled: boolean;
}

export interface GanttItem {
	startDate: string | Date;
	endDate: string | Date;
	value: boolean;
	totalPieces?: number;
	goodPieces?: number;
	badPieces?: number;
}

export interface ProductionStandard {
	value: number;
	unit: string;
	productId: number;
}