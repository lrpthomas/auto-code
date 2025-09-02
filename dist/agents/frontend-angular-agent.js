"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class FrontendAngularAgent {
    id = 'frontend-angular-agent';
    name = 'Frontend Angular Agent';
    type = 'frontend';
    capabilities = ['angular', 'typescript', 'rxjs', 'material', 'standalone', 'signals'];
    async initialize() {
        // Initialize Angular-specific resources
    }
    async execute(task) {
        try {
            const { requirements } = task;
            const files = await this.generateAngularApp(requirements);
            return {
                success: true,
                data: {
                    files,
                    framework: 'angular',
                    buildTool: 'ng-cli',
                    stateManagement: 'ngrx',
                    styling: 'angular-material'
                },
                metadata: {
                    generatedFiles: Object.keys(files).length,
                    framework: 'angular',
                    timestamp: new Date().toISOString()
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error in Angular agent'
            };
        }
    }
    async generateAngularApp(requirements) {
        const files = {};
        // Package.json
        files['package.json'] = this.generatePackageJson(requirements);
        // Angular.json
        files['angular.json'] = this.generateAngularJson(requirements);
        // TypeScript config
        files['tsconfig.json'] = this.generateTsConfig();
        files['tsconfig.app.json'] = this.generateAppTsConfig();
        // Index.html
        files['src/index.html'] = this.generateIndexHtml(requirements);
        // Main entry point
        files['src/main.ts'] = this.generateMainTs();
        // App component
        files['src/app/app.component.ts'] = this.generateAppComponent(requirements);
        files['src/app/app.component.html'] = this.generateAppTemplate(requirements);
        files['src/app/app.component.scss'] = this.generateAppStyles();
        // App config
        files['src/app/app.config.ts'] = this.generateAppConfig(requirements);
        // Routes
        files['src/app/app.routes.ts'] = this.generateRoutes(requirements);
        // Components based on features
        this.generateComponents(requirements, files);
        // Services
        this.generateServices(requirements, files);
        // Global styles
        files['src/styles.scss'] = this.generateGlobalStyles();
        return files;
    }
    generatePackageJson(requirements) {
        const appName = requirements.description?.split(' ').slice(0, 3).join('-').toLowerCase().replace(/[^a-z0-9-]/g, '') || 'angular-app';
        return JSON.stringify({
            name: appName,
            version: "0.0.0",
            scripts: {
                ng: "ng",
                start: "ng serve",
                build: "ng build",
                watch: "ng build --watch --configuration development",
                test: "ng test",
                lint: "ng lint"
            },
            private: true,
            dependencies: {
                "@angular/animations": "^17.0.0",
                "@angular/cdk": "^17.0.0",
                "@angular/common": "^17.0.0",
                "@angular/compiler": "^17.0.0",
                "@angular/core": "^17.0.0",
                "@angular/forms": "^17.0.0",
                "@angular/material": "^17.0.0",
                "@angular/platform-browser": "^17.0.0",
                "@angular/platform-browser-dynamic": "^17.0.0",
                "@angular/router": "^17.0.0",
                "@ngrx/store": "^17.0.0",
                "@ngrx/effects": "^17.0.0",
                "@ngrx/store-devtools": "^17.0.0",
                "rxjs": "~7.8.0",
                "tslib": "^2.3.0",
                "zone.js": "~0.14.0"
            },
            devDependencies: {
                "@angular-devkit/build-angular": "^17.0.0",
                "@angular/cli": "^17.0.0",
                "@angular/compiler-cli": "^17.0.0",
                "@types/jasmine": "~5.1.0",
                "@typescript-eslint/eslint-plugin": "^6.0.0",
                "@typescript-eslint/parser": "^6.0.0",
                "eslint": "^8.50.0",
                "jasmine-core": "~5.1.0",
                "karma": "~6.4.0",
                "karma-chrome-headless": "~3.1.0",
                "karma-coverage": "~2.2.0",
                "karma-jasmine": "~5.1.0",
                "karma-jasmine-html-reporter": "~2.1.0",
                "typescript": "~5.2.0"
            }
        }, null, 2);
    }
    generateAngularJson(requirements) {
        const appName = requirements.description?.split(' ').slice(0, 3).join('-').toLowerCase().replace(/[^a-z0-9-]/g, '') || 'angular-app';
        return JSON.stringify({
            "$schema": "./node_modules/@angular/cli/lib/config/schema.json",
            "version": 1,
            "newProjectRoot": "projects",
            "projects": {
                [appName]: {
                    "projectType": "application",
                    "schematics": {
                        "@schematics/angular:component": {
                            "style": "scss",
                            "standalone": true
                        },
                        "@schematics/angular:directive": {
                            "standalone": true
                        },
                        "@schematics/angular:pipe": {
                            "standalone": true
                        }
                    },
                    "root": "",
                    "sourceRoot": "src",
                    "prefix": "app",
                    "architect": {
                        "build": {
                            "builder": "@angular-devkit/build-angular:browser",
                            "options": {
                                "outputPath": "dist",
                                "index": "src/index.html",
                                "main": "src/main.ts",
                                "polyfills": ["zone.js"],
                                "tsConfig": "tsconfig.app.json",
                                "inlineStyleLanguage": "scss",
                                "assets": ["src/favicon.ico", "src/assets"],
                                "styles": ["@angular/material/prebuilt-themes/indigo-pink.css", "src/styles.scss"],
                                "scripts": []
                            },
                            "configurations": {
                                "production": {
                                    "budgets": [
                                        {
                                            "type": "initial",
                                            "maximumWarning": "500kb",
                                            "maximumError": "1mb"
                                        },
                                        {
                                            "type": "anyComponentStyle",
                                            "maximumWarning": "2kb",
                                            "maximumError": "4kb"
                                        }
                                    ],
                                    "outputHashing": "all"
                                },
                                "development": {
                                    "buildOptimizer": false,
                                    "optimization": false,
                                    "vendorChunk": true,
                                    "extractLicenses": false,
                                    "sourceMap": true,
                                    "namedChunks": true
                                }
                            },
                            "defaultConfiguration": "production"
                        },
                        "serve": {
                            "builder": "@angular-devkit/build-angular:dev-server",
                            "configurations": {
                                "production": {
                                    "buildTarget": `${appName}:build:production`
                                },
                                "development": {
                                    "buildTarget": `${appName}:build:development`
                                }
                            },
                            "defaultConfiguration": "development"
                        },
                        "extract-i18n": {
                            "builder": "@angular-devkit/build-angular:extract-i18n",
                            "options": {
                                "buildTarget": `${appName}:build`
                            }
                        },
                        "test": {
                            "builder": "@angular-devkit/build-angular:karma",
                            "options": {
                                "polyfills": ["zone.js", "zone.js/testing"],
                                "tsConfig": "tsconfig.spec.json",
                                "inlineStyleLanguage": "scss",
                                "assets": ["src/favicon.ico", "src/assets"],
                                "styles": ["@angular/material/prebuilt-themes/indigo-pink.css", "src/styles.scss"],
                                "scripts": []
                            }
                        },
                        "lint": {
                            "builder": "@angular-eslint/builder:lint",
                            "options": {
                                "lintFilePatterns": ["src/**/*.ts", "src/**/*.html"]
                            }
                        }
                    }
                }
            }
        }, null, 2);
    }
    generateTsConfig() {
        return JSON.stringify({
            "compileOnSave": false,
            "compilerOptions": {
                "baseUrl": "./",
                "outDir": "./dist/out-tsc",
                "forceConsistentCasingInFileNames": true,
                "strict": true,
                "noImplicitOverride": true,
                "noPropertyAccessFromIndexSignature": true,
                "noImplicitReturns": true,
                "noFallthroughCasesInSwitch": true,
                "sourceMap": true,
                "declaration": false,
                "downlevelIteration": true,
                "experimentalDecorators": true,
                "moduleResolution": "node",
                "importHelpers": true,
                "target": "ES2022",
                "module": "ES2022",
                "useDefineForClassFields": false,
                "lib": ["ES2022", "dom"],
                "paths": {
                    "@/*": ["src/app/*"],
                    "@components/*": ["src/app/components/*"],
                    "@services/*": ["src/app/services/*"],
                    "@models/*": ["src/app/models/*"]
                }
            },
            "angularCompilerOptions": {
                "enableI18nLegacyMessageIdFormat": false,
                "strictInjectionParameters": true,
                "strictInputAccessModifiers": true,
                "strictTemplates": true
            }
        }, null, 2);
    }
    generateAppTsConfig() {
        return JSON.stringify({
            "extends": "./tsconfig.json",
            "compilerOptions": {
                "outDir": "./out-tsc/app",
                "types": []
            },
            "files": ["src/main.ts"],
            "include": ["src/**/*.d.ts"]
        }, null, 2);
    }
    generateIndexHtml(requirements) {
        const title = requirements.description?.split(' ').slice(0, 3).join(' ') || 'Angular App';
        return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <base href="/">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/x-icon" href="favicon.ico">
  <link rel="preconnect" href="https://fonts.gstatic.com">
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
</head>
<body class="mat-typography">
  <app-root></app-root>
</body>
</html>`;
    }
    generateMainTs() {
        return `import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

bootstrapApplication(AppComponent, appConfig).catch((err) =>
  console.error(err)
);`;
    }
    generateAppComponent(requirements) {
        return `import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    HeaderComponent,
    FooterComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = '${requirements.description?.split(' ').slice(0, 2).join(' ') || 'Angular App'}';
}`;
    }
    generateAppTemplate(requirements) {
        return `<div class="app-container">
  <app-header></app-header>
  
  <main class="main-content">
    <div class="container">
      <router-outlet></router-outlet>
    </div>
  </main>
  
  <app-footer></app-footer>
</div>`;
    }
    generateAppStyles() {
        return `.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main-content {
  flex: 1;
  padding: 24px 0;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

@media (max-width: 768px) {
  .container {
    padding: 0 16px;
  }
}`;
    }
    generateAppConfig(requirements) {
        const hasAuth = requirements.features?.some((f) => f.toLowerCase().includes('auth'));
        return `import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';

import { routes } from './app.routes';
${hasAuth ? "import { authInterceptor } from './interceptors/auth.interceptor';\nimport { AuthEffects } from './store/auth/auth.effects';\nimport { authReducer } from './store/auth/auth.reducer';" : ''}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimationsAsync(),
    provideHttpClient(${hasAuth ? 'withInterceptors([authInterceptor])' : ''}),
    provideStore(${hasAuth ? '{ auth: authReducer }' : '{}'}),
    provideEffects(${hasAuth ? '[AuthEffects]' : '[]'}),
    provideStoreDevtools({
      maxAge: 25,
      logOnly: false,
      autoPause: true,
      trace: false,
      traceLimit: 75
    })
  ]
};`;
    }
    generateRoutes(requirements) {
        const hasAuth = requirements.features?.some((f) => f.toLowerCase().includes('auth'));
        return `import { Routes } from '@angular/router';
