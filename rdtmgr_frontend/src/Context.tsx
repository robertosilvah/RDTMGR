import React, { useContext, useState, useEffect, useReducer, FC, Reducer, useCallback } from "react";

import useWebSocket from "react-use-websocket";

import { Filters } from "./Helpers";
import { LineProcess, LineProcesses, LineProcessIndicators, ShiftDefinition, Location, LineProcessState } from "./Models";
import { WebSocketHook } from "react-use-websocket/dist/lib/types";
import { CachePolicies, useFetch } from "use-http";
import { TimeFilterChangeEvent } from "./components/filters/TimeFilter";
import { GanttDatum } from "./components/reports/Gantt";

export type AppContextModel = {
	api?: {
		main?: string,
		webSocket?: string
	},
	clientId?: number,
	setState?: React.Dispatch<React.SetStateAction<AppContextModel>>
};

export const AppContext = React.createContext<AppContextModel>({});

AppContext.displayName = "AppContext";

export const AppContextProvider: FC = ({ children }) => {
	const [ state, setState ] = useState<AppContextModel>({
		api: {
			main: process.env.REACT_APP_API,
			webSocket: process.env.REACT_APP_WS
		}
	});

	useEffect(() => {
		setState(prev => {
			return { ...prev, setState };
		})
	}, []);

	return (
		<AppContext.Provider value={state}>
			{children}
		</AppContext.Provider>
	)
}

//#region FilterContext

export type TimeRange = [Date, Date];

export type FilterContextDefinition = {
	date?: Date,
	dateRange?: TimeRange,
	timeFilter?: string,
	shiftFilter?: string | number,
	weekFilter?: string,
	search?: string,
	shiftFilters?: ShiftDefinition[],
	setFilters?: React.Dispatch<TimeFilterChangeEvent>
};

export const FilterContext = React.createContext<FilterContextDefinition>({});

FilterContext.displayName = "FilterContext";

const defaultFilters = () => {
	const date = new Date();
	const timeFilter = "Shift";

	return {
		timeFilter,
		date,
	};
}

type FilterReducerFunction = (prev: FilterContextDefinition) => TimeFilterChangeEvent;
type FilterReducerActionHandler = (prev: FilterContextDefinition, payload: TimeFilterChangeEvent) => FilterContextDefinition;
type FilterReducer = Reducer<FilterContextDefinition, TimeFilterChangeEvent | FilterReducerFunction>;

type asd = keyof typeof Filters;
// const FilterActionHandlers: { [k in asd]: FilterReducerActionHandler } = {
// 	Day: (prev, payload) => {
// 		const {  } = prev;
// 	}
// };

const filterReducer: FilterReducer = (prev, filters) => {
	if (typeof filters === "function")
		filters = filters(prev);

	const { timeFilter, shiftFilter, dateRange, date } = filters;
	const state: FilterContextDefinition = {};

	if (dateRange) {
		state.date = date;
		state.dateRange = dateRange;
	} else {
		state.date = prev.date;
		state.dateRange = prev.dateRange;
	}

	state.timeFilter = timeFilter ?? prev.timeFilter;

	if (state.timeFilter === "Shift")
		state.shiftFilter = Number(shiftFilter ?? prev.shiftFilter);

	return state;
}

export const FilterProvider = ({children}) => {
	const [filters, setFilters] = useReducer(filterReducer, defaultFilters());
	const [state, setState] = useState({ setFilters });

	useEffect(() => setState({ ...filters, setFilters }), [filters]);

	return (
		<FilterContext.Provider value={state}>
			{children}
		</FilterContext.Provider>
	);
}

//#endregion

// #region Line process contexts

export const LineProcessesContext = React.createContext<LineProcesses>(null);

LineProcessesContext.displayName = "LineProcessesContext";

enum LineProcessEvents {
	OnFinishProduction = "OnFinishProduction",
	OnUpdateProduction = "OnUpdateProduction",
	OnFinishDelay = "OnFinishDelay",
	OnUpdateDelay = "OnUpdateDelay",
	OnStateUpdate = "OnStateUpdate",
	OnInitialization = "OnInitialization"
}

type LineProcessActionHandler = (prev: LineProcesses, payload: unknown) => LineProcesses;

type DelayUpdatedModel = {
	location: Location,
	indicators: LineProcessIndicators,
	currentDelay: GanttDatum;
};

type ProductionUpdatedModel = {
	location: Location,
	indicators: LineProcessIndicators,
	currentProduction: GanttDatum;
};

