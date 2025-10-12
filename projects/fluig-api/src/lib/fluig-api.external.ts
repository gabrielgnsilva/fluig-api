/** @format */

let _OAuthCtor: any | null = null;
let _CryptoJS: any | null = null;

export function cacheExternalLibs(oauthMod: any, cryptoMod: any) {
  _OAuthCtor = oauthMod?.default ?? oauthMod;
  _CryptoJS = cryptoMod?.default ?? cryptoMod;
}

export function getCryptoJS(): any {
  if (!_CryptoJS)
    throw new Error('crypto-js not loaded (config.local must be true).');
  return _CryptoJS;
}

export function getOAuthCtor(): any {
  if (!_OAuthCtor)
    throw new Error('oauth-1.0a not loaded (config.local must be true).');
  return _OAuthCtor;
}

export function hasOAuthLibs(): boolean {
  return !!_OAuthCtor && !!_CryptoJS;
}
