<script setup lang="ts">
import { Bus, Loader2 } from 'lucide-vue-next'

definePageMeta({
  layout: false,
  middleware: 'auth'
})

const { login, loading, error } = useAuth()

const email = ref('')
const password = ref('')

const handleSubmit = async () => {
  const success = await login(email.value, password.value)
  if (success) {
    navigateTo('/')
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
    <div class="w-full max-w-md">
      <div class="bg-white rounded-2xl shadow-xl p-8">
        <div class="flex flex-col items-center mb-8">
          <div class="flex items-center gap-2 mb-2">
            <Bus class="h-10 w-10 text-primary" />
            <span class="text-2xl font-bold text-primary">Tapsakay</span>
          </div>
          <h1 class="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
          <p class="text-sm text-gray-500 mt-1">Sign in to your account</p>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-5">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 mb-1.5">
              Email
            </label>
            <UiInput
              id="email"
              v-model="email"
              type="email"
              placeholder="admin@tapsakay.com"
              required
            />
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 mb-1.5">
              Password
            </label>
            <UiInput
              id="password"
              v-model="password"
              type="password"
              placeholder="••••••••"
              required
            />
          </div>

          <div v-if="error" class="rounded-md bg-red-50 p-3">
            <p class="text-sm text-red-700">{{ error }}</p>
          </div>

          <UiButton
            type="submit"
            class="w-full"
            :disabled="loading"
          >
            <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
            {{ loading ? 'Signing in...' : 'Sign in' }}
          </UiButton>
        </form>
      </div>
    </div>
  </div>
</template>