const LineProcessActionHandlers: { [k in LineProcessEvents]?: LineProcessActionHandler } = {
	OnInitialization: (_, payload: LineProcessState[]) => {
		const entries = payload.map<[number, LineProcessState]>(process => [process.location.id, process]);
		const state = new Map<number, LineProcessState>(entries);

		console.log("OnInitialization", state);

		return state;
	},

	OnStateUpdate: (prev, payload: LineProcess) => {
		const state = new Map(prev);
		const { location: { id }, shifts } = payload;

		console.log("OnStateUpdate", prev, payload);

		const process: LineProcessState = !state.has(id) ?
			{ ...payload, realtime: true, shifts } :
			{ ...state.get(id), ...payload };

		state.set(id, process);

		return state;
	},

	OnUpdateDelay: (prev, payload: DelayUpdatedModel) => {
		const states = new Map(prev);
		const { location: { id }, indicators, currentDelay } = payload;
		const prevState = states.get(id);

		if (!currentDelay)
			console.log("!currentDelay", payload);

		if (prevState) {
			const { gantt } = indicators;
			const state = { ...prevState, indicators: { ...indicators, gantt } };
			states.set(id, state);
		}

		return states;
	},

	OnUpdateProduction: (prev, payload: ProductionUpdatedModel) => {
		const states = new Map(prev);
		const { location: { id }, indicators } = payload;
		const prevState = states.get(id);

		if (prevState) {
			const { gantt } = indicators;
			const state: LineProcessState = { ...prevState, indicators: { ...indicators, gantt } };
			states.set(id, state);
		}

		return states;
	}
}

type LineProcessAction = {
	clientId?: number,
	type: LineProcessEvents,
	payload: unknown
};

const LineProcessesReducer: Reducer<LineProcesses, LineProcessAction | null | undefined> = (prev, action) => {
	if (!action)
		return prev;

	const { type, payload } = action;
	// console.log("LineProcessesReducer action:", action);

	if (type && payload)
		return LineProcessActionHandlers[type](prev, payload);

	return prev;
}

/** Retrieves the line processes current state and receives their realtime updates. */
export const LineProcessesProvider: FC = ({children}) => {
	const { api, setState } = useContext(AppContext);

	const [lineProcesses, dispatch] = useReducer(LineProcessesReducer, new Map());

	const { get } = useFetch<LineProcess[]>(`${api.main}/process`, null);

	const getProcesses = useCallback(async () => {
		const data = await get();

		if (data) {
			dispatch({
				type: LineProcessEvents.OnInitialization,
				payload: data
			})
		}
	}, []);

	useEffect(() => { getProcesses(); }, []);

	// establish websocket connection for realtime line process updates
	const {lastJsonMessage: lastMsg}: WebSocketHook<MessageEvent> = useWebSocket(api.webSocket, {
		onError: (e) => console.error(e),
		onOpen: (e) => {
			console.info("WebSocket connection opened");
		},
		onClose: (e) => {
			console.info("WebSocket connection closed");
		},
		shouldReconnect: () => true,
		retryOnError: true,
		reconnectAttempts: Infinity,
		reconnectInterval: 1000,
	});

	useEffect(() => {
		// console.log("lastMsg:", lastMsg);
		if (lastMsg) {
			const { clientId }: LineProcessAction = lastMsg;

			if (clientId && setState) {
				setState((prev) => {
					return { ...prev, clientId };
				})
			}

			dispatch(lastMsg);
		}
	}, [lastMsg]);

	return (
		<LineProcessesContext.Provider value={lineProcesses}>
			{children}
		</LineProcessesContext.Provider>
	);
}

export const LineProcessContext = React.createContext<LineProcessState>({ realtime: true });
LineProcessContext.displayName = "LineProcessContext";

type LineProcessProviderProps = {
	lineProcess?: Partial<LineProcess>;
}

export const LineProcessProvider: FC<LineProcessProviderProps> = ({lineProcess, children}) => {
	const { api, clientId } = useContext(AppContext);
	const { dateRange, shiftFilter, timeFilter, date } = useContext(FilterContext);

	const [realtime, setRealtime] = useState(true);
	const [state, setState] = useState<LineProcessState>({ realtime });

	const { post } = useFetch(`${api.main}/process/${lineProcess.location.id}`, { cachePolicy: CachePolicies.NO_CACHE });

	// updates the realtime state
	useEffect(() => {
		if (dateRange) {
			const now = new Date();
			const [start, end] = dateRange;

			setRealtime(now > start && now < end && timeFilter === "Shift");
			getProcess();
		}
	}, [timeFilter, shiftFilter, dateRange]);

	const getProcess = useCallback(async () => {
		const now = new Date();

		const [start, end] = dateRange;
		const [prevStart, prevEnd] = state.interval.range.map(s => new Date(s));
		const sameStart = start.getTime() === prevStart.getTime();
		const sameEnd = end.getTime() === prevEnd.getTime();

		if (sameStart && sameEnd)
			return;

		const body: {
			clientId: number,
			start?: Date | string,
			end?: Date | string,
			shift?: number | string,
			date?: Date
		} = { clientId };

		if (timeFilter === "Shift") {
			body.shift = shiftFilter;
			body.date = date;
		} else {
			body.start = start;
			body.end = end;
		}

		const result: LineProcess = await post(body);

		if (result) {
			const [start, end] = result.interval.range.map(s => new Date(s));
			const realtime = now > start && now < end && timeFilter === "Shift";
			setRealtime(realtime);
			setState(prev => {
				return { ...prev, ...result, realtime };
			});

			console.log("getProcess", shiftFilter, start, end, realtime);
		}
	}, [post, dateRange, realtime, shiftFilter, date, timeFilter, state]);

	useEffect(() => {
		setState((prev) => {
			if (realtime)
				return { ...lineProcess, realtime };

			return prev;
		});
	}, [lineProcess, realtime]);

	return (
		<LineProcessContext.Provider value={state}>
			{children}
		</LineProcessContext.Provider>
	);
}

// #endregion
