"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class FrontendVueAgent {
    id = 'frontend-vue-agent';
    name = 'Frontend Vue.js Agent';
    type = 'frontend';
    capabilities = ['vue3', 'typescript', 'vite', 'pinia', 'composition-api', 'components'];
    async initialize() {
        // Initialize Vue-specific resources
    }
    async execute(task) {
        try {
            const { requirements } = task;
            const files = await this.generateVueApp(requirements);
            return {
                success: true,
                data: {
                    files,
                    framework: 'vue',
                    buildTool: 'vite',
                    stateManagement: 'pinia',
                    styling: 'tailwind'
                },
                metadata: {
                    generatedFiles: Object.keys(files).length,
                    framework: 'vue',
                    timestamp: new Date().toISOString()
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error in Vue agent'
            };
        }
    }
    async generateVueApp(requirements) {
        const files = {};
        // Package.json
        files['package.json'] = this.generatePackageJson(requirements);
        // Vite config
        files['vite.config.ts'] = this.generateViteConfig();
        // TypeScript config
        files['tsconfig.json'] = this.generateTsConfig();
        // Index.html
        files['index.html'] = this.generateIndexHtml(requirements);
        // Main entry point
        files['src/main.ts'] = this.generateMainTs();
        // App component
        files['src/App.vue'] = this.generateAppComponent(requirements);
        // CSS
        files['src/style.css'] = this.generateMainCss();
        // Components based on features
        this.generateComponents(requirements, files);
        // Composables
        this.generateComposables(requirements, files);
        // Store (Pinia)
        this.generateStore(requirements, files);
        // Utils
        files['src/utils/api.ts'] = this.generateApiUtils();
        // Router
        files['src/router/index.ts'] = this.generateRouter(requirements);
        return files;
    }
    generatePackageJson(requirements) {
        const appName = requirements.description?.split(' ').slice(0, 3).join('-').toLowerCase().replace(/[^a-z0-9-]/g, '') || 'vue-app';
        return JSON.stringify({
            name: appName,
            private: true,
            version: "0.0.0",
            type: "module",
            scripts: {
                dev: "vite",
                build: "vue-tsc && vite build",
                preview: "vite preview",
                test: "vitest",
                "test:ui": "vitest --ui",
                lint: "eslint . --ext .vue,.js,.jsx,.cjs,.mjs,.ts,.tsx,.cts,.mts --fix --ignore-path .gitignore",
                "type-check": "vue-tsc --noEmit -p tsconfig.vitest.json --composite false"
            },
            dependencies: {
                vue: "^3.3.8",
                "vue-router": "^4.2.5",
                pinia: "^2.1.7",
                axios: "^1.6.0",
                "@headlessui/vue": "^1.7.16",
                "@heroicons/vue": "^2.0.18",
                "@vueuse/core": "^10.5.0",
                "@vueuse/head": "^2.0.0"
            },
            devDependencies: {
                "@types/node": "^20.8.10",
                "@vitejs/plugin-vue": "^4.4.1",
                "@vue/eslint-config-prettier": "^8.0.0",
                "@vue/eslint-config-typescript": "^12.0.0",
                "@vue/test-utils": "^2.4.1",
                "@vue/tsconfig": "^0.4.0",
                autoprefixer: "^10.4.16",
                eslint: "^8.53.0",
                "eslint-plugin-vue": "^9.18.1",
                jsdom: "^23.0.1",
                postcss: "^8.4.32",
                prettier: "^3.0.3",
                tailwindcss: "^3.3.6",
                typescript: "~5.2.0",
                vite: "^4.5.0",
                vitest: "^0.34.6",
                "vue-tsc": "^1.8.22"
            }
        }, null, 2);
    }
    generateViteConfig() {
        return `import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
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
    environment: 'jsdom'
  }
})`;
    }
    generateTsConfig() {
        return JSON.stringify({
            extends: "@vue/tsconfig/tsconfig.dom.json",
            include: ["env.d.ts", "src/**/*", "src/**/*.vue"],
            exclude: ["src/**/__tests__/*"],
            compilerOptions: {
                composite: true,
                baseUrl: ".",
                paths: {
                    "@/*": ["./src/*"]
                },
                types: ["vite/client"],
                strict: true,
                noUnusedLocals: true,
                noUnusedParameters: true
            }
        }, null, 2);
    }
    generateIndexHtml(requirements) {
        const title = requirements.description?.split(' ').slice(0, 3).join(' ') || 'Vue App';
        return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <link rel="icon" type="image/svg+xml" href="/vite.svg">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>`;
    }
    generateMainTs() {
        return `import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createHead } from '@vueuse/head'
import App from './App.vue'
import router from './router'
import './style.css'

const app = createApp(App)
const pinia = createPinia()
const head = createHead()

app.use(pinia)
app.use(router)
app.use(head)

app.mount('#app')`;
    }
    generateAppComponent(requirements) {
        const hasAuth = requirements.features?.some((f) => f.toLowerCase().includes('auth'));
        const hasDashboard = requirements.features?.some((f) => f.toLowerCase().includes('dashboard'));
        return `<template>
  <div id="app" class="min-h-screen bg-gray-50">
    <AppHeader />
    <main class="container mx-auto px-4 py-8">
      <Suspense>
        <RouterView />
        <template #fallback>
          <div class="flex justify-center items-center min-h-64">
            <LoadingSpinner />
          </div>
        </template>
      </Suspense>
    </main>
    <AppFooter />
    <Notifications />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useHead } from '@vueuse/head'
