import React from "react";

import { Gantt } from "./Gantt";

export default {
	title: "Reports/Gantt",
	component: Gantt,
	argTypes: {
		width: { control: "number" },
		height: { control: "number" },
		showAxis: { control: "boolean" },
		showGrid: { control: "boolean" },
		vPadding: { control: "array" },
		property: { control: "text" },
	}
}

const Template = (args) => <Gantt {...args} />;

export const Example = Template.bind({});

export const Thick = Template.bind({});

Thick.args = {
	height: 128
};

export const Thin = Template.bind({});

Thin.args = {
	showAxis: false,
	showGrid: false,
	height: 8
}