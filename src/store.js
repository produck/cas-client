const EventEmitter = require('events');
const http = require('http');
const { request, parseXML } = require('./utils');
const debug = require('debug')('cas:store');

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

	async request(url, data, { method = 'GET', auth = '', headers = {} } = {}) {
		const appURL = new URL(url);
		const proxyTicketResponse = await request(`${this.agent.proxyPath}`, {
			pgt: this.pgt,
			targetService: url
		});

		if (proxyTicketResponse.data) {
			const parsedPT = await parseXML(proxyTicketResponse.data);
			
			if (parsedPT.proxySuccess) {
				appURL.searchParams.append('ticket', parsedPT.proxySuccess[0].proxyTicket[0]);
			}
		} else {
			debug('Proxy applying failed.');
		}

		const redirectResponse = await request(appURL);

		return new Promise((resolve, reject) => {
			const { headers } = redirectResponse;

			const request = http.request(headers.location, {
				headers: {
					'Cookie': headers['set-cookie'][0]
				}
			}, response => {
				let data = '';

				response.setEncoding('utf8');
				response.on('data', chunk => data += chunk);
				response.on('error', error => reject(error));
				response.on('end', () => resolve({
					data,
					status: response.statusCode,
					headers: response.headers
				}));
			});

			if (data) {
				request.write(data);
			}

			request.on('error', error => reject(error));
			request.end();
		});
	}
}

module.exports = {
	ServiceTicket,
	ServiceTicketStore
};