#!/usr/bin/env -S deno run --allow-net --allow-read

import { MqttClient } from './deps.ts';

const path = Deno.args[0];
const text = Deno.readTextFileSync(path);

const lines = text.split("\n");
lines.splice(0, 2);

const data: { [key: string]: string }[] = [];

lines.forEach(line => line && data.push(JSON.parse(line)));

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const client = new MqttClient({
	url: `mqtt://${Deno.env.get("MQTT_ADDRESS") || "127.0.0.1"}`
});

await client.connect();

for (let i = 0; i < data.length; i++) {
	const payload = data[i];
	const prev = data[i - 1];

	if (prev) {
		const date = new Date(payload.receivedAt);
		const prevDate = new Date(prev.receivedAt);
		const delta = date.getTime() - prevDate.getTime();
		await sleep(delta);
	}

	payload.ts = new Date().toLocaleString();
	await client.publish("iot-2/downtime", JSON.stringify(payload));
	console.log(payload);
}

await client.disconnect();
