const cookie = require('cookie');
const qs = require('qs');
const debug = require('debug')('cas');


const merge = require('./src/merge');
const { getRawBody, parseXML, sendRedirect } = require('./src/utils');
const { CasServerAgent } = require('./src/agent');
const { ServiceTicketStore } = require('./src/store');

module.exports = function httpCasClient(...options) {
	const clientOptions = merge(...options);
	const agent = new CasServerAgent(clientOptions);
	const store = new ServiceTicketStore(agent);

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
		 * Skip Authentication
		 * TODO: express session & koa2 session
		 */
		if (agent.skip(req, res, clientOptions)) {
			return true;
		}

		/**
		 * Ignore
		 */
		if (agent.ignoreValdate(req.url)) {
			return true;
		}

		/**
		 * Use principal adapter for debugging
		 */
		if (clientOptions.principalAdapter) {
			const principal = clientOptions.principalAdapter(req, res);
			req.principal = validatePrincipal(agent.cas, principal);
			return true;
		}

		/**
		 * SLO
		 */
		if (req.method === 'POST' && agent.slo) {
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
				
				res.end();

				return false;
			}
		}

		/**
		 * PGT callback
		 */
		if (agent.proxy && req.method === 'GET' && req.url.indexOf(agent.receptorUrl) !== -1) {
			if (req.url === agent.receptorUrl) {
				debug('PGT 1st callback detected and respond to cas server status 200.');
			} else {
				const { searchParams } = new URL(req.url, agent.serviceUrl);
				agent.pushPgtiou(searchParams.get('pgtIou'), searchParams.get('pgtId'));

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
		const requestURL = new URL(req.url, agent.serviceUrl);
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
			if (agent.gateway) {
				requestURL.searchParams.set('_g', 1);
			}

			const loginUrl = new URL(agent.loginUrl);
			loginUrl.searchParams.set('service', requestURL);

			sendRedirect(res, loginUrl);
		}

		return false;
	};
};

function validatePrincipal(cas, principal) {
	if(!principal.user) 
		throw new Error('Must provide user for principal adapter!');

	fakePrincipal = {user: principal.user};
	attributes = {}
	if (cas == 3) {
		attributes = {};
		attrs = principal.attributes;
		Object.keys(attrs).forEach(key => {
			if(attrs[key] instanceof Array) {
				attributes[key] = attrs[key].join(",");
			} else {
				attributes[key] = typeof attrs[key] === 'string'? attrs[key] : JSON.stringify(attrs[key]);
			}
		});
		fakePrincipal.attributes = attributes;
	}

	return fakePrincipal;
}