const httpCasClient = require('../');

module.exports = function createCasClientKoaMiddleware(...options) {
	const handler = httpCasClient(...options);

	return async function casClientMiddleware(ctx, next) {
		const { body } = ctx.request;
		const hook = {};

		if (body) {
			hook.bodyParser = () => body;
		}

		if(await handler(ctx.req, ctx.res, hook)) {
			ctx.principal = ctx.request.principal = ctx.req.principal;
			ctx.ticket = ctx.request.ticket = ctx.req.ticket;

			return next();
		}
	};
};
