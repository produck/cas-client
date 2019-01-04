const merge = require('../src/merge');

describe('Merge', function() {
	it('merge', () => {
		console.log(merge({ origin: 'http://127.0.0.1:8080' }));
	})
})