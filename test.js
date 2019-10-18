const jclabQrcode = require('.');
const payload = `https://example.com/TEST-ID-1234/!}"4321-DI-TSET" :"di_rebmem"{:jclab-wp-qrcode!`;

console.log(jclabQrcode.parse(payload));
