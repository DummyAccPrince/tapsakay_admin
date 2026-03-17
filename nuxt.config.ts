// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: false,
  modules: [
    '@nuxtjs/supabase',
    '@nuxtjs/tailwindcss'
  ],
  supabase: {
    redirect: false,
    url: 'https://spcdcbjqvnrqxduzueiv.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwY2RjYmpxdm5ycXhkdXp1ZWl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4ODI2NTYsImV4cCI6MjA3NjQ1ODY1Nn0.N-ySUqDDDNnqCTqRwxhKpwWxQ1sPugvkhn5kO2M5KgI'
  },
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      title: 'Tapsakay Admin',
      meta: [
        { name: 'description', content: 'Tapsakay Admin Dashboard' }
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&family=Cinzel:wght@400;500;600;700;800;900&display=swap' }
      ]
    }
  }
})
