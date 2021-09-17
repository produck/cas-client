const httpCasClient = require('../');

module.exports = function createCasClientExpressSessionMiddleware(...options) {
	const handler = httpCasClient(...options);

	return async function casClientMiddleware(req, res, next) {
		const { session, body } = req;

		if (!session) {
			throw new Error('Cas client for Express with express-session need to be put behind session middleware.');
		}

		const hooks = {
			getter() {
				return session.st;
			},
			created(ticketId) {
				session.st = ticketId;
			},
			destroy() {
				delete session.destroy;
			}
		};

		if (body) {
			hooks.bodyParser = () => body;
		}

		if(await handler(req, res, hooks)) {
			return next();
		} else {
			res.end();
		}
	};
};
