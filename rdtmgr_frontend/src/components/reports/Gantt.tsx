import React, { CSSProperties, FC, useCallback, useEffect, useState } from "react";

import { Group } from "@visx/group";
import { Grid } from "@visx/grid";
import { Bar, Line } from "@visx/shape";
import { AxisBottom } from "@visx/axis";
import { scaleLinear, scaleTime } from "@visx/scale";
import { useTooltip, TooltipWithBounds } from "@visx/tooltip";
import { timeFormat } from "d3-time-format";
import { GanttItem } from "../../Models";

import "./Gantt.scss";

/** 
 * @param {Date[]} domain
 */
export const getRandomData = (domain) => {
	let arr = [];

	for (let i = 0; i < 13; i++)
		arr.push(Math.random());

	const scale = scaleLinear({
		domain: [ 0, 1 ],
		range: [
			domain[0].getTime(),
			domain[1].getTime()
		]
	});

	arr = arr.sort().map((v, i, arr) => {
		return {
			start: i === 0 ? domain[0] : new Date(scale(arr[i - 1])),
			end: i !== arr.length - 1 ? new Date(scale(v)) : domain[1],
			value: i % 2 === 0
		};
	});

	return arr;
}

const getDefaultDateRange = () => {
	let dateRange = [ new Date(), new Date() ];
	dateRange[1].setDate(dateRange[1].getDate() + 1);

	dateRange = dateRange.map(d => {
		const date = new Date(d);
		date.setHours(0, 0, 0, 0);
		return date;
	});

	return (dateRange as [Date, Date]);
}

export type StyleMap = {[value: string]: CSSProperties};

const defaultStyles: StyleMap = {
	false: {
		fill: "#6dc78c"
	},
	true: {
		fill: "#ad4d4f"
	}
};

export type GanttDatum = {
	id?: number;
	start: Date | string;
	end: Date | string;
	value: boolean;
}

type TooltipDefinition = {
	field: string | number,
	label: string,
	type?: string,
};

export interface GanttProps {
	width?: number;
	height?: number;
	vPadding?: [number, number];
	dateRange?: [Date, Date];
	data?: GanttDatum[];
	property?: string;
	styles?: StyleMap;
	showGrid?: boolean;
	showAxis?: boolean;
	tooltips?: TooltipDefinition[];
	
	/** @see d3-time-format */
	format?: string;
}

const defaultTooltips: TooltipDefinition[] = [
	{ field: "start", label: "Start", type: "date" },
	{ field: "end", label: "End", type: "date" },
	{ field: "duration", label: "Duration" },
	{ field: "pieces", label: "Pieces" }
];

