const EventEmitter = require('events');
const debug = require('debug')('cas:agent');
const { parseXML, request } = require('./utils');

const PGTIOU_TIMEOUT = 10000;

class CasAgentError extends Error {}
class CasAgentAuthenticationError extends CasAgentError {
	constructor(message, xml) {
		super(message);

		this.xml = xml;
	}
}

const ticketTypeValidateMapping = {
	PT: 'proxy',
	ST: 'service'
};

class CasServerAgent extends EventEmitter {
	constructor({ origin, prefix, cas, path, proxy, renew, gateway }) {
		super();

		const { host, port } = new URL(origin);
		
		this.cas = cas;
		this.path = path;
		this.origin = origin;
		this.host = host;
		this.prefix = prefix;
		this.port = port;
		this.proxy = proxy;
		this.renew = renew;
		this.gateway = gateway;
		
		const pgtIouStore = this.pgtIouStore = {};

		setInterval(() => {
			const now = Date.now();

			Object.keys(pgtIouStore).forEach(pgtiou => {
				if (now > pgtIouStore[pgtiou].expired) {
					delete pgtIouStore[pgtiou];
					debug('Remove expired pgtiou.');
				}
			});
		}, PGTIOU_TIMEOUT);
	}

	getPgtByPgtiou(pgtIou) {
		const pgtWrap = this.pgtIouStore[pgtIou];

		if (pgtWrap) {
			delete this.pgtIouStore[pgtIou];
			
			return pgtWrap.pgt;
		}

		throw new CasAgentAuthenticationError('No pgt matched.');
	}

	pushPgtiou(pgtIou, pgt) {
		this.pgtIouStore[pgtIou] = {
			pgt, expired: Date.now() + PGTIOU_TIMEOUT
		};
	}

	get serviceValidatePath() {
		const { validate, serviceValidate, p3 } = this.path;

		return [validate, serviceValidate, p3.serviceValidate][this.cas - 1];
	}

	get proxyValidatePath() {
		const { validate, proxyValidate, p3 } = this.path;

		return [validate, proxyValidate, p3.proxyValidate][this.cas - 1];
	}

	get loginPath() {
		const url = new URL(`${this.prefix}${this.path.login}`, this.origin);

		if (this.renew) {
			url.searchParams.set('renew', true);
		}

		if (this.gateway) {
			url.searchParams.set('gateway', true);
		}

		return url;
	}

	get proxyPath() {
		return new URL(`${this.prefix}${this.path.proxy}`, this.origin);
	}

	async $parserPrincipal(data) {
		const result = await parseXML(data);
		const { authenticationSuccess } = result;

		if (!authenticationSuccess || !authenticationSuccess[0]) {
			throw new CasAgentAuthenticationError('Ticket error authentication failed.');
		}

		const { user, attributes, proxyGrantingTicket } = authenticationSuccess[0];
		const serviceTicketOptions = {};
	
		const principal = serviceTicketOptions.principal = {
			user: user[0]
		};
	
		if (this.cas === 3) {
			const allAttributes = attributes && attributes[0];
			const parsedAttributes = principal.attributes = {};
			
			if (allAttributes) {
				for (const key in allAttributes) {
					parsedAttributes[key] = allAttributes[key][0];
				}
			}
		}
	
		if (this.proxy.enabled) {
			const pgt = this.getPgtByPgtiou(proxyGrantingTicket[0]);

			serviceTicketOptions.pgt = pgt;
		}
	
		return serviceTicketOptions;
	}

	async validateService(ticket, serviceURL) {
		
		const ticketType = ticket.substr(0, 2);
		const validatePath = this[ticketTypeValidateMapping[ticketType] + 'ValidatePath'];

		const searchParams = {
			ticket, 
			service: serviceURL,
		};

		if (this.proxy.enabled) {
			searchParams.pgtUrl = `${serviceURL.origin}${this.proxy.pgtCallbackURL}`;
		}

		if (this.renew) {
			searchParams.renew = true;
		}

		const { data } = await request(`${this.origin}${this.prefix}${validatePath}`, searchParams);

		debug('Validation response XML START:\n\n' + data);
		debug('Validation response XML END.');

		const serviceTicketOptions = await this.$parserPrincipal(data);
		
		debug(`Validation success ST=${ticket}`);

		return serviceTicketOptions;
	}
}

module.exports = {
	CasServerAgent,
	CasAgentError,
	CasAgentAuthenticationError
};