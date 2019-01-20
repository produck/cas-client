const merge = require('../src/merge');
var assert = require('assert');

describe('Merge', function() {
	it('default value', () => {
		options = merge({
			casServerUrlPrefix: 'http://localhost:8080/cas',
			serverName: 'http://localhost:3000'
		});
		assert.equal('http://localhost:8080/cas', options.casServerUrlPrefix);
		assert.equal('http://localhost:3000', options.serverName);
		assert.equal(3, options.cas);
		assert.equal(null, options.principalAdapter);
		assert.equal(null, options.client.service);
		assert.equal(true, options.client.slo);
		assert.equal(false, options.client.skip());
		assert.equal(false, options.client.renew);
		assert.equal(false, options.client.gateway);
		assert.equal(false, options.client.useSession);
		assert.equal('GET', options.client.method);
		assert.equal(false, options.client.proxy.acceptAny);
		assert.equal(true, options.client.proxy.allowedChains());
		assert.equal(null, options.client.proxy.callbackUrl);
		assert.equal(null, options.client.proxy.receptorUrl);
		assert.equal(null, options.server.loginUrl);
		assert.equal('/login', options.server.path.login);
		assert.equal('/logout', options.server.path.logout);
		assert.equal('/validate', options.server.path.validate);
		assert.equal('/serviceValidate', options.server.path.serviceValidate);
		assert.equal('/proxy', options.server.path.proxy);
		assert.equal('/proxyValidate', options.server.path.proxyValidate);
		assert.equal('/p3/serviceValidate', options.server.path.p3.serviceValidate);
		assert.equal('/p3/proxyValidate', options.server.path.p3.proxyValidate);
	});

	it('set value', () => {
		const principal = {
			user: 'user',
			attributes: {
				attr1: 'test'
			}
		};
		options = merge({
			casServerUrlPrefix: 'http://localhost:8080/cas',
			serverName: 'http://localhost:3000',
			cas: 2,
			principalAdapter: () => principal,
			client: {
				skip: () => true,
				slo: false,
				renew: true,
				useSession: true,
				method: 'POST',
				proxy: {
					acceptAny: true,
					callbackUrl: 'http://localhost:8080/callback',
					receptorUrl: '/callback',
					allowedChains: () => false
				}
			},
			server: {
				loginUrl: 'http://localhost:8080/login',
				path: {
					login: '/login1'
				}
			}
		});
		assert.equal(2, options.cas);
		assert.equal(principal, options.principalAdapter());
		assert.equal(false, options.client.slo);
		assert.equal(true, options.client.skip());
		assert.equal(true, options.client.renew);
		assert.equal(true, options.client.useSession);
		assert.equal(false, options.client.proxy.allowedChains());
		assert.equal('POST', options.client.method);
		assert.equal(true, options.client.proxy.acceptAny);
		assert.equal('http://localhost:8080/callback', options.client.proxy.callbackUrl);
		assert.equal('/callback', options.client.proxy.receptorUrl);
		assert.equal('http://localhost:8080/login', options.server.loginUrl);
		assert.equal('/login1', options.server.path.login);
	});

});