${hasAuth ? "import { useAuthStore } from '@/stores/auth'" : ''}
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import Notifications from '@/components/Notifications.vue'

${hasAuth ? 'const authStore = useAuthStore()' : ''}

useHead({
  title: '${requirements.description?.split(' ').slice(0, 3).join(' ') || 'Vue App'}',
  meta: [
    { name: 'description', content: '${requirements.description || 'Vue application'}' }
  ]
})

onMounted(() => {
  ${hasAuth ? 'authStore.checkAuth()' : '// App mounted'}
})
</script>`;
    }
    generateMainCss() {
        return `@import 'tailwindcss/base';
@import 'tailwindcss/components';
@import 'tailwindcss/utilities';

@layer base {
  html {
    font-family: 'Inter', system-ui, sans-serif;
  }
}

@layer components {
  .btn {
    @apply px-4 py-2 rounded-md font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed;
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
  
  .fade-enter-active, .fade-leave-active {
    transition: opacity 0.3s ease;
  }
  
  .fade-enter-from, .fade-leave-to {
    opacity: 0;
  }
}`;
    }
    generateComponents(requirements, files) {
        const hasAuth = requirements.features?.some((f) => f.toLowerCase().includes('auth'));
        // Header component
        files['src/components/AppHeader.vue'] = `<template>
  <header class="bg-white shadow-sm border-b">
    <nav class="container mx-auto px-4 py-4 flex justify-between items-center">
      <RouterLink to="/" class="text-xl font-bold text-gray-900">
        ${requirements.description?.split(' ').slice(0, 2).join(' ') || 'Vue App'}
      </RouterLink>
      
      <div class="flex items-center space-x-4">
        <RouterLink
          to="/"
          class="text-gray-600 hover:text-gray-900 transition-colors"
        >
          Home
        </RouterLink>
        ${hasAuth ? `
        <template v-if="authStore.user">
          <RouterLink
            to="/dashboard"
            class="text-gray-600 hover:text-gray-900 transition-colors"
          >
            Dashboard
          </RouterLink>
          <button
            @click="handleLogout"
            class="btn btn-secondary"
          >
            Logout
          </button>
        </template>
        <template v-else>
          <RouterLink
            to="/login"
            class="text-gray-600 hover:text-gray-900 transition-colors"
          >
            Login
          </RouterLink>
          <RouterLink
            to="/register"
            class="btn btn-primary"
          >
            Sign Up
          </RouterLink>
        </template>` : ''}
      </div>
    </nav>
  </header>
</template>

<script setup lang="ts">
${hasAuth ? `import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

const handleLogout = async () => {
  await authStore.logout()
  router.push('/')
}` : ''}
</script>`;
        // Footer component
        files['src/components/AppFooter.vue'] = `<template>
  <footer class="bg-gray-100 border-t mt-auto">
    <div class="container mx-auto px-4 py-6 text-center text-gray-600">
      <p>&copy; 2024 ${requirements.description?.split(' ').slice(0, 2).join(' ') || 'Vue App'}. All rights reserved.</p>
      <p class="text-sm mt-2">Generated by ORCHESTRATOR-ALPHA</p>
    </div>
  </footer>
</template>`;
        // Loading spinner
        files['src/components/LoadingSpinner.vue'] = `<template>
  <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
</template>`;
        // Notifications component
        files['src/components/Notifications.vue'] = `<template>
  <Teleport to="body">
    <div
      class="fixed top-4 right-4 z-50 space-y-2"
      aria-live="polite"
    >
      <TransitionGroup name="notification">
        <div
          v-for="notification in notifications"
          :key="notification.id"
          class="max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5"
        >
          <div class="p-4">
            <div class="flex items-start">
              <div class="flex-shrink-0">
                <CheckCircleIcon
                  v-if="notification.type === 'success'"
                  class="h-6 w-6 text-green-400"
                />
                <ExclamationCircleIcon
                  v-else-if="notification.type === 'error'"
                  class="h-6 w-6 text-red-400"
                />
                <InformationCircleIcon
                  v-else
                  class="h-6 w-6 text-blue-400"
                />
              </div>
              <div class="ml-3 w-0 flex-1">
                <p class="text-sm font-medium text-gray-900">
                  {{ notification.title }}
                </p>
                <p v-if="notification.message" class="mt-1 text-sm text-gray-500">
                  {{ notification.message }}
                </p>
              </div>
              <div class="ml-4 flex-shrink-0 flex">
                <button
                  @click="removeNotification(notification.id)"
                  class="inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <XMarkIcon class="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useNotificationStore } from '@/stores/notifications'
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  XMarkIcon
} from '@heroicons/vue/24/outline'

