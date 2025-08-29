import { ShiftDefinition, ShiftDefinitionEvents, ShiftDefinitionUpdated, Shift } from "../models/shifts.ts";
import { Location } from "../models/locations.ts";
import { TimeInterval, TimeRange } from "../models/time_interval.ts";
import { LineStatus } from "../consts.ts";
import { Production, ProductionStandard } from "../models/production.ts";
import { Delay } from "../models/delays.ts";
import { logger } from "../logger.ts";
import { getStack, msToTimeString, varAsBoolean } from "../helpers.ts";

const debugMessages = varAsBoolean(Deno.env.get("DEBUG_MSGS"));

export interface LineProcessMessage {
	scanner: number;
	count: number;
	cycleTime: number;
	timestamp: Date;
}

interface LineProcessMessageDefinition {
	scanner: string;
	count: string;
	cycleTime: string;
}

export type LineProcessMessageDefinitions = {
	[k: string]: LineProcessMessageDefinition
}

export enum LineProcessEvents {
	OnFinishProduction = "OnFinishProduction",
	OnUpdateProduction = "OnUpdateProduction",
	OnFinishDelay = "OnFinishDelay",
	OnUpdateDelay = "OnUpdateDelay",
	OnStateUpdate = "OnStateUpdate",
}

export interface Action<T> {
	type: string;
	payload: T;
}

export abstract class EventWithAction<T> extends CustomEvent<T> {
	type: string;

	constructor(type: string, detail: T, eventInitDict?: CustomEventInit<T>) {
		super(type, { detail, ...eventInitDict });
		this.type = type;
	}

	asAction(): Action<unknown> {
		const { type, detail: payload } = this;
		return { type, payload };
	}
}

export class ProductionFinishedEvent extends EventWithAction<LineProcessState> {
	constructor(detail: LineProcessState, eventInitDict?: CustomEventInit<LineProcessState>) {
		super(LineProcessEvents.OnFinishProduction, detail, eventInitDict);
	}
}

type ProductionUpdatedModel = {
	location: Location,
	indicators: LineProcessIndicators,
	currentProduction: GanttDatum;
};
type ProductionUpdatedAction = Action<ProductionUpdatedModel>;

export class ProductionUpdatedEvent extends EventWithAction<LineProcessState> {
	static type = LineProcessEvents.OnUpdateProduction;

	constructor(detail: LineProcessState, eventInitDict?: CustomEventInit<LineProcessState>) {
		super(LineProcessEvents.OnUpdateProduction, detail, eventInitDict);
	}

	asAction(): ProductionUpdatedAction {
		const state = this.detail;
		const { location, currentProduction } = state!;
		const indicators = state!.getIndicators();
		const payload: ProductionUpdatedModel = {
			location, currentProduction: LineProcessIndicators.asGanttDatum(currentProduction!), indicators
		};

		return {
			type: ProductionUpdatedEvent.type,
			payload
		}
	}
}

export class DelayFinishedEvent extends EventWithAction<LineProcessState> {
	constructor(detail: LineProcessState, eventInitDict?: CustomEventInit<LineProcessState>) {
		super(LineProcessEvents.OnFinishDelay, detail, eventInitDict);
	}
}

type DelayUpdatedModel = {
	location: Location,
	indicators: LineProcessIndicators,
	currentDelay: GanttDatum;
};
type DelayUpdatedAction = Action<DelayUpdatedModel>;

export class DelayUpdatedEvent extends EventWithAction<LineProcessState> {
	static type = LineProcessEvents.OnUpdateDelay;

	constructor(detail: LineProcessState, eventInitDict?: CustomEventInit<LineProcessState>) {
		super(LineProcessEvents.OnUpdateDelay, detail, eventInitDict);
	}

	asAction(): DelayUpdatedAction {
		const state = this.detail;
		const { location, currentDelay } = state!;
		const indicators = state!.getIndicators();
		const payload: DelayUpdatedModel = {
			location, currentDelay: LineProcessIndicators.asGanttDatum(currentDelay!), indicators
		};

		return {
			type: DelayUpdatedEvent.type,
			payload
		}
	}
}

type StateUpdatedModel = {
	location: Location;
	standard: ProductionStandard | null;
	shifts?: TimeInterval[] | null;
	lastTimestamp: Date;
	interval: TimeInterval | null;
	indicators: LineProcessIndicators;
};

type StateUpdatedAction = Action<StateUpdatedModel>;

export class StateUpdatedEvent extends EventWithAction<LineProcess> {
	static type = LineProcessEvents.OnStateUpdate;

	constructor(detail: LineProcess, eventInitDict?: CustomEventInit<LineProcess>) {
		super(StateUpdatedEvent.type, detail, eventInitDict);
	}

