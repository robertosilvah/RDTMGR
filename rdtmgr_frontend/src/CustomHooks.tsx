import React, { useCallback, useContext } from "react"
import { TimeFilterChangeEvent, TimeInterval } from "./components/filters/TimeFilter";

import { FilterContext, TimeRange } from "./Context";
import { Filters } from "./Helpers";

export function getShiftsStart(shifts: TimeInterval[]) {
	const { range: [shiftsStart] } = shifts[0];
	return new Date(shiftsStart);
}

export function useFilterChangeCallback(
	selectedShift: TimeInterval,
	shifts: TimeInterval[],
	shiftChanged: (interval: TimeInterval) => void
) {
	const { timeFilter, date, setFilters } = useContext(FilterContext);

	const callback = useCallback((e: TimeFilterChangeEvent) => {
		if (e.interval) {
			const { interval } = e;
			const { id: shiftFilter, range } = interval;

			const dateRange = range.map(s => new Date(s)) as TimeRange;
			const filters: TimeFilterChangeEvent = {
				dateRange, shiftFilter,
				date: getShiftsStart(shifts)
			};

			setFilters(filters);
			shiftChanged(interval);
		} else if (e.timeFilter === "Shift") {
			const { range, id: shiftFilter } = selectedShift;

			const dateRange = range.map(s => new Date(s)) as TimeRange;
			const filters: TimeFilterChangeEvent = {
				...e, dateRange, shiftFilter,
				date: getShiftsStart(shifts)
			};

			setFilters(filters);
		} else if (e.timeFilter === "Day") {
			const start = getShiftsStart(shifts);
			const end = new Date(start.getTime() + 864e5);
			const dateRange: TimeRange = [start, end];
			const filters = { ...e, dateRange, date: start };

			console.log(filters);
			setFilters(filters);
		} else if (e.timeFilter === "Week") {
			const start = getShiftsStart(shifts);
			const end = new Date(start);
			end.setDate(end.getDate() + 7);

			const dateRange: TimeRange = [start, end];
			const filters = { ...e, dateRange, date: start };

			console.log(filters);
			setFilters(filters);
		} else if (e.timeFilter === "Month") {
			const dateRange = Filters.Month(date);
			const [start] = dateRange;
			const filters = { ...e, dateRange, date: start };

			console.log(filters);
			setFilters(filters);
		} else {
			console.log(e);
			setFilters(e);
		}
	}, [timeFilter, date, selectedShift, shifts]);

	return callback;
}