${hasAuth ? "import { authGuard } from './guards/auth.guard';\nimport { guestGuard } from './guards/guest.guard';" : ''}

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent)
  },
  ${hasAuth ? `
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent),
    canActivate: [guestGuard]
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent),
    canActivate: [guestGuard]
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },` : ''}
  {
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found.component').then(m => m.NotFoundComponent)
  }
];`;
    }
    generateComponents(requirements, files) {
        const hasAuth = requirements.features?.some((f) => f.toLowerCase().includes('auth'));
        // Header component
        files['src/app/components/header/header.component.ts'] = `import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
${hasAuth ? "import { Store } from '@ngrx/store';\nimport { AsyncPipe } from '@angular/common';\nimport { AuthActions } from '../../store/auth/auth.actions';\nimport { selectUser } from '../../store/auth/auth.selectors';" : ''}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    ${hasAuth ? 'AsyncPipe' : ''}
  ],
  template: \`
    <mat-toolbar color="primary">
      <span class="logo">
        <a routerLink="/" class="logo-link">
          ${requirements.description?.split(' ').slice(0, 2).join(' ') || 'Angular App'}
        </a>
      </span>
      
      <span class="spacer"></span>
      
      <nav class="nav-links">
        <a mat-button routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">
          Home
        </a>
        ${hasAuth ? `
        @if (user$ | async; as user) {
          <a mat-button routerLink="/dashboard" routerLinkActive="active">
            Dashboard
          </a>
          <button mat-icon-button [matMenuTriggerFor]="userMenu">
            <mat-icon>account_circle</mat-icon>
          </button>
          <mat-menu #userMenu="matMenu">
            <div class="user-info">
              <strong>{{ user.name }}</strong>
              <small>{{ user.email }}</small>
            </div>
            <mat-divider></mat-divider>
            <button mat-menu-item (click)="logout()">
              <mat-icon>exit_to_app</mat-icon>
              Logout
            </button>
          </mat-menu>
        } @else {
          <a mat-button routerLink="/login" routerLinkActive="active">
            Login
          </a>
          <a mat-raised-button color="accent" routerLink="/register" routerLinkActive="active">
            Sign Up
          </a>
        }` : ''}
      </nav>
    </mat-toolbar>
  \`,
  styles: [\`
    .logo-link {
      color: inherit;
      text-decoration: none;
      font-weight: 500;
      font-size: 1.2em;
    }
    
    .spacer {
      flex: 1 1 auto;
    }
    
    .nav-links {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .active {
      background-color: rgba(255, 255, 255, 0.1);
    }
    
    .user-info {
      padding: 8px 16px;
      display: flex;
      flex-direction: column;
    }
    
    @media (max-width: 768px) {
      .nav-links {
        gap: 4px;
      }
    }
  \`]
})
export class HeaderComponent {
  ${hasAuth ? `
  private store = inject(Store);
  user$ = this.store.select(selectUser);

  logout() {
    this.store.dispatch(AuthActions.logout());
  }` : ''}
}`;
        // Footer component
        files['src/app/components/footer/footer.component.ts'] = `import { Component } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [MatToolbarModule],
  template: \`
    <footer class="footer">
      <div class="container">
        <p>&copy; 2024 ${requirements.description?.split(' ').slice(0, 2).join(' ') || 'Angular App'}. All rights reserved.</p>
        <p class="generated-by">Generated by ORCHESTRATOR-ALPHA</p>
      </div>
    </footer>
  \`,
  styles: [\`
    .footer {
      background-color: #f5f5f5;
      border-top: 1px solid #e0e0e0;
      padding: 24px 0;
      margin-top: auto;
      text-align: center;
      color: rgba(0, 0, 0, 0.6);
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 24px;
    }
    
    .generated-by {
      font-size: 0.875rem;
      margin-top: 8px;
    }
  \`]
})
export class FooterComponent {}`;
        // Home page
        files['src/app/pages/home/home.component.ts'] = `import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [MatCardModule, MatButtonModule],
  template: \`
    <div class="home-container">
      <div class="hero-section">
        <h1>Welcome to ${requirements.description?.split(' ').slice(0, 3).join(' ') || 'Angular App'}</h1>
        <p class="hero-description">
          ${requirements.description || 'An Angular application'}
        </p>
      </div>
      
      <div class="features-grid">
        @for (feature of features; track feature) {
          <mat-card class="feature-card">
            <mat-card-header>
              <mat-card-title>{{ feature }}</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <p>{{ feature }} implementation coming soon...</p>
            </mat-card-content>
            <mat-card-actions>
              <button mat-button>Learn More</button>
            </mat-card-actions>
          </mat-card>
        }
      </div>
    </div>
  \`,
  styles: [\`
    .home-container {
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .hero-section {
      text-align: center;
      padding: 48px 0;
    }
    
    .hero-section h1 {
      font-size: 2.5rem;
      margin-bottom: 16px;
      font-weight: 300;
    }
    
    .hero-description {
      font-size: 1.125rem;
      color: rgba(0, 0, 0, 0.6);
      max-width: 600px;
      margin: 0 auto;
    }
    
    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;
      margin-top: 48px;
    }
    
    .feature-card {
      transition: transform 0.2s ease;
    }
    
    .feature-card:hover {
      transform: translateY(-4px);
    }
    
    @media (max-width: 768px) {
      .hero-section h1 {
        font-size: 2rem;
      }
      
      .features-grid {
        grid-template-columns: 1fr;
      }
    }
  \`]
})
export class HomeComponent {
  features = ${JSON.stringify(requirements.features || ['Feature 1', 'Feature 2', 'Feature 3'])};
}`;
        // Auth components if needed
        if (hasAuth) {
            this.generateAuthComponents(requirements, files);
        }
        // Not found page
        files['src/app/pages/not-found/not-found.component.ts'] = `import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  template: \`
    <div class="not-found-container">
      <div class="not-found-content">
        <h1>404</h1>
        <h2>Page Not Found</h2>
        <p>The page you're looking for doesn't exist.</p>
        <a mat-raised-button color="primary" routerLink="/">
          <mat-icon>home</mat-icon>
          Go Home
        </a>
      </div>
    </div>
  \`,
  styles: [\`
    .not-found-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 50vh;
      text-align: center;
    }
    
    .not-found-content h1 {
      font-size: 6rem;
      font-weight: 300;
      margin: 0;
      color: rgba(0, 0, 0, 0.3);
    }
    
    .not-found-content h2 {
      font-size: 1.5rem;
      margin: 16px 0;
    }
    
    .not-found-content p {
      color: rgba(0, 0, 0, 0.6);
      margin-bottom: 32px;
    }
  \`]
})
export class NotFoundComponent {}`;
    }
    generateAuthComponents(requirements, files) {
        // Login component
        files['src/app/pages/login/login.component.ts'] = `import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AsyncPipe } from '@angular/common';

import { AuthActions } from '../../store/auth/auth.actions';
import { selectAuthLoading, selectAuthError } from '../../store/auth/auth.selectors';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    AsyncPipe
  ],
  template: \`
    <div class="login-container">
      <mat-card class="login-card">
        <mat-card-header>
          <mat-card-title>Sign In</mat-card-title>
        </mat-card-header>
        
        <mat-card-content>
          @if (error$ | async; as error) {
            <div class="error-message">
              {{ error }}
            </div>
          }
          
          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email" required>
              @if (loginForm.get('email')?.hasError('required') && loginForm.get('email')?.touched) {
                <mat-error>Email is required</mat-error>
              }
              @if (loginForm.get('email')?.hasError('email') && loginForm.get('email')?.touched) {
                <mat-error>Please enter a valid email</mat-error>
              }
            </mat-form-field>
            
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Password</mat-label>
              <input matInput type="password" formControlName="password" required>
              @if (loginForm.get('password')?.hasError('required') && loginForm.get('password')?.touched) {
                <mat-error>Password is required</mat-error>
              }
            </mat-form-field>
            
            <button 
              mat-raised-button 
              color="primary" 
              type="submit" 
              class="full-width submit-button"
              [disabled]="loginForm.invalid || (loading$ | async)"
            >
              @if (loading$ | async) {
                <mat-spinner diameter="20"></mat-spinner>
                Signing in...
              } @else {
                Sign In
              }
            </button>
          </form>
        </mat-card-content>
        
        <mat-card-actions>
          <p class="signup-link">
            Don't have an account? 
            <a routerLink="/register">Sign up</a>
          </p>
        </mat-card-actions>
      </mat-card>
    </div>
  \`,
  styles: [\`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 60vh;
    }
    
    .login-card {
      width: 100%;
      max-width: 400px;
      margin: 20px;
    }
    
    .full-width {
      width: 100%;
    }
    
    .submit-button {
      margin-top: 16px;
    }
    
    .error-message {
      background-color: #ffebee;
      color: #c62828;
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 16px;
    }
    
    .signup-link {
      text-align: center;
      margin: 0 auto;
    }
    
    .signup-link a {
      color: #1976d2;
      text-decoration: none;
    }
    
    .signup-link a:hover {
      text-decoration: underline;
    }
  \`]
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private store = inject(Store);
  private router = inject(Router);

  loginForm: FormGroup;
  loading$ = this.store.select(selectAuthLoading);
  error$ = this.store.select(selectAuthError);

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  onSubmit() {
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;
      this.store.dispatch(AuthActions.login({ email, password }));
    }
  }
}`;
        // Register component
        files['src/app/pages/register/register.component.ts'] = `import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AsyncPipe } from '@angular/common';

import { AuthActions } from '../../store/auth/auth.actions';
import { selectAuthLoading, selectAuthError } from '../../store/auth/auth.selectors';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    AsyncPipe
  ],
  template: \`
    <div class="register-container">
      <mat-card class="register-card">
        <mat-card-header>
          <mat-card-title>Sign Up</mat-card-title>
        </mat-card-header>
        
        <mat-card-content>
          @if (error$ | async; as error) {
            <div class="error-message">
              {{ error }}
            </div>
          }
          
          <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Name</mat-label>
              <input matInput type="text" formControlName="name" required>
              @if (registerForm.get('name')?.hasError('required') && registerForm.get('name')?.touched) {
                <mat-error>Name is required</mat-error>
              }
            </mat-form-field>
            
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email" required>
              @if (registerForm.get('email')?.hasError('required') && registerForm.get('email')?.touched) {
                <mat-error>Email is required</mat-error>
              }
              @if (registerForm.get('email')?.hasError('email') && registerForm.get('email')?.touched) {
                <mat-error>Please enter a valid email</mat-error>
              }
            </mat-form-field>
            
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Password</mat-label>
              <input matInput type="password" formControlName="password" required>
              @if (registerForm.get('password')?.hasError('required') && registerForm.get('password')?.touched) {
                <mat-error>Password is required</mat-error>
              }
              @if (registerForm.get('password')?.hasError('minlength') && registerForm.get('password')?.touched) {
                <mat-error>Password must be at least 6 characters</mat-error>
              }
            </mat-form-field>
            
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Confirm Password</mat-label>
              <input matInput type="password" formControlName="confirmPassword" required>
              @if (registerForm.get('confirmPassword')?.hasError('required') && registerForm.get('confirmPassword')?.touched) {
                <mat-error>Please confirm your password</mat-error>
              }
              @if (registerForm.hasError('passwordMismatch') && registerForm.get('confirmPassword')?.touched) {
                <mat-error>Passwords do not match</mat-error>
              }
            </mat-form-field>
            
            <button 
              mat-raised-button 
              color="primary" 
              type="submit" 
              class="full-width submit-button"
              [disabled]="registerForm.invalid || (loading$ | async)"
            >
              @if (loading$ | async) {
                <mat-spinner diameter="20"></mat-spinner>
                Creating account...
              } @else {
                Sign Up
              }
            </button>
          </form>
        </mat-card-content>
        
        <mat-card-actions>
          <p class="login-link">
            Already have an account? 
            <a routerLink="/login">Sign in</a>
          </p>
        </mat-card-actions>
      </mat-card>
    </div>
  \`,
  styles: [\`
    .register-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 60vh;
    }
    
    .register-card {
      width: 100%;
      max-width: 400px;
      margin: 20px;
    }
    
    .full-width {
      width: 100%;
    }
    
    .submit-button {
      margin-top: 16px;
    }
    
    .error-message {
      background-color: #ffebee;
      color: #c62828;
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 16px;
    }
    
    .login-link {
      text-align: center;
      margin: 0 auto;
    }
    
    .login-link a {
      color: #1976d2;
      text-decoration: none;
    }
    
    .login-link a:hover {
      text-decoration: underline;
    }
  \`]
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private store = inject(Store);
  private router = inject(Router);

  registerForm: FormGroup;
  loading$ = this.store.select(selectAuthLoading);
  error$ = this.store.select(selectAuthError);

  constructor() {
    this.registerForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    return null;
  }

  onSubmit() {
    if (this.registerForm.valid) {
      const { name, email, password } = this.registerForm.value;
      this.store.dispatch(AuthActions.register({ name, email, password }));
    }
  }
}`;
        // Dashboard component
        files['src/app/pages/dashboard/dashboard.component.ts'] = `import { Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { AsyncPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { selectUser } from '../../store/auth/auth.selectors';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [AsyncPipe, MatCardModule, MatButtonModule, MatIconModule],
  template: \`
    @if (user$ | async; as user) {
      <div class="dashboard-container">
        <div class="dashboard-header">
          <h1>Welcome back, {{ user.name }}!</h1>
          <p>Here's what's happening with your account.</p>
        </div>
        
        <div class="dashboard-grid">
          <mat-card class="dashboard-card">
            <mat-card-header>
              <mat-icon mat-card-avatar>person</mat-icon>
              <mat-card-title>Profile</mat-card-title>
              <mat-card-subtitle>Manage your account settings</mat-card-subtitle>
            </mat-card-header>
            <mat-card-actions>
              <button mat-raised-button color="primary">Update Profile</button>
            </mat-card-actions>
          </mat-card>
          
          <mat-card class="dashboard-card">
            <mat-card-header>
              <mat-icon mat-card-avatar>timeline</mat-icon>
              <mat-card-title>Activity</mat-card-title>
              <mat-card-subtitle>View your recent activity</mat-card-subtitle>
            </mat-card-header>
            <mat-card-actions>
              <button mat-button>View Activity</button>
            </mat-card-actions>
          </mat-card>
          
          <mat-card class="dashboard-card">
            <mat-card-header>
              <mat-icon mat-card-avatar>settings</mat-icon>
              <mat-card-title>Settings</mat-card-title>
              <mat-card-subtitle>Configure your preferences</mat-card-subtitle>
            </mat-card-header>
            <mat-card-actions>
              <button mat-button>Open Settings</button>
            </mat-card-actions>
          </mat-card>
        </div>
      </div>
    }
  \`,
  styles: [\`
    .dashboard-container {
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .dashboard-header {
      margin-bottom: 32px;
    }
    
    .dashboard-header h1 {
      font-size: 2rem;
      margin-bottom: 8px;
      font-weight: 400;
    }
    
    .dashboard-header p {
      color: rgba(0, 0, 0, 0.6);
      font-size: 1rem;
    }
    
    .dashboard-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;
    }
    
    .dashboard-card {
      transition: transform 0.2s ease;
    }
    
    .dashboard-card:hover {
      transform: translateY(-2px);
    }
    
    @media (max-width: 768px) {
      .dashboard-grid {
        grid-template-columns: 1fr;
      }
    }
  \`]
})
export class DashboardComponent {
  private store = inject(Store);
  user$ = this.store.select(selectUser);
}`;
        // Generate auth store files
        this.generateAuthStore(files);
        this.generateAuthGuards(files);
        this.generateAuthInterceptor(files);
    }
    generateServices(requirements, files) {
        const hasAuth = requirements.features?.some((f) => f.toLowerCase().includes('auth'));
        // API Service
        files['src/app/services/api.service.ts'] = `import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl || 'http://localhost:3001/api';

  constructor(private http: HttpClient) {}

  get<T>(endpoint: string): Observable<T> {
    return this.http.get<T>(\`\${this.apiUrl}/\${endpoint}\`);
  }

  post<T>(endpoint: string, data: any): Observable<T> {
    return this.http.post<T>(\`\${this.apiUrl}/\${endpoint}\`, data);
  }

  put<T>(endpoint: string, data: any): Observable<T> {
    return this.http.put<T>(\`\${this.apiUrl}/\${endpoint}\`, data);
  }

  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(\`\${this.apiUrl}/\${endpoint}\`);
  }
}`;
        // Environment files
        files['src/app/environments/environment.ts'] = `export const environment = {
  production: false,
  apiUrl: 'http://localhost:3001/api'
};`;
        files['src/app/environments/environment.prod.ts'] = `export const environment = {
  production: true,
  apiUrl: '/api'
};`;
    }
    generateAuthStore(files) {
        // Auth actions
        files['src/app/store/auth/auth.actions.ts'] = `import { createActionGroup, emptyProps, props } from '@ngrx/store';

export const AuthActions = createActionGroup({
  source: 'Auth',
  events: {
    'Login': props<{ email: string; password: string }>(),
    'Login Success': props<{ user: any; token: string }>(),
    'Login Failure': props<{ error: string }>(),
    
    'Register': props<{ name: string; email: string; password: string }>(),
    'Register Success': props<{ user: any; token: string }>(),
    'Register Failure': props<{ error: string }>(),
    
    'Logout': emptyProps(),
    'Check Auth': emptyProps(),
    
    'Load User': emptyProps(),
    'Load User Success': props<{ user: any }>(),
    'Load User Failure': props<{ error: string }>(),
  }
});`;
        // Auth state
        files['src/app/store/auth/auth.state.ts'] = `export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

export const initialAuthState: AuthState = {
  user: null,
  token: localStorage.getItem('authToken'),
  loading: false,
  error: null
};`;
        // Auth reducer
        files['src/app/store/auth/auth.reducer.ts'] = `import { createReducer, on } from '@ngrx/store';
import { AuthActions } from './auth.actions';
import { initialAuthState } from './auth.state';

export const authReducer = createReducer(
  initialAuthState,
  
  on(AuthActions.login, (state) => ({
    ...state,
    loading: true,
    error: null
  })),
  
  on(AuthActions.loginSuccess, (state, { user, token }) => {
    localStorage.setItem('authToken', token);
    return {
      ...state,
      user,
      token,
      loading: false,
      error: null
    };
  }),
  
  on(AuthActions.loginFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),
  
  on(AuthActions.register, (state) => ({
    ...state,
    loading: true,
    error: null
  })),
  
  on(AuthActions.registerSuccess, (state, { user, token }) => {
    localStorage.setItem('authToken', token);
    return {
      ...state,
      user,
      token,
      loading: false,
      error: null
    };
  }),
  
  on(AuthActions.registerFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),
  
  on(AuthActions.logout, (state) => {
    localStorage.removeItem('authToken');
    return {
      ...state,
      user: null,
      token: null,
      loading: false,
      error: null
    };
  }),
  
  on(AuthActions.loadUserSuccess, (state, { user }) => ({
    ...state,
    user,
    loading: false,
    error: null
  })),
  
  on(AuthActions.loadUserFailure, (state, { error }) => ({
    ...state,
    user: null,
    token: null,
    loading: false,
    error
  }))
);`;
        // Auth selectors
        files['src/app/store/auth/auth.selectors.ts'] = `import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AuthState } from './auth.state';

export const selectAuthState = createFeatureSelector<AuthState>('auth');

export const selectUser = createSelector(
  selectAuthState,
  (state: AuthState) => state.user
);

export const selectToken = createSelector(
  selectAuthState,
  (state: AuthState) => state.token
);

export const selectAuthLoading = createSelector(
  selectAuthState,
  (state: AuthState) => state.loading
);

export const selectAuthError = createSelector(
  selectAuthState,
  (state: AuthState) => state.error
);

export const selectIsAuthenticated = createSelector(
  selectAuthState,
  (state: AuthState) => !!state.user && !!state.token
);`;
        // Auth effects
        files['src/app/store/auth/auth.effects.ts'] = `import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { map, exhaustMap, catchError, tap } from 'rxjs/operators';

import { ApiService } from '../../services/api.service';
import { AuthActions } from './auth.actions';

@Injectable()
export class AuthEffects {
  private actions$ = inject(Actions);
  private apiService = inject(ApiService);
  private router = inject(Router);

  login$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.login),
      exhaustMap(({ email, password }) =>
        this.apiService.post<{ user: any; token: string }>('auth/login', { email, password }).pipe(
          map(({ user, token }) => AuthActions.loginSuccess({ user, token })),
          catchError((error) => of(AuthActions.loginFailure({ error: error.message || 'Login failed' })))
        )
      )
    )
  );

  register$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.register),
      exhaustMap(({ name, email, password }) =>
        this.apiService.post<{ user: any; token: string }>('auth/register', { name, email, password }).pipe(
          map(({ user, token }) => AuthActions.registerSuccess({ user, token })),
          catchError((error) => of(AuthActions.registerFailure({ error: error.message || 'Registration failed' })))
        )
      )
    )
  );

  loadUser$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.loadUser),
      exhaustMap(() =>
        this.apiService.get<any>('auth/me').pipe(
          map((user) => AuthActions.loadUserSuccess({ user })),
          catchError((error) => of(AuthActions.loadUserFailure({ error: error.message || 'Failed to load user' })))
        )
      )
    )
  );

  loginSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.loginSuccess),
      tap(() => this.router.navigate(['/dashboard']))
    ),
    { dispatch: false }
  );

  registerSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.registerSuccess),
      tap(() => this.router.navigate(['/dashboard']))
    ),
    { dispatch: false }
  );

  logout$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.logout),
      tap(() => this.router.navigate(['/']))
    ),
    { dispatch: false }
  );
}`;
    }
    generateAuthGuards(files) {
        // Auth guard
        files['src/app/guards/auth.guard.ts'] = `import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { map, take } from 'rxjs/operators';

import { selectIsAuthenticated } from '../store/auth/auth.selectors';

export const authGuard: CanActivateFn = () => {
  const store = inject(Store);
  const router = inject(Router);

  return store.select(selectIsAuthenticated).pipe(
    take(1),
    map(isAuthenticated => {
      if (!isAuthenticated) {
        router.navigate(['/login']);
        return false;
      }
      return true;
    })
  );
};`;
        // Guest guard
        files['src/app/guards/guest.guard.ts'] = `import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { map, take } from 'rxjs/operators';

import { selectIsAuthenticated } from '../store/auth/auth.selectors';

export const guestGuard: CanActivateFn = () => {
  const store = inject(Store);
  const router = inject(Router);

  return store.select(selectIsAuthenticated).pipe(
    take(1),
    map(isAuthenticated => {
      if (isAuthenticated) {
        router.navigate(['/dashboard']);
        return false;
      }
      return true;
    })
  );
};`;
    }
    generateAuthInterceptor(files) {
        files['src/app/interceptors/auth.interceptor.ts'] = `import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { switchMap, take } from 'rxjs/operators';

import { selectToken } from '../store/auth/auth.selectors';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const store = inject(Store);

  return store.select(selectToken).pipe(
    take(1),
    switchMap(token => {
      if (token) {
        const authReq = req.clone({
          setHeaders: {
            Authorization: \`Bearer \${token}\`
          }
        });
        return next(authReq);
      }
      return next(req);
    })
  );
};`;
    }
    generateGlobalStyles() {
        return `@import '@angular/material/prebuilt-themes/indigo-pink.css';

/* Global Styles */
html, body {
  height: 100%;
  margin: 0;
  font-family: Roboto, "Helvetica Neue", sans-serif;
}

* {
  box-sizing: border-box;
}

/* Utility Classes */
.full-width {
  width: 100%;
}

.text-center {
  text-align: center;
}

.mt-16 {
  margin-top: 16px;
}

.mb-16 {
  margin-bottom: 16px;
}

.p-24 {
  padding: 24px;
}

/* Material Design Overrides */
.mat-mdc-card {
  box-shadow: 0 2px 4px rgba(0,0,0,.1);
  transition: box-shadow 0.3s ease;
}

.mat-mdc-card:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,.15);
}

.mat-mdc-raised-button {
  box-shadow: 0 2px 4px rgba(0,0,0,.2);
}

/* Responsive Design */
@media (max-width: 768px) {
  .container {
    padding: 0 16px;
  }
}`;
    }
    async cleanup() {
        // Cleanup resources
    }
}
exports.default = FrontendAngularAgent;
//# sourceMappingURL=frontend-angular-agent.js.map