export const Gantt = ({
	width = 800,
	height = 64,
	vPadding = [8, 8],
	dateRange,
	data: dataSet,
	property = "value",
	styles: customStyles,
	showGrid = true,
	showAxis = true,
	tooltips = defaultTooltips,
	format = "%H:%M"
}: GanttProps) => {
	const [xDomain, setXDomain] = useState<[Date, Date]>();

	// updates the xDomain
	useEffect(() => {
		setXDomain(dateRange || getDefaultDateRange());
	}, [dateRange]);

	const [positions, setPositions] = useState({ grid: {top: null, bottom: null}, bars: {top: null, bottom: null}});

	const barTopPadding = (vPadding && vPadding[0]) || 0;
	const barBottomPadding = (vPadding && vPadding[1]) || 0;

	// updates the positions
	useEffect(() => {
		let barsTop = barTopPadding;
		let barsBottom = barBottomPadding;
		let gridBottom = height;

		if (showGrid) {
			barsBottom += Number(showGrid) * 8;
		} else {
			barsTop = 0;
			barsBottom = 0;
		}

		if (showAxis) {
			barsBottom += Number(showAxis) * 24;
			gridBottom -= 24;
		} else {
			gridBottom--;
		}
		
		setPositions({
			bars: {
				top: barsTop,
				bottom: barsBottom
			},
			grid: {
				top: null,
				bottom: gridBottom
			}
		});
	
	}, [height, barTopPadding, barBottomPadding, showGrid, showAxis]);

	const [xScale, setXScale] = useState(() => scaleTime({
		domain: xDomain,
		range: [ 0, width - 1 ]
	}));

	// updates the xScale
	useEffect(() => {
		setXScale(() => scaleTime({
			domain: xDomain,
			range: [ 0, width - 1 ]
		}));
	}, [width, xDomain]);

	const [data, setData] = useState<GanttDatum[]>();

	// updates the data
	useEffect(() => {
		setXDomain(prev => {
			if (dataSet) {
				// if (JSON.stringify(prev) !== JSON.stringify(dataSet))
					setData(dataSet);
			} else {
				setData(getRandomData(prev));
			}

			return prev;
		});
	}, [dataSet]);

	const [styles, setStyles] = useState(defaultStyles);

	useEffect(() => {
		setStyles(customStyles || defaultStyles);
	}, [customStyles]);

	const [yScale] = useState(() => scaleLinear({
		domain: [0, 40],
		range: [0, 40]
	}));

	const {
		tooltipData,
		tooltipLeft,
		tooltipTop,
		tooltipOpen,
		showTooltip,
		hideTooltip
	} = useTooltip<GanttDatum>();

	const handleMouseEnter = (event, datum) => {
		let {layerX, layerY} = event.nativeEvent;
		layerX = layerX + 10;
		layerY = layerY + 120;
		showTooltip({
			tooltipLeft: layerX,
			tooltipTop: layerY,
			tooltipData: datum
		});

		// console.log("showTooltip", datum, properties);
	};

	const tickFormat = useCallback((v /*, i: number*/) => timeFormat(format)(v), [format]);

	const calcWidth = useCallback(({ start, end }: GanttDatum, i, arr) => {
		const {length} = arr;
		const result = xScale(new Date(end)) - xScale(new Date(start)) - 2 * (Number(i !== length) - 1);

		// if (!result)
		// 	console.error("This object produced a NaN width:", v);

		return result || 0;
	}, [xScale]);

	return (<>
		<svg
			width={width}
			height={height}
			shapeRendering="crispEdges"
			style={{display: "block"}}
		>
			{
				showGrid && <>
					<Grid
						xScale={xScale}
						yScale={yScale}
						stroke={"rgba(0, 0, 0, .24)"}
						width={width}
						height={height - Number(showAxis) * 24}
						numTicksRows={0}
						numTicksColumns={14}
					/>

					<Line
						x2={width}
						stroke={"rgba(0, 0, 0, .24)"}
					/>

					<Line
						y1={positions.grid.bottom}
						y2={positions.grid.bottom}
						x2={width}
						stroke={"rgba(0, 0, 0, .24)"}
					/>
				</>
			}

			<Group id="bars">
				{
					data &&
					data.map((v, i, arr) => {
						return (
							<Bar
								key={i}
								x={xScale(new Date(v.start))}
								width={calcWidth(v, i, arr)}
								y={positions.bars.top}
								height={height - positions.bars.bottom}
								style={styles[v[property]]}
								onMouseEnter={(e) => handleMouseEnter(e, v)}
								onMouseOut={hideTooltip}
								className="barItem"
							/>
						);
					})
				}
			</Group>

			{
				showAxis &&
				<AxisBottom
					scale={xScale}
					top={height - 24}
					tickFormat={tickFormat}
					strokeWidth={0}
					tickStroke={null}
					tickLength={8}
					numTicks={14}
					tickLabelProps={(value, index) => ({
						fill: "grey",
						fontSize: 12,
						fontFamily: "sans-serif",
						textAnchor:
							index === 0 ? "start" : "end"
					})}
				/>
			}
		</svg>

		{
			tooltipOpen &&
			<TooltipWithBounds
				className="tooltip"
				key={Math.random()}
				top={tooltipTop}
				left={tooltipLeft}
			>
				<table>
					<tbody>
						{tooltips.map(p =>
							Object.prototype.hasOwnProperty.call(tooltipData, p.field) &&
								<TooltipRow
									key={`${p.field}-${tooltipData[p.field]}`}
									tooltipData={tooltipData}
									p={p}
								/>
						)}
					</tbody>
				</table>
			</TooltipWithBounds>
		}
	</>);
}

export const TooltipRow = ({tooltipData, p}) => {
	if (!Object.prototype.hasOwnProperty.call(tooltipData, p.field))
		return null;

	let data = tooltipData[p.field];

	if (p.type === "date")
		data = new Date(data).toLocaleString();

	return (
		<tr>
			<td align="left">
				{p.label}:
			</td>

			<td align="right">
				<strong>{data}</strong>
			</td>
		</tr>
	);
}
