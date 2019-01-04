exports.apereo4 = {
	path: {
		login: '/login',
		logout: '/logout',
		validate: '/validate',
		serviceValidate: '/serviceValidate',
		proxyValidate: '/proxyValidate',
		proxy: '/proxy',
		p3: {
			serviceValidate: '/serviceValidate',
			proxyValidate: '/proxyValidate',
		}
	}
};

exports.apereo5 = {
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
	}
};

exports.apereo6 = exports.apereo5;