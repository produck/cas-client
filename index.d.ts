import { IncomingMessage, ServerResponse, OutgoingMessage } from "http";

declare namespace CAS {
	type version = 1 | 2 | 3;
}

declare namespace httpCasClient {
	interface Handler {

		/**
		 * @returns inProgress?
		 */
		(req: IncomingMessage, res: ServerResponse, hooks: Handler.hooks): Promise<Boolean>;
	}

	namespace Handler {
		interface hooks {

			/**
			 * Define a function to get ticket id from any store.
			 */
			getTicket?: () => String;

			/**
			 * Do something when a new ticket created.
			 */
			ticketCreated?: (ticketId: String) => void;

			/**
			 * Do something when a specific ticket has been destroyed.
			 */
			ticketDestroyed?: (ticketId: String) => void;

			/**
			 * A function return resolved request body object.
			 */
			bodyParser?: () => Object | Promise<Object>;
		}
	}
	
	interface Options {
		/**
		 * CAS protocol version 1, 2, 3.
		 */
		cas?: CAS.version;

		/**
		 * The start of the CAS server URL, i.e. https://localhost:8443/cas
		 */
		casServerUrlPrefix: String,

		/**
		 * The name of the server this application is hosted on.
		 * Service URL will be dynamically constructed using this,
		 * i.e. https://localhost:8443 (you must include the protocol,
		 * but port is optional if it's a standard port).
		 */
		serverName: String;

		/**
		 * The options of this application server (CAS Client).
		 */
		client?: Options.client;

		/**
		 * The options of CAS Server.
		 */
		server?: Options.server;
	}

	namespace Options {

		interface client {
	
			/**
			 * The name of the server this application is hosted on.
			 * Service URL will be dynamically constructed using this,
			 * i.e. https://localhost:8443 (you must include the protocol,
			 * but port is optional if it's a standard port).
			 */
			service?: String;

			/**
			 * Use SLO or not.
			 */
			slo?: Boolean;

			/**
			 * If this parameter is set, ticket validation will only succeed if the service ticket was
			 * issued from the presentation of the user’s primary credentials.
			 */
			renew?: Boolean;
			
			/**
			 * If this parameter is set, CAS will not ask the client for credentials. 
			 */
			gateway?: Boolean;

			/**
			 * Whether to store the Assertion in session or not. If sessions are not used, tickets
			 * will be required for each request. Defaults to false.
			 */
			useSession?: Boolean
			
			/**
			 * The method to be used when sending responses. While native HTTP redirects (GET) may
			 * be utilized as the default method, applications that require a POST response can use
			 * this parameter to indicate the method type. A HEADER method may also be specified to
			 * indicate the CAS final response such as service and ticketshould be returned in form
			 * of HTTP response headers. It is up to the CAS server implementation to determine whether
			 * or not POST or HEADER responses are supported.
			 */
			method?: String;
			
			/**
			 * URLs of requests matched rules will not be affected.
			 * 
			 *  - If you use strings and regexp lists, you only need to satisfy one item to pass.
			 *  - Or provide a function to define custom rules.
			 */
			ignore?: RegExp[] | ((httpRequest: IncomingMessage) => Boolean | Promise<Boolean>);

			/**
			 * A callback function to decide skip cas authentication or not.
			 */
			skip?: ((httpRequest: IncomingMessage, httpResponse: OutgoingMessage, options: Options) => Boolean | Promise<Boolean>);

			/**
			 * About CAS proxy.
			 */
			proxy?: proxy;
		}

		interface server {

			/**
			 * Defines the location of the CAS server login URL, i.e.
			 * https://localhost:8443/cas/login. This overrides casServerUrlPrefix, if set.
			 */
			loginUrl?: String;

			/**
			 * CAS URIs.
			 * https://apereo.github.io/cas/6.0.x/protocol/CAS-Protocol-Specification.html#2-cas-uris
			 */
			path?: path;
		}

		interface path {

			/**
			 * credential requestor / acceptor
			 */
			login?: String;

			/**
			 * destroy CAS session (logout)
			 */
			logout?: String;

			/**
			 * service ticket validation [CAS 1.0]
			 */
			validate?: String;

			/**
			 * service ticket validation [CAS 2.0]
			 */
			serviceValidate?: String;

			/**
			 * service/proxy ticket validation [CAS 2.0]
			 */
			proxyValidate?: String;

			/**
			 * proxy ticket service [CAS 2.0]
			 */
			proxy?: String;

			/**
			 * CAS 3.0 uri
			 */
			p3?: {
				
				/**
				 * service ticket validation [CAS 3.0]
				 */
				serviceValidate?: String;

				/**
				 * service/proxy ticket validation [CAS 3.0]
				 */
				proxyValidate?: String;
			}
		}
				
		interface proxy {

			/**
			 * Specifies whether any proxy is OK. Defaults to false.
			 */
			acceptAny?: Boolean;

			/**
			 * Specifies the proxy chain. Each acceptable proxy chain should include
			 * a space-separated list of URLs (for exact match) or regular expressions
			 * of URLs (starting by the ^ character). Each acceptable proxy chain
			 * should appear on its own line.
			 * 
			 *  - Or provide a function to define custom rules.
			 */
			allowedChains?: ((proxiex: string[]) => Boolean | Promise<Boolean>);

			/**
			 * The callback URL to provide the CAS server to accept Proxy Granting Tickets.
			 */
			callbackUrl?: String;

			/**
			 * The URL to watch for PGTIOU/PGT responses from the CAS server. Should be
			 * defined from the root of the context. For example, if your application is
			 * deployed in /cas-client-app and you want the proxy receptor URL to be
			 * /cas-client-app/my/receptor you need to configure proxyReceptorUrl to be
			 * /my/receptor.
			 */
			receptorUrl?: String;
		}
	}
}

declare class CasServerAgent {
	constructor(options: httpCasClient.Options);
}

/**
 * Create a native CasClientHandler for native http.createServer.
 */
declare function httpCasClient(...options: httpCasClient.Options[]): httpCasClient.Handler;

export = httpCasClient;