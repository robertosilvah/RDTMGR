# RDT REST API Server

## Endpoints

/downtimes
- GET: returns rows from the downtimes table
	- ?start: (optional)
	- ?end: (optional)

/lines/:lineId/shifts
- GET: returns all available shifts

## Setup

These instructions assume that you already have a working database to use (MySQL 5.5 or MariaDB 10.2+).

> If the database is empty, it should automatically create the required tables.

1. Install [Deno](https://deno.land/#installation) 1.4.6.

	> Deno is a simple, modern and secure runtime for JavaScript and TypeScript. Unlike Node, it was created the latest JavaScript standards in mind, like [modules](https://javascript.info/modules-intro). Also, it downloads and caches dependencies automatically.

1. Clone this repository and change directory:

	```
	$ git clone https://github.com/antaresautomation/rdt_pms_backend.git
	$ cd rdt_pms_backend
	```

1. Create an ```.env``` file with the required variables:

	```
	PORT=3000
	DB_NAME=rdt_pms
	DB_USER=username
	DB_PASS=password
	```

	You can also specify ```DB_ADDRESS``` and ```DB_PORT``` if required.

1. Run the server with ```deno run --allow-net --allow-read --allow-env src/server.ts``` or by running the ```deno: run``` VS Code task.

	> It is recommended to install the [Deno VS Code extension](https://marketplace.visualstudio.com/items?itemName=denoland.vscode-deno) to have working URL imports and better IntelliSense.

For **debugging inside VS Code**, just use the provided launch option.
> VS Code will probably say ```Unable to retrieve source content``` but breakpoints are working fine.

More info on debugging Deno scripts [here](https://deno.land/manual@master/tools/script_installer).

### Setup on an offline environment

For information on how to cache the project dependencies in an accesible folder for its usage in an offline environment, [click here](https://deno.land/manual/linking_to_external_code#but-what-if-the-host-of-the-url-goes-down-the-source-won#39t-be-available).
