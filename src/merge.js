module.exports = function mergeOptions(...optionsList) {
	const finalOptions = DefaultOptionsFactory();

	optionsList.forEach(({
		origin = finalOptions.origin,
		cas = finalOptions.cas,
		prefix = finalOptions.prefix,
		ignore = finalOptions.ignore,
		redirect = finalOptions.redirect,
		session,
		path,
		slo,
		proxy
	}) => {
		finalOptions.origin = origin;
		finalOptions.cas = cas;
		finalOptions.prefix = prefix;
		finalOptions.ignore = ignore;
		finalOptions.redirect = redirect;
		
		if (slo) {
			const {
				enabled = finalOptions.slo.enabled,
				path = finalOptions.slo.path
			} = slo;

			finalOptions.slo.enabled = enabled;
			finalOptions.slo.path = path;
		}

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

		if (session) {
			const {
				enabled = finalOptions.session.enabled,
				cookie
			} = session;

			finalOptions.session.enabled = enabled;

			if (cookie) {
				const {
					httpOnly = finalOptions.session.cookie.httpOnly,
					key = finalOptions.session.cookie.key
				} = cookie;

				finalOptions.session.cookie.httpOnly = httpOnly;
				finalOptions.session.cookie.key = key;
			}
		}

		if (proxy) {
			const {
				enabled = finalOptions.session.enabled,
				pgt
			} = proxy;

			finalOptions.proxy.enabled = enabled;

			if (pgt) {
				const {
					callbackURL = finalOptions.proxy.pgt.callbackURL
				} = pgt;

				finalOptions.proxy.pgt.callbackURL = callbackURL;
			}

		}
	});

	validateOptions(finalOptions);

	return finalOptions;
};

class CasMiddlewareOptionsError extends Error {};

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
	redirect: isBoolean,
	slo: {
		enabled: isBoolean,
		path: isString
	},
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
	session: {
		enabled: isBoolean,
		cookie: {
			key: isString,
			httpOnly: isBoolean
		}
	},
	proxy: {
		enabled: isBoolean,
		pgt: {
			callbackURL: isString
		}
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
		redirect: false,
		slo: {
			enabled: true,
			path: '/'
		},
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
		session: {
			enabled: false,
			cookie: {
				key: 'st',
				httpOnly: true,
			}
		},
		ignore: ['**/*.ico', '**/*.js', '**/*.css'],
		proxy: {
			enabled: true,
			pgt: {
				callbackURL: '/pgtCalllbackURL'
			}
		}
	};
}

function isBoolean(value) {
	return typeof value === 'boolean';
}

function isString(value) {
	return typeof value === 'string';
}