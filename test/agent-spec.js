const { CasServerAgent } = require('../src/agent');
const merge = require('../src/merge');
var assert = require('assert');

describe('Agent', function() {
    it('Constructor', function() {
        const clientOptions = merge({
            casServerUrlPrefix: 'http://localhost:8080/cas',
            serverName: 'http://127.0.0.1:8081'
        });
        const agent = new CasServerAgent(clientOptions);
        assert.equal(3, agent.cas);
        assert.equal(true, agent.allowedChains());
        assert.equal(false, agent.acceptAny);
        assert.equal(false, agent.proxy);
        assert.equal(false, agent.renew);
        assert.equal(false, agent.gateway);
        assert.equal(false, agent.useSession);
        assert.equal(true, agent.slo);
        assert.equal('GET', agent.method);
        assert.equal(null, agent.receptorUrl);
        assert.equal('http://127.0.0.1:8081/', agent.serviceUrl.href);
        assert.equal('http://localhost:8080/cas/proxy', agent.proxyUrl.href);
        assert.equal('http://localhost:8080/cas/login', agent.loginUrl.href);
        assert.equal('http://localhost:8080/cas/p3/serviceValidate', agent.validateUrl.href);
    });

    
    it('Push & Get Pgtiou', function() {
        const clientOptions = merge({
            casServerUrlPrefix: 'http://localhost:8080/cas',
            serverName: 'http://127.0.0.1:8081'
        });
        const agent = new CasServerAgent(clientOptions);
        agent.pushPgtiou('iou', 'pgt');
        assert.equal('pgt', agent.getPgtByPgtiou('iou'));
        try{
            agent.getPgtByPgtiou('iou');
        } catch(err) {
            assert.equal('No pgt matched.', err.message);
        }
    });    
});