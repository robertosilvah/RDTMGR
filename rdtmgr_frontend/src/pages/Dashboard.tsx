import React, { FC, Fragment, useCallback, useContext, useEffect, useState } from "react";

import moment from "moment";

import { CachePolicies, useFetch } from "use-http";

import { Select, Dialog, DialogTitle, DialogContent, DialogActions, DialogButton, DialogProps, TextField, IconButton } from "rmwc";

import { AppContext, FilterContext, FilterProvider, LineProcessContext, LineProcessesContext, LineProcessProvider, TimeRange } from "../Context";
import { IndicatorCard } from "../components/reports/IndicatorCard";
import { FullscreenSpinner } from "../components/Spinners";
import TimeFilter, { TimeInterval } from "../components/filters/TimeFilter";
import { LineProcess } from "../Models";
import { getShiftsStart, useFilterChangeCallback } from "../CustomHooks";

import "./Report.scss";
import "./Dashboard.scss";

// const handleMoreClick = () => console.log("More info clicked");

const calcColor = (value, standard?) => {
	switch (typeof value) {
		case "number":
			return value >= standard ? "#6dc78c" : "#ad4d4f";
		default:
			return value === standard ? "#6dc78c" : "#ad4d4f";
	}
}

const StandardSubtitle = ({text, stdValue}) => <>
	<span>{text}</span>
	<br/>
	<span>Standard: {stdValue}</span>
</>;

interface Product {
	id: number;
	name: string;
}

export const Dashboard = () => {
	const {api} = useContext(AppContext);
	const {date, timeFilter, setFilters} = useContext(FilterContext);
	const lineProcesses = useContext(LineProcessesContext);
	const {get} = useFetch(api.main, null);

	const [products, setProducts] = useState<Product[]>([]);

	const getProducts = useCallback(async () => {
		const result = await get("/products");
		if (result) setProducts(result);
	}, [get]);

	// get products
	useEffect(() => { getProducts() }, [getProducts]);

	return (
		<>
			<FullscreenSpinner/>

			<div id="prod-dashboard" className="report-content">
				{
					lineProcesses ?
					Array.from(lineProcesses.values()).map(process => (
						<FilterProvider key={process.location.name}>
							<LineProcessProvider lineProcess={process}>
								<LineState
									products={products}
								/>
							</LineProcessProvider>
						</FilterProvider>
					)) : "Loading..."
				}
			</div>
		</>
	);
}

type LineStateProps = {
	defaultState?: Partial<LineProcess>;
	products: Product[];
}

