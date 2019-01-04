const NodeRSA = require('node-rsa');
const cookie = require('cookie');
const getRawBody = require('raw-body');
const qs = require('qs');
const RSAKey = new NodeRSA({b: 384});
const mm = require('micromatch');
const debug = require('debug')('cas');
const { parseString } = require('xml2js');
const { stripPrefix } = require('xml2js/lib/processors');
const merge = require('./src/merge');
const { CasServerAgent } = require('./src/agent');
const { PrincipalStore, Principal } = require('./src/store');

const DEFAULT_COOKIE_OPTIONS = {
	key: 'st',
	httpOnly: true
};

exports.createCasClientHandler = function createCasClientHandler(options = {}, {
	key, httpOnly
} = DEFAULT_COOKIE_OPTIONS, init = () => {}) {
	const { cas, origin, prefix, slo, ignore, path } = merge(options);
	const agent = new CasServerAgent({ origin, prefix, cas, path });
	const store = new PrincipalStore();
	const matcher = mm.matcher(ignore);

	init(agent, store);

	return async function (req, res) {
		/**
		 * SLO
		 */
		if (slo.enabled && req.method === 'POST' && req.url === slo.path) {
			const buffer = await getRawBody(req);
			const { logoutRequest } = qs.parse(buffer.toString('utf-8'));

			if (logoutRequest) {
				await parseString(logoutRequest, {
					explicitRoot: false,
					tagNameProcessors: [stripPrefix]
				}, (error, result) => {
					if (error) {
						return reject(error);
					}
					
					store.remove(result['SessionIndex'][0]);
				});

				return true;
			} 

			throw new Error('Bad cas SLO request.');
		}

		/**
		 * Ignore
		 */
		if (matcher(req.url, ignore)) {
			return true;
		}

		/**
		 * Try to resolve st in cookie.
		 */
		const cookieMapping = cookie.parse(req.headers.cookie || '');
		let ticketFromCookie = cookieMapping[key];

		if (ticketFromCookie) {
			try {
				ticketFromCookie = RSAKey.decrypt(ticketFromCookie, 'utf8');
				const principal = store.get(ticketFromCookie);
	
				if (principal && principal.valid) {
					req.principal = principal;
					
					return true;
				}
				
				store.remove(ticketFromCookie);
				res.setHeader('Set-Cookie', cookie.serialize(key, ''));
			} catch (error) {
				ticketFromCookie = null;
				debug(error.message);
			}
		}

		/**
		 * NO valid st in cookie, try to sso.
		 */
		const requestURL = new URL(`http://${req.headers.host}${req.url}`);
		const ticket = requestURL.searchParams.get('ticket');

		if (ticket) {
			requestURL.searchParams.delete('ticket');
			const serviceURL = requestURL.toString();
			const principalOptions = await agent.validateService(ticket, serviceURL);

			store.put(ticket, new Principal(principalOptions));
			
			const encryptedTicket = RSAKey.encrypt(ticket, 'base64');
			res.setHeader('Set-Cookie', cookie.serialize(key, encryptedTicket, {
				httpOnly
			}));

			res.setHeader('Location', serviceURL);
			res.statusCode = 302;
			res.end();

			return true;
		} else {
			const serviceURL = requestURL.toString();
			const redirectLocation = new URL(agent.loginPath);
			redirectLocation.searchParams.set('service', serviceURL);

			res.setHeader('Location', redirectLocation);
			res.statusCode = 302;
			res.end();

			return false;
		}

	}
};