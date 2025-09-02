import { Agent, AgentTask, AgentResult } from '../src/types';

export default class FrontendReactAgent implements Agent {
  id = 'frontend-react-agent';
  name = 'Frontend React Agent';
  type = 'frontend';
  capabilities = ['react', 'typescript', 'vite', 'tailwind', 'components'];

  async initialize(): Promise<void> {
    // Initialize React-specific resources
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    try {
      const { requirements } = task;
      
      const files = await this.generateReactApp(requirements);
      
      return {
        success: true,
        data: {
          files,
          framework: 'react',
          buildTool: 'vite',
          styling: 'tailwind'
        },
        metadata: {
          generatedFiles: Object.keys(files).length,
          framework: 'react',
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in React agent'
      };
    }
  }

  private async generateReactApp(requirements: any): Promise<Record<string, string>> {
    const files: Record<string, string> = {};
    
    // Package.json
    files['package.json'] = this.generatePackageJson(requirements);
    
    // Vite config
    files['vite.config.ts'] = this.generateViteConfig();
    
    // TypeScript config
    files['tsconfig.json'] = this.generateTsConfig();
    
    // Index.html
    files['index.html'] = this.generateIndexHtml(requirements);
    
    // Main entry point
    files['src/main.tsx'] = this.generateMainTsx();
    
    // App component
    files['src/App.tsx'] = this.generateAppComponent(requirements);
    
    // CSS
    files['src/index.css'] = this.generateIndexCss();
    
    // Components based on features
    this.generateComponents(requirements, files);
    
    // Hooks
    this.generateHooks(requirements, files);
    
    // Utils
    files['src/utils/api.ts'] = this.generateApiUtils();
    files['src/utils/auth.ts'] = this.generateAuthUtils();
    
    return files;
  }

  private generatePackageJson(requirements: any): string {
    const appName = requirements.description.split(' ').slice(0, 3).join('-').toLowerCase().replace(/[^a-z0-9-]/g, '');
    
    return JSON.stringify({
      name: appName,
      private: true,
      version: "0.0.0",
      type: "module",
      scripts: {
        dev: "vite",
        build: "tsc && vite build",
        lint: "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
        preview: "vite preview",
        test: "vitest",
        "test:ui": "vitest --ui"
      },
      dependencies: {
        react: "^18.2.0",
        "react-dom": "^18.2.0",
        "react-router-dom": "^6.8.1",
        axios: "^1.6.0",
        "react-query": "^3.39.3",
        "@headlessui/react": "^1.7.17",
        "@heroicons/react": "^2.0.18",
        clsx: "^2.0.0",
        "react-hook-form": "^7.48.2",
        "@hookform/resolvers": "^3.3.2",
        zod: "^3.22.4"
      },
      devDependencies: {
        "@types/react": "^18.2.43",
        "@types/react-dom": "^18.2.17",
        "@typescript-eslint/eslint-plugin": "^6.14.0",
        "@typescript-eslint/parser": "^6.14.0",
        "@vitejs/plugin-react": "^4.2.1",
        autoprefixer: "^10.4.16",
        eslint: "^8.55.0",
        "eslint-plugin-react-hooks": "^4.6.0",
        "eslint-plugin-react-refresh": "^0.4.5",
        postcss: "^8.4.32",
        tailwindcss: "^3.3.6",
        typescript: "^5.2.2",
        vite: "^5.0.8",
        vitest: "^1.0.4",
        "@testing-library/react": "^13.4.0",
        "@testing-library/jest-dom": "^6.1.5",
        "@testing-library/user-event": "^14.5.1"
      }
    }, null, 2);
  }

  private generateViteConfig(): string {
    return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts'
  }
});`;
  }

  private generateTsConfig(): string {
    return JSON.stringify({
      compilerOptions: {
        target: "ES2020",
        useDefineForClassFields: true,
        lib: ["ES2020", "DOM", "DOM.Iterable"],
        module: "ESNext",
        skipLibCheck: true,
        moduleResolution: "bundler",
        allowImportingTsExtensions: true,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: "react-jsx",
        strict: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noFallthroughCasesInSwitch: true,
        baseUrl: ".",
        paths: {
          "@/*": ["./src/*"]
        }
      },
      include: ["src"],
      references: [{ path: "./tsconfig.node.json" }]
    }, null, 2);
  }

  private generateIndexHtml(requirements: any): string {
    const title = requirements.description.split(' ').slice(0, 3).join(' ');
    
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;
  }

  private generateMainTsx(): string {
    return `import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);`;
  }

  private generateAppComponent(requirements: any): string {
    const hasAuth = requirements.features.some((f: string) => f.toLowerCase().includes('auth'));
    const hasDashboard = requirements.features.some((f: string) => f.toLowerCase().includes('dashboard'));
    
    return `import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Home from './pages/Home';