const { notifications, removeNotification } = useNotificationStore()
</script>

<style>
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}
.notification-enter-from {
  opacity: 0;
  transform: translateX(100%);
}
.notification-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>`;
        // Home page
        files['src/views/HomeView.vue'] = `<template>
  <div class="max-w-4xl mx-auto">
    <div class="text-center mb-12">
      <h1 class="text-4xl font-bold text-gray-900 mb-4">
        Welcome to ${requirements.description?.split(' ').slice(0, 3).join(' ') || 'Vue App'}
      </h1>
      <p class="text-xl text-gray-600">
        ${requirements.description || 'A Vue.js application'}
      </p>
    </div>
    
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      <FeatureCard
        v-for="feature in features"
        :key="feature"
        :title="feature"
        :description="\`\${feature} implementation coming soon...\`"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import FeatureCard from '@/components/FeatureCard.vue'

const features = ${JSON.stringify(requirements.features || ['Feature 1', 'Feature 2', 'Feature 3'])}
</script>`;
        // Feature card component
        files['src/components/FeatureCard.vue'] = `<template>
  <div class="card hover:shadow-md transition-shadow">
    <h3 class="text-lg font-semibold mb-2">{{ title }}</h3>
    <p class="text-gray-600">{{ description }}</p>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title: string
  description: string
}

defineProps<Props>()
</script>`;
        // Auth-specific components
        if (hasAuth) {
            this.generateAuthComponents(requirements, files);
        }
    }
    generateAuthComponents(requirements, files) {
        // Login view
        files['src/views/LoginView.vue'] = `<template>
  <div class="max-w-md mx-auto mt-12">
    <div class="card">
      <h1 class="text-2xl font-bold text-center mb-6">Sign In</h1>
      
      <div
        v-if="error"
        class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4"
      >
        {{ error }}
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label for="email" class="form-label">Email</label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            required
            class="form-input"
            :disabled="loading"
          />
        </div>

        <div>
          <label for="password" class="form-label">Password</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            required
            class="form-input"
            :disabled="loading"
          />
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full btn btn-primary"
        >
          {{ loading ? 'Signing in...' : 'Sign In' }}
        </button>
      </form>

      <p class="text-center mt-4 text-gray-600">
        Don't have an account?
        <RouterLink to="/register" class="text-blue-600 hover:underline">
          Sign up
        </RouterLink>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const form = reactive({
  email: '',
  password: ''
})

