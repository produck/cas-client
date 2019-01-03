const _ = require('lodash');
const axios = require('axios');
const { parseString } = require('xml2js');
const { stripPrefix } = require('xml2js/lib/processors');
const EventEmitter = require('events');

const DEFAULT_SERVER_PATH = {
	validate: '/validate',
	serviceValidate: '/serviceValidate',
	proxy: '/proxy',
	login: '/login',
	logout: '/logout',
	proxyCallback: '/proxyCallback'
};
const PATH_ITEM_LIST = Object.keys(DEFAULT_SERVER_PATH);

class CasAgentError extends Error {}
class CasAgentServerError extends CasAgentError {}
class CasAgentAuthenticationError extends CasAgentError {
	constructor(message, xml) {
		super(message);

		this.xml = xml;
	}
}

class CasServerAgent extends EventEmitter {
	constructor(origin, prefix = '', path = {}, principalParser = DefaultPrincipalParser) {
		super();

		if (!_.isString(origin)) {
			throw new CasAgentError('Origin MUST be a string in construction.');
		}

		const { host, port } = new URL(origin);

		this.$api = axios.create({ baseURL: `${origin}${prefix}` });

		this.origin = origin;
		this.host = host;
		this.prefix = prefix;
		this.port = port;
		this.path = Object.assign({}, DEFAULT_SERVER_PATH, _.pick(path, PATH_ITEM_LIST));
		this.principalParser = principalParser;
	}

	get loginPath() {
		return new URL(`${this.prefix}${this.path.login}`, this.origin).toString();
	}

	async validateService(ticket, service) {
		let response;

		try {
			response = await this.$api.get(this.path.serviceValidate, {
				params: {
					ticket, service
				}
			});
		} catch (error) {
			throw new CasAgentServerError('CAS server can NOT be connected.');
		}

		const { data } = response;

		return new Promise((resolve, reject) => {
			parseString(data, {
				explicitRoot: false,
				tagNameProcessors: [stripPrefix]
			}, (error, result) => {
				if (error) {
					return reject(error);
				}

				if (result.authenticationSuccess && result.authenticationSuccess[0]) {
					resolve(this.principalParser(result));
				}

				throw new CasAgentAuthenticationError('Ticket error.', data);
			});
		});
	}

	setPrincipalParser(parserFn) {
		this.principalParser = parserFn;
	}
}

module.exports = {
	CasServerAgent,
	CasAgentError,
	CasAgentAuthenticationError
};

function DefaultPrincipalParser(authenticationSuccessResult) {
	const { authenticationSuccess } = authenticationSuccessResult;
	const { user, attributes } = authenticationSuccess[0];

	return {
		user: user[0],
		attributes: attributes && attributes[0]
	};
}