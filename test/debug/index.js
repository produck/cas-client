const Koa = require('koa');
const bodyparser = require('koa-bodyparser');
const { createCasClientHandler } = require('../..');

const origin = 'http://localhost:9000';
const prefix = '/cas';

const casHandler = createCasClientHandler({
	origin,
	prefix
});

const app = new Koa();

app.use(async ({ req, res }, next) => {
	if(await casHandler(req, res)) {
		return next();
	}

	return;
});

app.use(bodyparser({
}));

app.use((ctx) => {
	// console.log('ri', ctx.request.body);
	// console.log(ctx.req.cas);
	ctx.req.on('data', data => {
		buffer = Buffer.concat([buffer, data]);

	});

	ctx.body = `<a href="${origin}${prefix}/logout">hello</a><pre>`
	ctx.body += JSON.stringify(ctx.req.principal, null, 2);
	ctx.body += '</pre>'
}).listen(2000, '0.0.0.0');