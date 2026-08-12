<script setup lang="ts">
defineProps<{
  demo?: boolean
}>()

const { loggedIn } = useUserSession()
const { orderBy, order } = usePhotoSort()

const LIMIT = 36
const params = computed(() => ({
  hidden: false,
  orderBy: orderBy.value,
  order: order.value,
}))

const { photos, hasMore, loadMore, loading } = usePhotosInfinite(params, LIMIT)

useInfiniteScroll(window, loadMore, { distance: 320, canLoadMore: () => hasMore.value })

function getPhotoThumbnail(photo: IPhoto) {
  const path = photo.thumbnail || photo.jpeg || photo.webp || photo.avif
  if (!path)
    throw new Error('Photo has no Image File')
  return path
}

const { deletingPhoto, deletePhoto: _deletePhoto } = useDeletePhoto()
function deletePhoto(id: string) {
  _deletePhoto(id).then(() =>
    photos.value = photos.value.filter(photo => photo.id !== id),
  )
}

const selectedPhoto = ref<IPhoto>()

function openEditDialog(photo: IPhoto) {
  selectedPhoto.value = photo
}
</script>

<template>
  <div class="p-4 flex flex-col gap-4">
    <SiteAccessSettings v-if="!demo" />
    <NuxtLinkLocale :to="demo ? '/admin/demo/upload' : '/admin/upload'">
      <div class="group p-4 border border-muted rounded-lg bg-background flex flex-col w-full items-center justify-center relative overflow-hidden md:shadow-xl">
        <span class="text-5xl text-transparent leading-none font-semibold my-8 text-center pointer-events-none whitespace-pre-wrap from-black to-gray-300/80 bg-gradient-to-b bg-clip-text dark:from-white dark:to-slate-900/10">
          {{ $t('go_to_upload') }}
        </span>
        <BorderBeam
          color-from="oklch(var(--primary))"
          color-to="oklch(var(--primary-foreground))"
          :duration="2"
          :border-width="4"
        />
      </div>
    </NuxtLinkLocale>
    <div
      v-if="photos && photos.length"
      class="gap-2px grid grid-cols-3 2xl:grid-cols-8 lg:grid-cols-5 sm:grid-cols-4 xl:grid-cols-6"
    >
      <div
        v-for="photo in photos"
        :key="photo.id"
        class="group p-2 border rounded-lg border-dashed relative hover:bg-muted"
      >
        <div class="rounded-lg flex h-auto w-full aspect-[4/3]">
          <div class="gap-1 hidden right--0 top--0 absolute z-[9999] group-hover:flex lt-md:translate-y--100% sm:right-1 sm:top-1">
            <EditPhotoDialog
              :photo="selectedPhoto"
            >
              <Button
                size="icon"
                @click="openEditDialog(photo)"
              >
                <div class="i-lucide-edit" />
              </Button>
            </EditPhotoDialog>
            <ProButton
              :loading="deletingPhoto === photo.id"
              :disabled="!loggedIn"
              variant="destructive"
              size="icon"
              @click="loggedIn && deletePhoto(photo.id)"
            >
              <div class="i-lucide-trash" />
            </ProButton>
          </div>
          <img
            v-if="photo"
            :src="`/photos/${getPhotoThumbnail(photo)}`"
            class="m-auto rounded-md shadow-black/50 shadow-lg object-cover"
            :class="photo.aspectRatio ? photo.aspectRatio > (4 / 3) ? 'w-full h-auto' : 'h-full w-auto' : 'h-full w-full'"
            :alt="photo.semanticDescription || photo.caption || photo.title"
          >
        </div>
        <div class="mt-2">
          <div class="flex gap-2 items-center justify-center">
            <span> {{ photo.title }}</span>
          </div>
          <div class="flex gap-2 items-center justify-center">
            <span class="text-sm text-muted-foreground">{{ photo.caption }}</span>
          </div>
          <div class="flex flex-wrap gap-x-1 gap-y-0 justify-center">
            <Tag
              v-for="tag in (photo.tags ? photo.tags.split(',') : [])"
              :key="tag" :label="tag"
              class="text-sm text-muted-foreground"
            />
          </div>
        </div>
      </div>
      <template v-if="loading">
        <div v-for="i in LIMIT" :key="i">
          <Skeleton class="rounded-lg w-full aspect-[4/3]" />
        </div>
      </template>
    </div>
  </div>
</template>
