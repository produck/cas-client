const httpCasClient = require('../');

module.exports = function createCasClientKoaSessionMiddleware(...options) {
	const handler = httpCasClient(...options);

	return async function casClientMiddleware(ctx, next) {
		const { session, request } = ctx;
		const { body } = request;

		if (!session) {
			throw new Error('Cas client for koa2 with koa-session need to be put behind session middleware');
		}

		const hooks = {
			getter() {
				return session.st;
			},
			created(ticketId) {
				session.st = ticketId;
			},
			destroy() {
				delete ctx.session;
			}
		};

		if (body) {
			hooks.bodyParser = () => body;
		}

		if(await handler(ctx.req, ctx.res, hooks)) {
			ctx.principal = ctx.request.principal = ctx.req.principal;
			ctx.ticket = ctx.request.ticket = ctx.req.ticket;

			return next();
		}
	};
};
