import React from "react";
import { IndicatorCard } from "./IndicatorCard";

export default {
	title: "Reports/Indicator (card)",
	component: IndicatorCard,
	argTypes: {
		background: { control: "color" }
	}
}

const Template = (args) => <IndicatorCard {...args} />;

export const Example = Template.bind({});

Example.args = {
	title: "Title",
	subtitle: "Subtitle",
	background: "#D2D6DE",
	icon: "open-in-new",
	handleMoreClick: () => console.log("More info clicked")
};

export const UpsetterPipeCount = Template.bind({});

UpsetterPipeCount.args = {
	...Example.args,
	title: 0,
	subtitle: "Upsetter Pipe Count",
	background: "#D2D6DE",
	icon: "open-in-new",
};

export const Efficiency = Template.bind({});
Efficiency.args = {
	...Example.args,
	title: "0%",
	subtitle: "Efficiency",
	icon: "file-excel-outline",
	background: "#DD4B39"
};

export const CycleTime = Template.bind({});
CycleTime.args = {
	...Example.args,
	title: "73.5 s",
	subtitle: "Cycle Time",
	icon: "file-excel-outline",
	background: "#F39C12"
};

export const HtPipeCount = Template.bind({});
HtPipeCount.storyName = "Heat Treatment Pipe Count";
HtPipeCount.args = {
	...Example.args,
	title: "73.5 s",
	subtitle: HtPipeCount.storyName,
	icon: "file-excel-outline",
	background: "#00A65A"
};

export const GridExample = () => {
	return (
		<div style={{
			display: "grid",
			gridTemplateColumns: "1fr 1fr 1fr",
			gridTemplateRows: "1fr 1fr",
			gap: "12px"
		}}>
			<IndicatorCard {...UpsetterPipeCount.args}/>
			<IndicatorCard {...Efficiency.args}/>
			<IndicatorCard {...CycleTime.args}/>
			<IndicatorCard {...HtPipeCount.args}/>
			<IndicatorCard {...Efficiency.args}/>
			<IndicatorCard {...CycleTime.args} background="#00A65A"/>
		</div>
	)
}