	asAction(): StateUpdatedAction {
		const { state, shiftDefinition } = this.detail;
		const { lastTimestamp, location, interval, productionStandard: standard } = state!;
		const shifts = ShiftDefinition.calcIntervalsFrom(lastTimestamp, shiftDefinition!);
		const indicators = state!.getIndicators();

		return {
			type: StateUpdatedEvent.type,
			payload: { location, standard, shifts, lastTimestamp, interval, indicators }
		}
	}
}

export interface LineProcessEventMap {
	OnFinishProduction: ProductionFinishedEvent,
	OnUpdateProduction: ProductionUpdatedEvent,
	OnFinishDelay: DelayFinishedEvent,
	OnUpdateDelay: DelayUpdatedEvent,
	OnStateUpdate: StateUpdatedEvent,
}

/** Contains the state of a specific time interval of a LineProcess. */
export class LineProcessState {
	production!: Production[];
	delays!: Delay[];
	location: Location;

	shiftId: number | null = null;
	interval: TimeInterval | null = null;

	status = LineStatus.INITIALIZING;
	zero = 0;
	count = 0;
	badPieces = 0;
	cycleTime = 0;

	/** Production standard for the selected product, in milliseconds. */
	standard: number | null = 60000;

	currentProduction: Production | null = null;
	currentDelay: Delay | null = null;
	productId: number | null = null;
	productionStandard: ProductionStandard | null = null;

	get lastTimestamp(): Date {
		const currentEvent = this.currentDelay || this.currentProduction;
		if (currentEvent)
			return new Date(currentEvent.endDate);

		if (this.interval) {
			const [start] = this.interval.range;
			return start;
		}

		throw new Error("No last event nor interval defined.");
	}

	get totalPieces() {
		return this.count - this.zero;
	}

	get delayAmount() {
		return this.delays.length + Number(!!this.currentDelay);
	}

	get goodPieces() {
		return this.totalPieces - this.badPieces;
	}

	get delayTime() {
		if (this.currentDelay) {
			const { startDate, endDate } = this.currentDelay;
			const currentDelayDuration = endDate.getTime() - startDate.getTime();
			return this.getDelayTime() + currentDelayDuration;
		}

		return this.getDelayTime();
	}

	get productionTime() {
		if (this.currentProduction) {
			const { startDate, endDate } = this.currentProduction;
			const currentProductionDuration = endDate.getTime() - startDate.getTime();
			return this.getProductionTime() + currentProductionDuration;
		}

		return this.getProductionTime();
	}

	constructor(location: Location, productions: Production[], delays: Delay[], interval?: TimeInterval) {
		this.location = location;

		logger.debug(`${this.location.name} Lineprocessstate constructor, productions ${JSON.stringify(productions)}`)
		logger.debug(`${this.location.name} Lineprocessstate constructor, delays ${JSON.stringify(delays)}`)
		logger.debug(`${this.location.name} Lineprocessstate constructor, interval ${JSON.stringify(interval)}`);

		if (interval)
			this.interval = interval;

		this.setProductions(productions);
		this.setDelays(delays);
	}

	private setProductions(production: Production[]) {
		this.production = production;

		const {length: amount} = production;
		const lastProduction: Production = production[amount-1];

		if (lastProduction) {
			const { totalPieces, badPieces } = LineProcessState.getPieces(production);
			this.count = totalPieces;
			this.badPieces = badPieces;
			this.trySetCurrentProduction(lastProduction);
			if (this.currentProduction)
				this.status = LineStatus.RUNNING;
			else
				this.status = LineStatus.DELAYED;
		} else {
			this.status = LineStatus.DELAYED;
		}
	}

	static getPieces(production: Production[]) {
		let shiftId: number | null = null;
		let prevTotalPieces = 0;
		let totalPieces = 0;
		let prevBadPieces = 0;
		let badPieces = 0;

		production.forEach(p => {
			if (shiftId !== p.shiftId) {
				prevTotalPieces = 0;
				prevBadPieces = 0;
				shiftId = p.shiftId;
			}

			totalPieces += p.totalPieces - prevTotalPieces!;
			badPieces += p.badPieces - prevBadPieces!;

			prevTotalPieces = p.totalPieces;
			prevBadPieces = p.badPieces;
		});

		return { totalPieces, badPieces };
	}

	private trySetCurrentProduction(production: Production | null) {
		if (!production)
			return;
 
		if (this.productionTimeSurpassedStandard(production)) {
			logger.debug(`${this.location.name}: Lineprocessstate trySetCurrentProduction - Last production surpasses production standard, then current production is null`)
			this.currentProduction = null;
		} else {
			
			logger.debug(`${this.location.name}: Lineprocessstate trySetCurrentProduction - Last production ${JSON.stringify(production)}`)
			this.currentProduction = production;
			const index = this.production.indexOf(production);
			if (index !== -1)
				this.production.splice(index, 1);
		}
	}

