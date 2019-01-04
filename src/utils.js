const http = require('http');

exports.request = function request(url) {
	return new Promise((resolve, reject) => {
		http.get(url, res => {
			const { statusCode } = res;
	
			if (res.statusCode !== 200) {
				res.resume();
				return reject (new Error(`Request Failed.\nStatus Code: ${statusCode}`));
			}
			
			let rawData = '';
			res.setEncoding('utf8');
			res.on('data', (chunk) => { rawData += chunk; });
			res.on('end', () => resolve(rawData));
		}).on('error', error => reject(error));
	});
};

exports.getRawBody = function getRawBody(request) {
	let data = '';

	return new Promise((resolve, reject) => {
		request.on('data', trunk => data += trunk);
		request.on('end', () => resolve(data));
		request.on('error', error => reject(error));
	});
};

const { parseString } = require('xml2js');
const { stripPrefix } = require('xml2js/lib/processors');

exports.parseXML = function parseXML(xmlString) {
	return new Promise((resolve, reject) => {
		parseString(xmlString, {
			explicitRoot: false,
			tagNameProcessors: [stripPrefix]
		}, (error, result) => {
			if (error) {
				return reject(error);
			}
			
			resolve(result);
		});
	});
};

exports.sendRedirect = function sendRedirect(response, url) {
	response.setHeader('Location', url);
	response.statusCode = 302;
	response.end();
};

const NodeRSA = require('node-rsa');
const RSAKey = new NodeRSA({b: 384});

exports.encrypt = function encrypt(plaintext) {
	return RSAKey.encrypt(plaintext, 'base64');
};

exports.decrypt = function decrypt(ciphertext) {
	try {
		return RSAKey.decrypt(ciphertext, 'utf8');
	} catch (error) {
		return null;
	}
};