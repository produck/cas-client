exports['apereo =4.0.x'] = {
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

exports['apereo >4.1.x'] = {
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