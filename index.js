const cookie = require('cookie');
const qs = require('qs');
const mm = require('micromatch');
const debug = require('debug')('cas');

const merge = require('./src/merge');
const { getRawBody, parseXML, sendRedirect } = require('./src/utils');
const { CasServerAgent } = require('./src/agent');
const { ServiceTicketStore } = require('./src/store');

module.exports = function createCasClientHandler(...options) {
	const { cas, origin, prefix, slo, ignore, path, proxy, renew, gateway } = merge(...options);
	const agent = new CasServerAgent({ origin, prefix, cas, path, proxy, renew, gateway });
	const store = new ServiceTicketStore(agent);
	const matcher = mm.matcher(ignore);

	const cookieOptions = {
		httpOnly: true,
		path: '/'
	};

	return async function (req, res, {
		getTicket = function () {
			return cookie.parse(req.headers.cookie || '').st;
		},
		ticketCreated = function (ticketId) {
			res.setHeader('Set-Cookie', cookie.serialize('st', ticketId, cookieOptions));
		},
		ticketDestroyed = function () {
			res.setHeader('Set-Cookie', cookie.serialize('st', '', cookieOptions));
		},
		bodyParser = async function () {
			return qs.parse(await getRawBody(req));
		}
	} = {}) {
		/**
		 * Ignore
		 */
		if (matcher(req.url, ignore)) {
			return true;
		}

		/**
		 * SLO
		 */
		if (slo.enabled && req.method === 'POST') {
			const { logoutRequest } = await bodyParser();

			if (!logoutRequest) {
				debug('CAS client detected a POST method but not SLO request.');
			} else {
				debug('SLO request detected.');
				
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
		const ticket = await getTicket();
		
		if (ticket) {
			debug(`A ticket has been found ST=${ticket}.`);
			const serviceTicket = store.get(ticket);

			if (serviceTicket && serviceTicket.valid) {
				req.ticket = serviceTicket;
				req.principal = serviceTicket.principal;
				debug(`Principal has been injected to http.request by the ticket ST=${ticket}.`);
				
				return true;
			} else {
				store.remove(ticket);
				debug(`The ticket ST=${ticket} has been destroyed.`);

				await ticketDestroyed(ticket);
			}
		} else {
			debug('No ticket found.');
		}

		/**
		 * NO valid st in cookie, try to sso.
		 */
		const requestURL = new URL(`http://${req.headers.host}${req.url}`);
		const newTicket = requestURL.searchParams.get('ticket');

		if (newTicket) {
			debug(`A new ticket recieved ST=${newTicket}`);

			requestURL.searchParams.delete('ticket');
			const serviceTicketOptions = await agent.validateService(newTicket, requestURL);
			
			debug(`Ticket ST=${newTicket} has been validated successfully.`);
			store.put(newTicket, serviceTicketOptions);
			
			await ticketCreated(newTicket);
			requestURL.searchParams.delete('_g');

			sendRedirect(res, requestURL);
		} else {
			// Access is unauthenticated.
			if (requestURL.searchParams.get('_g') === '1') {
				res.statusCode = 403;

				return false;
			}

			debug('Access is unauthenticated and redirect to cas server "/login".');
			if (gateway) {
				requestURL.searchParams.set('_g', 1);
			}

			const redirectLocation = new URL(agent.loginPath);
			redirectLocation.searchParams.set('service', requestURL);

			sendRedirect(res, redirectLocation);
		}

		return false;
	};
};