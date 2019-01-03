const _ = require('lodash');
const axios = require('axios');
const { parseString } = require('xml2js');
const { stripPrefix } = require('xml2js/lib/processors');
const EventEmitter = require('events');

const DEFAULT_SERVER_PATH = {
	validate: '/cas/validate',
	serviceValidate: '/cas/serviceValidate',
	proxy: '/cas/proxy',
	login: '/cas/login',
	logout: '/cas/logout',
	proxyCallback: '/cas/proxyCallback'
};
const PATH_ITEM_LIST = Object.keys(DEFAULT_SERVER_PATH);
const DEFAULT_OPTIONS = { slo: true, redirect: true };
const OPTIONS_ITEM_LIST = Object.keys(DEFAULT_OPTIONS);

class CasAgentError extends Error {}
class CasAgentServerError extends CasAgentError {}
class CasAgentAuthenticationError extends CasAgentError {
	constructor(message, xml) {
		super(message);

		this.xml = xml;
	}
}

class CasServerAgent extends EventEmitter {
	constructor(origin, path = {}, options = {}, principalParser = DefaultPrincipalParser) {
		super();

		if (!_.isString(origin)) {
			throw new CasAgentError('Origin MUST be a string in construction.');
		}

		this.principalParser = principalParser;
		this.origin = origin;
		this.path = Object.assign({}, DEFAULT_SERVER_PATH, _.pick(path, PATH_ITEM_LIST));
		this.options = Object({}, DEFAULT_OPTIONS, _.pick(options, OPTIONS_ITEM_LIST));
		this.$api = axios.create({
			baseURL: origin,
		});
	}

	get loginPath() {
		return new URL(this.path.login, this.origin).toString();
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
		attributes: attributes[0]
	};
}