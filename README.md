<!-- @format -->

# Fluig API

Fluig API is an Angular service designed to simplify authentication and integration for Fluig platform applications, specifically for developers while developing locally, without the need to constantly build and push to a server to test the Angular app. It provides a wrapper for OAuth-based HTTP request authentication, and environment configuration.

## Key Features

- **OAuth Integration**: Simplifies authentication using OAuth 1.0a.
- **Environment-Specific Configurations**: Easy switching between local and production environments.
- **HTTP Request Handling**: Provides pre-configured methods for GET, POST, DELETE, PUT, and PATCH.
- **Token Management**: Automatic injection of OAuth or Bearer authentication headers.

## Pre-requisites and Dependencies

Ensure the following dependencies are installed:

- [Node.js](https://nodejs.org/) which includes [Node Package Manager](https://www.npmjs.com/get-npm) (or whatever package manager you prefer, like [Yarn](https://yarnpkg.com/) or [PNPM](https://pnpm.io/))
- [Angular](https://angular.dev/) (>= 19.x)

The `package.json` includes the additional peer dependencies:

```jsonc
"peerDependencies": {
  // ...
  "crypto-js": "^4.2.0",
  "oauth-1.0a": "^2.2.6"
}
```

Be sure to install these dependencies as `devDependencies` in your project.

### PNPM

```bash
pnpm install -D crypto-js oauth-1.0a
```

### NPM

```bash
npm install --save-dev crypto-js oauth-1.0a
```

## Installation

To install Fluig API in your Angular project, execute the following command:

### PNPM

```bash
pnpm install fluig-api
```

### NPM

```bash
npm install fluig-api
```

## Configuration

### Environment Variables

Set up the `environment.ts` and `environment.development.ts` file:

```typescript
// environment.development.ts
import { FluigAPIConfig } from 'fluig-api';

type Environment = Record<string, any> & { fluigAPI: FluigAPIConfig };

export const environment = {
  fluigAPI: {
    local: true, // enables token injection. In production, set this to false.
    debug: true,
    url: 'https://your-fluig-server.com',
    endpoints: ['/content-management', '/public', '/api', '/portal'],
    oauth: {
      consumerKey: 'consumer_key',
      consumerSecret: 'consumer_secret',
      accessToken: 'access_token',
      tokenSecret: 'token_secret',
    },
  },
};
```

For **production**, you need to disable local mode, as the app will be served from the Fluig server itself, which already handles authentication:

```typescript
// environment.ts
import { FluigAPIConfig } from 'fluig-api';

type Environment = Record<string, any> & { fluigAPI: FluigAPIConfig };

export const environment = {
  fluigAPI: { local: false },
};
```

### Angular Module Configuration

Add the `FLUIG_API_CONFIG` provider to your `ApplicationConfig`:

```typescript
// app.config.ts
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { environment } from '../environments/environment';
import { provideFluigAPI, fluigAPIInterceptor } from 'fluig-api';

export const appConfig: ApplicationConfig = {
  providers: [
    // You must use `provideFluigAPI(config)`. This allows the package
    // to not use libraries like `crypto-js` and `oauth-1.0a` when not needed.
    provideFluigAPI(environment.fluigAPI),
    // Optionally add the interceptor to the HTTP client
    provideHttpClient(withInterceptors([fluigAPIInterceptor])),
  ],
};
```

## Usage Example

Inject the `FluigAPIService` in your component or service:

```typescript
import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FluigAPIService } from 'fluig-api';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class App implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly fluigAPI = inject(FluigAPIService);

  ngOnInit(): void {
    // Example API call using FluigAPIService
    // With this service, the OAuth headers are automatically added
    this.fluigAPI
      .get('/api/public/2.0/users/getCurrent')
      .subscribe((response) => console.log(response));

    // Example API call using `HttpClient` with `FluigAPI interceptor`.
    // The interceptor automatically adds the `OAuth` headers to the requests.
    // You might be better off using the `FluigAPIService` directly, though.
    // As you will need to manage the endpoints yourself in the environments config.
    this.http
      .get('/api/public/2.0/users/getCurrent')
      .subscribe((response) => console.log(response));
  }
}
```

## Troubleshooting

### Handling CORS Issues

During local development, it's common to face CORS issues when attempting to access the Fluig using relative paths (e.g., `/api`, `/public`, etc.) that happens because the Fluig server is on a different origin than your local development server (e.g., `http://localhost:4200`). This results in blocked requests due to CORS policy restrictions.

A practical solution is to configure a reverse proxy to redirect local requests to the Fluig server. You can set this up using a `proxy.conf.json` file and use it in combination with the `ng serve` command:

```jsonc
// proxy.conf.json
{
  "/api": {
    "target": "https://your-fluig-server.com",
    "secure": true,
    "changeOrigin": true,
    "logLevel": "debug",
  },
}
```

Then, run Angular with:

```bash
ng serve --proxy-config proxy.conf.json
```

You can read more about this in my blog post[^1] and in the Angular documentation[^2].

[^1]: [How to Fix CORS Issues with Fluig Using Reverse Proxy in Angular](https://devoncommand.com/posts/programming/2025/proxy-angular-fluig/)

[^2]: [Proxying to a backend server](https://angular.dev/tools/cli/serve#proxying-to-a-backend-server)

## Contributions

Contributions are welcome! Feel free to fork this repository and submit pull requests.

## Contact Information

For issues or inquiries, please contact the repository owner:

- **Author**: Gabriel Nascimento
- **GitHub**: [gabrielgnsilva](https://github.com/gabrielgnsilva)
- **Issues**: [Report Issues](https://github.com/gabrielgnsilva/fluig-api/issues)
