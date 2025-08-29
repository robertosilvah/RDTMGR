import { MySqlClientConfig, MySqlClient } from "./deps.ts";

const config: MySqlClientConfig = {
	db: Deno.env.get("DB_NAME"),
	hostname: Deno.env.get("DB_ADDRESS") || Deno.env.get("ADDRESS") || '127.0.0.1',
	port: Number(Deno.env.get("DB_PORT") || 3306),
	username: Deno.env.get("DB_USER") || 'root',
	password: Deno.env.get("DB_PASS") || ''
	// poolSize: 0
};

const db = await new MySqlClient().connect(config);

// try {
// 	await db.sync();
// } catch (error) {
// 	console.warn(error.stack);
// }

export default db;
