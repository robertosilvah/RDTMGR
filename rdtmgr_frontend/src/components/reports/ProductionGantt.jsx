import React, { Fragment, useState, useEffect } from "react";

import { Bar, Line } from "@visx/shape";
import { Grid } from "@visx/grid";
import { scaleLinear, scaleTime } from "@visx/scale";
import { AxisTop } from "@visx/axis";
import { Group } from "@visx/group";
import { useTooltip, TooltipWithBounds } from "@visx/tooltip";

import { timeFormat } from "d3-time-format";

import "./ProductionGantt.scss";

const tickFormat = (v /*, i: number*/) => timeFormat("%H")(v);

export const logEvent = (e, item, index, arr) => {
	console.log(e.nativeEvent, item, index, arr);
};

export const ProductionGantt = ({
	width: outerWidth = 800,
	height: outerHeight = 200,
	margin = {
		top: 32,
		right: 16,
		bottom: 16,
		left: 160
	},
	dividerColor = "rgba(0,0,0,.12)",
	primaryColor = "rgb(13, 79, 139)",
	primaryTextColor = "rgba(0,0,0,.87)",
	secondaryTextColor = "rgba(0,0,0,.54)",
	bottomDataClassKey = "status",
	data = null,
	properties = null,
	labels = null,
	tooltips = null,
	domains = null,
	onMainBarClick = logEvent,
	onMainBarMouseEnter = null,
	onTopBarMouseEnter = null,
	onBottomBarMouseEnter = null,
	id = "svg-gantt",
	title = "Day shift",
	subtitle = "Crews: A/B",
}) => {
	const [xDomain, setXDomain] = useState();

	useEffect(() => {
		if (domains && domains.x) {
			setXDomain(domains.x.map(i => new Date(i)));
		} else {
			const domain = [ new Date(), new Date() ];
			domain[1].setDate(domain[1].getDate() + 1);
			setXDomain(domain);
		}
	}, [domains]);

	const {
		tooltipData,
		tooltipLeft,
		tooltipTop,
		tooltipOpen,
		showTooltip,
		hideTooltip
	} = useTooltip();

	if (!data || !properties || !labels || !domains)
		return (
			<svg
				id={id}
				width={outerWidth}
				height={outerHeight}
				shapeRendering="crispEdges"
			></svg>
		);

	const endFormat = (labels.main && labels.main.end) ?
		(v /*, i: number*/) => timeFormat(labels.main.end)(v) :
		(v) => String(v);

	const handleMouseOver = (event, datum, properties) => {
		const {clientX, clientY} = event;

		showTooltip({
			tooltipLeft: clientX,
			tooltipTop: clientY,
			tooltipData: [datum, properties]
		});
	};

	const width = outerWidth - margin.left - margin.right;
	const height = outerHeight - margin.top - margin.bottom;

	if (width < 10) return null;

	const vBreakpoints = [
		8,
		8 + 16,
		8 + 16 + 8,
		height / 2 + 8,
		height - 24,
		height - 12,
		height
	];

	const xScale = scaleTime({
		domain: xDomain,
		range: [0, width]
	});

	const mainYScale = scaleLinear({
		domain: domains[properties.main.top],
		range: [0, vBreakpoints[3] - vBreakpoints[2]]
	});

	const secondaryYScale = scaleLinear({
		domain: domains[properties.main.bottom],
		range: [0, vBreakpoints[4] - vBreakpoints[3]]
	});

	return (<>
		<svg
			id={id}
			width={outerWidth}
			height={outerHeight}
			shapeRendering="crispEdges"
		>
			<Group id="text" top={margin.top} left={margin.right}>
				<text
					x={0}
					y={vBreakpoints[1] - 18}
					fontSize={24}
					fontFamily="Roboto"
					fontWeight="bold"
					fill={primaryTextColor}
				>
					{title}
				</text>
				<text
					x={0}
					y={vBreakpoints[1] + 6}
					fontSize={16}
					fontFamily="Roboto"
					fill={secondaryTextColor}
				>
					{subtitle}
				</text>

				{
					labels.main &&
					<>
						<text
							y={vBreakpoints[3] - 8}
							fontSize={12}
							fontFamily="Roboto"
							fill={secondaryTextColor}
						>
							{labels.main.top}
						</text>
						<Line
							from={{ x: 0, y: vBreakpoints[3] }}
							to={{ x: width, y: vBreakpoints[3] }}
							stroke={dividerColor}
							strokeWidth={2}
						/>
						<text
							y={vBreakpoints[3] + 16}
							fontSize={12}
							fontFamily="Roboto"
							fill={secondaryTextColor}
						>
							{labels.main.bottom}
						</text>
					</>
				}

				{
					labels.bottom &&
					<text
						y={vBreakpoints[6] - 4}
						fontSize={12}
						fontFamily="Roboto"
						fill={secondaryTextColor}
					>
						{labels.bottom}
					</text>
				}
			</Group>
			<Group id="layout" top={margin.top} left={margin.left}>
				<AxisTop
					scale={xScale}
					tickFormat={tickFormat}
					strokeWidth={0}
					tickStroke={null}
					tickLength={8}
					numTicks={14}
					tickLabelProps={(value, index) => ({
						fill: secondaryTextColor,
						fontSize: 12,
						fontFamily: "sans-serif",
						textAnchor: "middle"
					})}
				/>
				<Grid
					xScale={xScale}
					yScale={mainYScale}
					stroke={dividerColor}
					width={width}
					height={vBreakpoints[6]}
					numTicksRows={0}
					numTicksColumns={14}
				/>

				<text
					x={-8}
					y={vBreakpoints[2] + 4}
					fontSize={12}
					fontFamily="Roboto"
					fill="rgba(0,0,0,.54)"
					textAnchor="end"
				>
					{
						(labels?.domains[properties.main.top] && labels.domains[properties.main.top][1]) ||
						(domains[properties.main.top] && domains[properties.main.top][1])
					}
				</text>
				<Line
					from={{ x: -4, y: vBreakpoints[2] }}
					to={{ x: width, y: vBreakpoints[2] }}
					stroke={dividerColor}
					strokeDasharray={"6 2"}
					strokeWidth={2}
				/>

				<text
					x={-8}
					y={vBreakpoints[3] - 8}
					fontSize={12}
					fontFamily="Roboto"
					fill="rgba(0,0,0,.54)"
					textAnchor="end"
				>
					{domains[properties.main.top][0]}
				</text>
				<text
					x={-8}
					y={vBreakpoints[3] + 16}
					fontSize={12}
					fontFamily="Roboto"
					fill="rgba(0,0,0,.54)"
					textAnchor="end"
				>
					{domains[properties.main.bottom][0]}
				</text>

				<text
					x={-8}
					y={vBreakpoints[4] + 4}
					fontSize={12}
					fontFamily="Roboto"
					fill={secondaryTextColor}
					textAnchor="end"
				>
					{domains[properties.main.bottom][1]}
				</text>
				<Line
					from={{ x: -4, y: vBreakpoints[4] }}
					to={{ x: width, y: vBreakpoints[4] }}
					stroke={dividerColor}
					strokeDasharray={"6 2"}
					strokeWidth={2}
				/>
			</Group>
			<Group id="bars" top={margin.top} left={margin.left}>
				{
					properties.top && data.top &&
					data.top.map((d, i, arr) => {
						let left = xScale(new Date(d[properties.main.start]));

						if (left >= width) return null;
						if (left <= 0) left = 0;

						let right = xScale(new Date(d[properties.main.end]));

						let barWidth;

						if (right > width) {
							barWidth = width - left;
						} else {
							barWidth = right - left;
							barWidth = barWidth > 2 ? barWidth - 1 : barWidth;
						}

						right = left + barWidth;

						if (barWidth < 0) return null;

						const barY = vBreakpoints[0];

						const handleMouseEnter = (e) => {
							handleMouseOver(e, d, tooltips.top);

							if (onTopBarMouseEnter)
								onTopBarMouseEnter(e, d, i, arr);
						};

						return (
							<Group
								key={i}
								onMouseEnter={handleMouseEnter}
								onMouseOut={hideTooltip}
							>
								{
									barWidth > 40 && <>
									<Line
										from={{ x: right, y: -1 }}
										to={{ x: right, y: height }}
										stroke={dividerColor}
										strokeWidth={1}
									/>

									<Group top={13} left={-6}>
										<Bar
											x={right - 36}
											y={barY - 28}
											width={35}
											height={15}
											fill="white"
										/>

										<text
											className="top-bar-text"
											textAnchor="end"
											x={right - 4}
											y={barY - 16}
											fill={secondaryTextColor}
											fontFamily="sans-serif"
											fontSize={12}
										>
											{endFormat(new Date(d[properties.main.end]))}
										</text>
									</Group>

									<Group
										transform={`translate(${right - 10}, ${barY - 14}) scale(0.5, 0.5)`}
									>
										<path
											fill={dividerColor}
											d="M20,10V14H11L14.5,17.5L12.08,19.92L4.16,12L12.08,4.08L14.5,6.5L11,10H20Z"
										/>
									</Group>
								</>}

								{
									barWidth <= 40 && <>
									<Group>
										<Bar
											x={right - 42}
											y={barY - 28}
											width={35}
											height={15}
											fill="white"
										/>

										<Bar
											x={right - 1}
											y={barY - 28}
											width={18}
											height={28}
											fill="white"
										/>

										<text
											className="top-bar-text"
											textAnchor="end"
											x={right - 10}
											y={barY - 16}
											fill={secondaryTextColor}
											fontFamily="sans-serif"
											fontSize={12}
										>
											{endFormat(new Date(d[properties.main.end]))}
										</text>
									</Group>

									<Group
										transform={`translate(${right - 10}, ${barY - 26}) scale(0.5, 0.5)`}
									>
										<path
											fill={dividerColor}
											d="M20,10V14H11L14.5,17.5L12.08,19.92L4.16,12L12.08,4.08L14.5,6.5L11,10H20Z"
										/>
									</Group>

									<Line
										from={{ x: right, y: -12 }}
										to={{ x: right, y: height }}
										stroke={dividerColor}
										strokeWidth={1}
									/>
								</>}

								<Bar
									className="top-bar"
									x={left}
									y={barY}
									width={barWidth}
									height={vBreakpoints[1] - vBreakpoints[0]}
									fill={primaryColor}
									fillOpacity={0.78}
								/>
								{
									barWidth > 45 &&
									<TopBarLabel
										item={d}
										textAnchor="middle"
										x={left + barWidth / 2}
										y={barY + 13}
										label={labels.top}
									/>
								}
							</Group>
						);
					})
				}
				{
					properties.main &&
					data.main.map((d, i, arr) => {
						let left = xScale(new Date(d[properties.main.start]));

						if (left >= width) return null;
						if (left <= 0) left = 0;

						let right = xScale(new Date(d[properties.main.end]));

						let barWidth;

						if (right > width) {
							barWidth = width - left;
						} else {
							barWidth = right - left;
							barWidth = barWidth > 2 ? barWidth - 1 : barWidth;
						}

						if (barWidth < 0)
							return null;

						const topBarHeight = mainYScale(d[properties.main.top]);
						const bottomBarHeight = secondaryYScale(d[properties.main.bottom]);
						const barY = vBreakpoints[3] - topBarHeight;

						const handleClick = onMainBarClick ?
							(e) => onMainBarClick(e, d, i, data.main) : undefined;

						const handleMouseEnter = (e) => {
							handleMouseOver(e, d, tooltips.main);
							if (onMainBarMouseEnter) onMainBarMouseEnter(e, d, i, arr);
						};

						const selected = d.selected ? "selected" : "null";

						return (
							<Fragment key={i}>
								<Bar
									className={`main-top-bar ${selected}`}
									x={left}
									y={barY}
									width={barWidth}
									height={topBarHeight}
									onClick={handleClick}
									onMouseEnter={handleMouseEnter}
									onMouseOut={hideTooltip}
								/>
								<Line
									from={{ x: left, y: barY }}
									to={{ x: left + barWidth, y: barY }}
									stroke="#777DA7"
									strokeWidth={2}
								/>

								<Bar
									className={`main-bottom-bar ${selected}`}
									x={left}
									y={vBreakpoints[3]}
									width={barWidth}
									height={bottomBarHeight}
									fill={primaryColor}
									onClick={handleClick}
									onMouseEnter={handleMouseEnter}
									onMouseOut={hideTooltip}
								/>
								<Line
									from={{ x: left, y: vBreakpoints[3] + bottomBarHeight }}
									to={{ x: left + barWidth, y: vBreakpoints[3] + bottomBarHeight }}
									stroke="#999999"
									strokeWidth={2}
								/>
							</Fragment>
						);
					})
				}

				<Line
					from={{ x: 0, y: vBreakpoints[3] }}
					to={{ x: width, y: vBreakpoints[3] }}
					stroke="white"
					strokeWidth={2}
				/>
				{
					properties.bottom && data.bottom &&
					data.bottom.map((d, i, arr) => {
						let left = xScale(new Date(d[properties.bottom.start]));

						if (left >= width) return null;
						if (left <= 0) left = 0;

						let right = xScale(new Date(d[properties.bottom.end]));

						let barWidth;

						if (right > width) {
							barWidth = width - left;
						} else {
							barWidth = right - left;
							barWidth = barWidth > 2 ? barWidth - 1 : barWidth;
						}

						if (barWidth < 0) return null;

						const barY = vBreakpoints[5];

						const handleMouseEnter = (e) => {
							handleMouseOver(e, d, tooltips.bottom);

							if (onBottomBarMouseEnter)
								onBottomBarMouseEnter(e, d, i, arr);
						};

						return (
							<Bar
								key={i}
								className={`bottom-bar ${bottomDataClassKey}-${d[bottomDataClassKey]}`}
								x={left}
								y={barY}
								width={barWidth}
								height={vBreakpoints[6] - vBreakpoints[5]}
								onMouseEnter={handleMouseEnter}
								onMouseOut={hideTooltip}
							/>
						);
					})
				}
			</Group>
		</svg>

		{
			tooltipOpen &&
			<TooltipWithBounds
				// set this to random so it correctly updates with parent bounds
				className="tooltip"
				key={Math.random()}
				top={tooltipTop}
				left={tooltipLeft}
			>
				<table>
					<tbody>
						{
							tooltipData[1].map(p =>
								tooltipData[0].hasOwnProperty(p.field) &&
								(
									<tr key={`${p.field}-${tooltipData[0][p.field]}`}>
										<td align="left">
											{p.label}:
										</td>
										<td align="right">
											<strong>{tooltipData[0][p.field]}</strong>
										</td>
									</tr>
								))
						}
					</tbody>
				</table>
			</TooltipWithBounds>
		}
	</>);
};

const TopBarLabel = ({item, x, y, label, textAnchor = "middle"}) => {
	return (<>
		{
			label &&
			<text
				className="top-bar-text"
				textAnchor={textAnchor}
				x={x}
				y={y}
				fontSize={12}
				fill="white"
				fontFamily="Roboto Mono"
				fontWeight="700"
			>
				{
					label === Object(label) && label.key ?
						item[label.key] : label
				}
			</text>
		}
	</>);
}

export default ProductionGantt;
