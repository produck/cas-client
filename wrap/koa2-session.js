const createCasClientHandler = require('..');

module.exports = function createCasClientKoaMiddleware(...options) {
	const handler = createCasClientHandler(...options);

	return async function casClientMiddleware(ctx, next) {
		const { session } = ctx;

		if (!session) {
			throw new Error('Cas client for koa2 with koa-session need to be put behind session middleware');
		}

		const continued = await handler(ctx.req, ctx.res, {
			getter() {
				return session.st;
			},
			created(ticketId) {
				session.st = ticketId;
			},
			destroy() {
				delete ctx.session;
			},
		});

		if(continued) {
			ctx.principal = ctx.request.principal = ctx.req.principal;
			ctx.ticket = ctx.request.ticket = ctx.req.ticket;
	
			return next();
		}
	}
}