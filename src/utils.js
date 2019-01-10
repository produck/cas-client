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
};