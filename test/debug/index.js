const httpCasClient = require('../..');
const presets = require('../../presets/apereo');
const Koa = require('koa');
const app = new Koa();

const origin = 'http://localhost:9000';
const prefix = '/cas';

const casProxyClientHandler = httpCasClient({ origin, prefix });

app.use(async (ctx, next) => {
	// This is a middleware may be very abstract.
	// Ensuring need to continue then call next().
	if(await casProxyClientHandler(ctx.req, ctx.res)) {
		ctx.principal = ctx.request.principal = ctx.req.principal;
		ctx.cas = ctx.request.cas = ctx.req.cas;

		return next();
	}
}).use((ctx, next) => {
	if (ctx.request.path === '/app') {
		return next();
	}

	const principal = ctx.principal;

	// your statements...
	ctx.body = `<p>This is proxy</p>`;
	ctx.body += `<a href="${origin}${prefix}/logout">SLO</a><pre>`;
	ctx.body += JSON.stringify(principal, null, 2);
	ctx.body += '</pre>'
}).use(async ctx => {
	const { st } = ctx.cas;

	const response = await st.request('http://127.0.0.1:3000/');

	ctx.body = response.data;
}).listen(2000);


const casAppClientHandler = httpCasClient({ origin, prefix, proxy: {
	enabled: false,
	pgt: {
		callbackURL: 'proxyCallback'
	}
} });

const app2 = new Koa();
app2.use(async (ctx, next) => {
	// This is a middleware may be very abstract.
	// Ensuring need to continue then call next().
	if(await casAppClientHandler(ctx.req, ctx.res)) {
		ctx.principal = ctx.request.principal = ctx.req.principal;
		ctx.cas = ctx.request.cas = ctx.req.cas;

		return next();
	}
}).use(ctx => {
	const principal = ctx.principal;

	// your statements...
	ctx.body = `<p>This is App</p>`;
	ctx.body += `<a href="${origin}${prefix}/logout">SLO</a><pre>`;
	ctx.body += JSON.stringify(principal, null, 2);
	ctx.body += '</pre>'
}).listen(3000);