import { Router, helpers, Status } from '../deps.ts';
import { getFields } from "../helpers.ts";
import { logger } from "../logger.ts";
import { Location as model } from "../models/locations.ts";

const router = new Router({ prefix: "/api" });

router.get('/locations', async (ctx) => {
	const {response} = ctx;

	try {
		const params = helpers.getQuery(ctx);

		if (params['enabled'] === 'true') {
			// response.body = await model
			// 	.where('enabled', true)
			// 	.all();
			response.body = await model.getEnabled();
		} else {
			response.body = await model.all();
		}
	} catch (ex) {0
		logger.error(ex);
		response.status = Status.InternalServerError;
		response.body = JSON.stringify(ex);
	}
});

router.get('/locations/fields', async (ctx) => {
	ctx.response.body = getFields(model);
});

router.get('/locations/:id', async (ctx) => {
	try {
		// ctx.response.body = await model
		// 	.where('id', ctx.params.id)
		// 	.where('enabled', true)
		// 	.all();
		ctx.response.body = await model.getByNameOrId(ctx.params.id!);
	} catch (ex) {
		logger.error(ex);
	}
});

router.post('/locations', async (ctx) => {
	const {response, request} = ctx;
	const value = await request.body().value;
	const {name, parentId, enabled} = value;

	try {
		const result = await model.create(name, parentId, enabled);

		if (result?.lastInsertId) {
			response.body = await model.getById(result.lastInsertId);
		}
	} catch (ex) {
		logger.error(value, ex);
		response.status = Status.InternalServerError;
		response.body = JSON.stringify(ex);
	}
});

router.put('/locations', async (ctx) => {
	const {response, request} = ctx;
	const value = await request.body().value;
	const {id, name, parentId, enabled} = value;

	try {
		const result = await model.update(id, name, parentId, enabled);

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

router.delete('/locations/:id', async (ctx) => {
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
