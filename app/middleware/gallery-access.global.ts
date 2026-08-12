export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/access' || to.path.startsWith('/admin'))
    return

  const { data } = await useFetch<{ enabled: boolean, authorized: boolean }>('/api/site-access', {
    key: 'gallery-access-status',
    server: true,
    lazy: false,
  })

  if (data.value?.enabled && !data.value.authorized)
    return navigateTo('/access')
})
