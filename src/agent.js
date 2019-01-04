const axios = require('axios');
const EventEmitter = require('events');
const debug = require('debug')('cas:agent');
const { parseXML } = require('./utils');

class CasAgentError extends Error {}
class CasAgentServerError extends CasAgentError {}
class CasAgentAuthenticationError extends CasAgentError {
	constructor(message, xml) {
		super(message);

		this.xml = xml;
	}
}

class CasServerAgent extends EventEmitter {
	constructor({ origin, prefix, cas, path }) {
		super();

		const { host, port } = new URL(origin);
		
		this.cas = cas;
		this.path = path;
		this.origin = origin;
		this.host = host;
		this.prefix = prefix;
		this.port = port;

		this.$api = axios.create({ baseURL: `${origin}${prefix}` });
	}

	get validatePath() {
		const { validate, serviceValidate, p3 } = this.path;

		return [validate, serviceValidate, p3.serviceValidate][this.cas - 1];
	}

	get loginPath() {
		return new URL(`${this.prefix}${this.path.login}`, this.origin).toString();
	}

	async validateService(ticket, service) {
		try {
			var response = await this.$api.get(this.validatePath, {
				params: {
					ticket, service
				}
			});
		} catch (error) {
			throw new CasAgentServerError('CAS server can NOT be connected.');
		}

		const { data } = response;
		
		debug('Validation response XML START:\n\n' + data);
		debug('Validation response XML END.');

		const result = await parseXML(data);

		if (result.authenticationSuccess && result.authenticationSuccess[0]) {
			debug(`Validation success ST=${ticket}`);

			return parserPrincipal(result);
		}

		throw new CasAgentAuthenticationError('Ticket error.', data);
	}
}

module.exports = {
	CasServerAgent,
	CasAgentError,
	CasAgentAuthenticationError
};

function parserPrincipal(authenticationSuccessResult) {
	const { authenticationSuccess } = authenticationSuccessResult;
	const { user, attributes } = authenticationSuccess[0];

	return {
		user: user[0],
		attributes: attributes && attributes[0]
	};
}