	private productionTimeSurpassedStandard(lastProduction: Production | null, timestamp?: Date | null): boolean {
		if (!this.standard)
			throw new Error("No production standard set.");

		if (!lastProduction)
			return false;

		if (!timestamp)
			timestamp = this.lastTimestamp;

		if (!timestamp)
			throw new Error("Timestamp is not defined.");

		const productionStartToLastTimestamp = timestamp.getTime() - lastProduction.startDate.getTime();
		return productionStartToLastTimestamp >= this.standard;
	}

	private setDelays(delays: Delay[]) {
		this.delays = delays;
		logger.debug(`${this.location.name}: Lineprocessstate setDelays - lastDelay ${JSON.stringify(this.currentDelay)}`)
		logger.debug(`${this.location.name}: Lineprocessstate setDelays - getLastDelay ${JSON.stringify(this.getLastDelay())}`)

		const lastDelay = this.currentDelay || this.getLastDelay();
		const lastProduction = this.getLastProduction();

		if (lastDelay) {
			if (lastProduction) {
				if (lastDelay.startDate > lastProduction.startDate) {
					logger.debug(`${this.location.name}: Lineprocessstate setDelays - lastDelay startdate ${lastDelay.startDate} is higher than last production startDate ${lastProduction.startDate}.`);
					logger.debug(`${this.location.name}: Lineprocessstate setDelays - setting last delay as current.`);
					this.trySetCurrentDelay(lastDelay);
				} else {
					logger.debug(`${this.location.name}: Lineprocessstate setDelays - lastDelay startdate ${lastDelay.startDate} is lower than last production startDate ${lastProduction.startDate}.`);
					this.trySetCurrentDelayFromLastProduction();
				}

				if (!lastProduction.id)
					this.tryFinishProduction();
				else
				{
					/* If the production item was removed from the list we add it again */
					const index = this.production.indexOf(lastProduction);
					if (index === -1)
					{
						logger.debug(`${this.location.name}: Lineprocessstate setDelays - adding current production again to the production array, because it was removed it`);
						this.production.push(lastProduction)
					}
					logger.debug(`${this.location.name}: Lineprocessstate setDelays - setting current production null`);
					this.currentProduction = null;
				}
			} else {
				logger.debug(`${this.location.name}: Lineprocessstate setDelays - setting last delay as current.`);
				this.trySetCurrentDelay(lastDelay);
			}
		} else {
			this.trySetCurrentDelay();
		}
	}

	private trySetCurrentDelay(delay?: Delay) {
		if (delay) {
			this.currentDelay = delay;
			logger.debug(`${this.location.name}: Lineprocessstate trySetCurrentDelay - delay ${JSON.stringify(delay)}`);

			const index = this.delays.indexOf(delay);
			if (index !== -1)
			{
				this.delays.splice(index, 1);
				logger.debug(`${this.location.name}: Lineprocessstate trySetCurrentDelay - splice from delays ${JSON.stringify(delay)}, delays  ${JSON.stringify(this.delays)}`);
			}
		} else {
			logger.debug(`${this.location.name}: Lineprocessstate trySetCurrentDelay - setting new current delay.`);
			this.currentDelay = new Delay(this.lastTimestamp, this.lastTimestamp, this.location.id);
		}

		this.status = LineStatus.DELAYED;
	}

	private trySetCurrentDelayFromLastProduction() {
		const lastProduction = this.getLastProduction();
		if (lastProduction) {
			if (this.isRealtime())
				logger.info(`${this.location.name}: Lineprocessstate trySetCurrentDelayFromLastProduction - setting delay from last production end.`);

			this.trySetCurrentDelay(new Delay(lastProduction.endDate, this.lastTimestamp, this.location.id));
		} else {
			this.trySetCurrentDelay();
		}
	}

	getProductionTime(): number {
		return this.production.reduce((timeAccum, production) => {
			const { startDate, endDate } = production;
			return timeAccum + endDate.getTime() - startDate.getTime();
		}, 0);
	}

	getDelayTime(): number {
		return this.delays.reduce((timeAccum, delay) => {
			const { startDate, endDate } = delay;
			return timeAccum + endDate.getTime() - startDate.getTime();
		}, 0);
	}

	handleUpdate(timestamp: Date) {
		this.tryUpdateCurrentProduction(timestamp);
		this.tryUpdateCurrentDelay(timestamp);

		if (this.currentDelay)
			this.status = LineStatus.DELAYED;
		else if (this.currentProduction)
			this.status = LineStatus.RUNNING;
		else
			throw new Error("No delay nor production defined");

		return this;
	}

