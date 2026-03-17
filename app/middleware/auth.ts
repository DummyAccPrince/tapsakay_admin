export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) return

  const stored = localStorage.getItem('admin-user')
  
  if (!stored && to.path !== '/login') {
    return navigateTo('/login')
  }
  
  if (stored && to.path === '/login') {
    return navigateTo('/')
  }
})
