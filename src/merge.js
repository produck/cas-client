module.exports = function mergeOptions(...optionsList) {
	const finalOptions = DefaultOptionsFactory();

	optionsList.forEach(({
		origin = finalOptions.origin,
		cas = finalOptions.cas,
		prefix = finalOptions.prefix,
		renew = finalOptions.renew,
		gateway = finalOptions.gateway,
		ignore = finalOptions.ignore,
		slo = finalOptions.slo,
		path,
		proxy
	}) => {
		finalOptions.origin = origin;
		finalOptions.cas = cas;
		finalOptions.prefix = prefix;
		finalOptions.ignore = ignore;
		finalOptions.renew = renew;
		finalOptions.gateway = gateway;
		finalOptions.slo = slo;

		if (path) {
			const {
				login = finalOptions.path.login,
				logout = finalOptions.path.logout,
				validate = finalOptions.path.validate,
				serviceValidate = finalOptions.path.serviceValidate,
				proxyValidate =  finalOptions.path.proxyValidate,
				proxy = finalOptions.path.proxy,
				p3
			} = path;

			finalOptions.path.login = login;
			finalOptions.path.logout = logout;
			finalOptions.path.validate = validate;
			finalOptions.path.serviceValidate = serviceValidate;
			finalOptions.path.proxyValidate = proxyValidate;
			finalOptions.path.proxy = proxy;

			if (p3) {
				const {
					serviceValidate = finalOptions.p3.path.serviceValidate,
					proxyValidate =  finalOptions.p3.path.proxyValidate,
				} = p3;

				finalOptions.path.p3.serviceValidate = serviceValidate;
				finalOptions.path.p3.proxyValidate = proxyValidate;
			}
		}

		if (proxy) {
			const {
				enabled = finalOptions.proxy.enabled,
				accepted = finalOptions.proxy.accepted,
				pgtCallbackURL = finalOptions.proxy.pgtCallbackURL
			} = proxy;

			finalOptions.proxy.accepted = accepted;
			finalOptions.proxy.enabled = enabled;
			finalOptions.proxy.pgtCallbackURL = pgtCallbackURL;
		}
	});

	validateOptions(finalOptions);

	const { renew, gateway } = finalOptions;

	if (renew && gateway) {
		throw new Error('In options gateway & renew can not be true at same time.');
	}

	return finalOptions;
};

class CasMiddlewareOptionsError extends Error {}

const validateOptionsRule = {
	cas(value) {
		return [1, 2, 3].indexOf(value) !== -1;
	},
	ignore(valueList) {
		if (!Array.isArray(valueList)) {
			return false;
		}

		return !valueList.find(value => !isString(value));
	},
	origin: isString,
	prefix: isString,
	renew: isBoolean,
	gateway: isBoolean,
	slo: isBoolean,
	path: {
		login: isString,
		logout: isString,
		validate: isString,
		serviceValidate: isString,
		proxyValidate: isString,
		proxy: isString,
		p3: {
			serviceValidate: isString,
			proxyValidate: isString
		}
	},
	proxy: {
		accepted: isBoolean,
		enabled: isBoolean,
		pgtCallbackURL: isString
	}
};

function validateOptions(options) {
	const nodePath = [];

	function validate(ruleNode, optionsNode) {
		Object.keys(ruleNode).forEach(item => {
			nodePath.push(item);

			const ruleValidator = ruleNode[item];
			const optionsValue = optionsNode[item];

			if (typeof ruleValidator === 'object') {

				validate(ruleValidator, optionsValue);
			} else if (!ruleValidator(optionsValue)) {
				throw new CasMiddlewareOptionsError(`Bad value at options.${nodePath.join('.')}`);
			}

			nodePath.pop();
		});
	}

	validate(validateOptionsRule, options);

	return true;
}

function DefaultOptionsFactory() {
	return {
		cas: 3,
		prefix: '/',
		renew: false,
		gateway: false,
		slo: true,
		path: {
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
		},
		ignore: ['**/*.ico', '**/*.js', '**/*.css'],
		proxy: {
			accepted: false, //TODO ignore PT
			enabled: false, //TODO ignore PT
			pgtCallbackURL: '/pgtCalllbackURL'
		}
	};
}

function isBoolean(value) {
	return typeof value === 'boolean';
}

function isString(value) {
	return typeof value === 'string';
}