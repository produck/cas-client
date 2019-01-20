const { CasServerAgent } = require('../src/agent');
const { ServiceTicketStore, ServiceTicket } = require('../src/store');
const merge = require('../src/merge');
var assert = require('assert');
describe('Store', function() {
    const clientOptions = merge({
        casServerUrlPrefix: 'http://localhost:8080/cas',
        serverName: 'http://127.0.0.1:8081'
    });
    
    const agent = new CasServerAgent(clientOptions);
    describe('ServiceTicket', function() {
        it('Constructor', function() {
            const ticket = new ServiceTicket({user: 'user1'}, 'pgt', agent);
            assert.equal('user1', ticket.principal.user);
            assert.equal('pgt', ticket.pgt);
            assert.equal(true, ticket.valid);
            assert.equal('http://localhost:8080/cas', ticket.agent.casServerUrlPrefix);
        });

        it('Invalidate', function() {
            const ticket = new ServiceTicket({user: 'user1'}, 'pgt', agent);
            assert.equal(true, ticket.valid);
            ticket.invalidate();
            assert.equal(false, ticket.valid);
        })
    });

    describe('ServiceTicketStore', function() {
        const store = new ServiceTicketStore(agent);
        it('Push & Get ST', function() {
            store.put('t1', {principal: {user: 'user1'}, pgt: 'pgt'});
            const ticket = store.get('t1');
            // console.log(ticket);
            assert.equal('user1', ticket.principal.user);
            assert.equal(true, ticket.valid);
            assert.equal('pgt', ticket.pgt);
            
            assert.equal(undefined, store.get('t2'));
        });

        it('Remove', function() {
            store.remove('t1');
            assert.equal(undefined, store.get('t1'));
        });
    });
});