	private tryUpdateCurrentProduction(timestamp: Date) {
		if (!this.standard)
			throw new Error("No production standard set.");

		if (this.status === LineStatus.RUNNING) {
			if (this.currentProduction) {
				if (this.productionTimeSurpassedStandard(this.currentProduction, timestamp)) {
					logger.info(`${this.location.name}: Lineprocessstate tryUpdateCurrentProduction - production time surpassed, setting new delay.`);
					this.tryFinishProduction();
					const { endDate } = this.getLastProduction()!;
					this.trySetCurrentDelay(new Delay(new Date(endDate), timestamp, this.location.id));
				} else if (timestamp) {
					this.currentProduction.endDate = new Date(timestamp);
					logger.info(`${this.location.name}: Lineprocessstate tryUpdateCurrentProduction - setting end current production. ${JSON.stringify(timestamp)}`);
					dispatchEvent(new ProductionUpdatedEvent(this));
				} else {
					throw new Error("Timestamp is not defined.");
				}
			}
		}
	}

	private tryUpdateCurrentDelay(timestamp: Date) {
		if (this.status !== LineStatus.RUNNING) {
			if (this.currentDelay) {
				if (!timestamp)
					throw new Error("Timestamp is not defined.");

				this.currentDelay.endDate = new Date(timestamp);
				dispatchEvent(new DelayUpdatedEvent(this));
			}
		}
	}

	setProductionStandard(standard: ProductionStandard) {
		this.productionStandard = standard;
		this.standard = standard.getStandardInMillis();
		this.productId = standard.productId;
	}

	tryStartProduction(timestamp: Date, cycleTime: number, count: number) {
		if (!this.currentDelay)
			throw new Error(`${this.location.name}: Lineprocessstate tryStartProduction - no current delay defined`);

		let amount = count - this.count;
		if (amount == 0) {
			return;
		} else if (amount < 0) {
			amount = 1;
			this.zero = count - 1 - this.totalPieces;
			this.count = count - 1;
		}

		this.startProduction(timestamp, cycleTime, amount);
	}

	private startProduction(timestamp: Date, cycleTime: number, amount: number) {
		this.finishDelay(timestamp);

		logger.info(`${this.location.name}: Lineprocessstate startProduction - starting production. timestamp ${JSON.stringify(timestamp)} cycleTime ${cycleTime} amount ${amount}`);
		this.updateProduction(amount, timestamp, cycleTime);
	}

	private finishDelay(timestamp: Date): Delay {
		if (!this.currentDelay)
			throw new Error(`${this.location.name}: no current delay defined.`);

		if (!this.standard)
			throw new Error("No production standard set.");

		logger.info(`${this.location.name}: Lineprocessstate finishDelay - finishing delay. ${JSON.stringify(this.currentDelay)}, timestamp ${JSON.stringify(timestamp)}`);
		const delay = this.currentDelay;
		delay.endDate = new Date(timestamp);
		this.currentDelay = null;
		this.pushDelay(delay)
		return delay;
	}

	private pushDelay(delay: Delay) {
		this.delays.forEach(d => {
			if (d.startDate.getTime() === delay.startDate.getTime())
				throw new Error(`Lineprocessstate pushDelay - Already inserted delay ${d.id} with start date ${d.startDate.toISOString()}`);
		});

		console.log(`${this.location.name}: Lineprocessstate pushDelay - ${JSON.stringify(delay)}`)
		this.delays.push(delay);
		dispatchEvent(new DelayFinishedEvent(this));
	}

	tryUpdateProduction(count: number, timestamp: Date, cycleTime: number) {
		if (!this.currentProduction)
			throw new Error(`${this.location.name}: no current production defined`);

		let amount = count - this.count;
		if (amount == 0) {
			return;
		} else if (amount < 0) {
			amount = 1;
			this.zero = count - 1 - this.totalPieces;
			this.count = count - 1;
		}

		this.updateProduction(amount, timestamp, cycleTime);
	}

	private updateProduction(amount: number, timestamp: Date, cycleTime: number) {
		if (amount > 0) {
			logger.info(`${this.location.name}: Lineprocessstate updateProduction - updating production.`);
			this.addProduction(timestamp, cycleTime, amount);
		} else if (this.productionTimeSurpassedStandard(this.getLastProduction(), timestamp)) {
			logger.info(`${this.location.name}: Lineprocessstate updateProduction - production time surpassed, setting new delay.`);
			if (this.currentProduction) {
				this.tryFinishProduction();
				this.trySetCurrentDelayFromLastProduction();
			} else if (this.currentDelay) {
				this.tryUpdateCurrentDelay(timestamp);
			} else {
				logger.error(`${this.location.name}: Lineprocessstate updateProduction - no production nor delay defined.`, getStack(new Error()));
				this.trySetCurrentDelay();
			}
		}
	}

	private addProduction(timestamp: Date, cycleTime: number, amount: number) {
		this.tryFinishProduction(timestamp);
		this.createProductionEntries(timestamp, cycleTime, amount);
		this.trySetCurrentProduction(this.getLastProduction());
		this.count += amount;
	}

