/** @format */

import {
  HttpClient,
  HttpContext,
  HttpEvent,
  HttpHeaders,
  HttpParams,
  HttpResponse,
} from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import {
  Environment,
  OAuthConfig,
  FLUIG_API_CONFIG,
  FluigAPIConfig,
  BearerConfig,
} from './fluig-api.config';
import { Observable } from 'rxjs';

import { getOAuthCtor, getCryptoJS, hasOAuthLibs } from './fluig-api.external';

type LocalOAuth = Extract<FluigAPIConfig, Environment<true> & OAuthConfig>;
type LocalBearer = Extract<FluigAPIConfig, Environment<true> & BearerConfig>;
type RequestOptions = {
  url: string;
  method: string;
  data?: any;
  options?: {
    headers?: HttpHeaders | Record<string, string | string[]>;
    params?:
      | HttpParams
      | Record<
          string,
          string | number | boolean | ReadonlyArray<string | number | boolean>
        >;
  };
  includeBodyHash?: boolean;
};

@Injectable({ providedIn: 'root' })
export class FluigAPIService {
  private readonly http = inject(HttpClient);
  private readonly cfg = inject(FLUIG_API_CONFIG);

  private readonly oauth = this.getOAuthClient();

  private isOAuthConfig(cfg: FluigAPIConfig): cfg is LocalOAuth {
    return cfg.local === true && 'oauth' in cfg && !('token' in cfg);
  }
  private isBearerConfig(cfg: FluigAPIConfig): cfg is LocalBearer {
    return cfg.local === true && 'token' in cfg && !('oauth' in cfg);
  }

  private getOAuthClient() {
    if (!this.isOAuthConfig(this.cfg) || !hasOAuthLibs()) return null;

    const OAuth = getOAuthCtor();
    const CryptoJS = getCryptoJS();

    const bodyHash = (body: any): string => {
      return CryptoJS.SHA1(body).toString(CryptoJS.enc.Base64);
    };
    const hashFunction = (base_string: string, key: string): string => {
      return CryptoJS.HmacSHA1(base_string, key).toString(CryptoJS.enc.Base64);
    };

    return new OAuth({
      consumer: {
        key: this.cfg.oauth.consumerKey,
        secret: this.cfg.oauth.consumerSecret,
      },
      signature_method: 'HMAC-SHA1',
      body_hash_function: bodyHash,
      hash_function: hashFunction,
    });
  }

  private getAuthHeader(
    request?: RequestOptions
  ): HttpHeaders | Record<string, string | string[]> {
    let headers = request?.options?.headers ?? new HttpHeaders();
    if (!this.cfg || !this.cfg.local) return headers;

    const oauthToken = this.getAuthToken(request);
    if (typeof headers === 'object' && !(headers instanceof HttpHeaders)) {
      return { ...headers, Authorization: oauthToken };
    }
    return headers.set('Authorization', oauthToken);
  }

  private getUrlWithParams(
    url: string,
    params?:
      | HttpParams
      | Record<
          string,
          string | number | boolean | ReadonlyArray<string | number | boolean>
        >
  ) {
    if (params == null) return url;
    const httpParams: HttpParams =
      params instanceof HttpParams
        ? params
        : typeof params === 'string'
          ? new HttpParams({ fromString: params })
          : new HttpParams({ fromObject: params });
    const paramString = httpParams.toString();
    return paramString ? `${url}?${paramString}` : url;
  }

  private signRequest(request: RequestOptions) {
    if (!this.oauth || !this.isOAuthConfig(this.cfg)) {
      throw new Error('[FluigAPI] OAuth configuration is missing');
    }

    const absoluteUrl = new URL(
      this.getUrlWithParams(request.url, request?.options?.params),
      this.cfg.url
    ).toString();

    const authOptions = {
      url: absoluteUrl,
      method: request.method.toUpperCase(),
      includeBodyHash: false,
      data: undefined,
    };

    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      authOptions.includeBodyHash = true;
      authOptions.data = request.data;
    }

