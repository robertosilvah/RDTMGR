import React, { FC, useContext, useEffect, useState } from "react";

import moment from "moment";

import { ParentSize } from "@visx/responsive";

import { Card } from "rmwc";

import { Gantt } from "../components/reports/Gantt";
import { IndicatorsCard } from "../components/reports/Indicators";
import { FullscreenSpinner } from "../components/Spinners";
import TimeFilter, { TimeInterval } from "../components/filters/TimeFilter";
import { getShiftsStart, useFilterChangeCallback } from "../CustomHooks";
import { FilterContext, FilterProvider, LineProcessContext, LineProcessesContext, LineProcessProvider, TimeRange } from "../Context";

import "./Report.scss";

export const Report = () => {
	const lineProcesses = useContext(LineProcessesContext);

	return (
		<div className="report-content">
			<FullscreenSpinner/>

			{
				lineProcesses ?
					Array.from(lineProcesses.values()).map(process => (
						<FilterProvider key={process.location.name}>
							<LineProcessProvider lineProcess={process}>
								<LineProcessComponent />
							</LineProcessProvider>
						</FilterProvider>
					)) : "Loading..."
			}
		</div>
	);
}

const shouldShowGantt = (timeFilter) => {
	switch (timeFilter) {
		case "Week":
		case "Month":
			return false;
		default:
			return true;
	}
}

const LineProcessComponent: FC = () => {
	const { date, dateRange, timeFilter, setFilters } = useContext(FilterContext);

	const lineProcess = useContext(LineProcessContext);

	const [showGantt, setShowGantt] = useState(shouldShowGantt(timeFilter));
	const [shift, setShift] = useState<TimeInterval>();

	const { shifts, realtime } = lineProcess;
	// const [realtime, setRealtime] = useState(true);

	// updates the state and the date range if it changed
	useEffect(() => {
		if (lineProcess && realtime && timeFilter === "Shift") {
			if (shift?.id !== lineProcess.interval?.id) {
				const { interval } = lineProcess;

				if (interval) {
					console.log(`${lineProcess.location?.name}: updating shift to`, interval);
					const dateRange = interval.range.map(s => new Date(s)) as TimeRange;

					setFilters({ dateRange, shiftFilter: interval.id, date: getShiftsStart(shifts) });
					setShift(interval);
				}
			}
		}
	}, [lineProcess, realtime, shifts]);

	// toggle gantt chart
	useEffect(() => {
		setShowGantt(shouldShowGantt(timeFilter));
	}, [timeFilter]);

	const handleFilterChange = useFilterChangeCallback(shift, shifts, (i) => setShift(i));

	const { lineStops, delayTimeStr, delayRate, oee, status, totalPieces, gantt } = lineProcess?.indicators || {};
	const shiftPosition = String(Number(shift?.id) || 0);
	const { interval } = lineProcess;
	let dateRangeInterval = [];
	if (interval && interval.range) {
		dateRangeInterval = interval.range.map(s => new Date(s)) as TimeRange;
	}
	let [start, end] = ['' , '']
	if (dateRangeInterval.length > 1)
		[start, end] = dateRangeInterval;

	return <>
		<div className="filter-container">
			<TimeFilter
				date={date}
				timeFilter={timeFilter}
				shiftFilter={shiftPosition}
				shiftFilters={shifts}
				onChange={handleFilterChange}
			/>
		</div>

		<IndicatorsCard
			line={<>
				{lineProcess.location?.name} {realtime && timeFilter === "Shift" && <span style={{ opacity: .5 }}>· realtime </span>}&nbsp; {<span style={{ opacity: .5 }}> ·  Range:  {moment(start).format("MM/DD/YYYY hh:mm A")}  -  {moment(end).format("MM/DD/YYYY hh:mm A")}</span> }
			</>}
			entry={totalPieces}
			stops={lineStops}
			delayTime={delayTimeStr}
			delayRate={delayRate}
			efficiency={oee}
			lineStatus={status}
			showLineStatus={realtime && timeFilter === "Shift" }
		/>

		{
			showGantt &&
			<Card>
				<ParentSize style={{ padding: "16px 16px 8px" }}>
					{({ width }) => <Gantt
						width={width}
						data={gantt}
						dateRange={dateRange}
						format={timeFilter !== "Shift" ? "%H" : "%H:%M"}
					/>}
				</ParentSize>
			</Card>
		}
	</>;
}

export default Report;
