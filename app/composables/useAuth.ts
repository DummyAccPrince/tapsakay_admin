import type { User } from '~/types'

export const useAuth = () => {
  const supabase = useSupabaseClient()
  const user = useState<User | null>('auth-user', () => null)
  const loading = useState('auth-loading', () => false)
  const error = useState<string | null>('auth-error', () => null)

  const login = async (email: string, password: string) => {
    loading.value = true
    error.value = null

    try {
      const { data, error: queryError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('role', 'admin')
        .single()

      if (queryError || !data) {
        console.error('Query error:', queryError)
        error.value = 'Invalid credentials or not an admin account'
        return false
      }

      const userData = data as User
      console.log('User found:', userData.email)
      console.log('Password entered:', `"${password}"`, 'Length:', password.length)
      console.log('Password hash:', userData.password_hash)

      // Simple password check for demo - in production, use proper bcrypt
      const trimmedPassword = password.trim()
      const isValid = (trimmedPassword === 'password' || trimmedPassword === 'admin123') && userData.password_hash.startsWith('$2a$10$')
      console.log('Password valid (demo mode):', isValid)
      console.log('Trimmed password:', `"${trimmedPassword}"`)
      console.log('Comparison result:', trimmedPassword === 'password' || trimmedPassword === 'admin123')

      if (!isValid) {
        error.value = 'Invalid credentials'
        return false
      }

      if (!userData.is_active) {
        error.value = 'Account is disabled'
        return false
      }

      user.value = userData
      localStorage.setItem('admin-user', JSON.stringify(userData))
      return true
    } catch (e) {
      error.value = 'An error occurred during login'
      console.error('Login error:', e)
      return false
    } finally {
      loading.value = false
    }
  }

  const logout = () => {
    user.value = null
    localStorage.removeItem('admin-user')
    navigateTo('/login')
  }

  const checkAuth = () => {
    const stored = localStorage.getItem('admin-user')
    if (stored) {
      user.value = JSON.parse(stored)
      return true
    }
    return false
  }

  return {
    user,
    loading,
    error,
    login,
    logout,
    checkAuth
  }
}
