const EventEmitter = require('events');
const { parseXML } = require('./utils');
const debug = require('debug')('cas:store');
const axios = require('axios');
const { URL } = require('url');

class ServiceTicketStore extends EventEmitter {
	constructor(agent) {
		super();

		this.mapping = {};
		this.agent = agent;
	}

	put(st, { principal, pgt = null }) {
		// this.emit('create', st, principal);

		return this.mapping[st] = new ServiceTicket(principal, pgt, this.agent);
	}

	get(st) {
		return this.mapping[st];
	}

	remove(st) {
		const serviceTicket = this.mapping[st];
		delete this.mapping[st];

		// this.emit('remove', st, serviceTicket);

		return serviceTicket;
	}
}

class ServiceTicket {
	constructor(principal, pgt, agent) {
		this.valid = true;
		this.pgt = pgt;
		this.principal = principal;
		this.agent = agent;
	}

	invalidate() {
		this.valid = false;

		return this;
	}

	async request(url) {
		if (!this.agent.proxy) {
			throw new Error('CAS Proxy feature is not enabled for the client this time.');
		}

		const appURL = new URL(url);
		const proxyTicketResponse = await axios(this.agent.proxyUrl.href, {
			params: {
				pgt: this.pgt,
				targetService: url
			}
		});

		if (proxyTicketResponse.data) {
			const parsedPT = await parseXML(proxyTicketResponse.data);
			
			if (parsedPT.proxySuccess) {
				appURL.searchParams.append('ticket', parsedPT.proxySuccess[0].proxyTicket[0]);
			}
		} else {
			debug('Proxy applying failed.');
		}

		return axios.get(appURL.href, { maxRedirects: 0 }).catch(result => {
			const { response } = result;
			const { headers } = response;

			return axios.create({
				baseURL: appURL.href,
				headers: { 'Cookie': headers['set-cookie'][0] }
			});
		});
	}
}

module.exports = {
	ServiceTicket,
	ServiceTicketStore
};