// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-01-26',
  future: { compatibilityVersion: 4 },
  modules: [
    '@nuxthub/core',
    '@nuxtjs/color-mode',
    '@nuxt/fonts',
    '@nuxt/eslint',
    '@nuxtjs/i18n',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@unocss/nuxt',
    '@nuxtjs/device',
    'nuxt-auth-utils',
  ],
  hub: {
    blob: {
      driver: 'cloudflare-r2',
      binding: 'BLOB',
    },
    db: {
      dialect: 'sqlite',
      driver: 'd1',
    },
  },
  nitro: {
    preset: 'cloudflare_module',
    cloudflare: {
      deployConfig: true,
      nodeCompat: true,
    },
    routeRules: {
      '/photos/**': {
        headers: {
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      },
    },
  },
  components: [
    {
      path: '~/components/ui',
      prefix: '',
      extensions: ['vue'],
    },
    {
      path: '~/components/inspira',
      prefix: '',
      extensions: ['vue'],
    },
    {
      path: '~/components/ui-pro',
      prefix: '',
      extensions: ['vue'],
    },
    '~/components',
  ],
  imports: {
    presets: [
      { from: 'vue-sonner', imports: ['toast'] },
    ],
  },
  css: [
    '@unocss/reset/tailwind.css',
    'vue-sonner/style.css',
  ],
  colorMode: {
    classSuffix: '',
  },
  experimental: {
    viewTransition: true,
  },
  runtimeConfig: {
    galleryAccessSecret: process.env.NUXT_GALLERY_ACCESS_SECRET || process.env.NUXT_SESSION_PASSWORD,
    public: {
      title: process.env.NUXT_PUBLIC_TITLE,
      description: process.env.NUXT_PUBLIC_DESCRIPTION,
      disable3DCardDefault: process.env.NUXT_PUBLIC_DISABLE_3D_CARD_DEFAULT,
    },
  },
  i18n: {
    locales: [
      { code: 'en', iso: 'en-US', file: 'en.yml' },
      { code: 'zh', iso: 'zh-CN', file: 'zh.yml' },
    ],
    defaultLocale: 'en',
  },
  devtools: { enabled: true },
  eslint: {
    config: {
      standalone: false,
      nuxt: {
        sortConfigKeys: true,
      },
    },
  },
  build: {
    transpile: [/@jsquash\//],
  },
  vite: {
    optimizeDeps: {
      exclude: ['@jsquash/avif', '@jsquash/jpeg', '@jsquash/png', '@jsquash/resize', '@jsquash/webp'],
      include: [
        '@lucide/vue',
        'clsx',
        'nuxt > @nuxt/devtools > @vitejs/devtools-kit/client',
        'nuxt > @nuxt/devtools > @vitejs/devtools/client/inject',
        'nuxt > @nuxt/devtools > @vitejs/devtools-core',
        'nuxt > @nuxt/devtools > @vitejs/devtools/client/inject',
        'reka-ui',
        'tailwind-merge',
        'vue-sonner',
      ],
    },
    worker: {
      format: 'es',
    },
    plugins: [
      {
        name: 'expose-theme',
        transform(src, id) {
          if (id.includes('unocss-preset-shadcn')) {
            return {
              code: `${src}\nexport { theme };\n`,
            }
          }
        },
      },
    ],
  },
})
