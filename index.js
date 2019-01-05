const cookie = require('cookie');
const qs = require('qs');
const mm = require('micromatch');
const debug = require('debug')('cas');

const merge = require('./src/merge');
const { getRawBody, parseXML, sendRedirect } = require('./src/utils');
const { CasServerAgent } = require('./src/agent');
const { ServiceTicketStore } = require('./src/store');

module.exports = function createCasClientHandler(...options) {
	const { cas, origin, prefix, slo, ignore, path, session, proxy } = merge(...options);
	const agent = new CasServerAgent({ origin, prefix, cas, path, proxy });
	const store = new ServiceTicketStore(agent);
	const matcher = mm.matcher(ignore);

	return async function (req, res) {
		req.cas = { agent, store };

		/**
		 * Ignore
		 */
		if (matcher(req.url, ignore)) {
			return true;
		}

		/**
		 * SLO
		 */
		if (req.method === 'POST' && req.url === slo.path && slo.enabled) {
			debug(`SLO request detected.`);
			const { logoutRequest } = qs.parse(await getRawBody(req));

			if (logoutRequest) {
				const { SessionIndex: [ticket] } = await parseXML(logoutRequest);
				const serviceTicket = store.get(ticket);

				if (serviceTicket) {
					serviceTicket.invalidate();
					debug(`Ticket ST=${ticket} has been invalidated with principal.`);
				} else {
					debug(`Principal of ticket ST=${ticket} not found when SLO.`);
				}

				return false;
			}
		}

		/**
		 * PGT callbak
		 */
		if (proxy.enabled && req.method === 'GET' && req.url.indexOf(agent.proxy.pgt.callbackURL) === 0) {
			if (req.url === agent.proxy.pgt.callbackURL) {
				debug('PGT 1st callback detected and respond to cas server status 200.');
			} else {
				const { pgtIou, pgtId } = qs.parse(req.url.replace(agent.proxy.pgt.callbackURL + '?', ''));
				agent.pushPgtiou(pgtIou, pgtId);

				debug('PGT 2ed callback detected and set pgt mapping.');
			}

			res.statusCode = 200;
			res.end();

			return false;
		}

		/**
		 * Try to resolve st mapped principal.
		 */
		if (!session.enabled) {
			const ticket = cookie.parse(req.headers.cookie || '')[session.cookie.key];
			
			if (ticket) {
				debug(`A ticket has been found in cookie.`);
				const serviceTicket = store.get(ticket);
	
				if (serviceTicket && serviceTicket.valid) {
					req.cas.st = serviceTicket;
					req.principal = serviceTicket.principal;
					debug(`Principal has been injected to http.request by the ticket ST=${ticket}.`);
					
					return true;
				} else {
					store.remove(ticket);
					debug(`The ticket ST=${ticket} has been destroyed.`);

					res.setHeader('Set-Cookie', cookie.serialize(session.cookie.key, ''));
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
			const serviceTicketOptions = await agent.validateService(ticket, requestURL);

			store.put(ticket, serviceTicketOptions);
			
			debug(`Ticket ST=${ticket} has been validated successfully.`);

			if (!session.enabled) {
				const cookieString = cookie.serialize(session.cookie.key, ticket, session.cookie);
				res.setHeader('Set-Cookie', cookieString);
			}

			sendRedirect(res, requestURL);
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