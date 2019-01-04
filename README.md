# http-cas-client

A complete implement of CAS Client middleware for Node.js, support CAS 1.0, 2.0+, 3.0+ protocol.

CAS(Central Authentication Service) is a single-sign-on / single-sign-off protocol for the web.

We suppose you are already familiar with the CAS protocol, if not, please read this [document](https://github.com/apereo/cas/blob/master/cas-server-documentation/protocol/CAS-Protocol-Specification.md) before you use this.

## Installation

```base
$ npm install http-cas-client
```

## Getting Started

CAS Client

Basic usage with default options for creating a cas client handler and use it in nodejs native http server. For example,
```js
const http = require('http');
const httpCasClient = require('http-cas-client');

// A CAS server deployed at url http://localhost:8080.
// Default prefix is '/'.
const casClientHandler = httpCasClient({ origin: 'http://localhost:8080' });

http.createServer(async (req, res) => {
	await casClientHandler(req, res);

	const { principal } = req;

	console.log(principal);
	// { user: 'test', attributes: { ... } }

	// your statements...
}).listen(80);
```

It can also use with popular backend framework like Koa2. For example,
```js
const httpCasClient = require('http-cas-client');
const Koa = require('koa');
const app = new Koa();

const origin = 'http://localhost:9000';
const prefix = '/cas';

const casClientHandler = httpCasClient({ origin, prefix });

// NOTICE: Put the middleware include casClientHandler to the first.
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
}).listen(80);
```
Under the traditional pattern, cas client NEED to use with session, especially those 'Spring mvc' project in servlet.

So there is also a way to implement with all nodejs backend frameworks. For example in Koa2,
```js
//TODO NO implement yet.
const httpCasClient = require('http-cas-client');
const session = require('koa-session');
const Koa = require('koa');
const app = new Koa();

const casClientHandler = httpCasClient({
	origin, prefix,
	session: {
		// When session enabled, ticket will not save to cookie in browser.
		// You must implement <ticket(st), session> mapping.
		enabled: true
	}
});

const sessionMiddleware = session(app);
app.use(async (ctx, next) => {
	// This is a middleware may be very abstract.
	// Ensuring need to continue then call next().
	if(await casHandler(ctx.req, ctx.res)) {
		ctx.principal = ctx.request.principal = ctx.req.principal;

		return next();
	}
}).use(ctx => {
	const principal = ctx.principal;

	// your statements...
	ctx.body = `<a href="${origin}${prefix}/logout">SLO</a><pre>`
	ctx.body += JSON.stringify(principal, null, 2);
	ctx.body += '</pre>'
}).listen(80);
```
### CAS Proxy
//TODO

## API Referrence
### Options
The origin of CAS Server is essential. The simplest form is like,
```js
const casClientHandler = httpCasClient({ origin: 'http://your.cas-server.hostname' });
```
What is [Origin](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Origin)?
#### Full Default Options
```js
// options.origin is required.

// Other items are optional.
const defaultOptions = {
	cas: 3, // CAS protocol version 1, 2, 3
	prefix: '/', // CAS Server custom deployment prefix
	redirect: false, //TODO
	slo: {
		enabled: true, // Use SLO?
		path: '/' // The path whitch logoutRequest request to from CAS Server.
	},
	path: { // CAS Server URIs.
		login: '/login',
		logout: '/logout',
		validate: '/validate',
		serviceValidate: '/serviceValidate',
		proxyValidate: '/proxyValidate',
		proxy: '/proxy',
		p3: {
			serviceValidate: '/p3/serviceValidate',
			proxyValidate: '/p3/proxyValidate',
		}
	},
	session: {
		enabled: false, // If NOT enabled, an isolating cookie stored ST be implemented.
		cookie: {
			key: 'st', 
			httpOnly: true,
		}
	},
	ignore: ['**/*.ico', '**/*.js', '**/*.css'] // The resource path rules let cas client ignore.
}
```
Why these paths? See also, [CAS Protocol 3.0 Specification](https://apereo.github.io/cas/5.2.x/protocol/CAS-Protocol-Specification.html#2-cas-uris).

#### Presets for Apereo CAS
Version difference between ``=4.0.x`` and ``>4.1.x``.

In apereo 4.0.x (non prefix /p3):
> The current CAS protocol is the version 3.0, implemented by the CAS server 4.0.
It’s mainly a capture of the most common enhancements built on top of the CAS protocol revision 2.0.
Among all features, the most noticable update between versions 2.0 and 3.0 is the ability to return the authentication/user attributes in the **/serviceValidate** response.

See also, [CAS-Protocol 4.0.x](https://apereo.github.io/cas/4.0.x/protocol/CAS-Protocol.html).

In apereo 4.1.x (prefix /p3):
> The current CAS protocol is the version 3.0. The draft version of the protocol is available as part of the CAS codebase, which is hereby implemented. It’s mainly a capture of the most common enhancements built on top of the CAS protocol revision 2.0. Among all features, the most noticeable update between versions 2.0 and 3.0 is the ability to return the authentication/user attributes through the new **/p3/serviceValidate** response (in addition to the **/serviceValidate** endpoint, already existing for CAS 2.0 protocol).

See also, [CAS-Protocol 4.1.x](https://apereo.github.io/cas/4.1.x/protocol/CAS-Protocol.html).

When dependent on an ``Apereo 4.0.x CAS Server``, options need to be with a preset,
```js
const presets = require('http-cas-client/presets/apereo');
const casClientHandler = httpCasClient(presets['apereo =4.0.x'], {
	origin: 'http://your.cas-server.hostname'
});
```
#### Customs Options for Special Purposes
You can also override all items of options for your special cas server. And use chained multiple options arguments to create handler,
```js
const casClientHandler = httpCasClient(options1, options2, ...);
```
### Store
Store is an event emitter.
#### Method

//TODO

#### Event
//TODO

## Debug
Because CAS protocol is complicated, we remove this option. We recommend you to always log every step that what CAS client do on your production environment.

Setting env.DEBUG="cas,cas:*";

## License

MIT