${hasAuth ? "import Login from './pages/Login';\nimport Register from './pages/Register';" : ''}
${hasDashboard ? "import Dashboard from './pages/Dashboard';" : ''}
import NotFound from './pages/NotFound';
${hasAuth ? "import { AuthProvider } from './contexts/AuthContext';\nimport ProtectedRoute from './components/ProtectedRoute';" : ''}

function App() {
  return (
    ${hasAuth ? '<AuthProvider>' : '<>'}
      <div className="min-h-screen bg-gray-50">
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            ${hasAuth ? `
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            ${hasDashboard ? `
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />` : ''}` : ''}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
        <Toaster position="top-right" />
      </div>
    ${hasAuth ? '</AuthProvider>' : '</>'}
  );
}

export default App;`;
  }

  private generateIndexCss(): string {
    return `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    font-family: 'Inter', system-ui, sans-serif;
  }
}

@layer components {
  .btn {
    @apply px-4 py-2 rounded-md font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2;
  }
  
  .btn-primary {
    @apply bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500;
  }
  
  .btn-secondary {
    @apply bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500;
  }
  
  .btn-danger {
    @apply bg-red-600 text-white hover:bg-red-700 focus:ring-red-500;
  }
  
  .form-input {
    @apply w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500;
  }
  
  .form-label {
    @apply block text-sm font-medium text-gray-700 mb-1;
  }
  
  .card {
    @apply bg-white shadow rounded-lg p-6;
  }
}`;
  }

  private generateComponents(requirements: any, files: Record<string, string>): void {
    // Layout component
    files['src/components/Layout.tsx'] = `import { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>
      <Footer />
    </div>
  );
}`;

    // Header component
    const hasAuth = requirements.features.some((f: string) => f.toLowerCase().includes('auth'));
    files['src/components/Header.tsx'] = `import { Link } from 'react-router-dom';
${hasAuth ? "import { useAuth } from '../contexts/AuthContext';" : ''}

export default function Header() {
  ${hasAuth ? 'const { user, logout } = useAuth();' : ''}

  return (
    <header className="bg-white shadow-sm border-b">
      <nav className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/" className="text-xl font-bold text-gray-900">
          ${requirements.description.split(' ').slice(0, 2).join(' ')}
        </Link>
        
        <div className="flex items-center space-x-4">
          <Link to="/" className="text-gray-600 hover:text-gray-900">
            Home
          </Link>
          ${hasAuth ? `
          {user ? (
            <>
              <Link to="/dashboard" className="text-gray-600 hover:text-gray-900">
                Dashboard
              </Link>
              <button
                onClick={logout}
                className="btn btn-secondary"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-gray-600 hover:text-gray-900">
                Login
              </Link>
              <Link to="/register" className="btn btn-primary">
                Sign Up
              </Link>
            </>
          )}` : ''}
        </div>
      </nav>
    </header>
  );
}`;

    // Footer component
    files['src/components/Footer.tsx'] = `export default function Footer() {
  return (
    <footer className="bg-gray-100 border-t">
      <div className="container mx-auto px-4 py-6 text-center text-gray-600">
        <p>&copy; 2024 ${requirements.description.split(' ').slice(0, 2).join(' ')}. All rights reserved.</p>
        <p className="text-sm mt-2">Generated by ORCHESTRATOR-ALPHA</p>
      </div>
    </footer>
  );
}`;

    // Pages
    files['src/pages/Home.tsx'] = `export default function Home() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to ${requirements.description.split(' ').slice(0, 3).join(' ')}
        </h1>
        <p className="text-xl text-gray-600">
          ${requirements.description}
        </p>
      </div>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        ${requirements.features.map((feature: string) => `
        <div className="card">
          <h3 className="text-lg font-semibold mb-2">${feature}</h3>
          <p className="text-gray-600">Feature implementation coming soon...</p>
        </div>`).join('\n        ')}
      </div>
    </div>
  );
}`;

    files['src/pages/NotFound.tsx'] = `import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="text-center">
      <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-gray-700 mb-4">Page Not Found</h2>
      <p className="text-gray-600 mb-8">The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn btn-primary">
        Go Home
      </Link>
    </div>
  );
}`;

    // Auth-specific components
    if (hasAuth) {
      files['src/contexts/AuthContext.tsx'] = this.generateAuthContext();
      files['src/components/ProtectedRoute.tsx'] = this.generateProtectedRoute();
      files['src/pages/Login.tsx'] = this.generateLoginPage();
      files['src/pages/Register.tsx'] = this.generateRegisterPage();
      files['src/pages/Dashboard.tsx'] = this.generateDashboardPage();
    }
  }

  private generateHooks(requirements: any, files: Record<string, string>): void {
    // Custom hooks
    files['src/hooks/useApi.ts'] = `import { useState, useEffect } from 'react';
