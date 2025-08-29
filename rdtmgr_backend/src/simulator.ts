#!/usr/bin/env -S deno run --allow-net --allow-read

import { Application, Router, MqttClient } from './deps.ts';

const payload = {
	d: {
		"value": 0,
		"UpsetterPipeCount": 0,
		"UpsetterCycleTime": 0,
		"HT_DT_Scanner": 0,
		"HTPipeCounter": 0,
		"HtCycleTime": 0
	}
};

const processes = new Router();

let work = true;

let upsetterId: number | null;
let heatTreatmentId: number | null;

let upsetterPipesId: number | null;
let heatTreatmentPipesId: number | null;

processes.get("/1/start", ({response}) => {
	tryStartUpsetter();
	response.body = payload;
});

function tryStartUpsetter() {
	if (!upsetterId) {
		upsetterId = setInterval(() => {
			payload.d.value++;
		}, 1000);
	}
}

processes.get("/1/stop", ({response}) => {
	if (upsetterId) {
		clearInterval(upsetterId);
		upsetterId = null;
	}

	response.body = payload;
});

processes.get("/1/increment", ({response}) => {
	payload.d.UpsetterPipeCount++;
	response.body = payload;
});

processes.get("/1/increment/start", ({response}) => {
	if (!upsetterPipesId) {
		upsetterPipesId = setInterval(() => {
			payload.d.UpsetterPipeCount++;
		}, 80000);
	}

	response.body = payload;
});

processes.get("/1/increment/stop", ({response}) => {
	if (upsetterPipesId) {
		clearInterval(upsetterPipesId);
		upsetterPipesId = null;
	}

	response.body = payload;
});

processes.get("/1/increment/:value", ({response, params}) => {
	payload.d.UpsetterPipeCount = Number(params.value);
	response.body = payload;
});

processes.get("/2/start", ({response}) => {
	tryStartHeatTreatment();
	response.body = payload;
});

function tryStartHeatTreatment() {
	if (!heatTreatmentId) {
		heatTreatmentId = setInterval(() => {
			payload.d.HT_DT_Scanner++;
		}, 1000);
	}
}

processes.get("/2/stop", ({response}) => {
	if (heatTreatmentId) {
		clearInterval(heatTreatmentId);
		heatTreatmentId = null;
	}

	response.body = payload;
});

processes.get("/2/increment", ({response}) => {
	payload.d.HTPipeCounter++;
	response.body = payload;
});

processes.get("/2/increment/start", ({response}) => {
	if (!heatTreatmentPipesId) {
		heatTreatmentPipesId = setInterval(() => {
			payload.d.HTPipeCounter++;
		}, 80000);
	}

	response.body = payload;
});

processes.get("/2/increment/stop", ({response}) => {
	if (heatTreatmentPipesId) {
		clearInterval(heatTreatmentPipesId);
		heatTreatmentPipesId = null;
	}

	response.body = payload;
});

processes.get("/2/increment/:value", ({response, params}) => {
	payload.d.HTPipeCounter = Number(params.value);
	response.body = payload;
});

processes.get("/stop", ({response}) => {
	work = false;
	response.body = payload;
});

const client = new MqttClient({
	url: `mqtt://${Deno.env.get("MQTT_ADDRESS") || "127.0.0.1"}`
});

await client.connect();

tryStartHeatTreatment();
tryStartUpsetter();

setInterval(async () => {
	client.publish("iot-2/downtime", JSON.stringify(payload));
}, 1000);

const address = `${Deno.env.get("ADDRESS")}:${Number(Deno.env.get("PORT")) + 2}`;

const api = new Application();
api.use(processes.routes());
console.log('Process tester API server listening at', address);
await api.listen(address);
