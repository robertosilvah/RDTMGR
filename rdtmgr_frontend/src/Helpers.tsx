import { useContext, useEffect, useState } from "react"

import { AppContext, TimeRange } from "./Context";

export function shallowEqual(objA, objB) {
	if (objA === objB)
		return true;

	if (typeof objA !== "object" || objA === null ||
			typeof objB !== "object" || objB === null)
		return false;

	const keysA = Object.keys(objA);
	const keysB = Object.keys(objB);

	if (keysA.length !== keysB.length)
		return false;

	// Test for A"s keys different from B.
	const bHasOwnProperty = Object.hasOwnProperty.bind(objB);

	for (let i = 0; i < keysA.length; i++)
		if (!bHasOwnProperty(keysA[i]) || objA[keysA[i]] !== objB[keysA[i]])
			return false;

	return true;
}

export function shallowCompare(instance, nextProps, nextState) {
	return (
		!shallowEqual(instance.props, nextProps) ||
		!shallowEqual(instance.state, nextState)
	);
}

export const fetchConfig: RequestInit = {
	method: "GET", // *GET, POST, PUT, DELETE, etc.
	mode: "cors", // no-cors, *cors, same-origin
	cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
	credentials: "same-origin", // include, *same-origin, omit
	headers: {
		"Accept": "application/json",
		"Content-Type": "application/json",
		"Access-Control-Allow-Headers": "*",
		"Access-Control-Allow-Origin": "http://localhost:3000"
		// "Content-Type": "application/x-www-form-urlencoded",
	},
	redirect: "follow", // manual, *follow, error
	referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
}

interface UseApiOptions {
	payload?;
	def?;
	callback?;
}

export const useApi = (api: string, options: UseApiOptions = {}) => {
	const context = useContext(AppContext);
	const {payload, def: defaultValue, callback} = options;

	const [result, setResult] = useState(defaultValue);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const body = { api, payload };

		fetch(context.api.main, {...fetchConfig, body: JSON.stringify(body)})
			.then(response => {
				if (response.ok)
					return response.json();

				throw response;
			})
			.then(data => {
				setResult(data);
				setLoading(false);

				if (callback)
					callback(data);
			})
			.catch(reason => console.error(reason))
	}, [api, payload, callback, context, context.api.main]);

	return [result, loading];
}

type Filter = "Shift" | "Day" | "Week" | "Month";
type FilterHandler = (date: Date, param?: string) => TimeRange;
type FilterMap = { [k in Filter]: FilterHandler };

export const Filters: FilterMap = Object.freeze({
	Shift: (date, shift?) => {
		date = new Date(date);
		date.setUTCDate(date.getDate());

		const start = new Date(date);
		const end = new Date(date);

		const startHours = start.getUTCHours();

		if (!shift)
			shift = (startHours >= 12 && startHours < 20) ? "First" :
				(startHours >= 4 && startHours < 12) ? "Third" : "Second";

		if (shift === "First") {
			start.setUTCHours(12, 0, 0, 0);
			end.setUTCHours(20, 0, 0, 0);
		} else if (shift === "Second") {
			start.setUTCHours(20, 0, 0, 0);
			// start.setUTCDate(start.getUTCDate() - 1);
			end.setUTCHours(4, 0, 0, 0);
			end.setUTCDate(end.getUTCDate() + 1);
		} else {
			start.setUTCHours(4, 0, 0, 0);
			end.setUTCHours(12, 0, 0, 0);
			// end.setUTCDate(end.getDate() + 1);
		}

		const result: TimeRange = [start, end];
		// console.log(shift, date, result/*.map(v => v.toLocaleString())*/);

		return result;
	},

	Day: (date) => {
		const start = new Date(date);
		start.setUTCHours(12, 0, 0, 0);

		const end = new Date(start);
		end.setDate(end.getDate() + 1);

		return [start, end];
	},

	Week: (date) => {
		const start = new Date(date);
		start.setUTCHours(12, 0, 0, 0);
		// start.setDate(start.getDate() - start.getDay());

		const end = new Date(start);
		end.setDate(end.getDate() + 7);

		return [start, end];
	},

	Month: (date) => {
		const start = new Date(date);
		start.setHours(0, 0, 0, 0);
		start.setDate(1);

		const end = new Date(start);
		end.setMonth(end.getMonth() + 1);

		return [start, end];
	}
});

export function colorAsRGB(color) {
	if (!color)
		return [0, 0, 0];

	let r, g, b;

	if (color.match(/^rgb/)) {
		// If RGB --> store the red, green, blue values in separate variables
		color = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)$/);

		r = color[1];
		g = color[2];
		b = color[3];
	} else {
		color = +("0x" + color.slice(1).replace(
		color.length < 5 && /./g, "$&$&"));

		r = color >> 16;
		g = (color >> 8) & 255;
		b = color & 255;
	}

	return [r, g, b];
}

// https://www.w3.org/TR/WCAG20/#relativeluminancedef
export function calcLuminance(color) {
	let [r, g, b] = colorAsRGB(color).map(v => v / 255);

	if (r <= 0.03928)
		r = r / 12.92;
	else
		r = ((r + 0.055) / 1.055) ** 2.4;

	if (g <= 0.03928)
		g = g / 12.92;
	else
		g = ((g + 0.055) / 1.055) ** 2.4;

	if (b <= 0.03928)
		b = b / 12.92;
	else
		b = ((b + 0.055) / 1.055) ** 2.4;

	const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
	// console.log("luminance:", l);

	return l;
}

export function getUTCDayStart(date: Date): Date {
	const dayStart = new Date(date);
	dayStart.setHours(0, 0, 0, 0);
	dayStart.setUTCHours(0, 0, 0, 0);
	return dayStart;
}

export function timeAsDate(time: string): Date {
	const tzOffset = new Date().getTimezoneOffset();
	const [hours, min] = time.split(":").map((s) => Number(s));
	return new Date(hours * 36e5 + (min + tzOffset) * 6e4);
}

export function getTimeFromDate(date: Date | string): string {
	const d = new Date(date);
	const hours = String(d.getHours()).padStart(2, "0");
	const min = String(d.getMinutes()).padStart(2, "0");
	return `${hours}:${min}`;
}

/**
* Returns the index of the last element in the array where predicate is true, and -1
* otherwise.
* @param array The source array to search in
* @param predicate find calls predicate once for each element of the array, in descending
* order, until it finds one where predicate returns true. If such an element is found,
* findLastIndex immediately returns that element index. Otherwise, findLastIndex returns -1.
* @url https://stackoverflow.com/a/53187807/7129550
*/
export function findLastIndex<T>(array: Array<T>, predicate: (value: T, index: number, obj: T[]) => boolean): number {
	let l = array.length;

	while (l--) {
		if (predicate(array[l], l, array))
			return l;
	}

	return -1;
}
