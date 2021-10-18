const EventEmitter = require('events');
const debug = require('debug')('cas:agent');
const axios = require('axios');
const { parseXML } = require('./utils');


const PGTIOU_TIMEOUT = 10000;

class CasAgentError extends Error {}
class CasAgentAuthenticationError extends CasAgentError {
	constructor(message, xml) {
		super(message);

		this.xml = xml;
	}
}

class CasServerAgent extends EventEmitter {
	constructor({
		cas, casServerUrlPrefix, serverName,
		client: {
			renew, gateway, useSession, slo, method, proxy, service, ignore, skip
		},
		server: {
			loginUrl, path
		}
	}) {
		super();

		this.ignoreValdate = ignoreValidatorFactory(ignore);
		this.skip = skip;

		this.cas = cas;
		this.allowedChains = proxy.allowedChains;
		this.acceptAny = proxy.acceptAny;
		this.proxy = Boolean(proxy.callbackUrl);
		this.renew = renew;
		this.gateway = gateway;
		this.useSession = useSession;
		this.slo = slo;
		this.method = method;
		this.receptorUrl = proxy.receptorUrl;

		this.casServerUrlPrefix = new URL(casServerUrlPrefix);
		this.serviceUrl = new URL(service || `${serverName}`);
		this.proxyUrl = new URL(casServerUrlPrefix + path.proxy);
		this.loginUrl = new URL(loginUrl || `${casServerUrlPrefix}${path.login}`);
		this.validateUrl = new URL(casServerUrlPrefix + {
			1: path.validate,
			2: this.acceptAny ? path.proxyValidate : path.serviceValidate,
			3: this.acceptAny ? path.p3.proxyValidate : path.p3.serviceValidate
		}[cas]);

		// this.loginUrl.searchParams.set('service', this.serviceUrl);
		// this.validateUrl.searchParams.set('service', this.serviceUrl);

		if (this.proxy) {
			this.validateUrl.searchParams.set('pgtUrl', proxy.callbackUrl);
		}

		if (renew) {
			this.loginUrl.searchParams.set('renew', true);
			this.validateUrl.searchParams.set('renew', true);
		}

		if (gateway) {
			this.loginUrl.searchParams.set('gateway', true);
		}

		const pgtIouStore = this.pgtIouStore = {};

		setInterval(() => {
			Object.keys(pgtIouStore).forEach(pgtiou => {
				if (Date.now() < pgtIouStore[pgtiou].expired) {
					return;
				}
				
				delete pgtIouStore[pgtiou];
				debug('Remove expired pgtiou.');
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
					if (allAttributes[key] && allAttributes[key].length > 1) {
						parsedAttributes[key] = allAttributes[key];
					}
					else {
						parsedAttributes[key] = allAttributes[key][0];
					}
				}
			}
		}
	
		if (this.proxy) {
			serviceTicketOptions.pgt = this.getPgtByPgtiou(proxyGrantingTicket[0]);
		}
	
		return serviceTicketOptions;
	}

	async validateService(ticket, serviceUrl) {
		const validateUrl = new URL(this.validateUrl);

		validateUrl.searchParams.set('service', serviceUrl);

		const { data } = await axios.get(validateUrl.href, {
			params: { ticket }
		});

		debug('Validation response XML START:\n\n' + data);
		debug('Validation response XML END.');

		const serviceTicketOptions = await this.$parserPrincipal(data);
		
		debug(`Validation success ST=${ticket}`);

		return serviceTicketOptions;
	}
}

function ignoreValidatorFactory(any) {
	if (typeof any === 'function') {
		return any;
	}

	return url => any.find(regExp => regExp.test(url));
}

module.exports = {
	CasServerAgent,
	CasAgentError,
	CasAgentAuthenticationError
};