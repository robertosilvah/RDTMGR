import React, { useContext, useState, useEffect, useCallback, FC } from "react";

import moment from "moment";

import { Select, IconButton, TextField } from "rmwc";

import { Filters, getUTCDayStart } from "../../Helpers";
import { TimeRange, FilterContext } from "../../Context";
import "./TimeFilter.scss";

export class TimeInterval {
	id: number | null;
	range: TimeRange | [string, string];
	description: string;

	constructor(range: TimeRange, id?: number) {
		this.range = range;
		this.id = id || null;
	}

	getIntervalWith(date: Date): TimeInterval {
		const start = this.getCurrentIntervalStart(date);
		const end = new Date(start.getTime() + this.getDuration());

		return new TimeInterval([start, end], this.id);
	}

	getCurrentIntervalStart(date: Date): Date {
		const [intervalStartStr] = this.range;
		const intervalStart = new Date(intervalStartStr);

		const start = getUTCDayStart(date);
		start.setUTCHours(intervalStart.getUTCHours(), intervalStart.getUTCMinutes(), intervalStart.getUTCSeconds(), intervalStart.getUTCMilliseconds());

		return start;
	}

	getDuration(): number {
		const [start, end] = this.range;
		return new Date().getTime() - new Date(start).getTime();
	}

	contains(date: Date): boolean {
		const [start, end] = this.range;
		return date >= start && date < end;
	}

	static from(obj: { id?: number, description: string, startDate: string | Date, endDate: string | Date }) {
		if (!obj) {
			console.error("Tried to create TimeInterval from an invalid object:", obj);
			return null;
		}

		const { startDate, endDate, id } = obj;
		return Object.assign(new this([new Date(startDate), new Date(endDate)], id), obj);
	}
}

export const timeFilters = ["Shift", "Day", "Week", "Month"];

export type TimeFilterChangeEvent = {
	date?: Date;
	timeFilter?: string;
	shiftFilter?: string | number;
	weekFilter?: string;
	search?: string;
	interval?: TimeInterval;
	dateRange?: [Date, Date];
	changed?: boolean;
}

interface TimeFilterProps {
	disabled?: boolean;
	date: Date;
	timeFilter: string;
	shiftFilters?: TimeInterval[];
	shiftFilter?: string | number;
	weekFilter?: string;
	onChange: (e: TimeFilterChangeEvent) => void;
}

const TimeFilter: FC<TimeFilterProps> = ({
	disabled,
	date,
	timeFilter,
	shiftFilter,
	shiftFilters = defaultShiftFilters,
	onChange: handleChange
}) => {
	const [FilterComponent, setComponent] = useState(TimeFilters[timeFilter]);

	useEffect(() => {
		setComponent(() => TimeFilters[timeFilter]);
	}, [timeFilter]);

	return (
		<>
			<Select
				outlined
				disabled={disabled}
				theme={"secondary"}
				className="dense"
				value={timeFilter}
				options={timeFilters}
				onChange={({currentTarget}) => {
					const timeFilter = currentTarget.value;
					const event: TimeFilterChangeEvent = { timeFilter };

					handleChange(event);
				}}
			/>

			{
				FilterComponent && (typeof FilterComponent === "function") &&
				<FilterComponent
					disabled={disabled}
					shiftFilter={shiftFilter}
					shiftFilters={shiftFilters}
					onChange={handleChange}
				/>
			}
		</>
	);
}

const defaultShiftFilters = ["First", "Second", "Third"];

interface ShiftTimeFilterProps {
	interval?: TimeInterval;
	shiftFilter?: string;
	shiftFilters: string[] | TimeInterval[];
	onChange: (e: TimeFilterChangeEvent) => void;
}

const defaultShiftTimeFilterProps = { shiftFilters: defaultShiftFilters, onChange: (e) => console.log(e) };

const PositionStrings = [
	"First",
	"Second",
	"Third",
	"Fourth"
];

export const ShiftTimeFilter: FC<ShiftTimeFilterProps> = ({
	interval,
	shiftFilter,
	shiftFilters,
	onChange: handleChange
} = defaultShiftTimeFilterProps) => {
	return (
		<>
			<Select
				outlined
				className="dense"
				value={shiftFilter}
				onChange={({ currentTarget }) => {
					const value = currentTarget.value;

					const result = (shiftFilters as []).find((v: string | TimeInterval) => {
						if (typeof v === "string")
							return v === value;

						return Number(v.id) === Number(value) || v.description === value;
					});

					if (typeof result === "string")
						handleChange({ shiftFilter: result, search: null });
					else
						handleChange({ interval: result, search: null });
				}}
			>
				{shiftFilters && (shiftFilters as []).map((v: string | TimeInterval) => {
					if (typeof v === "string") {
						return <option key={v} value={v}>{v}</option>
					} else {
						const id = Number(v.id);
						return <option key={id} value={id}>{PositionStrings[id] || id}</option>
					}
				})}
			</Select>

			<DayTimeFilter onChange={handleChange}/>
		</>
	);
}

