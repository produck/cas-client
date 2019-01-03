const _ = require('lodash');
const axios = require('axios');
const { parseString } = require('xml2js');
const { stripPrefix } = require('xml2js/lib/processors');
const EventEmitter = require('events');
const debug = require('debug')('cas:agent');

const CAS_SERVER_URI = {
	login: '/login',
	logout: '/logout',
	validate: '/validate',
	serviceValidate: '/serviceValidate',
	proxyValidate: '/proxyValidate',
	proxy: '/proxy',
	p3: {
		serviceValidate: '/p3/serviceValidate',
		proxyValidate: '/p3/proxyValidate',
	}
};

const VALIDATE_PROTOCOL_MAPPING = [
	CAS_SERVER_URI.validate,
	CAS_SERVER_URI.serviceValidate,
	CAS_SERVER_URI.p3.serviceValidate
];

class CasAgentError extends Error {}
class CasAgentServerError extends CasAgentError {}
class CasAgentAuthenticationError extends CasAgentError {
	constructor(message, xml) {
		super(message);

		this.xml = xml;
	}
}

class CasServerAgent extends EventEmitter {
	constructor(origin, prefix = '', cas = 3) {
		super();

		if (!_.isString(origin)) {
			throw new CasAgentError('Origin MUST be a string in construction.');
		}

		const { host, port } = new URL(origin);

		this.$api = axios.create({ baseURL: `${origin}${prefix}` });

		this.cas = cas;
		this.origin = origin;
		this.host = host;
		this.prefix = prefix;
		this.port = port;
	}

	get loginPath() {
		return new URL(`${this.prefix}${CAS_SERVER_URI.login}`, this.origin).toString();
	}

	async validateService(ticket, service) {
		try {
			var response = await this.$api.get(VALIDATE_PROTOCOL_MAPPING[this.cas - 1], {
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

		return new Promise((resolve, reject) => {
			parseString(data, {
				explicitRoot: false,
				tagNameProcessors: [stripPrefix]
			}, (error, result) => {
				if (error) {
					return reject(error);
				}

				if (result.authenticationSuccess && result.authenticationSuccess[0]) {
					resolve(parserPrincipal(result));
				}

				throw new CasAgentAuthenticationError('Ticket error.', data);
			});
		});
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