const loading = ref(false)
const error = ref('')

const handleSubmit = async () => {
  try {
    loading.value = true
    error.value = ''
    
    await authStore.login(form.email, form.password)
    router.push('/dashboard')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Login failed'
  } finally {
    loading.value = false
  }
}
</script>`;
        // Register view
        files['src/views/RegisterView.vue'] = `<template>
  <div class="max-w-md mx-auto mt-12">
    <div class="card">
      <h1 class="text-2xl font-bold text-center mb-6">Sign Up</h1>
      
      <div
        v-if="error"
        class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4"
      >
        {{ error }}
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label for="name" class="form-label">Name</label>
          <input
            id="name"
            v-model="form.name"
            type="text"
            required
            class="form-input"
            :disabled="loading"
          />
        </div>

        <div>
          <label for="email" class="form-label">Email</label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            required
            class="form-input"
            :disabled="loading"
          />
        </div>

        <div>
          <label for="password" class="form-label">Password</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            required
            class="form-input"
            :disabled="loading"
          />
        </div>

        <div>
          <label for="confirmPassword" class="form-label">Confirm Password</label>
          <input
            id="confirmPassword"
            v-model="form.confirmPassword"
            type="password"
            required
            class="form-input"
            :disabled="loading"
          />
          <p
            v-if="form.password !== form.confirmPassword && form.confirmPassword"
            class="text-red-500 text-sm mt-1"
          >
            Passwords do not match
          </p>
        </div>

        <button
          type="submit"
          :disabled="loading || form.password !== form.confirmPassword"
          class="w-full btn btn-primary"
        >
          {{ loading ? 'Creating account...' : 'Sign Up' }}
        </button>
      </form>

      <p class="text-center mt-4 text-gray-600">
        Already have an account?
        <RouterLink to="/login" class="text-blue-600 hover:underline">
          Sign in
        </RouterLink>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const form = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const loading = ref(false)
const error = ref('')

const handleSubmit = async () => {
  if (form.password !== form.confirmPassword) {
    error.value = 'Passwords do not match'
    return
  }

  try {
    loading.value = true
    error.value = ''
    
    await authStore.register(form.name, form.email, form.password)
    router.push('/dashboard')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Registration failed'
  } finally {
    loading.value = false
  }
}
</script>`;
        // Dashboard view
        files['src/views/DashboardView.vue'] = `<template>
  <div>
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">
        Welcome back, {{ authStore.user?.name }}!
      </h1>
      <p class="text-gray-600">
        Here's what's happening with your account.
      </p>
    </div>

    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div class="card">
        <h3 class="text-lg font-semibold mb-2">Profile</h3>
        <p class="text-gray-600 mb-4">Manage your account settings</p>
        <button class="btn btn-primary">Update Profile</button>
      </div>

      <div class="card">
        <h3 class="text-lg font-semibold mb-2">Activity</h3>
        <p class="text-gray-600 mb-4">View your recent activity</p>
        <button class="btn btn-secondary">View Activity</button>
      </div>

      <div class="card">
        <h3 class="text-lg font-semibold mb-2">Settings</h3>
        <p class="text-gray-600 mb-4">Configure your preferences</p>
        <button class="btn btn-secondary">Open Settings</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
</script>`;
    }
    generateComposables(requirements, files) {
        // API composable
        files['src/composables/useApi.ts'] = `import { ref, reactive } from 'vue'
import axios, { type AxiosResponse } from 'axios'

interface UseApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export function useApi<T>(url: string) {
  const state = reactive<UseApiState<T>>({
    data: null,
    loading: false,
    error: null
  })

  const execute = async (): Promise<T> => {
    try {
      state.loading = true
      state.error = null
      
      const response: AxiosResponse<T> = await axios.get(url)
      state.data = response.data
      
      return response.data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred'
      state.error = errorMessage
      throw error
    } finally {
      state.loading = false
    }
  }

