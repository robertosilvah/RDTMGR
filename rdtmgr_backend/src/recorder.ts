#!/usr/bin/env -S deno run --allow-net --allow-read

import { MqttClient } from "./deps.ts";

const prettyPrint = Deno.args.indexOf("--pretty-print") !== -1;

const client = new MqttClient({url: `mqtt://${Deno.env.get("MQTT_ADDRESS") || "127.0.0.1"}`});

console.log("Connecting to message broker...");
await client.connect();
console.log("Connected to message broker");

await client.subscribe("iot-2/downtime");

client.on("message", async (topic: string, payload: Uint8Array) => {
	const data: {
		value: number,
		UpsetterPipeCount: number,
		UpsetterCycleTime: number,
		HT_DT_Scanner: number,
		HTPipeCounter: number,
		HtCycleTime: number,
		receivedAt: Date
	} = JSON.parse(new TextDecoder().decode(payload));

	data.receivedAt = new Date();

	if (prettyPrint)
		console.log(data);
	else
		console.log(JSON.stringify(data));
});
