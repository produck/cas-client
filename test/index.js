const Koa = require('koa');
const bodyparser = require('koa-bodyparser');
const cas = require('../');

const casServer = 'http://localhost:9000';
const prefix = '/cas';

const casHandler = cas({
	origin: casServer,
	prefix,
	slo: {
		enabled: true,
		path: '/'
	},
	ignore: ['/*.ico'],
	redirect: false
});

const app = new Koa();

app.use(async ({ req, res }, next) => {
	if(await casHandler(req, res)) {
		return next();
	}

	return;
});

app.use(bodyparser({
	onerror(error) {
		console.log(error)
	}
}));

app.use((ctx) => {
	console.log('ri', ctx.request.body);
	// console.log(ctx.req.cas);
	ctx.req.on('data', data => {
		buffer = Buffer.concat([buffer, data]);

		console.log(buffer);
	});

	ctx.body = `<a href="${casServer}${prefix}/logout">hello</a>`
}).listen(2000, '0.0.0.0');