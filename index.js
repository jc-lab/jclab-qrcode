const jose = require('jose');
const zlib = require('browserify-zlib');
const querystring = require('querystring');

function urlBase64Decode(encoded) {
    encoded = encoded.replace('-', '+').replace('_', '/');
    while (encoded.length % 4)
        encoded += '=';
    return Buffer.from(encoded, 'base64').toString();
}

function compress(payload) {
    const payloadBuf = Buffer.from(payload);
    const payloadBase64 = payloadBuf.toString('base64');
    const compressed = Buffer.concat([Buffer.from('z'), zlib.deflateSync(payloadBuf)]);
    if(payloadBase64.length < compressed.toString('base64').length) {
        return payloadBuf;
    }else{
        return compressed;
    }
}

function decompress(payload) {
    const decoded = (typeof payload == 'string') ? Buffer.from(payload, 'base64') : payload;
    if(decoded[0] == '{')
        return decoded.toString();
    if(decoded[0] == 'z') {
        const zpayload = Buffer.from(decoded, 1);
        const decompressed = zlib.inflateSync(zpayload);
        return decompressed.toString();
    }
    throw Error('Unknown payload header');
}

function compressJsonPayload(input) {
    const output = {};
    for(let k in input) {
        let item = input[k];
        if(typeof item == 'object') {
            if(item.type.toUpperCase() == 'UUID') {
                output['_u:' + k] = Buffer.from(item.value.replace(/-/g, ''), 'hex').toString('base64').replace(/=/g, '');
            }
        }else{
            output[k] = item;
        }
    }
    return output;
}

function decompressJsonPayload(input) {
    const output = {};
    for(let k in input) {
        let item = input[k];
        if(k.startsWith('_u:')) {
            let pos = 0;
            let uuid_output = '';
            item = Buffer.from(item, 'base64').toString('hex');
            uuid_output += item.substr(pos, 8) + '-'; pos += 8;
            uuid_output += item.substr(pos, 4) + '-'; pos += 4;
            uuid_output += item.substr(pos, 4) + '-'; pos += 4;
            uuid_output += item.substr(pos, 4) + '-'; pos += 4;
            uuid_output += item.substr(pos, 12); pos += 12;
            output[k.substr(3)] = uuid_output;
        } else {
            output[k] = item;
        }
    }
    return output;
}

function makeUrlFooter(payload, header, key) {
    const compressedPayload = compress(JSON.stringify(compressJsonPayload(payload)));
    const signer = new jose.JWS.Sign(compressedPayload);
    signer.recipient(key, compressJsonPayload(header));
    const token = signer.sign('compact');
    const compressedTokenBase64 = token.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const qrpayload = (token.length < compressedTokenBase64.length) ? token : compressedTokenBase64;
    return querystring.escape('<' + qrpayload + ':jwpqr!');
}

function v1Parse(qrcodeData, key) {
    const beginPos = qrcodeData.lastIndexOf('<');
    if(beginPos < 0) {
        return null;
    }

    const payload = Buffer.from(qrcodeData.substr(beginPos + 1), 'base64').toString();
    if(key) {
        const verified = jose.JWS.verify(payload, key, { complete: true });
        return {
            version: 1,
            header: verified.protected,
            payload: verified.payload
        };
    }else{
        const tokens = payload.split('.');
        return {
            version: 1,
            header: JSON.parse(urlBase64Decode(tokens[0])),
            payload: JSON.parse(urlBase64Decode(tokens[1]))
        }
    }
}

function v2Parse(qrcodeData, key) {
    const beginPos = qrcodeData.lastIndexOf('<');
    if(beginPos < 0) {
        return null;
    }

    const payload = qrcodeData.substr(beginPos + 1);
    if(key) {
        const verified = jose.JWS.verify(payload, key, { complete: true });
        return {
            version: 2,
            header: decompressJsonPayload(verified.protected),
            payload: decompressJsonPayload(verified.payload)
        };
    }else{
        const tokens = payload.split('.');
        return {
            version: 2,
            header: decompressJsonPayload(JSON.parse(urlBase64Decode(tokens[0]))),
            payload: decompressJsonPayload(JSON.parse(urlBase64Decode(tokens[1])))
        }
    }
}

function fromCurrentUrl() {
    return parse(decodeURIComponent(location.hash));
}

const providers = [];
function addProvider(footer, parse) {
    const o = { sig: footer, parse: parse };
    providers.push(o);
}

addProvider(':jclab-wp-qrcode!', v1Parse);
addProvider(':jwpqr!', v2Parse);

function parse(qrcodeData, key) {
    qrcodeData = querystring.unescape(qrcodeData);
    for(let p of providers) {
        if(qrcodeData.endsWith(p.sig)) {
            return p.parse(qrcodeData.substr(0, qrcodeData.length - p.sig.length), key);
        }
    }
    return null;
}

module.exports = {
    parse,
    makeUrlFooter,
    fromCurrentUrl
};