interface TimeFiltersProps {
	onChange: (e: TimeFilterChangeEvent) => void;
}

export const DayTimeFilter: FC<TimeFiltersProps> = ({onChange: handleChange}) => {
	return (
		<DateFilter
			onPrevDate={(date, dateRange) => {
				const [start, end] = dateRange;
				start.setDate(start.getDate() - 1);
				end.setDate(end.getDate() - 1);
				date.setDate(date.getDate() - 1);
				console.log(dateRange, start, end);
				handleChange({ date, dateRange, search: null });
			}}			
			onDateChanged={(date, dateRange, newDate)  => { 
				const [start, end] = dateRange;
				const diff = end.valueOf() - start.valueOf()

				start.setFullYear(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
				date.setFullYear(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());

				const newEnd = new Date(start.valueOf() + diff);
				end.setFullYear(newEnd.getFullYear(), newEnd.getMonth(), newEnd.getDate());

				handleChange({ date, dateRange, search: null });
			}}
			onNextDate={(date, dateRange) => {
				const [start, end] = dateRange;
				start.setDate(start.getDate() + 1);
				end.setDate(end.getDate() + 1);
				date.setDate(date.getDate() + 1);
				handleChange({ date, dateRange, search: null });
			}}
		/>
	);
}

export const MonthTimeFilter: FC<TimeFiltersProps> = ({onChange: handleChange}) => {
	return (
		<DateFilter
			onPrevDate={(date, _range) => {
				date.setMonth(date.getMonth() - 1);
				const dateRange = Filters.Month(date);
				const [newDate] = dateRange;
				handleChange({ date: newDate, dateRange, search: null });
			}}
			onDateChanged={(date, _range, newDate) => { 
				date.setMonth(newDate.getMonth());
				const dateRange = Filters.Month(date);
				const [newMonthDate] = dateRange;
				handleChange({ date: newMonthDate, dateRange, search: null });
			}}
			onNextDate={(date, _range) => {
				date.setMonth(date.getMonth() + 1);
				const dateRange = Filters.Month(date);
				const [newDate] = dateRange;
				handleChange({ date: newDate, dateRange, search: null });
			}}
		/>
	);
}

interface DateFilterProps {
	onPrevDate: (date: Date, range: TimeRange) => void;
	onDateChanged: (date: Date, range: TimeRange, newDate: Date) => void;
	onNextDate: (date: Date, range: TimeRange) => void;
}

export const DateFilter: FC<DateFilterProps> = ({onPrevDate, onDateChanged, onNextDate}) => {
	const { date, dateRange } = useContext(FilterContext);

	const prevDateHandler = useCallback(() => {
		if (!date || !onPrevDate)
			return;

		const range = dateRange.map(d => new Date(d)) as TimeRange;
		onPrevDate(new Date(date), range);
	}, [date, onPrevDate]);

	const dateChangedHandler = useCallback((evt) => {
		if (!date || !onDateChanged)
			return;

		const newDateValue = evt.currentTarget.value;
		if (newDateValue) {
			const values = newDateValue.split("-").map(v => Number(v));					
			const newDate = new Date();
			newDate.setFullYear(values[0], values[1] - 1, values[2]);
			
			const range = dateRange.map(d => new Date(d)) as TimeRange;
			onDateChanged(new Date(date), range, newDate);			
		}

	}, [date, onDateChanged]);

	const nextDateHandler = useCallback(() => {
		if (!date || !onNextDate)
			return;

		const range = dateRange.map(d => new Date(d)) as TimeRange;
		onNextDate(new Date(date), range);
	}, [date, onNextDate]);

	return (<>
		{
			onPrevDate &&
			<IconButton
				className="date-button"
				icon="chevron_left"
				onClick={prevDateHandler}
			/>
		}

		<TextField
			className="dense"
			outlined
			style={{width: "192px", height: "36px"}}
			type="date"
			value={date ? moment(date).format("YYYY-MM-DD") : ""}
			onChange={dateChangedHandler}
		/>

		{
			onNextDate &&
			<IconButton
				className="date-button"
				icon="chevron_right"
				onClick={nextDateHandler}
			/>
		}
	</>);
}

const TimeFilters = {
	Shift: ShiftTimeFilter,
	Day: DayTimeFilter,
	Week: DayTimeFilter,
	Month: MonthTimeFilter
}

export default TimeFilter;
