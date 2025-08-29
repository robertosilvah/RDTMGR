import { Router, helpers, Status } from '../deps.ts';
import { getFields } from "../helpers.ts";
import { logger } from "../logger.ts";

import { ShiftDefinition as model } from '../models/shifts.ts';

const router = new Router({ prefix: "/api/" });

router.get(model.endpoint, async (ctx) => {
	const {response} = ctx;

	try {
		const { enabled } = helpers.getQuery(ctx);

		if (enabled === 'true') {
			response.body = await model.getEnabled();
		} else {
			response.body = await model.all();
		}
	} catch (ex) {
		logger.error(ex);
		response.status = Status.InternalServerError;
		response.body = JSON.stringify(ex);
	}
});

router.get(`${model.endpoint}/fields`, ({response}) => {
	response.body = getFields(model);
});

router.post(model.endpoint, async (ctx) => {
	const {response, request} = ctx;
	const row: model = await request.body().value;
	const { locationId, startTime, amount, enabled } = row;

	try {
		const result = await model.create(locationId!, startTime, amount, enabled!);

		if (result?.lastInsertId)
			response.body = await model.getById(result.lastInsertId);
	} catch (ex) {
		logger.error(row, ex);
		response.status = Status.InternalServerError;
		response.body = JSON.stringify(ex);
	}
});

router.put(model.endpoint, async (ctx) => {
	const { response, request } = ctx;
	const row = await request.body().value;
	const { id, locationId, startTime, amount, enabled } = row;

	try {
		const result = await model.update(Number(id), Number(locationId), new Date(startTime), Number(amount), Boolean(enabled)!);

		if (result) {
			const row = await model.getById(id!);
			if (row)
				response.body = model.from(row);
		}
	} catch (ex) {
		const {message, name, stack} = ex;
		logger.error(ex);
		response.body = {message, name, stack};
		response.status = Status.InternalServerError;
	}
});

router.delete(`${model.endpoint}/:id`, async (ctx) => {
	const {response, params} = ctx;

	try {
		response.body = await model.disable(Number(params.id));
	} catch (ex) {
		logger.error(ex);
		response.status = Status.InternalServerError;
		response.body = JSON.stringify(ex);
	}
});

router.get('locations/:locationId/shifts', async (ctx) => {
	const {response, params: {locationId}} = ctx;
	const {enabled} = helpers.getQuery(ctx);

	try {
		response.body = await model.getEnabledByLocationId(Number(locationId));
	} catch (ex) {
		logger.error(ex);
	}
});

export const routes = router.routes();
