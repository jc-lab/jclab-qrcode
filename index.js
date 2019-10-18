const oneJson = require('one-json');

function parse(payload) {
    const footer = ':jclab-wp-qrcode!';
    if(!payload.endsWith(footer)) {
        return false;
    }

    const reverseText = function (text) {
        return text.split('').reverse().join('');
    };

    let result = oneJson.parse(reverseText(payload.substr(0, payload.length - footer.length)));
    return result.output;
}

function fromCurrentUrl() {
    return parse(location.href);
}

module.exports = {
    parse,
    fromCurrentUrl
};
