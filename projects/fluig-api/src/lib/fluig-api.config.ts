/** @format */

import { InjectionToken } from '@angular/core';

// ---------------------------- Type Helpers ----------------------------------

// AI slop that acctually works...
type Without<T, K> = { [P in Exclude<keyof T, keyof K>]?: never };
type XOR<T, U> = (Without<T, U> & U) | (Without<U, T> & T);
type Forbid<T> = { [K in keyof T]?: never };

// ---------------------------- Config Types ----------------------------------

/** Base configuration for Fluig authentication */
type OAuthBaseConfig = {
  /** Application URL */
  url: string;
};

/** Configuration for Fluig authentication using the Bearer token */
export interface BearerConfig extends OAuthBaseConfig {
  /** OAuth token
   *
   * WARN: **Never** set this option in production!
   * This option is meant to be used while **developing in a local environment only**.
   * API calls in production injects the user token in the request header
   * automatically. Set `local` to `false` instead.
   */
  token: string;
}
/** Configuration for Fluig authentication using OAuth */
export interface OAuthConfig extends OAuthBaseConfig {
  /** OAuth secrets
   *
   * WARN: **Never** set these options in production!
   * This options are meant to be used **while developing in a local environment only**.
   * API calls in production injects the user token in the request header
   * automatically. Set `local` to `false` instead.
   */
  oauth: {
    /** Consumer key used for OAuth authentication */
    consumerKey: string;
    /** Consumer secret used for OAuth authentication */
    consumerSecret: string;
    /** Access token used for OAuth authentication */
    accessToken: string;
    /** Token secret used for OAuth authentication */
    tokenSecret: string;
  };
}

/** Configuration for Fluig authentication interceptor */
export interface InterceptorConfig extends OAuthBaseConfig {
  /** List of API endpoints to intercept
   *
   * If the request URL starts with one of these endpoints, the interceptor
   * will add the authentication token to the request header.
   * If empty or omitted all requests will be intercepted.
   */
  endpoints?: string[];
  /** Logs whenever a request is intercepted */
  debug?: boolean;
}

/** Configuration for Fluig authentication */
type Auth = XOR<OAuthConfig, BearerConfig>;

/** Environment configuration */
export interface Environment<L extends boolean> {
  /** Are we in a local environment?
   *
   * WARN: **Never** set this to `true` in production, **NEVER**!
   * API calls in production inject the user token in the request header
   * automatically.
   */
  local: L;
}

export type FluigAPIConfig =
  | (Environment<false> & Forbid<OAuthBaseConfig & Auth & InterceptorConfig>)
  | (Environment<true> & Auth & InterceptorConfig);

/** Injection token for Fluig authentication configuration */
export const FLUIG_API_CONFIG = new InjectionToken<FluigAPIConfig>(
  'FLUIG_API_CONFIG'
);
