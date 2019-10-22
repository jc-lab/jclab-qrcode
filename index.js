function parse(payload) {
    const footer = ':jclab-wp-qrcode!';
    if(!payload.endsWith(footer)) {
        return false;
    }
    const beginPos = payload.lastIndexOf('<');
    if(beginPos < 0) {
        return false;
    }

    return Buffer.from(payload.substr(beginPos + 1, (payload.length - footer.length) - beginPos - 1), 'base64');
}

function makeUrlFooter(content) {
    const buf = Buffer.isBuffer(content) ? content : Buffer.from(content);
    return '<' + buf.toString('base64') + ':jclab-wp-qrcode!';
}

function fromCurrentUrl() {
    return parse(decodeURIComponent(location.hash));
}

module.exports = {
    parse,
    makeUrlFooter,
    fromCurrentUrl
};
