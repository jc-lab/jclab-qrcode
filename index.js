function parse(payload) {
    const footer = ':jclab-wp-qrcode!';
    if(!payload.endsWith(footer)) {
        return false;
    }
    const beginPos = payload.lastIndexOf('<');
    if(beginPos < 0) {
        return false;
    }

    return payload.substr(beginPos + 1, (payload.length - footer.length) - beginPos - 1);
}

function makeUrlFooter(content) {
    return '<' + Buffer.from(content).toString('base64') + ':jclab-wp-qrcode!';
}

function fromCurrentUrl() {
    return parse(location.href);
}

module.exports = {
    parse,
    makeUrlFooter,
    fromCurrentUrl
};
