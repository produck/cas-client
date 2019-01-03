const NodeRSA = require('node-rsa');
const cookie = require('cookie');
const RSAKey = new NodeRSA({b: 384});
const debug = require('debug')('cas');

const { CasServerAgent } = require('./src/agent');
const { AuthenticationStore } = require('./src/store');

const DEFAULT_COOKIE_OPTIONS = {
	key: 'st',
	httpOnly: true
};

const DEFAULT_CLIENT_PATH_FILTER = {
	ignore: []
};

module.exports = function createHttpServerHandler({
	origin, path = {}, options
}, {
	key, httpOnly
} = DEFAULT_COOKIE_OPTIONS, {
	ignore
} = DEFAULT_CLIENT_PATH_FILTER, init = () => {}) {
	const agent = new CasServerAgent(origin, path, options);
	const store = new AuthenticationStore();

	init(agent, store);

	return async function (req, res) {
		/**
		 * Try to resolve st in cookie.
		 */
		const cookieMapping = cookie.parse(req.headers.cookie || '');
		let ticketFromCookie = cookieMapping[key];

		if (ticketFromCookie) {
			try {
				ticketFromCookie = RSAKey.decrypt(ticketFromCookie, 'utf8');
			} catch (error) {
				ticketFromCookie = null;
				debug(error.message);
			}
		}

		if (ticketFromCookie) {
			const authentication = store.get(ticketFromCookie);

			if (authentication && authentication.valid) {
				req.cas = authentication;
				
				return true;
			}
			
			store.remove(ticketFromCookie);
			res.setHeader('Set-Cookie', cookie.serialize(key, null));
		}

		/**
		 * NO valid st in cookie, try to sso.
		 */
		const requestURL = new URL(`http://${req.headers.host}${req.url}`);
		const ticket = requestURL.searchParams.get('ticket');

		if (ticket) {
			requestURL.searchParams.delete('ticket');
			const serviceURL = requestURL.toString();
			const response = await agent.validateService(ticket, serviceURL);

			res.end(JSON.stringify(response))
		} else {
			const serviceURL = requestURL.toString();
			const redirectLocation = new URL(agent.loginPath);
			redirectLocation.searchParams.set('service', serviceURL);

			res.setHeader('Location', redirectLocation);
			res.statusCode = 302;
			res.end();

			return false;
		}

		// res.setHeader('Set-Cookie', cookie.serialize(key, RSAKey.encrypt(ticketFromCookie, 'base64'), {
		// 	httpOnly
		// }));
	}
}