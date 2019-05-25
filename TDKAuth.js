module.exports = class TDKAuth {
    constructor(hashFunc = 'sha512', encoding = 'utf-8') { 
        this.hashFunc = hashFunc
        this.encoding = encoding
    }
    hashThis(hashString, hashSalt = '') {
      return TDKAuth.statHashThis(hashString, hashSalt, this.hashFunc, this.encoding)
    }
    static statHashThis(hashString, hashSalt = '', hashFunc = 'sha512', encoding = 'utf-8')
    {
        let crypto = require('crypto')
        return crypto.createHash(hashFunc).update(hashString + hashSalt,encoding).digest('hex')
    }
}