const httpCasClient = require('../');

module.exports = function createCasClientExpressMiddleware(...options) {
	const handler = httpCasClient(...options);

	return async function casClientMiddleware(req, res, next) {
		const { body } = req;
		const hooks = {};

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