	private tryFinishProduction(end?: Date | number) {
		if (this.currentProduction)
			this.finishProduction(end);
	}

	private finishProduction(end?: Date | number) {
		if (!this.currentProduction)
			throw new Error(`${this.location.name}: no current production defined`);

		if (!this.standard)
			throw new Error("No production standard set.");

		logger.info(`${this.location.name}: Lineprocessstate finishProduction - finishing production. endDate ${end}. Current Production ${JSON.stringify(this.currentProduction)}`);

		const entry = this.currentProduction!;
		const { startDate } = entry;
		let { totalPieces } = entry;

		const prevIndex = this.production.length - 1;
		const prevProduction = this.production[prevIndex];

		if (prevProduction)
			totalPieces -= prevProduction.totalPieces;

		if (!end)
			end = startDate.getTime() + (this.standard * totalPieces);

		entry.endDate = new Date(end);

		this.currentProduction = null;
		this.pushProduction(entry);
	}

	private createProductionEntries(timestamp: Date, cycleTime: number, amount: number) {
		const newEntries: Production[] = [];

		for (let i = 0; i < amount; i++) {
			const totalPieces = this.totalPieces + i + 1;
			logger.info(`${this.location.name}: Lineprocessstate createProductionEntries - creating new production, ${totalPieces} total pieces.`);

			const entry = Object.assign(new Production(this.location), {
				productId: this.productId,
				shiftId: this.shiftId!,
				totalPieces,
				badPieces: this.badPieces,
				goodPieces: totalPieces - this.badPieces,
				startDate: new Date(timestamp),
				endDate: new Date(timestamp),
				cycleTime: cycleTime
			});
			
			logger.debug(`${this.location.name}: Lineprocessstate createProductionEntries - entry ${JSON.stringify(entry)}`);
			newEntries.push(entry);
		}

		this.currentProduction = newEntries.pop()!;
		newEntries.forEach(entry => this.pushProduction(entry));
	}

	private pushProduction(production: Production) {
		this.production.push(production);
		dispatchEvent(new ProductionFinishedEvent(this));
	}

	getLastProduction(): Production | null {
		if (this.currentProduction)
			return this.currentProduction;

		const index = this.production.length - 1;
		return this.production[index];
	}

	getLastDelay(): Delay | null {
		if (this.currentDelay)
			return this.currentDelay;

		const index = this.delays.length - 1;
		return this.delays[index];
	}

	getIndicators() {
		return new LineProcessIndicators(this);
	}

	setScrap(amount: number) {
		this.badPieces = amount;
		const lastProduction = this.getLastProduction();
		if (lastProduction)
			lastProduction.badPieces = amount;
	}

	isRealtime(): boolean {
		if (!this.interval)
			throw new Error("Can't compare with undefined state.");

		return this.interval.contains(new Date());
	}

	finish(timestamp: Date) {
		this.handleUpdate(timestamp);
		const [, end] = this.interval!.range;

		switch (this.status) {
			case LineStatus.LOST_MQTT_CONNECTION:
			case LineStatus.DELAYED:
				this.finishDelay(end);
				break;

			case LineStatus.RUNNING:
				this.finishProduction(end);
				break;

			default:
				logger.error(`${this.location.name}: Lineprocessstate finish -  can't finish process in "${this.status}" state timestamp ${timestamp}`);
				break;
		}

		return this;
	}
}

export const LineProcesses = new Map<number, LineProcess>();

export class LineProcess {
	location: Location;

	state: LineProcessState | null = null;
	shiftDefinition?: ShiftDefinition | null;
	lastMessage: LineProcessMessage | null = null;
	lastStandard?: ProductionStandard;

	parseMessage?: (message: Record<string,number>) => LineProcessMessage;

	constructor(location: Location, shiftDefinitions?: ShiftDefinition | null) {
		this.location = location;
		this.shiftDefinition = shiftDefinitions;

		logger.debug(`${this.location.name} LineProcess constructor, shiftDefinition ${JSON.stringify(shiftDefinitions)}`);
	}

	/** Initializes the process with the last state in the provided interval, or current shift if not. */
	async init(interval?: TimeInterval): Promise<LineProcess> {
		logger.info(`${this.location.name}: initializing line process. Interval ${JSON.stringify(interval)}`);
		this.state = await this.getStateFromTimeInterval(interval);
		await this.trySetCurrentShift(interval);	
		LineProcesses.set(this.location.id, this);
		return this;
	}

	async trySetCurrentShift(interval?: TimeInterval) {
		try {
			// Is current shift if it doesn't receive an interval
			if(this.state && this.state.interval && !interval)
			{
				logger.debug(`${this.location.name}: LineProcess trySetCurrentShift - is current shift`)
				const shiftInfo = await Shift.getByTimeRange(this.location.id, this.state.interval.range)
				logger.debug(`${this.location.name}: LineProcess trySetCurrentShift - shiftInfo ${JSON.stringify(shiftInfo)}`)

				if (shiftInfo)
				{
					this.state.shiftId = shiftInfo.id
				}
			}
		}
		catch(_){}
	}

