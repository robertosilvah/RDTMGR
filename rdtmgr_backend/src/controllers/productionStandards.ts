import { Router, helpers, Status } from '../deps.ts';
import { getFields } from "../helpers.ts";
import { logger } from "../logger.ts";
import { ProductionStandard as model } from "../models/production.ts";

const router = new Router({ prefix: "/api" });

router.get('/production/standards', async (ctx) => {
	const {response} = ctx;

	try {
		const params = helpers.getQuery(ctx);

		if (params['enabled'] === 'true') {
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

router.get('/production/standards/fields', async (ctx) => {
	ctx.response.body = getFields(model);
});

router.get('/production/standards/:id', async (ctx) => {
	try {
		ctx.response.body = await model.getById(Number(ctx.params.id));
	} catch (ex) {
		logger.error(ex);
	}
});

router.post('/production/standards', async (ctx) => {
	const {response, request} = ctx;
	const row = await request.body().value;
	const {locationId, productId, value, unit, enabled} = row;

	try {
		const result = await model.create(locationId, productId, value, unit, enabled);

		if (result?.lastInsertId) {
			response.body = await model.getById(result.lastInsertId);
		}
	} catch (ex) {
		logger.error(row, ex);
		response.status = Status.InternalServerError;
		response.body = JSON.stringify(ex);
	}
});

router.put('/production/standards', async (ctx) => {
	const {response, request} = ctx;
	const row = await request.body().value;
	const {id, locationId, productId, value, unit, enabled} = row;

	try {
		const result = await model.update(id, locationId, productId, value, unit, enabled);

		if (result) {
			// logger.debug(result, location);
			response.body = await model.getById(id);
		}
	} catch (ex) {
		const {message, name, stack} = ex;
		logger.error(ex);
		response.body = {message, name, stack};
		response.status = Status.InternalServerError;
	}
});

router.delete('/production/standards/:id', async (ctx) => {
	const {response, params} = ctx;

	try {
		response.body = await model.disable(Number(params.id));
	} catch (ex) {
		logger.error(ex);
		response.status = Status.InternalServerError;
		response.body = JSON.stringify(ex);
	}
});

export const routes = router.routes();
