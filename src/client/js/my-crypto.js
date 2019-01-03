// Create the encryption object for asymmetric RSA algorithm.
var rsa = new JSEncrypt({ default_key_size: 1024 });

// hasing text by sha-512 algorithm
function getHash(input) {
    return CryptoJS.SHA512(input).toString();
}

// create the pair public and private key for asymmetric RSA encryption
function setupKeyPair() {
    if (localStorage.privateKey == null || localStorage.publicKey == null) {
        rsa.getKey(); // generate keys

        // store keys in localStorage
        localStorage.publicKey = rsa.getPublicKey();
        localStorage.privateKey = rsa.getPrivateKey();
    }
}

// asymmetric RSA encryption
function asymEncrypt(input, publicKey) {
    rsa.setPublicKey(publicKey);
    return rsa.encrypt(input);
}

// asymmetric RSA decryption
function asymDecrypt(cipherInput) {
    rsa.setPrivateKey(localStorage.privateKey); // Set the private.
    return rsa.decrypt(cipherInput);
}

// symmetric 3DES encryption
function symEncrypt(input, pass) {
    return CryptoJS.TripleDES.encrypt(input, pass).toString();
}

// symmetric 3DES decryption
// function symDecrypt(cipherInput, pass) {
//     var bytes = CryptoJS.TripleDES.decrypt(cipherInput, pass);
//     return bytes.toString(CryptoJS.enc.Utf8);
// }


// setup key pairs if was not exist
setupKeyPair();