	async getStateFromTimeInterval(interval?: TimeInterval) {
		const { id: locationId } = this.location;

		logger.debug(`${this.location.name}: LineProcess getStateFromTimeInterval - interval ${JSON.stringify(interval)}`);
		logger.debug(`${this.location.name}: LineProcess getStateFromTimeInterval - shiftDefinition ${JSON.stringify(this.shiftDefinition)}`);

		if (!this.shiftDefinition)
			this.shiftDefinition = await ShiftDefinition.getByLocationId(locationId);

		logger.debug(`${this.location.name}: LineProcess getStateFromTimeInterval - shiftDefinition ${JSON.stringify(this.shiftDefinition)}`);
		if (!interval) {
			const now = new Date();
			interval = this.calcMatchingInterval(now);
			logger.debug(`${this.location.name}: LineProcess getStateFromTimeInterval - calculated interval ${JSON.stringify(interval)}`);
		}

		let isCurrent = false;

		try {
			isCurrent = this.isCurrentInterval(interval.range)
			logger.debug(`${this.location.name}: LineProcess getStateFromTimeInterval - is current interval ${isCurrent}`);
		} catch (error) {}

		if (isCurrent) {
			return this.state;
		} else if (interval) {
			const [start, end] = interval.range;
			const productions = await Production.getByTimeRange(locationId, start, end);
			const lastProduction = productions[productions.length - 1];
			const delays = await Delay.getByTimeRange(locationId, start, end);

			let standard: ProductionStandard | null = null;

			if (lastProduction) {
				standard = await ProductionStandard.get(lastProduction.productId, locationId);
			}

			const state = this.getStateFrom(productions, delays, interval);

			if (standard)
				state.setProductionStandard(standard);

			return state;
		}

		throw new Error("LineProcess getStateFromTimeInterval - Interval is not defined.");
	}

	setupState(productions: Production[] = [], delays: Delay[] = [], interval?: TimeInterval): LineProcessState {
		this.state = this.getStateFrom(productions, delays, interval);
		return this.state;
	}

	getStateFrom(productions: Production[] = [], delays: Delay[] = [], interval?: TimeInterval): LineProcessState {
		const state = new LineProcessState(this.location, productions, delays, interval);
		return state;
	}

	parseAndHandleMessage(message: any) {
		if (this.parseMessage)
			message = this.parseMessage(message as Record<string, number>);

		this.handleMessage(message);
	}

	handleMessage(message: LineProcessMessage): LineProcessState {
		this.clearStateIfOutOfTimeRange(message.timestamp);

		if (debugMessages)
		{
			logger.debug(`${this.location.name}: LineProcess handleMessage - handling message`, JSON.stringify(message));
		}

		if (!this.lastMessage) {
			this.firstStateUpdate(message);
			this.dispatchStateUpdate();
		} else {
			this.notFirstStateUpdate(message);
		}

		return this.state!;
	}

	dispatchStateUpdate(state?: LineProcessState) {
		const detail = !state ? this : { ...this, state };
		dispatchEvent(new StateUpdatedEvent(detail));
	}

	clearStateIfOutOfTimeRange(timestamp: Date) {
		if (this.state) {
			if (this.state.productionStandard)
				this.lastStandard = this.state.productionStandard;

			if (!this.state.interval)
				throw new Error("Interval is not defined.");

			const [, end] = this.state.interval.range;

			if (timestamp >= end) {
				logger.info(`${this.location.name}: LineProcess clearStateIfOutOfTimeRange - timestamp is out of time range, closing process interval.`);

				this.state.finish(end);
				this.state = null;
				this.lastMessage = null;
			}
		}
	}

	private firstStateUpdate(message: LineProcessMessage) {
		logger.debug(`${this.location.name}: LineProcess firstStateUpdate - updating process for the first time.`);

		const { count, cycleTime, timestamp } = message;

		if (!this.state) {
			const interval = this.calcMatchingInterval(timestamp);
			this.state = this.getStateFrom([], [], interval);
			this.trySetProductionStandard(this.lastStandard);
		}

		this.state.zero = count - this.state.totalPieces;
		this.state.count = count;
		this.state.cycleTime = cycleTime;
		this.state.handleUpdate(timestamp);

		this.lastMessage = message;
	}

	private calcMatchingInterval(timestamp: Date) {
		if (!this.shiftDefinition)
			throw new Error(`${this.location.name}: LineProcess calcMatchingInterval - Shift definition is not defined.`);

		const interval = ShiftDefinition.calcMatchingInterval(timestamp, this.shiftDefinition);

		if (!interval)
			throw new Error(`${this.location.name}: LineProcess calcMatchingInterval - couldn't find matching interval.`);

		return interval;
	}