import { api } from '../utils/api';

export function useApi<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await api.get(url);
        setData(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [url]);

  return { data, loading, error };
}`;

    files['src/hooks/useLocalStorage.ts'] = `import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('Error reading localStorage:', error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error('Error setting localStorage:', error);
    }
  };

  return [storedValue, setValue] as const;
}`;
  }

  private generateApiUtils(): string {
    return `import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = \`Bearer \${token}\`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);`;
  }

  private generateAuthUtils(): string {
    return `import { api } from './api';

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData extends LoginData {
  name: string;
  confirmPassword: string;
}

export const authApi = {
  async login(data: LoginData): Promise<{ user: User; token: string }> {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  async register(data: RegisterData): Promise<{ user: User; token: string }> {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  async getCurrentUser(): Promise<User> {
    const response = await api.get('/auth/me');
    return response.data;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },
};`;
  }

  private generateAuthContext(): string {
    return `import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { User, authApi } from '../utils/auth';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOGOUT' };

const initialState: AuthState = {
  user: null,
  loading: true,
  error: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_USER':
      return { ...state, user: action.payload, loading: false, error: null };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'LOGOUT':
      return { ...state, user: null, loading: false, error: null };
    default:
      return state;
  }
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        const user = await authApi.getCurrentUser();
        dispatch({ type: 'SET_USER', payload: user });
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    } catch (error) {
      localStorage.removeItem('authToken');
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const login = async (email: string, password: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const { user, token } = await authApi.login({ email, password });
      localStorage.setItem('authToken', token);
      dispatch({ type: 'SET_USER', payload: user });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Login failed' });
    }
  };

  const register = async (name: string, email: string, password: string, confirmPassword: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const { user, token } = await authApi.register({ name, email, password, confirmPassword });
      localStorage.setItem('authToken', token);
      dispatch({ type: 'SET_USER', payload: user });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Registration failed' });
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    authApi.logout().catch(() => {}); // Fire and forget
    dispatch({ type: 'LOGOUT' });
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}`;
  }

  private generateProtectedRoute(): string {
    return `import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}`;
  }

  private generateLoginPage(): string {
    return `import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { user, login, loading, error } = useAuth();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  if (user) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, password);
  };

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="card">
        <h1 className="text-2xl font-bold text-center mb-6">Sign In</h1>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="form-label">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center mt-4 text-gray-600">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-600 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}`;
  }

  private generateRegisterPage(): string {
    return `import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { user, register, loading, error } = useAuth();

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return; // Handle password mismatch
    }
    await register(name, email, password, confirmPassword);
  };

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="card">
        <h1 className="text-2xl font-bold text-center mb-6">Sign Up</h1>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="form-label">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="form-label">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              required
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="form-label">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="form-input"
              required
            />
            {password !== confirmPassword && confirmPassword && (
              <p className="text-red-500 text-sm mt-1">Passwords do not match</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || password !== confirmPassword}
            className="w-full btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center mt-4 text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}`;
  }

  private generateDashboardPage(): string {
    return `import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {user?.name}!
        </h1>
        <p className="text-gray-600">
          Here's what's happening with your account.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-2">Profile</h3>
          <p className="text-gray-600 mb-4">Manage your account settings</p>
          <button className="btn btn-primary">Update Profile</button>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-2">Activity</h3>
          <p className="text-gray-600 mb-4">View your recent activity</p>
          <button className="btn btn-secondary">View Activity</button>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-2">Settings</h3>
          <p className="text-gray-600 mb-4">Configure your preferences</p>
          <button className="btn btn-secondary">Open Settings</button>
        </div>
      </div>
    </div>
  );
}`;
  }

  async cleanup(): Promise<void> {
    // Cleanup resources
  }
}