    return this.oauth.authorize(
      {
        url: authOptions.url,
        method: authOptions.method,
        includeBodyHash: authOptions.includeBodyHash,
        data: authOptions.data,
      },
      {
        key: this.cfg.oauth.accessToken,
        secret: this.cfg.oauth.tokenSecret,
      }
    );
  }

  /** Get the `Authorization` token to be used in the request header
   *
   * If in a local environment, the token is generated using the OAuth
   * configuration provided or the Bearer token.
   *
   * @param request The request options to be signed (required if using OAuth)
   * @returns The authentication token to be used in the request header
   */
  public getAuthToken(request?: RequestOptions): string {
    if (this.isBearerConfig(this.cfg)) return `Bearer ${this.cfg.token}`;

    if (this.isOAuthConfig(this.cfg) && this.oauth && request) {
      const header = this.oauth.toHeader(this.signRequest(request));
      return header.Authorization;
    }
    throw new Error(
      '[FluigAPI] Invalid configuration for authentication, token not generated.'
    );
  }

  /**
   * Constructs a `DELETE` request that interprets the body as an `ArrayBuffer`
   *  and returns the response as an `ArrayBuffer`.
   *
   * @param url     The endpoint URL.
   * @param options The HTTP options to send with the request.
   *
   * @return  An `Observable` of the response body as an `ArrayBuffer`.
   */
  delete(
    url: string,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      context?: HttpContext;
      observe?: 'body';
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType: 'arraybuffer';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      body?: any | null;
    }
  ): Observable<ArrayBuffer>;
  /**
   * Constructs a `DELETE` request that interprets the body as a `Blob` and returns
   * the response as a `Blob`.
   *
   * @param url     The endpoint URL.
   * @param options The HTTP options to send with the request.
   *
   * @return An `Observable` of the response body as a `Blob`.
   */
  delete(
    url: string,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      context?: HttpContext;
      observe?: 'body';
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType: 'blob';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      timeout?: number;
      body?: any | null;
    }
  ): Observable<Blob>;
  /**
   * Constructs a `DELETE` request that interprets the body as a text string and returns
   * a string.
   *
   * @param url     The endpoint URL.
   * @param options The HTTP options to send with the request.
   *
   * @return An `Observable` of the response, with the response body of type string.
   */
  delete(
    url: string,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      context?: HttpContext;
      observe?: 'body';
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType: 'text';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      timeout?: number;
      body?: any | null;
    }
  ): Observable<string>;
  /**
   * Constructs a `DELETE` request that interprets the body as an `ArrayBuffer`
   *  and returns the full event stream.
   *
   * @param url     The endpoint URL.
   * @param options The HTTP options to send with the request.
   *
   * @return An `Observable` of all `HttpEvent`s for the request,
   * with response body as an `ArrayBuffer`.
   */
  delete(
    url: string,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      observe: 'events';
      context?: HttpContext;
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType: 'arraybuffer';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      timeout?: number;
      body?: any | null;
    }
  ): Observable<HttpEvent<ArrayBuffer>>;
  /**
   * Constructs a `DELETE` request that interprets the body as a `Blob`
   *  and returns the full event stream.
   *
   * @param url     The endpoint URL.
   * @param options The HTTP options to send with the request.
   *
   * @return An `Observable` of all the `HttpEvent`s for the request, with the response body as a
   * `Blob`.
   */
  delete(
    url: string,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      observe: 'events';
      context?: HttpContext;
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType: 'blob';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      timeout?: number;
      body?: any | null;
    }
  ): Observable<HttpEvent<Blob>>;
  /**
   * Constructs a `DELETE` request that interprets the body as a text string
   * and returns the full event stream.
   *
   * @param url     The endpoint URL.
   * @param options The HTTP options to send with the request.
   *
   * @return An `Observable` of all `HttpEvent`s for the request, with the response
   * body of type string.
   */
  delete(
    url: string,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      observe: 'events';
      context?: HttpContext;
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType: 'text';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      timeout?: number;
      body?: any | null;
    }
  ): Observable<HttpEvent<string>>;
  /**
   * Constructs a `DELETE` request that interprets the body as JSON
   * and returns the full event stream.
   *
   * @param url     The endpoint URL.
   * @param options The HTTP options to send with the request.
   *
   * @return An `Observable` of all `HttpEvent`s for the request, with response body of
   * type `Object`.
   */
  delete(
    url: string,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      observe: 'events';
      context?: HttpContext;
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      timeout?: number;
      body?: any | null;
    }
  ): Observable<HttpEvent<Object>>;
  /**
   * Constructs a `DELETE`request that interprets the body as JSON
   * and returns the full event stream.
   *
   * @param url     The endpoint URL.
   * @param options The HTTP options to send with the request.
   *
   * @return An `Observable` of all the `HttpEvent`s for the request, with a response
   * body in the requested type.
   */
  delete<T>(
    url: string,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      observe: 'events';
      context?: HttpContext;
      params?:
        | HttpParams
        | Record<
            string,
            string | number | boolean | (string | number | boolean)[]
          >;
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      timeout?: number;
      body?: any | null;
    }
  ): Observable<HttpEvent<T>>;
  /**
   * Constructs a `DELETE` request that interprets the body as an `ArrayBuffer` and returns
   *  the full `HttpResponse`.
   *
   * @param url     The endpoint URL.
   * @param options The HTTP options to send with the request.
   *
   * @return An `Observable` of the full `HttpResponse`, with the response body as an `ArrayBuffer`.
   */
  delete(
    url: string,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      observe: 'response';
      context?: HttpContext;
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType: 'arraybuffer';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      timeout?: number;
      body?: any | null;
    }
  ): Observable<HttpResponse<ArrayBuffer>>;
  /**
   * Constructs a `DELETE` request that interprets the body as a `Blob` and returns the full
   * `HttpResponse`.
   *
   * @param url     The endpoint URL.
   * @param options The HTTP options to send with the request.
   *
   * @return An `Observable` of the `HttpResponse`, with the response body of type `Blob`.
   */
  delete(
    url: string,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      observe: 'response';
      context?: HttpContext;
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType: 'blob';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      timeout?: number;
      body?: any | null;
    }
  ): Observable<HttpResponse<Blob>>;
  /**
   * Constructs a `DELETE` request that interprets the body as a text stream and
   *  returns the full `HttpResponse`.
   *
   * @param url     The endpoint URL.
   * @param options The HTTP options to send with the request.
   *
   * @return An `Observable` of the full `HttpResponse`, with the response body of type string.
   */
  delete(
    url: string,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      observe: 'response';
      context?: HttpContext;
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType: 'text';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      timeout?: number;
      body?: any | null;
    }
  ): Observable<HttpResponse<string>>;
  /**
   * Constructs a `DELETE` request the interprets the body as a JavaScript object and returns
   * the full `HttpResponse`.
   *
   * @param url     The endpoint URL.
   * @param options The HTTP options to send with the request.
   *
   * @return An `Observable` of the `HttpResponse`, with the response body of type `Object`.
   *
   */
  delete(
    url: string,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      observe: 'response';
      context?: HttpContext;
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      timeout?: number;
      body?: any | null;
    }
  ): Observable<HttpResponse<Object>>;
  /**
   * Constructs a `DELETE` request that interprets the body as JSON
   * and returns the full `HttpResponse`.
   *
   * @param url     The endpoint URL.
   * @param options The HTTP options to send with the request.
   *
   * @return An `Observable` of the `HttpResponse`, with the response body of the requested type.
   */
  delete<T>(
    url: string,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      observe: 'response';
      context?: HttpContext;
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      timeout?: number;
      body?: any | null;
    }
  ): Observable<HttpResponse<T>>;
  /**
   * Constructs a `DELETE` request that interprets the body as JSON and
   * returns the response body as an object parsed from JSON.
   *
   * @param url     The endpoint URL.
   * @param options The HTTP options to send with the request.
   *
   * @return An `Observable` of the response, with the response body of type `Object`.
   */
  delete(
    url: string,
    options?: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      context?: HttpContext;
      observe?: 'body';
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      timeout?: number;
      body?: any | null;
    }
  ): Observable<Object>;
  /**
   * Constructs a DELETE request that interprets the body as JSON and returns
   * the response in a given type.
   *
   * @param url     The endpoint URL.
   * @param options The HTTP options to send with the request.
   *
   * @return An `Observable` of the `HttpResponse`, with response body in the requested type.
   */
  delete<T>(
    url: string,
    options?: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      context?: HttpContext;
      observe?: 'body';
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      timeout?: number;
      body?: any | null;
    }
  ): Observable<T>;
  /** Constructs a `DELETE` request and returns the response body in a given type. */
  public delete<T>(url: string, params?: any): Observable<any> {
    return this.http.delete<T>(url, {
      ...params,
      headers: this.getAuthHeader({
        method: 'DELETE',
        url,
        options: {
          headers: params?.headers,
          params: params?.params,
        },
      }),
    });
  }

  /**
   * Constructs a `GET` request that interprets the body as an `ArrayBuffer` and returns the
   * response in an `ArrayBuffer`.
   *
   * @param url     The endpoint URL.
   * @param options The HTTP options to send with the request.
   *
   * @return An `Observable` of the response, with the response body as an `ArrayBuffer`.
   */
  get(
    url: string,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      context?: HttpContext;
      observe?: 'body';
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType: 'arraybuffer';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      transferCache?:
        | {
            includeHeaders?: string[];
          }
        | boolean;
      timeout?: number;
    }
  ): Observable<ArrayBuffer>;

  /**
   * Constructs a `GET` request that interprets the body as a `Blob`
   * and returns the response as a `Blob`.
   *
   * @param url     The endpoint URL.
   * @param options The HTTP options to send with the request.
   *
   * @return An `Observable` of the response, with the response body as a `Blob`.
   */
  get(
    url: string,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      context?: HttpContext;
      observe?: 'body';
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType: 'blob';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      transferCache?:
        | {
            includeHeaders?: string[];
          }
        | boolean;
      timeout?: number;
    }
  ): Observable<Blob>;
  /**
   * Constructs a `GET` request that interprets the body as a text string
   * and returns the response as a string value.
   *
   * @param url     The endpoint URL.
   * @param options The HTTP options to send with the request.
   *
   * @return An `Observable` of the response, with the response body of type string.
   */
  get(
    url: string,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      context?: HttpContext;
      observe?: 'body';
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType: 'text';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      transferCache?:
        | {
            includeHeaders?: string[];
          }
        | boolean;
      timeout?: number;
    }
  ): Observable<string>;
  /**
   * Constructs a `GET` request that interprets the body as an `ArrayBuffer` and returns
   *  the full event stream.
   *
   * @param url     The endpoint URL.
   * @param options The HTTP options to send with the request.
   *
   * @return An `Observable` of all `HttpEvent`s for the request, with the response
   * body as an `ArrayBuffer`.
   */
  get(
    url: string,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      observe: 'events';
      context?: HttpContext;
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType: 'arraybuffer';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      transferCache?:
        | {
            includeHeaders?: string[];
          }
        | boolean;
      timeout?: number;
    }
  ): Observable<HttpEvent<ArrayBuffer>>;
  /**
   * Constructs a `GET` request that interprets the body as a `Blob` and
   * returns the full event stream.
   *
   * @param url     The endpoint URL.
   * @param options The HTTP options to send with the request.
   *
   * @return An `Observable` of the response, with the response body as a `Blob`.
   */
  get(
    url: string,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      observe: 'events';
      context?: HttpContext;
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType: 'blob';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      transferCache?:
        | {
            includeHeaders?: string[];
          }
        | boolean;
      timeout?: number;
    }
  ): Observable<HttpEvent<Blob>>;
  /**
   * Constructs a `GET` request that interprets the body as a text string and returns
   * the full event stream.
   *
   * @param url     The endpoint URL.
   * @param options The HTTP options to send with the request.
   *
   * @return An `Observable` of the response, with the response body of type string.
   */
  get(
    url: string,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      observe: 'events';
      context?: HttpContext;
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType: 'text';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      transferCache?:
        | {
            includeHeaders?: string[];
          }
        | boolean;
      timeout?: number;
    }
  ): Observable<HttpEvent<string>>;
  /**
   * Constructs a `GET` request that interprets the body as JSON
   * and returns the full event stream.
   *
   * @param url     The endpoint URL.
   * @param options The HTTP options to send with the request.
   *
   * @return An `Observable` of the response, with the response body of type `Object`.
   */
  get(
    url: string,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      observe: 'events';
      context?: HttpContext;
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      transferCache?:
        | {
            includeHeaders?: string[];
          }
        | boolean;
      timeout?: number;
    }
  ): Observable<HttpEvent<Object>>;
  /**
   * Constructs a `GET` request that interprets the body as JSON and returns the full
   * event stream.
   *
   * @param url     The endpoint URL.
   * @param options The HTTP options to send with the request.
   *
   * @return An `Observable` of the response, with a response body in the requested type.
   */
  get<T>(
    url: string,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      observe: 'events';
      context?: HttpContext;
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      transferCache?:
        | {
            includeHeaders?: string[];
          }
        | boolean;
      timeout?: number;
    }
  ): Observable<HttpEvent<T>>;
  /**
   * Constructs a `GET` request that interprets the body as an `ArrayBuffer` and
   * returns the full `HttpResponse`.
   *
   * @param url     The endpoint URL.
   * @param options The HTTP options to send with the request.
   *
   * @return An `Observable` of the `HttpResponse` for the request,
   * with the response body as an `ArrayBuffer`.
   */
  get(
    url: string,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      observe: 'response';
      context?: HttpContext;
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType: 'arraybuffer';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      transferCache?:
        | {
            includeHeaders?: string[];
          }
        | boolean;
      timeout?: number;
    }
  ): Observable<HttpResponse<ArrayBuffer>>;
  /**
   * Constructs a `GET` request that interprets the body as a `Blob` and
   * returns the full `HttpResponse`.
   *
   * @param url     The endpoint URL.
   * @param options The HTTP options to send with the request.
   *
   * @return An `Observable` of the `HttpResponse` for the request,
   * with the response body as a `Blob`.
   */
  get(
    url: string,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      observe: 'response';
      context?: HttpContext;
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType: 'blob';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      transferCache?:
        | {
            includeHeaders?: string[];
          }
        | boolean;
      timeout?: number;
    }
  ): Observable<HttpResponse<Blob>>;
  /**
   * Constructs a `GET` request that interprets the body as a text stream and
   * returns the full `HttpResponse`.
   *
   * @param url     The endpoint URL.
   * @param options The HTTP options to send with the request.
   *
   * @return An `Observable` of the `HttpResponse` for the request,
   * with the response body of type string.
   */
  get(
    url: string,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      observe: 'response';
      context?: HttpContext;
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType: 'text';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      transferCache?:
        | {
            includeHeaders?: string[];
          }
        | boolean;
      timeout?: number;
    }
  ): Observable<HttpResponse<string>>;
  /**
   * Constructs a `GET` request that interprets the body as JSON and
   * returns the full `HttpResponse`.
   *
   * @param url     The endpoint URL.
   * @param options The HTTP options to send with the request.
   *
   * @return An `Observable` of the full `HttpResponse`,
   * with the response body of type `Object`.
   */
  get(
    url: string,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      observe: 'response';
      context?: HttpContext;
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      transferCache?:
        | {
            includeHeaders?: string[];
          }
        | boolean;
      timeout?: number;
    }
  ): Observable<HttpResponse<Object>>;
  /**
   * Constructs a `GET` request that interprets the body as JSON and
   * returns the full `HttpResponse`.
   *
   * @param url     The endpoint URL.
   * @param options The HTTP options to send with the request.
   *
   * @return An `Observable` of the full `HttpResponse` for the request,
   * with a response body in the requested type.
   */
  get<T>(
    url: string,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      observe: 'response';
      context?: HttpContext;
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      transferCache?:
        | {
            includeHeaders?: string[];
          }
        | boolean;
      timeout?: number;
    }
  ): Observable<HttpResponse<T>>;
  /**
   * Constructs a `GET` request that interprets the body as JSON and
   * returns the response body as an object parsed from JSON.
   *
   * @param url     The endpoint URL.
   * @param options The HTTP options to send with the request.
   *
   *
   * @return An `Observable` of the response body as a JavaScript object.
   */
  get(
    url: string,
    options?: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      context?: HttpContext;
      observe?: 'body';
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      transferCache?:
        | {
            includeHeaders?: string[];
          }
        | boolean;
      timeout?: number;
    }
  ): Observable<Object>;
  /**
   * Constructs a `GET` request that interprets the body as JSON and returns
   * the response body in a given type.
   *
   * @param url     The endpoint URL.
   * @param options The HTTP options to send with the request.
   *
   * @return An `Observable` of the `HttpResponse`, with a response body in the requested type.
   */
  get<T>(
    url: string,
    options?: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      context?: HttpContext;
      observe?: 'body';
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      transferCache?:
        | {
            includeHeaders?: string[];
          }
        | boolean;
      timeout?: number;
    }
  ): Observable<T>;
  /** Constructs a `GET` request and returns the response body in a given type. */
  public get<T>(url: string, params: any = {}): Observable<any> {
    return this.http.get<T>(url, {
      ...params,
      headers: this.getAuthHeader({
        method: 'GET',
        url,
        options: {
          headers: params?.headers,
          params: params?.params,
        },
      }),
    });
  }

  /**
   * Constructs a `PATCH` request that interprets the body as an `ArrayBuffer` and returns
   * the response as an `ArrayBuffer`.
   *
   * @param url The endpoint URL.
   * @param body The resources to edit.
   * @param options HTTP options.
   *
   * @return An `Observable` of the response, with the response body as an `ArrayBuffer`.
   */
  patch(
    url: string,
    body: any | null,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      context?: HttpContext;
      observe?: 'body';
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType: 'arraybuffer';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      timeout?: number;
    }
  ): Observable<ArrayBuffer>;
  /**
   * Constructs a `PATCH` request that interprets the body as a `Blob` and returns the response
   * as a `Blob`.
   *
   * @param url The endpoint URL.
   * @param body The resources to edit.
   * @param options HTTP options.
   *
   * @return An `Observable` of the response, with the response body as a `Blob`.
   */
  patch(
    url: string,
    body: any | null,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      context?: HttpContext;
      observe?: 'body';
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType: 'blob';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      timeout?: number;
    }
  ): Observable<Blob>;
  /**
   * Constructs a `PATCH` request that interprets the body as a text string and
   * returns the response as a string value.
   *
   * @param url The endpoint URL.
   * @param body The resources to edit.
   * @param options HTTP options.
   *
   * @return An `Observable` of the response, with a response body of type string.
   */
  patch(
    url: string,
    body: any | null,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      context?: HttpContext;
      observe?: 'body';
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType: 'text';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      timeout?: number;
    }
  ): Observable<string>;
  /**
   * Constructs a `PATCH` request that interprets the body as an `ArrayBuffer` and
   *  returns the full event stream.
   *
   * @param url The endpoint URL.
   * @param body The resources to edit.
   * @param options HTTP options.
   *
   * @return An `Observable` of all the `HttpEvent`s for the request,
   * with the response body as an `ArrayBuffer`.
   */
  patch(
    url: string,
    body: any | null,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      observe: 'events';
      context?: HttpContext;
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType: 'arraybuffer';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      timeout?: number;
    }
  ): Observable<HttpEvent<ArrayBuffer>>;
  /**
   * Constructs a `PATCH` request that interprets the body as a `Blob`
   *  and returns the full event stream.
   *
   * @param url The endpoint URL.
   * @param body The resources to edit.
   * @param options HTTP options.
   *
   * @return An `Observable` of all the `HttpEvent`s for the request, with the
   * response body as `Blob`.
   */
  patch(
    url: string,
    body: any | null,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      observe: 'events';
      context?: HttpContext;
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType: 'blob';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      timeout?: number;
    }
  ): Observable<HttpEvent<Blob>>;
  /**
   * Constructs a `PATCH` request that interprets the body as a text string and
   * returns the full event stream.
   *
   * @param url The endpoint URL.
   * @param body The resources to edit.
   * @param options HTTP options.
   *
   * @return An `Observable` of all the `HttpEvent`s for the request, with a
   * response body of type string.
   */
  patch(
    url: string,
    body: any | null,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      observe: 'events';
      context?: HttpContext;
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType: 'text';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      timeout?: number;
    }
  ): Observable<HttpEvent<string>>;
  /**
   * Constructs a `PATCH` request that interprets the body as JSON
   * and returns the full event stream.
   *
   * @param url The endpoint URL.
   * @param body The resources to edit.
   * @param options HTTP options.
   *
   * @return An `Observable` of all the `HttpEvent`s for the request,
   * with a response body of type `Object`.
   */
  patch(
    url: string,
    body: any | null,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      observe: 'events';
      context?: HttpContext;
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      timeout?: number;
    }
  ): Observable<HttpEvent<Object>>;
  /**
   * Constructs a `PATCH` request that interprets the body as JSON
   * and returns the full event stream.
   *
   * @param url The endpoint URL.
   * @param body The resources to edit.
   * @param options HTTP options.
   *
   * @return An `Observable` of all the `HttpEvent`s for the request,
   * with a response body in the requested type.
   */
  patch<T>(
    url: string,
    body: any | null,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      observe: 'events';
      context?: HttpContext;
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      timeout?: number;
    }
  ): Observable<HttpEvent<T>>;
  /**
   * Constructs a `PATCH` request that interprets the body as an `ArrayBuffer`
   *  and returns the full `HttpResponse`.
   *
   * @param url The endpoint URL.
   * @param body The resources to edit.
   * @param options HTTP options.
   *
   * @return  An `Observable` of the `HttpResponse` for the request,
   * with the response body as an `ArrayBuffer`.
   */
  patch(
    url: string,
    body: any | null,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      observe: 'response';
      context?: HttpContext;
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType: 'arraybuffer';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      timeout?: number;
    }
  ): Observable<HttpResponse<ArrayBuffer>>;
  /**
   * Constructs a `PATCH` request that interprets the body as a `Blob` and returns the full
   * `HttpResponse`.
   *
   * @param url The endpoint URL.
   * @param body The resources to edit.
   * @param options HTTP options.
   *
   * @return  An `Observable` of the `HttpResponse` for the request,
   * with the response body as a `Blob`.
   */
  patch(
    url: string,
    body: any | null,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      observe: 'response';
      context?: HttpContext;
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType: 'blob';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      timeout?: number;
    }
  ): Observable<HttpResponse<Blob>>;
  /**
   * Constructs a `PATCH` request that interprets the body as a text stream and returns the
   * full `HttpResponse`.
   *
   * @param url The endpoint URL.
   * @param body The resources to edit.
   * @param options HTTP options.
   *
   * @return  An `Observable` of the `HttpResponse` for the request,
   * with a response body of type string.
   */
  patch(
    url: string,
    body: any | null,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      observe: 'response';
      context?: HttpContext;
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType: 'text';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      timeout?: number;
    }
  ): Observable<HttpResponse<string>>;
  /**
   * Constructs a `PATCH` request that interprets the body as JSON
   * and returns the full `HttpResponse`.
   *
   * @param url The endpoint URL.
   * @param body The resources to edit.
   * @param options HTTP options.
   *
   * @return An `Observable` of the `HttpResponse` for the request,
   * with a response body in the requested type.
   */
  patch(
    url: string,
    body: any | null,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      observe: 'response';
      context?: HttpContext;
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      timeout?: number;
    }
  ): Observable<HttpResponse<Object>>;
  /**
   * Constructs a `PATCH` request that interprets the body as JSON
   * and returns the full `HttpResponse`.
   *
   * @param url The endpoint URL.
   * @param body The resources to edit.
   * @param options HTTP options.
   *
   * @return An `Observable` of the `HttpResponse` for the request,
   * with a response body in the given type.
   */
  patch<T>(
    url: string,
    body: any | null,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      observe: 'response';
      context?: HttpContext;
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      timeout?: number;
    }
  ): Observable<HttpResponse<T>>;
  /**
  
     * Constructs a `PATCH` request that interprets the body as JSON and
     * returns the response body as an object parsed from JSON.
     *
     * @param url The endpoint URL.
     * @param body The resources to edit.
     * @param options HTTP options.
     *
     * @return An `Observable` of the response, with the response body as an object parsed from JSON.
     */
  patch(
    url: string,
    body: any | null,
    options?: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      context?: HttpContext;
      observe?: 'body';
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      timeout?: number;
    }
  ): Observable<Object>;
  /**
   * Constructs a `PATCH` request that interprets the body as JSON
   * and returns the response in a given type.
   *
   * @param url The endpoint URL.
   * @param body The resources to edit.
   * @param options HTTP options.
   *
   * @return  An `Observable` of the `HttpResponse` for the request,
   * with a response body in the given type.
   */
  patch<T>(
    url: string,
    body: any | null,
    options?: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      context?: HttpContext;
      observe?: 'body';
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      timeout?: number;
    }
  ): Observable<T>;
  /** Constructs a `PATCH` request and returns the response body in a given type. */
  public patch<T>(url: string, body?: any, params?: any): Observable<any> {
    return this.http.patch<T>(url, body, {
      ...params,
      headers: this.getAuthHeader({
        method: 'PATCH',
        url,
        options: {
          headers: params?.headers,
          params: params?.params,
        },
      }),
    });
  }

  /**
   * Constructs a `POST` request that interprets the body as an `ArrayBuffer` and returns
   * an `ArrayBuffer`.
   *
   * @param url The endpoint URL.
   * @param body The content to replace with.
   * @param options HTTP options.
   *
   * @return An `Observable` of the response, with the response body as an `ArrayBuffer`.
   */
  post(
    url: string,
    body: any | null,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      context?: HttpContext;
      observe?: 'body';
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType: 'arraybuffer';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      transferCache?:
        | {
            includeHeaders?: string[];
          }
        | boolean;
      timeout?: number;
    }
  ): Observable<ArrayBuffer>;
  /**
   * Constructs a `POST` request that interprets the body as a `Blob` and returns the
   * response as a `Blob`.
   *
   * @param url The endpoint URL.
   * @param body The content to replace with.
   * @param options HTTP options
   *
   * @return An `Observable` of the response, with the response body as a `Blob`.
   */
  post(
    url: string,
    body: any | null,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      context?: HttpContext;
      observe?: 'body';
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType: 'blob';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      transferCache?:
        | {
            includeHeaders?: string[];
          }
        | boolean;
      timeout?: number;
    }
  ): Observable<Blob>;
  /**
   * Constructs a `POST` request that interprets the body as a text string and
   * returns the response as a string value.
   *
   * @param url The endpoint URL.
   * @param body The content to replace with.
   * @param options HTTP options
   *
   * @return An `Observable` of the response, with a response body of type string.
   */
  post(
    url: string,
    body: any | null,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      context?: HttpContext;
      observe?: 'body';
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType: 'text';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      transferCache?:
        | {
            includeHeaders?: string[];
          }
        | boolean;
      timeout?: number;
    }
  ): Observable<string>;
  /**
   * Constructs a `POST` request that interprets the body as an `ArrayBuffer` and
   * returns the full event stream.
   *
   * @param url The endpoint URL.
   * @param body The content to replace with.
   * @param options HTTP options
   *
   * @return An `Observable` of all `HttpEvent`s for the request,
   * with the response body as an `ArrayBuffer`.
   */
  post(
    url: string,
    body: any | null,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      observe: 'events';
      context?: HttpContext;
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType: 'arraybuffer';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      transferCache?:
        | {
            includeHeaders?: string[];
          }
        | boolean;
      timeout?: number;
    }
  ): Observable<HttpEvent<ArrayBuffer>>;
  /**
   * Constructs a `POST` request that interprets the body as a `Blob`
   * and returns the response in an observable of the full event stream.
   *
   * @param url The endpoint URL.
   * @param body The content to replace with.
   * @param options HTTP options
   *
   * @return An `Observable` of all `HttpEvent`s for the request, with the response body as `Blob`.
   */
  post(
    url: string,
    body: any | null,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      observe: 'events';
      context?: HttpContext;
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType: 'blob';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      transferCache?:
        | {
            includeHeaders?: string[];
          }
        | boolean;
      timeout?: number;
    }
  ): Observable<HttpEvent<Blob>>;
  /**
   * Constructs a `POST` request that interprets the body as a text string and returns the full
   * event stream.
   *
   * @param url The endpoint URL.
   * @param body The content to replace with.
   * @param options HTTP options
   *
   * @return  An `Observable` of all `HttpEvent`s for the request,
   * with a response body of type string.
   */
  post(
    url: string,
    body: any | null,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      observe: 'events';
      context?: HttpContext;
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType: 'text';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      transferCache?:
        | {
            includeHeaders?: string[];
          }
        | boolean;
      timeout?: number;
    }
  ): Observable<HttpEvent<string>>;
  /**
   * Constructs a POST request that interprets the body as JSON and returns the full
   * event stream.
   *
   * @param url The endpoint URL.
   * @param body The content to replace with.
   * @param options HTTP options
   *
   * @return  An `Observable` of all `HttpEvent`s for the request,
   * with a response body of type `Object`.
   */
  post(
    url: string,
    body: any | null,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      observe: 'events';
      context?: HttpContext;
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      transferCache?:
        | {
            includeHeaders?: string[];
          }
        | boolean;
      timeout?: number;
    }
  ): Observable<HttpEvent<Object>>;
  /**
   * Constructs a POST request that interprets the body as JSON and returns the full
   * event stream.
   *
   * @param url The endpoint URL.
   * @param body The content to replace with.
   * @param options HTTP options
   *
   * @return An `Observable` of all `HttpEvent`s for the request,
   * with a response body in the requested type.
   */
  post<T>(
    url: string,
    body: any | null,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      observe: 'events';
      context?: HttpContext;
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      transferCache?:
        | {
            includeHeaders?: string[];
          }
        | boolean;
      timeout?: number;
    }
  ): Observable<HttpEvent<T>>;
  /**
   * Constructs a POST request that interprets the body as an `ArrayBuffer`
   *  and returns the full `HttpResponse`.
   *
   * @param url The endpoint URL.
   * @param body The content to replace with.
   * @param options HTTP options
   *
   * @return  An `Observable` of the `HttpResponse` for the request, with the response body as an
   * `ArrayBuffer`.
   */
  post(
    url: string,
    body: any | null,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      observe: 'response';
      context?: HttpContext;
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType: 'arraybuffer';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      transferCache?:
        | {
            includeHeaders?: string[];
          }
        | boolean;
      timeout?: number;
    }
  ): Observable<HttpResponse<ArrayBuffer>>;
  /**
   * Constructs a `POST` request that interprets the body as a `Blob` and returns the full
   * `HttpResponse`.
   *
   * @param url The endpoint URL.
   * @param body The content to replace with.
   * @param options HTTP options
   *
   * @return An `Observable` of the `HttpResponse` for the request,
   * with the response body as a `Blob`.
   */
  post(
    url: string,
    body: any | null,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      observe: 'response';
      context?: HttpContext;
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType: 'blob';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      transferCache?:
        | {
            includeHeaders?: string[];
          }
        | boolean;
      timeout?: number;
    }
  ): Observable<HttpResponse<Blob>>;
  /**
   * Constructs a `POST` request that interprets the body as a text stream and returns
   * the full `HttpResponse`.
   *
   * @param url The endpoint URL.
   * @param body The content to replace with.
   * @param options HTTP options
   *
   * @return  An `Observable` of the `HttpResponse` for the request,
   * with a response body of type string.
   */
  post(
    url: string,
    body: any | null,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      observe: 'response';
      context?: HttpContext;
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType: 'text';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      transferCache?:
        | {
            includeHeaders?: string[];
          }
        | boolean;
      timeout?: number;
    }
  ): Observable<HttpResponse<string>>;
  /**
   * Constructs a `POST` request that interprets the body as JSON
   * and returns the full `HttpResponse`.
   *
   * @param url The endpoint URL.
   * @param body The content to replace with.
   * @param options HTTP options
   *
   * @return An `Observable` of the `HttpResponse` for the request, with a response body of type
   * `Object`.
   */
  post(
    url: string,
    body: any | null,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      observe: 'response';
      context?: HttpContext;
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      transferCache?:
        | {
            includeHeaders?: string[];
          }
        | boolean;
      timeout?: number;
    }
  ): Observable<HttpResponse<Object>>;
  /**
   * Constructs a `POST` request that interprets the body as JSON and returns the
   * full `HttpResponse`.
   *
   *
   * @param url The endpoint URL.
   * @param body The content to replace with.
   * @param options HTTP options
   *
   * @return An `Observable` of the `HttpResponse` for the request, with a response body in the
   * requested type.
   */
  post<T>(
    url: string,
    body: any | null,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      observe: 'response';
      context?: HttpContext;
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      transferCache?:
        | {
            includeHeaders?: string[];
          }
        | boolean;
      timeout?: number;
    }
  ): Observable<HttpResponse<T>>;
  /**
   * Constructs a `POST` request that interprets the body as JSON
   * and returns the response body as an object parsed from JSON.
   *
   * @param url The endpoint URL.
   * @param body The content to replace with.
   * @param options HTTP options
   *
   * @return An `Observable` of the response, with the response body as an object parsed from JSON.
   */
  post(
    url: string,
    body: any | null,
    options?: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      context?: HttpContext;
      observe?: 'body';
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      transferCache?:
        | {
            includeHeaders?: string[];
          }
        | boolean;
      timeout?: number;
    }
  ): Observable<Object>;
  /**
   * Constructs a `POST` request that interprets the body as JSON
   * and returns an observable of the response.
   *
   * @param url The endpoint URL.
   * @param body The content to replace with.
   * @param options HTTP options
   *
   * @return  An `Observable` of the `HttpResponse` for the request, with a response body in the
   * requested type.
   */
  post<T>(
    url: string,
    body: any | null,
    options?: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      context?: HttpContext;
      observe?: 'body';
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      transferCache?:
        | {
            includeHeaders?: string[];
          }
        | boolean;
      timeout?: number;
    }
  ): Observable<T>;
  /** Constructs a `POST` request and returns the response body in a given type. */
  public post<T>(url: string, body?: any, params?: any): Observable<any> {
    return this.http.post<T>(url, body, {
      ...params,
      headers: this.getAuthHeader({
        method: 'POST',
        url,
        options: {
          headers: params?.headers,
          params: params?.params,
        },
      }),
    });
  }

  /**
   * Constructs a `PUT` request that interprets the body as an `ArrayBuffer` and returns the
   * response as an `ArrayBuffer`.
   *
   * @param url The endpoint URL.
   * @param body The resources to add/update.
   * @param options HTTP options
   *
   * @return An `Observable` of the response, with the response body as an `ArrayBuffer`.
   */
  put(
    url: string,
    body: any | null,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      context?: HttpContext;
      observe?: 'body';
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType: 'arraybuffer';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      timeout?: number;
    }
  ): Observable<ArrayBuffer>;
  /**
   * Constructs a `PUT` request that interprets the body as a `Blob` and returns
   * the response as a `Blob`.
   *
   * @param url The endpoint URL.
   * @param body The resources to add/update.
   * @param options HTTP options
   *
   * @return An `Observable` of the response, with the response body as a `Blob`.
   */
  put(
    url: string,
    body: any | null,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      context?: HttpContext;
      observe?: 'body';
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType: 'blob';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      timeout?: number;
    }
  ): Observable<Blob>;
  /**
   * Constructs a `PUT` request that interprets the body as a text string and
   * returns the response as a string value.
   *
   * @param url The endpoint URL.
   * @param body The resources to add/update.
   * @param options HTTP options
   *
   * @return An `Observable` of the response, with a response body of type string.
   */
  put(
    url: string,
    body: any | null,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      context?: HttpContext;
      observe?: 'body';
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType: 'text';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      timeout?: number;
    }
  ): Observable<string>;
  /**
   * Constructs a `PUT` request that interprets the body as an `ArrayBuffer` and
   * returns the full event stream.
   *
   * @param url The endpoint URL.
   * @param body The resources to add/update.
   * @param options HTTP options
   *
   * @return An `Observable` of all `HttpEvent`s for the request,
   * with the response body as an `ArrayBuffer`.
   */
  put(
    url: string,
    body: any | null,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      observe: 'events';
      context?: HttpContext;
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType: 'arraybuffer';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      timeout?: number;
    }
  ): Observable<HttpEvent<ArrayBuffer>>;
  /**
   * Constructs a `PUT` request that interprets the body as a `Blob` and returns the full event
   * stream.
   *
   * @param url The endpoint URL.
   * @param body The resources to add/update.
   * @param options HTTP options
   *
   * @return An `Observable` of all `HttpEvent`s for the request,
   * with the response body as a `Blob`.
   */
  put(
    url: string,
    body: any | null,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      observe: 'events';
      context?: HttpContext;
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType: 'blob';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      timeout?: number;
    }
  ): Observable<HttpEvent<Blob>>;
  /**
   * Constructs a `PUT` request that interprets the body as a text string and returns the full event
   * stream.
   *
   * @param url The endpoint URL.
   * @param body The resources to add/update.
   * @param options HTTP options
   *
   * @return An `Observable` of all `HttpEvent`s for the request, with a response body
   * of type string.
   */
  put(
    url: string,
    body: any | null,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      observe: 'events';
      context?: HttpContext;
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType: 'text';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      timeout?: number;
    }
  ): Observable<HttpEvent<string>>;
  /**
   * Constructs a `PUT` request that interprets the body as JSON and returns the full
   * event stream.
   *
   * @param url The endpoint URL.
   * @param body The resources to add/update.
   * @param options HTTP options
   *
   * @return An `Observable` of all `HttpEvent`s for the request, with a response body of
   * type `Object`.
   */
  put(
    url: string,
    body: any | null,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      observe: 'events';
      context?: HttpContext;
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      timeout?: number;
    }
  ): Observable<HttpEvent<Object>>;
  /**
   * Constructs a `PUT` request that interprets the body as JSON and returns the
   * full event stream.
   *
   * @param url The endpoint URL.
   * @param body The resources to add/update.
   * @param options HTTP options
   *
   * @return An `Observable` of all `HttpEvent`s for the request,
   * with a response body in the requested type.
   */
  put<T>(
    url: string,
    body: any | null,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      observe: 'events';
      context?: HttpContext;
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      timeout?: number;
    }
  ): Observable<HttpEvent<T>>;
  /**
   * Constructs a `PUT` request that interprets the body as an
   * `ArrayBuffer` and returns an observable of the full HTTP response.
   *
   * @param url The endpoint URL.
   * @param body The resources to add/update.
   * @param options HTTP options
   *
   * @return An `Observable` of the `HttpResponse` for the request, with the response body as an
   * `ArrayBuffer`.
   */
  put(
    url: string,
    body: any | null,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      observe: 'response';
      context?: HttpContext;
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType: 'arraybuffer';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      timeout?: number;
    }
  ): Observable<HttpResponse<ArrayBuffer>>;
  /**
   * Constructs a `PUT` request that interprets the body as a `Blob` and returns the
   * full HTTP response.
   *
   * @param url The endpoint URL.
   * @param body The resources to add/update.
   * @param options HTTP options
   *
   * @return An `Observable` of the `HttpResponse` for the request,
   * with the response body as a `Blob`.
   */
  put(
    url: string,
    body: any | null,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      observe: 'response';
      context?: HttpContext;
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType: 'blob';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      timeout?: number;
    }
  ): Observable<HttpResponse<Blob>>;
  /**
   * Constructs a `PUT` request that interprets the body as a text stream and returns the
   * full HTTP response.
   *
   * @param url The endpoint URL.
   * @param body The resources to add/update.
   * @param options HTTP options
   *
   * @return An `Observable` of the `HttpResponse` for the request, with a response body of type
   * string.
   */
  put(
    url: string,
    body: any | null,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      observe: 'response';
      context?: HttpContext;
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType: 'text';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      timeout?: number;
    }
  ): Observable<HttpResponse<string>>;
  /**
   * Constructs a `PUT` request that interprets the body as JSON and returns the full
   * HTTP response.
   *
   * @param url The endpoint URL.
   * @param body The resources to add/update.
   * @param options HTTP options
   *
   * @return An `Observable` of the `HttpResponse` for the request, with a response body
   * of type 'Object`.
   */
  put(
    url: string,
    body: any | null,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      observe: 'response';
      context?: HttpContext;
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      timeout?: number;
    }
  ): Observable<HttpResponse<Object>>;
  /**
   * Constructs a `PUT` request that interprets the body as an instance of the requested type and
   * returns the full HTTP response.
   *
   * @param url The endpoint URL.
   * @param body The resources to add/update.
   * @param options HTTP options
   *
   * @return An `Observable` of the `HttpResponse` for the request,
   * with a response body in the requested type.
   */
  put<T>(
    url: string,
    body: any | null,
    options: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      observe: 'response';
      context?: HttpContext;
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      timeout?: number;
    }
  ): Observable<HttpResponse<T>>;
  /**
   * Constructs a `PUT` request that interprets the body as JSON
   * and returns an observable of JavaScript object.
   *
   * @param url The endpoint URL.
   * @param body The resources to add/update.
   * @param options HTTP options
   *
   * @return An `Observable` of the response as a JavaScript object.
   */
  put(
    url: string,
    body: any | null,
    options?: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      context?: HttpContext;
      observe?: 'body';
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      timeout?: number;
    }
  ): Observable<Object>;
  /**
   * Constructs a `PUT` request that interprets the body as an instance of the requested type
   * and returns an observable of the requested type.
   *
   * @param url The endpoint URL.
   * @param body The resources to add/update.
   * @param options HTTP options
   *
   * @return An `Observable` of the requested type.
   */
  put<T>(
    url: string,
    body: any | null,
    options?: {
      headers?: HttpHeaders | Record<string, string | string[]>;
      context?: HttpContext;
      observe?: 'body';
      params?:
        | HttpParams
        | Record<
            string,
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>
          >;
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
      credentials?: RequestCredentials;
      keepalive?: boolean;
      priority?: RequestPriority;
      cache?: RequestCache;
      mode?: RequestMode;
      redirect?: RequestRedirect;
      referrer?: string;
      integrity?: string;
      timeout?: number;
    }
  ): Observable<T>;
  /** Constructs a `PUT` request and returns the response body in a given type. */
  public put<T>(url: string, body?: any, params?: any): Observable<any> {
    return this.http.put<T>(url, body, {
      ...params,
      headers: this.getAuthHeader({
        method: 'PUT',
        url,
        options: {
          headers: params?.headers,
          params: params?.params,
        },
      }),
    });
  }
}
