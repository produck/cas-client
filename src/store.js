const EventEmitter = require('events');

class AuthenticationStore extends EventEmitter {
	constructor() {
		super();

		this.mapping = {};
	}

	put(st, authentication) {
		this.emit('create', st, authentication);

		return this.mapping[st] = authentication;
	}

	get(st) {
		return this.mapping[st];
	}

	remove(st) {
		const authentication = this.mapping[st];
		delete this.mapping[st];

		this.emit('remove', st, authentication);

		return authentication;
	}
}

class Authentication {
	constructor() {

	}

	invalidate() {
		this.valid = false;

		return this;
	}

}

module.exports = {
	Authentication,
	AuthenticationStore
};