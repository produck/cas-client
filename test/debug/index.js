const httpCasClient = require('../..');
const presets = require('../../presets/apereo');
const Koa = require('koa');
const app = new Koa();

const origin = 'http://localhost:9000';
const prefix = '/cas';

const casClientHandler = httpCasClient({ origin, prefix });

app.use(async (ctx, next) => {
	// This is a middleware may be very abstract.
	// Ensuring need to continue then call next().
	if(await casClientHandler(ctx.req, ctx.res)) {
		ctx.principal = ctx.request.principal = ctx.req.principal;

		return next();
	}
}).use(ctx => {
	const principal = ctx.principal;

	// your statements...
	ctx.body = `<a href="${origin}${prefix}/logout">SLO</a><pre>`
	ctx.body += JSON.stringify(principal, null, 2);
	ctx.body += '</pre>'
}).listen(2000);