  return {
    ...state,
    execute
  }
}`;
        // Local storage composable
        files['src/composables/useLocalStorage.ts'] = `import { ref, watch } from 'vue'

export function useLocalStorage<T>(key: string, defaultValue: T) {
  const storedValue = localStorage.getItem(key)
  const initial = storedValue ? JSON.parse(storedValue) : defaultValue
  
  const value = ref<T>(initial)

  watch(
    value,
    (newValue) => {
      localStorage.setItem(key, JSON.stringify(newValue))
    },
    { deep: true }
  )

  return value
}`;
    }
    generateStore(requirements, files) {
        const hasAuth = requirements.features?.some((f) => f.toLowerCase().includes('auth'));
        // Auth store
        if (hasAuth) {
            files['src/stores/auth.ts'] = `import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/utils/api'

interface User {
  id: string
  name: string
  email: string
}

interface AuthState {
  user: User | null
  token: string | null
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('authToken'))
  
  const isAuthenticated = computed(() => !!user.value && !!token.value)

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password })
      const { user: userData, token: authToken } = response.data
      
      user.value = userData
      token.value = authToken
      localStorage.setItem('authToken', authToken)
      
      return userData
    } catch (error) {
      throw new Error('Invalid credentials')
    }
  }

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await api.post('/auth/register', { name, email, password })
      const { user: userData, token: authToken } = response.data
      
      user.value = userData
      token.value = authToken
      localStorage.setItem('authToken', authToken)
      
      return userData
    } catch (error) {
      throw new Error('Registration failed')
    }
  }

  const logout = () => {
    user.value = null
    token.value = null
    localStorage.removeItem('authToken')
  }

  const checkAuth = async () => {
    if (!token.value) return
    
    try {
      const response = await api.get('/auth/me')
      user.value = response.data
    } catch (error) {
      logout()
    }
  }

  return {
    user,
    token,
    isAuthenticated,
    login,
    register,
    logout,
    checkAuth
  }
})`;
        }
        // Notifications store
        files['src/stores/notifications.ts'] = `import { defineStore } from 'pinia'
import { ref } from 'vue'

interface Notification {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message?: string
  timeout?: number
}

export const useNotificationStore = defineStore('notifications', () => {
  const notifications = ref<Notification[]>([])

  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
    const newNotification = { ...notification, id }
    
    notifications.value.push(newNotification)

    // Auto-remove after timeout
    const timeout = notification.timeout || 5000
    setTimeout(() => {
      removeNotification(id)
    }, timeout)

    return id
  }

  const removeNotification = (id: string) => {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index > -1) {
      notifications.value.splice(index, 1)
    }
  }

  const clearAll = () => {
    notifications.value = []
  }

  // Convenience methods
  const success = (title: string, message?: string) => 
    addNotification({ type: 'success', title, message })
  
  const error = (title: string, message?: string) => 
    addNotification({ type: 'error', title, message })
  
  const info = (title: string, message?: string) => 
    addNotification({ type: 'info', title, message })
  
  const warning = (title: string, message?: string) => 
    addNotification({ type: 'warning', title, message })

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    success,
    error,
    info,
    warning
  }
})`;
    }
    generateRouter(requirements) {
        const hasAuth = requirements.features?.some((f) => f.toLowerCase().includes('auth'));
        return `import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
${hasAuth ? "import { useAuthStore } from '@/stores/auth'" : ''}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    ${hasAuth ? `
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { requiresGuest: true }
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'),
      meta: { requiresGuest: true }
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue'),
      meta: { requiresAuth: true }
    },` : ''}
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue')
    }
  ]
})

${hasAuth ? `
// Navigation guards
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login')
  } else if (to.meta.requiresGuest && authStore.isAuthenticated) {
    next('/dashboard')
  } else {
    next()
  }
})` : ''}

export default router`;
    }
    generateApiUtils() {
        return `import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = \`Bearer \${token}\`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api`;
    }
    async cleanup() {
        // Cleanup resources
    }
}
exports.default = FrontendVueAgent;
//# sourceMappingURL=frontend-vue-agent.js.map