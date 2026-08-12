<script setup lang="ts">
const password = ref('')
const loading = ref(false)
const error = ref('')

async function login() {
  if (!password.value)
    return

  loading.value = true
  error.value = ''
  try {
    await $fetch('/api/site-access/login', {
      method: 'POST',
      body: { password: password.value },
    })
    window.location.assign('/')
  }
  catch (err: any) {
    error.value = err?.data?.statusMessage || 'Invalid password'
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-6 bg-background">
    <Card class="w-full max-w-md">
      <CardHeader class="text-center">
        <CardTitle class="text-2xl">Gallery is protected</CardTitle>
        <CardDescription>Enter the access password to continue.</CardDescription>
      </CardHeader>
      <CardContent>
        <form class="flex flex-col gap-4" @submit.prevent="login">
          <Input
            v-model="password"
            type="password"
            autocomplete="current-password"
            placeholder="Access password"
            autofocus
          />
          <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
          <Button type="submit" :disabled="loading || !password">
            {{ loading ? 'Checking...' : 'Enter gallery' }}
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
