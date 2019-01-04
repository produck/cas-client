const merge = require('../src/merge');

describe('Merge', function() {
	it('merge', () => {
		console.log(merge({
			cas: 2,
			path: {
				validate: '/ri'
			}
		}));
	})
})