const LineState: FC<LineStateProps> = ({defaultState, products}) => {
	const { api } = useContext(AppContext);
	const { date, timeFilter, setFilters } = useContext(FilterContext);
	const lineProcess = useContext(LineProcessContext) || { realtime: true };

	const [state, setState] = useState<Partial<LineProcess>>(lineProcess);
	// const [realtime, setRealtime] = useState(true);
	const { location, realtime, shifts } = lineProcess;
	const [shift, setShift] = useState<TimeInterval>();

	const [open, setOpen] = useState(false);
	const [product, setProduct] = useState<Product>();
	const [productLock, setProductLock] = useState(true);

	const standard = lineProcess?.standard;

	const { post } = useFetch(`${api.main}/process`, { cachePolicy: CachePolicies.NO_CACHE });

	// updates the state and the date range if it changed
	useEffect(() => {
		if (lineProcess) {
			setState(prev => { return {...prev, ...lineProcess}; });
			
			if (realtime && timeFilter === "Shift") {
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
		}
	}, [lineProcess, realtime, shifts]);

	useEffect(() => {
		if (standard && products) {
			if (!product || product.id !== standard.productId)
				setProduct(products.find(p => p.id === standard.productId));
		}
	}, [standard, products]);

	const handleAddClick = useCallback(async (amount) => {
		const locationId = location?.id;

		if (Number.isInteger(locationId))
			await post(`/${locationId}/scrap/${amount}`);
	}, [location]);

	const handleProductChange = useCallback(async ({currentTarget}) => {
		const locationId = state?.location?.id;

		const { value } = currentTarget;
		const product = products.find(v => v.id === Number(value));

		if (product) {
			const result = await post(`/${locationId}/product/${product.id}`);

			if (result) {
				setProduct(product);

				setState(prev => {
					const state = {...prev, standard: result};
					console.log(`${state.location.name}: set product standard to ${product.name}`)
					console.log(result);
					return state;
				});

				setProductLock(true);
			}
		} else {
			console.log(`Selected product ${value} not found in`, products);
		}
	}, [products, state]);

	const handleFilterChange = useFilterChangeCallback(shift, shifts, (i) => setShift(i));

	const { indicators } = state;
	const { availability, cycleTime, oee, performance, quality, status, totalPieces } = indicators || {};
	const { interval } = lineProcess;
	let dateRangeInterval = [];
	if (interval && interval.range) {
		dateRangeInterval = interval.range.map(s => new Date(s)) as TimeRange;
	}
	let [start, end] = ['' , '']
	if (dateRangeInterval.length > 1)
		[start, end] = dateRangeInterval;

	return <Fragment>
		<div className="filter-container">
			<TimeFilter
				date={date}
				timeFilter={timeFilter}
				shiftFilter={String(Number(shift?.id) || 0)}
				shiftFilters={shifts}
				onChange={handleFilterChange}
			/>
		</div>

		<div className="asd">
			<h3>
				{state.location?.name} · <span>Producing:</span>
			</h3>

			<Select
				outlined
				className="dense"
				disabled={!!state.standard && productLock}
				value={String(product?.id) || ""}
				placeholder="Product"
				onChange={handleProductChange}
			>
				{products.map(({id, name}: Product) => <option key={id} value={id}>{name}</option>)}
			</Select>

			{
				(realtime && timeFilter === "Shift" && state.standard && productLock) &&
				<IconButton
					className="date-button"
					icon="lock"
					title="Unlock"
					onClick={() => setProductLock(false)}
				/>
			}
			
			<h3>
				{realtime && timeFilter === "Shift"  && <span>· realtime </span>}
			</h3>
			&nbsp; 
			&nbsp; 
			<h3>
				{<span> ·  Range:  {moment(start).format("MM/DD/YYYY hh:mm A")}  -  {moment(end).format("MM/DD/YYYY hh:mm A")}</span> }
			</h3>
		</div>

		<IndicatorCard
			subtitle="Availability"
			title={`${availability || 0}%`}
			background="#3c8dbc"
			icon="clock-outline"
		/>

		<IndicatorCard
			subtitle="Performance"
			title={`${performance || 0}%`}
			background="#3c8dbc"
			icon="calculator"
		/>

		<IndicatorCard
			subtitle="Quality"
			title={`${quality || 0}%`}
			background="#3c8dbc"
			icon="calculator"
			onClickOptions={realtime && timeFilter === "Shift" && {
				content: "Add scrap info",
				handle: () => setOpen(true)
			}}
		/>

		<IndicatorCard
			subtitle={<StandardSubtitle text="OEE" stdValue="90%"/>}
			title={`${oee || 0}%`}
			background={calcColor(oee, 90)}
			icon="calculator"
		/>

		<IndicatorCard
			subtitle={
				state.standard ?
					<StandardSubtitle
						text="Pipe Count"
						stdValue={
							state.standard ?
								`${state.standard.value} ${state.standard.unit}` :
								"-"
						}
					/> :
					"Pipe Count"
			}
			title={totalPieces ? totalPieces : "-"}
			background={calcColor(totalPieces || 0, 1)}
			icon="calculator"
		/>

		<IndicatorCard
			subtitle={
				state.standard ?
					<StandardSubtitle
						text="Cycle Time"
						stdValue={state.standard ? (1 / state.standard.value * 3600).toFixed(2) + " sec" : "-"}
					/> :
					"Cycle Time"
			}
			title={cycleTime ? `${(Number(cycleTime) / 1000).toFixed(1)} sec` : "-"}
			background={calcColor(cycleTime, 1 / state.standard?.value * 3600)}
			icon="clock-outline"
		/>

		{
			realtime &&
			<IndicatorCard
				subtitle="Line Status"
				title={status || "No conn."}
				background={calcColor(status, "Running")}
				icon="chart-bar"
			/>
		}

		<ScrapDialog
			open={open}
			product={product}
			renderToPortal
			onClose={({detail: {action}}) => {
				console.log(action);
				setOpen(false);
			}}
			onAddClick={handleAddClick}
			// onClosed={evt => console.log(evt.detail.action)}
		/>
	</Fragment>;
}

interface ScrapDialogProps extends DialogProps {
	product?: Product;
	amount?: number;
	onAddClick: (value: number) => void;
}

const ScrapDialog: FC<ScrapDialogProps> = ({product, amount, onAddClick, ...props}) => {
	const [scrap, setScrap] = useState<number>(0);

	useEffect(() => setScrap(amount || 0), [amount]);

	const handleAddClick = useCallback(() => {
		setScrap(prev => {
			onAddClick(prev);
			return prev;
		})
	}, []);

	return <>
		<Dialog {...props}>

			{(product && <>
				<DialogTitle>
					Add scrap of {product.name}
				</DialogTitle>

				<DialogContent>
					<TextField
						placeholder="Amount of pieces"
						type="number"
						value={scrap}
						onChange={({ currentTarget: { value } }) => {
							const amount = Number(value || 0);
							setScrap(amount >= 0 ? amount : 0);
						}}
					/>
				</DialogContent>
			</>) || <>
				<DialogTitle>
					Action required first
				</DialogTitle>

				<DialogContent>
					You should first set which product is being produced in this line.
				</DialogContent>
			</>}

			<DialogActions>
				<DialogButton action="close">
					Cancel
				</DialogButton>

				{
					product &&
					<DialogButton action="add" onClick={handleAddClick}>
						Add
					</DialogButton>
				}
			</DialogActions>
		</Dialog>
	</>;
}