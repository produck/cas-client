const EventEmitter = require('events');

class PrincipalStore extends EventEmitter {
	constructor() {
		super();

		this.mapping = {};
	}

	put(ticket, principal) {
		this.emit('create', ticket, principal);

		return this.mapping[ticket] = principal;
	}

	get(ticket) {
		return this.mapping[ticket];
	}

	remove(ticket) {
		const principal = this.mapping[ticket];
		delete this.mapping[ticket];

		this.emit('remove', ticket, principal);

		return principal;
	}
}

class Principal {
	constructor({ user, attributes }) {
		this.valid = true;
		this.user = user;
		this.attributes = attributes;
	}

	invalidate() {
		this.valid = false;

		return this;
	}
}

module.exports = {
	Principal,
	PrincipalStore
};