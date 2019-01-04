module.exports = function mergeOptions(...optionsList) {
	const finalOptions = DefaultOptionsFactory();

	optionsList.forEach(({
		origin = finalOptions.origin,
		cas = finalOptions.cas,
		prefix = finalOptions.prefix,
		ignore = finalOptions.ignore,
		redirect = finalOptions.redirect,
		path,
		slo
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
					serviceValidate = finalOptions.path.serviceValidate,
					proxyValidate =  finalOptions.path.proxyValidate,
				} = p3;

				finalOptions.path.p3.serviceValidate = serviceValidate;
				finalOptions.path.p3.proxyValidate = proxyValidate;
			}
		}
	});

	if (!finalOptions.origin) {
		throw new CasMiddlewareOptionsError('Origin excepted in options.');
	}

	return finalOptions;
};

class CasMiddlewareOptionsError extends Error {};

const validateOptions = {
	cas(value) {
		if (value !== 1 || value !== 2 || value !== 3) {
			throw new CasMiddlewareOptionsError('Invalid cas protocol version.');
		}
	},
	prefix(value) {
		if (!isString(value)) {
			throw new CasMiddlewareOptionsError('Invalid cas server prefix.');
		}
	}
};

function isString(value) {
	return typeof value === 'string';
}

function DefaultOptionsFactory() {
	return {
		cas: 3,
		prefix: '',
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
		ignore: ['**/*.ico', '**/*.js', '**/*.css'],
		redirect: false
	};
}