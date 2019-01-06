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
	constructor({ origin, prefix, cas, path, proxy }) {
		super();

		const { host, port } = new URL(origin);
		
		this.cas = cas;
		this.path = path;
		this.origin = origin;
		this.host = host;
		this.prefix = prefix;
		this.port = port;
		this.proxy = proxy;
		
		const pgtiouStore = this.pgtiouStore = {};

		setInterval(() => {
			const now = Date.now();

			Object.keys(pgtiouStore).forEach(pgtiou => {
				if (now > pgtiouStore[pgtiou].expired) {
					delete pgtiouStore[pgtiou];
					debug('Remove expired pgtiou.');
				}
			});
		}, PGTIOU_TIMEOUT);
	}

	getPgtByPgtiou(pgtIou) {
		const pgtWrap = this.pgtiouStore[pgtIou];

		if (pgtWrap) {
			delete this.pgtiouStore[pgtIou];
			
			return pgtWrap.pgt;
		}

		throw new CasAgentAuthenticationError('No pgt matched.');
	}

	pushPgtiou(pgtIou, pgt) {
		this.pgtiouStore[pgtIou] = {
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
		return new URL(`${this.prefix}${this.path.login}`, this.origin).toString();
	}

	get proxyPath() {
		return new URL(`${this.prefix}${this.path.proxy}`, this.origin).toString();
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
			principal.attributes = attributes && attributes[0];
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
			pgtUrl: `${serviceURL.origin}${this.proxy.pgt.callbackURL}`
		};

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