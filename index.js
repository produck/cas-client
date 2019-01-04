const cookie = require('cookie');
const qs = require('qs');
const mm = require('micromatch');
const debug = require('debug')('cas');

const merge = require('./src/merge');
const { getRawBody, parseXML, decrypt, encrypt, sendRedirect } = require('./src/utils');
const { CasServerAgent } = require('./src/agent');
const { PrincipalStore, Principal } = require('./src/store');

module.exports = function createCasClientHandler(...options) {
	const { cas, origin, prefix, slo, ignore, path, session } = merge(...options);
	const agent = new CasServerAgent({ origin, prefix, cas, path });
	const store = new PrincipalStore();
	const matcher = mm.matcher(ignore);

	return async function (req, res) {
		/**
		 * SLO
		 */
		if (req.method === 'POST' && req.url === slo.path && slo.enabled) {
			debug(`SLO request detected.`);
			const { logoutRequest } = qs.parse(await getRawBody(req));

			if (logoutRequest) {
				const { SessionIndex: [ticket] } = await parseXML(logoutRequest);
				const principal = store.get(ticket);

				if (principal) {
					principal.invalidate();
					debug(`Ticket ST=${ticket} has been invalidated with principal.`);
				} else {
					debug(`Principal of ticket ST=${ticket} not found when SLO.`);
				}

				return true;
			}
		}

		/**
		 * Ignore
		 */
		if (matcher(req.url, ignore)) {
			return true;
		}

		/**
		 * Try to resolve st mapped principal.
		 */
		if (!session.enabled) {
			const cookieTicket = cookie.parse(req.headers.cookie || '')[session.cookie.key];
			
			if (cookieTicket) {
				debug(`A ticket has been found in cookie.`);
				const ticket = decrypt(cookieTicket);

				if (ticket) {
					const principal = store.get(ticket);
		
					if (principal && principal.valid) {
						req.principal = principal;
						debug(`Principal has been injected to http.request by the ticket ST=${ticket}.`);
						
						return true;
					} else {
						store.remove(ticket);
						debug(`The ticket ST=${ticket} has been destroyed.`);
	
						res.setHeader('Set-Cookie', cookie.serialize(session.cookie.key, ''));
					}
				} else {
					res.setHeader('Set-Cookie', cookie.serialize(session.cookie.key, ''));
					debug(`The ticket ST=${ticket} decrypt failed.`);
				}
			} else {
				debug('No ticket found in cookie.');
			}
		}

		/**
		 * NO valid st in cookie, try to sso.
		 */
		const requestURL = new URL(`http://${req.headers.host}${req.url}`);
		const ticket = requestURL.searchParams.get('ticket');

		if (ticket) {
			debug(`A new ticket recieved ST=${ticket}`);

			requestURL.searchParams.delete('ticket');
			const serviceURL = requestURL.toString();
			const principalOptions = await agent.validateService(ticket, serviceURL);

			store.put(ticket, new Principal(principalOptions));
			
			debug(`Ticket ST=${ticket} has been validated successfully.`);

			if (!session.enabled) {
				const encryptedTicket = encrypt(ticket, 'base64');
				const cookieString = cookie.serialize(session.cookie.key, encryptedTicket, session.cookie);
				res.setHeader('Set-Cookie', cookieString);
			}

			sendRedirect(res, serviceURL);
		} else {
			debug('Redirect to cas server /login to apply a st.');

			const serviceURL = requestURL.toString();
			const redirectLocation = new URL(agent.loginPath);
			redirectLocation.searchParams.set('service', serviceURL);

			sendRedirect(res, redirectLocation);
		}

		return false;
	}
};