	private notFirstStateUpdate(message: LineProcessMessage) {
		const { scanner: lastScanner, count: lastCount } = this.lastMessage!;
		const { scanner, count, cycleTime, timestamp } = message;

		if (!this.state)
			throw new Error(`${this.location.name}: LineProcess notFirstStateUpdate - state wasn't initialized`);

		if (count !== lastCount)
			this.updateCount(timestamp, cycleTime, count);

		this.state.handleUpdate(timestamp);

		this.lastMessage = message;
	}

	private updateCount(timestamp: Date, cycleTime: number, count: number) {
		const state = this.state!;
		const { status } = state;

		switch (status) {
			case LineStatus.RUNNING:
				state.tryUpdateProduction(count, timestamp, cycleTime);
				break;

			default:
				state.tryStartProduction(timestamp, cycleTime, count);
				break;
		}
	}

	trySetProductionStandard(standard?: ProductionStandard | null) {
		if (!this.state)
			throw new Error(`${this.location.name}: LineProcess trySetProductionStandard - tried to set production standard but state is not defined.`);

		if (standard)
			this.state.setProductionStandard(standard);
	}

	static tryGetById(locationId: number): LineProcess | undefined {
		return LineProcesses.get(locationId);
	}

	static async getById(locationId: number) {
		const process = LineProcesses.get(locationId);
		if (process)
			return process;

		const location = await Location.getById(locationId);
		if (location)
			return LineProcess.getByLocation(location);

		throw new Error(`Couldn't find location with id ${locationId}`);
	}

	static async getByLocation(location: Location) {
		const process = LineProcesses.get(location.id);
		if (process)
			return process;

		return await new LineProcess(location).init();
	}

	setupMessageParser(definition: LineProcessMessageDefinition) {
		const { scanner, count, cycleTime } = definition;
		this.parseMessage = (message: Record<string, number>): LineProcessMessage => {
			return {
				scanner: message[scanner],
				count: message[count],
				cycleTime: message[cycleTime],
				timestamp: new Date()
			}
		}
	}

	setScrap(amount: number) {
		if (!this.state)
			throw new Error(`${this.location.name}: tried to set scrap but state is not defined.`);

		this.state.setScrap(amount);
	}

	isCurrentInterval([start, end]: TimeRange): boolean {
		logger.debug("LineProcess isCurrentInterval method")
		if (!this.state)
			{
				logger.debug(`LineProcess isCurrentInterval - Can't compare with undefined state. State is undefined` )
				throw new Error("LineProcess isCurrentInterval - Can't compare with undefined state.");
			}

		const realtimeInterval = this.state.interval;
		if (!realtimeInterval)
		{
			logger.debug(`LineProcess isCurrentInterval - Can't compare with undefined state. State interval is undefined` )
			throw new Error("LineProcess isCurrentInterval - Can't compare with undefined state.");
		}
		
		const [ realtimeStart, realtimeEnd ] = realtimeInterval.range;
		const startMatches = start.getTime() === realtimeStart.getTime();
		const endMatches = end.getTime() === realtimeEnd.getTime();
		logger.debug(`LineProcess isCurrentInterval - realtimeStart ${realtimeStart} realtimeEnd ${realtimeEnd}` )
		logger.debug(`LineProcess isCurrentInterval - start ${start} end ${end}` )
		logger.debug(`LineProcess isCurrentInterval - startMatches ${startMatches} endMatches ${endMatches}` )
		return startMatches && endMatches;
	}

	inCurrentInterval(timestamp: Date): boolean {
		if (!this.state)
			throw new Error("LineProcess inCurrentInterval - Can't compare with undefined state.");

		return !!this.state.interval?.contains(timestamp);
	}

	asStateUpdatedAction(): StateUpdatedAction {
		return new StateUpdatedEvent(this).asAction();
	}
}

export class LineProcessIndicators {
	delayRate: number | string = "0";
	delayTimeStr = "--:--:--";
	lineStops: number | string = "-";

	availability: number | string = "0";
	performance: number | string = "0";
	quality: number | string = "0";
	oee: number | string = "0";
	cycleTime: number | string = "0";

	totalPieces: number | string = 0;
	status = LineStatus.INITIALIZING;
	gantt: { start: Date, end: Date, value: boolean }[] = [];

