import React, { FC, useState } from "react";

import { ArcGauge } from "@progress/kendo-react-gauges";

import { TopAppBar, TopAppBarRow, TopAppBarSection, TopAppBarTitle, TopAppBarFixedAdjust, Card } from "rmwc";

import { ReactComponent as Led } from '../../assets/led.svg';

import "./Indicators.scss";

const ArcGaugeColors = [
	{
		to: 50,
		color: "#f31700"
	}, {
		from: 50,
		to: 70,
		color: "#ffc000"
	}, {
		from: 70,
		color: "#37b400"
	}
];

const InvertedArcGaugeColors = [
	{
		to: 50,
		color: "#37b400"
	}, {
		from: 50,
		to: 70,
		color: "#ffc000"
	}, {
		from: 70,
		color: "#f31700"
	}
];

const defState = {
	entry: 5,
	stops: 2,
	delayTime: "05:30:00",
	delayRate: 2,
	efficiency: 80,
};

interface IndicatorsCardProps {
	line: JSX.Element
	entry: string | number
	stops: string | number
	delayTime: string | number
	delayRate: string | number
	efficiency: string | number
	lineStatus: string | number,
	showLineStatus: boolean
}

export const IndicatorsCard: FC<IndicatorsCardProps> = ({
	line = "Line",
	entry = "-",
	stops = "-",
	delayTime = "--:--:--",
	delayRate = 0,
	efficiency = 0,
	lineStatus = "-",
	showLineStatus = true
}) => {
	return (
		<Card className="indicators">
			<TopAppBar dense>
				<TopAppBarRow>
					<TopAppBarSection>
						<TopAppBarTitle style={{ paddingLeft: "12px", paddingRight: "0px" }}>
							{line}
						</TopAppBarTitle>
					</TopAppBarSection>
				</TopAppBarRow>
			</TopAppBar>

			<div className="content" style={{ padding: "16px" }}>
				<TextIndicator title="Pipe Count">
					{entry}
				</TextIndicator>

				<TextIndicator title="Line stops">
					{stops}
				</TextIndicator>

				<TextIndicator title="Downtime">
					{delayTime}
				</TextIndicator>

				<ArcIndicator title="Downtime rate" value={delayRate} colors={InvertedArcGaugeColors}/>

				<ArcIndicator title="Efficiency" value={efficiency}/>

				{
					showLineStatus &&
					<div className="indicator center" style={{minWidth: '160px'}}>
						<span className="title">
							Line status
						</span>

						<div style={{ display: 'flex', marginTop: '4px', width: '100%', justifyContent: 'center' }}>
							<Led
								width="40px"
								height="40px"
								style={{
									color: lineStatus ?
										(lineStatus === "Running" ? '#00aa00' : '#aa0000') :
										'grey'
								}}
							/>
							<span style=
								{{
									fontFamily: 'Roboto Mono',
									fontWeight: 'bold',
									fontSize: '18px',
									marginLeft: '12px',
									marginTop: '8px',
									width: '8ch',
									// textAlign: 'end'
								}}
							>
								{lineStatus}
							</span>
						</div>
					</div>
				}
			</div>
		</Card>
	)
};

const ArcIndicator = ({title, value, colors = ArcGaugeColors}) => (
	<div className="indicator center">
		<span className="title">
			{title}
		</span>
		<ArcGauge
			style={{ width: "96px", height: "48px" }}
			value={value}
			scale={{
				rangeSize: 4,
				startAngle: -10,
				endAngle: 190
			}}
			colors={colors}
			arcCenterRender={arcCenterRenderer} />
	</div>
);

const TextIndicator = ({title, children}) => (
	<div className="indicator center">
		<span className="title">
			{title}
		</span>

		<span style=
			{{
				fontFamily: "Roboto Mono",
				fontWeight: "bold",
				fontSize: "22px",
				marginTop: "12px"
			}}>
			{children}
		</span>
	</div>
);

const arcCenterRenderer = (currentValue, color) => {
	return (<h3 style={{ color: color, margin: 0 }}>{currentValue}%</h3>);
};

export default IndicatorsCard;