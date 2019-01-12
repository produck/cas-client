# http-cas-client
[![Build Status](https://img.shields.io/travis/lemonce/cas-client.svg?style=flat-square)](https://www.npmjs.com/package/http-cas-client)
[![NPM Downloads](https://img.shields.io/npm/dm/http-cas-client.svg?style=flat-square)](https://www.npmjs.com/package/http-cas-client)
[![NPM Version](https://img.shields.io/npm/v/http-cas-client.svg?style=flat-square)](https://www.npmjs.com/package/http-cas-client)

A complete implement of CAS Client middleware for Node.js, support CAS 1.0, 2.0+, 3.0+ protocol.

CAS(Central Authentication Service) is a single-sign-on / single-sign-off protocol for the web.

We suppose you are already familiar with the CAS protocol, if not, please read this [document](https://apereo.github.io/cas/6.0.x/protocol/CAS-Protocol.html) before you use this.

## Installation

```base
$ npm install http-cas-client
```

## Feature

* Singing Sign On (SSO)
* CAS Proxy with axios api for POST, PUT, DELETE...
* CAS Proxy - proxiex chain checking
* Single Logout (SLO)
* Renew & gateway
* Native http module supported
* No-session mode supported
* Easy to wrap for all popular backend framework integration
* Cluster friendly //TODO
* Principal adapter for application debugging //TODO
* SMAL1.1 //TODO
* Restlet integration supported //TODO
* Conditional skip CAS authentication //TODO
* PT cache //TODO

## Getting Started

### CAS Client Handler for Native

Basic usage with default options for creating a cas client handler and use it in nodejs native http server. For example,
```js
const http = require('http');
const httpCasClient = require('http-cas-client');

// A CAS server deployed at url http://localhost:8080.
// Default prefix is '/'.
const handler = httpCasClient({
	casServerUrlPrefix: 'http://localhost:9000/cas',
	serverName: 'http://127.0.0.1'
});

http.createServer(async (req, res) => {
	if(!await handler(req, res)) {
		return res.end();
	}

	const { principal, ticket } = req;
	console.log(principal, ticket);
	// { user: 'test', attributes: { ... } }

	// your statements...
	res.end('hello world');
}).listen(80);
```
### Koa2 Wrap
It can also use with popular backend framework like Koa2. For example,
```js
const koaCasClient = require('http-cas-client/wrap/koa2');
const Koa = require('koa');
const bodyparser = require('koa-bodyparser');

const casServerUrlPrefix = 'http://localhost:9000/cas';

const app = new Koa();

// NOTICE: If you put bodyparser after cas client, bodyparser will not receive req.socket data.
// A native body parser is used in handler.
// Sometimes you need to make some adjustments for your especial case.
app.use(bodyparser());

// NOTICE: Put the middleware include casClientHandler before your specific api code.
// For example, put it before routes.
app.use(koaCasClient({
	casServerUrlPrefix: 'http://localhost:9000/cas',
	serverName: 'http://127.0.0.1'
})).use(ctx => {
	const { principal, ticket } = ctx;

	// your statements...
	ctx.body = `<a href="${casServerUrlPrefix}/logout">SLO</a><pre>`
	ctx.body += JSON.stringify(principal, null, 2);
	ctx.body += '</pre>'
}).listen(80);
```
Under the traditional pattern, cas client NEED to use with session, especially those 'Spring mvc' project in servlet.

So there is also a way to implement with all nodejs backend frameworks. For example in Koa2,
```js
const koaSessionCasClient = require('http-cas-client/wrap/koa2-session');
const session = require('koa-session');
const Koa = require('koa');
const casServerUrlPrefix = 'http://localhost:9000/cas';

const app = new Koa();
const sessionMiddleware = session(app);
app.keys = ['koa-app'];

app.use(session(app)).use(koaSessionCasClient({
	casServerUrlPrefix: 'http://localhost:9000/cas',
	serverName: 'http://127.0.0.1'
})).use(ctx => {
	const { principal } = ctx;

	// your statements...
	ctx.body = `<a href="${casServerUrlPrefix}/logout">SLO</a><pre>`
	ctx.body += JSON.stringify(principal, null, 2);
	ctx.body += '</pre>'
}).listen(80);
```
### CAS Proxy (Use ServiceTicket instance)
```js
const koaSessionCasClient = require('http-cas-client/wrap/koa2-session');
const koaCasClient = require('http-cas-client/wrap/koa2');
const Koa = require('koa');
const session = require('koa-session');

const casServerUrlPrefix = 'http://localhost:9000/cas';

const app = new Koa();
app.keys = ['koa-app'];
app.use(session(app)).use(koaSessionCasClient({
	casServerUrlPrefix: 'http://localhost:9000/cas',
	serverName: 'http://127.0.0.1:2000',
	client: {
		proxy: {
			callbackUrl: 'http://127.0.0.1:2000/callback',
			receptorUrl: '/callback'
		}
	}
})).use((ctx, next) => {
	// If req.url matches /app, skip into next middleware.
	if (ctx.request.path === '/app') {
		return next();
	}

	const { principal } = ctx;

	// This is the 1st cas client.
	// your statements...
	ctx.body = `<p>This is proxy</p>`;
	ctx.body = `<a href="${casServerUrlPrefix}/logout">SLO</a><pre>`
	ctx.body += JSON.stringify(principal, null, 2);
	ctx.body += '</pre>'
}).use(async ctx => {
	const { ticket } = ctx;

	// Proxy request some data from 2rd cas client 'http://127.0.0.1:3000'.
	const response = await ticket.request('http://127.0.0.1:3000/').then(axios => {
		return axios.post('/test');
	});

	// Proxy send the data from 2rd.
	ctx.body = response.data;
}).listen(2000);

const app2 = new Koa();
app2.use(koaCasClient({
	casServerUrlPrefix: 'http://localhost:9000/cas',
	serverName: 'http://127.0.0.1:3000',
	client: {
		proxy: {
			acceptAny: true,
			callbackUrl: 'http://127.0.0.1:3000/proxyCallback',
			receptorUrl: '/proxyCallback'
		}
	}
})).use(async ctx => {
	//This is the 2nd cas client.
	const { principal, ticket } = ctx;

	// Proxy request some data from 3rd cas client 'http://127.0.0.1:4000/'.
	const response = await ticket.request('http://127.0.0.1:4000/').then(axios => {
		return axios.post('/test');
	});

	// your statements...
	ctx.body = `<p>This is App</p>`;
	ctx.body += `<a href="${casServerUrlPrefix}/logout">SLO</a><pre>`;
	ctx.body += JSON.stringify(principal, null, 2);
	ctx.body += '</pre>';

	// Combine data from the 3rd.
	ctx.body += response.data;
}).listen(3000);

const app3 = new Koa();
app3.use(koaCasClient({
	casServerUrlPrefix: 'http://localhost:9000/cas',
	serverName: 'http://127.0.0.1:4000',
	client: {
		proxy: {
			acceptAny: true,
		}
	}
})).use(async ctx => {
	// This is the 3rd cas client.
	// your statements...
	ctx.body = 'from the proxy proxy app.'
}).listen(4000);
```
### Custom Wrap
//TODO But you can review 'http-cas-client/wrap/koa2.js'. Maybe you can understand how to do.

At least I think that's easy. Good luck.

## API Referrence
### Options
The origin of CAS Server is essential. The simplest form is like,
```js
const httpCasClient = require('http-cas-client');
const handler = httpCasClient({
	casServerUrlPrefix: 'http://localhost:9000/cas',
	serverName: 'http://127.0.0.1',
});
```
#### Full Default Options
```js
// Other items are optional.
const defaultOptions = {
	cas: 3, // CAS protocol version 1, 2, 3

	client: {
		service: null,
		slo: true, // Use SLO?
		renew: false, // CAS renew.
		gateway: false, // CAS gateway
		useSession: false,
		method: 'GET',
		// The resource path rules let cas client ignore.
		ignore: [/\.(ico|css|js|jpe?g|svg|png)/],
		proxy: {
			acceptAny: false,
			allowedChains: () => true,
			callbackUrl: null,
			receptorUrl: null
		}
	},

	server: {
		loginUrl: null,

		// CAS Server URIs. Normally no change is required.
		// Useful when use a nonstandard cas server or url re-writed.
		path: {
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
		}
	}
}
```
Why these paths? See also, [CAS Protocol 3.0 Specification](https://apereo.github.io/cas/5.2.x/protocol/CAS-Protocol-Specification.html#2-cas-uris).

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

## CAS Client Cluster
### Shared Ticket Store
### Sync ST store
#### In Frontend
#### In Backend

## Debug
Because CAS protocol is complicated, we remove this option. We recommend you to always log every step that what CAS client do on your production environment.

Setting env.DEBUG="cas,cas:*";

## License

MIT