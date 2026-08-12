<script setup lang="ts">
const enabled = ref(false)
const password = ref('')
const passwordConfigured = ref(false)
const loading = ref(true)
const saving = ref(false)

async function load() {
  loading.value = true
  try {
    const data = await $fetch<{ enabled: boolean, passwordConfigured: boolean }>('/api/site-access')
    enabled.value = data.enabled
    passwordConfigured.value = data.passwordConfigured
  }
  finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  try {
    const body: { enabled: boolean, password?: string } = { enabled: enabled.value }
    if (password.value)
      body.password = password.value

    const data = await $fetch<{ enabled: boolean, passwordConfigured: boolean }>('/api/site-access', {
      method: 'PUT',
      body,
    })

    enabled.value = data.enabled
    passwordConfigured.value = data.passwordConfigured
    password.value = ''
    toast.success('Gallery access settings saved')
  }
  catch (err: any) {
    toast.error(err?.data?.statusMessage || 'Failed to save settings')
  }
  finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <Card class="mb-4">
    <CardHeader>
      <CardTitle class="flex gap-2 items-center">
        <div class="i-lucide-lock-keyhole" />
        Gallery access
      </CardTitle>
      <CardDescription>
        Protect the public gallery with a password. Image files and public APIs are protected too.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div v-if="loading" class="text-sm text-muted-foreground">Loading...</div>
      <div v-else class="flex flex-col gap-5">
        <div class="flex gap-3 items-center">
          <Checkbox id="gallery-access-enabled" v-model:checked="enabled" />
          <label for="gallery-access-enabled" class="font-medium cursor-pointer">
            Enable password access
          </label>
        </div>

        <div class="flex flex-col gap-2 max-w-lg">
          <label class="text-sm font-medium">Access password</label>
          <Input
            v-model="password"
            type="password"
            autocomplete="new-password"
            :placeholder="passwordConfigured ? 'Leave empty to keep current password' : 'Set an access password'"
          />
          <p class="text-xs text-muted-foreground">
            {{ passwordConfigured ? 'A password is configured.' : 'No password has been configured yet.' }}
          </p>
        </div>

        <div>
          <Button :disabled="saving || (enabled && !passwordConfigured && !password)" @click="save">
            {{ saving ? 'Saving...' : 'Save access settings' }}
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
