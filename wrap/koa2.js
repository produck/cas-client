const createCasClientHandler = require('../');

module.exports = function createCasClientKoaMiddleware(...options) {
	const handler = createCasClientHandler(...options);

	return async function casClientMiddleware(ctx, next) {
		const { body } = ctx.request;
		const hook = {};
		
		if (body) {
			hook.bodyParser = () => body;
		}

		if(await handler(ctx.req, ctx.res)) {
			ctx.principal = ctx.request.principal = ctx.req.principal;
			ctx.ticket = ctx.request.ticket = ctx.req.ticket;
	
			return next();
		}
	};
};