	constructor(state: LineProcessState) {
		const { delayTime, interval, lastTimestamp, delays, currentDelay, standard, productionTime, totalPieces, goodPieces, cycleTime, status, production, currentProduction } = state;

		if (!interval)
			throw new Error("LineProcessIndicators constructor - Interval is not defined.");

		if (!lastTimestamp)
			throw new Error("LineProcessIndicators constructor - Timestamp is not defined.");

		if (!standard)
			return;

		this.totalPieces = totalPieces;
		const [ start ] = interval.range;
		const elapsedTime = lastTimestamp.getTime() - start.getTime();

		this.delayRate = (delayTime / elapsedTime * 100 || 0).toFixed();
		this.delayTimeStr = LineProcessIndicators.getPrintableDelayTime(delayTime);
		this.lineStops = delays.length + Number(!!currentDelay);

		if (this.lineStops === 1 && currentDelay) {
			const { startDate, endDate } = currentDelay;
			const duration = endDate.getTime() - startDate.getTime();

			if (duration === 0)
				this.lineStops = 0;
		}

		const productionRate = productionTime / elapsedTime || 0;
		this.availability = (productionRate * 100).toFixed();

		const outputRate = totalPieces * standard / elapsedTime || 0;
		this.performance = (outputRate * 100).toFixed();

		const goodPiecesRate = (goodPieces / totalPieces) || 0;
		this.quality = (goodPiecesRate * 100).toFixed();

		this.oee = (productionRate * outputRate * goodPiecesRate * 100).toFixed();
		this.cycleTime = cycleTime.toFixed(1);

		this.status = status;

		this.gantt = LineProcessIndicators.getGanttItems(currentProduction, production, currentDelay, delays);
	}

	static getPrintableDelayTime(delayTime: number) {
		const delayTimeDate = new Date(delayTime);
		const hours = String(delayTimeDate.getUTCHours()).padStart(2, '0');
		const minutes = String(delayTimeDate.getUTCMinutes()).padStart(2, '0');
		const seconds = String(delayTimeDate.getUTCSeconds()).padStart(2, '0');
		return `${hours}:${minutes}:${seconds}`;
	}

	static getGanttItems(currentProduction: Production | null, production: Production[], currentDelay: Delay | null, delays: Delay[]): GanttDatum[] {
		let gantt: GanttDatum[] = [];

		if (currentProduction)
			production = [...production, currentProduction];

		production = this.groupProductions(production);
		gantt = gantt.concat(production.map(this.asGanttDatum));

		if (currentDelay)
			delays = [...delays, currentDelay];

		gantt = gantt.concat(delays.map(this.asGanttDatum));

		return gantt;
	}

	static groupProductions(production: Production[]): Production[] {
		const production_copy = production.map(x => Object.assign({}, x))
		const result: Production[] = [];
		let totalPieces = 0;
		let goodPieces = 0;
		let badPieces = 0;
		
 		logger.debug("LineProcessIndicators groupProductions - Indicators Grouping Productions")

		const getTotalPieces = (accumulator: number, currentValue: Production) => accumulator + currentValue.totalPieces
		const getGoodPieces = (accumulator: number, currentValue: Production) => accumulator + currentValue.goodPieces
		const getBadPieces = (accumulator: number, currentValue: Production) => accumulator + currentValue.badPieces

		for (const p of production_copy) {
			const last = result[result.length - 1];

			if (!last) {
				const copy = Object.assign(new Production(), p);
				result.push(copy);
			} else if (last.endDate.getTime() !== p.startDate.getTime()/*|| last.shiftId !== p.shiftId*/) {

				const copy = Object.assign(new Production(), p);

				const cummulativeTotal = result.reduce(getTotalPieces, 0)
				const cummulativeGood = result.reduce(getGoodPieces, 0)
				const cummulativeBad = result.reduce(getBadPieces, 0)
				
				totalPieces = cummulativeTotal;
				goodPieces = cummulativeGood;
				badPieces = cummulativeBad;

				copy.totalPieces = p.totalPieces - totalPieces;
				copy.goodPieces = p.goodPieces - goodPieces;
				copy.badPieces = p.badPieces - badPieces;

				result.push(copy);
			} else {
				
				last.endDate = new Date(p.endDate);
				last.totalPieces = p.totalPieces - totalPieces;
				last.goodPieces = p.goodPieces - goodPieces;
				last.badPieces = p.badPieces - badPieces;
			}
		}

		return result;
	}

	static asGanttDatum(object: Production | Delay): GanttDatum {
		const { id, startDate: start, endDate: end } = object;
		const duration = msToTimeString(end.getTime() - start.getTime());

		if (object instanceof Delay) {
			return { id, start, end, duration, value: true };
		} else {
			const { totalPieces: pieces } = object;
			return { id, start, end, duration, value: false, pieces };
		}
	}
}

export type GanttDatum = {
	id?: number | null;
	start: Date;
	end: Date;
	duration: string;
	value: boolean;
	pieces?: number;
}

addEventListener(ShiftDefinitionEvents.OnShiftDefinitionUpdated, e => {
	const { detail } = e as ShiftDefinitionUpdated;
	const { locationId } = detail;
	const process = LineProcess.tryGetById(locationId!);

	if (process)
		process.shiftDefinition = detail;
});