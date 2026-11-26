<template>
  <div
    ref="homePage"
    class="homePage"
    :aria-busy="!activityReady"
  >
    <FtCard class="homeIntro">
      <div class="homeHeading">
        <h1 class="pageTitle">
          <FtIcon
            :icon="['fas', 'house']"
            class="headingIcon"
          />
          {{ t('Home Page.Home') }}
        </h1>
        <p>{{ t('Home Page.Description') }}</p>
        <FtButton
          :label="customizing ? t('Home Page.Done') : t('Home Page.Customize')"
          :icon="customizing ? ['fas', 'check'] : ['fas', 'sliders']"
          :background-color="customizing ? 'var(--primary-color)' : 'var(--secondary-card-bg-color)'"
          :text-color="customizing ? 'var(--text-with-main-color)' : 'var(--primary-text-color)'"
          @click="customizing = !customizing"
        />
      </div>

      <section
        v-if="customizing"
        class="sectionCustomizer"
        :aria-label="t('Home Page.Customize')"
      >
        <p>{{ t('Home Page.Customize description') }}</p>
        <ol class="customizerList">
          <li
            v-for="(section, index) in configurableSections"
            :key="section.id"
            class="customizerItem"
            :data-home-section-id="section.id"
            :class="{ dragging: draggedSectionId === section.id }"
            :style="sectionRowStyle(section.id)"
          >
            <span
              class="dragHandle"
              aria-hidden="true"
              @dragstart.prevent
              @pointerdown="startSectionDrag($event, section.id)"
              @pointermove="moveSectionDrag"
              @pointerup="endSectionDrag"
              @pointercancel="cancelSectionDrag"
              @lostpointercapture="cancelSectionDrag"
            >
              <FtIcon :icon="['fas', 'grip']" />
            </span>
            <FtToggleSwitch
              :label="sectionLabel(section.id)"
              :default-value="section.visible"
              compact
              @change="setSectionVisibility(section.id, $event)"
            />
            <div class="reorderButtons">
              <FtIconButton
                :title="t('Home Page.Move section up', { section: sectionLabel(section.id) })"
                :icon="['fas', 'arrow-up']"
                :disabled="index === 0"
                theme="base-no-default"
                @click="moveSection(section.id, -1)"
              />
              <FtIconButton
                :title="t('Home Page.Move section down', { section: sectionLabel(section.id) })"
                :icon="['fas', 'arrow-down']"
                :disabled="index === configurableSections.length - 1"
                theme="base-no-default"
                @click="moveSection(section.id, 1)"
              />
            </div>
          </li>
        </ol>
        <p
          class="reorderStatus"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {{ reorderStatus }}
        </p>
      </section>
    </FtCard>

    <FtCard
      v-if="allSectionsHidden || (activityReady && !hasVisibleActivity)"
      class="emptyState"
    >
      <FtIcon :icon="['fas', 'clapperboard']" />
      <h2>
        {{ allSectionsHidden ? t('Home Page.All sections hidden') : t('Home Page.Nothing here yet') }}
      </h2>
      <p>
        {{ allSectionsHidden ? t('Home Page.All sections hidden description') : t('Home Page.Empty description') }}
      </p>
    </FtCard>

    <template
      v-for="section in renderedSections"
      :key="section.id"
    >
      <FtCard
        v-if="section.id === 'continueWatching'"
        class="homeSection"
        data-home-section="continueWatching"
      >
        <HomeSectionHeading
          :title="sectionLabel(section.id)"
          :icon="['fas', 'clock-rotate-left']"
          to="/history"
        />
        <HomeShelf
          :items="continueWatching"
          :label="sectionLabel(section.id)"
        >
          <template #default="{ items }">
            <ul class="mediaGrid">
              <li
                v-for="video in items"
                :key="video.videoId"
              >
                <RouterLink
                  :to="continueWatchingRoute(video)"
                  :data-tab-title="video.title"
                  @click.capture="activateExistingContinueWatchingTab($event, video)"
                >
                  <span class="mediaThumbnail">
                    <FtRetryImage
                      :src="videoThumbnail(video)"
                      sizes="144px"
                      :class="{ blur: blurThumbnails }"
                      width="160"
                      height="90"
                      loading="lazy"
                    />
                    <span
                      class="watchProgress"
                      :style="{ inlineSize: watchProgressPercent(video) }"
                      aria-hidden="true"
                    />
                  </span>
                  <span class="mediaDetails">
                    <strong
                      dir="auto"
                      :title="video.title"
                    >{{ video.title }}</strong>
                    <span dir="auto">{{ video.author }}</span>
                  </span>
                </RouterLink>
              </li>
            </ul>
          </template>
        </HomeShelf>
      </FtCard>

      <FtCard
        v-else-if="section.id === 'newSinceLastVisit'"
        class="homeSection"
        data-home-section="newSinceLastVisit"
      >
        <HomeSectionHeading
          :title="sectionLabel(section.id)"
          :icon="['fas', 'fire']"
          :to="newSubscriptionFeedRoute"
        />
        <HomeShelf
          :items="newSubscriptionEntries"
          :label="sectionLabel(section.id)"
        >
          <template #default="{ items }">
            <ul class="mediaGrid newSubscriptionGrid">
              <li
                v-for="item in items"
                :key="item.entry.videoId ?? item.entry.postId"
              >
                <FtBlockedItem
                  :blocked="isBlurredByBlockLists(item.entry, { useChannelsHidden: false })"
                  :reveal-key="item.entry.videoId ?? item.entry.postId"
                >
                  <RouterLink
                    :to="newSubscriptionEntryRoute(item)"
                    :data-tab-title="newSubscriptionEntryTabTitle(item.entry)"
                  >
                    <span class="mediaThumbnail">
                      <FtRetryImage
                        v-if="item.entry.videoId"
                        :src="videoThumbnail(item.entry)"
                        sizes="144px"
                        :class="{ blur: blurThumbnails }"
                        width="160"
                        height="90"
                        loading="lazy"
                      />
                      <span
                        v-else
                        class="newPostVisual"
                        aria-hidden="true"
                      >
                        <FtIcon :icon="['fas', 'message']" />
                      </span>
                      <span class="newContentType">
                        <FtIcon
                          :icon="newSubscriptionCategoryIcon(item.category)"
                          aria-hidden="true"
                        />
                        {{ newSubscriptionCategoryLabel(item.category) }}
                      </span>
                    </span>
                    <span class="mediaDetails">
                      <strong
                        dir="auto"
                        :title="newSubscriptionEntryTitle(item.entry)"
                      >{{ newSubscriptionEntryTitle(item.entry) }}</strong>
                      <span dir="auto">{{ item.entry.author }}</span>
                    </span>
                  </RouterLink>
                </FtBlockedItem>
              </li>
            </ul>
          </template>
        </HomeShelf>
      </FtCard>

      <FtCard
        v-else-if="section.id === 'watchQueue'"
        class="homeSection"
        data-home-section="watchQueue"
      >
        <HomeSectionHeading
          :title="sectionLabel(section.id)"
          :icon="['fas', 'bars-progress']"
        />
        <HomeShelf
          :items="watchQueue"
          :label="sectionLabel(section.id)"
        >
          <template #default="{ items }">
            <ul class="mediaGrid">
              <li
                v-for="video in items"
                :key="video.queueItemId"
              >
                <RouterLink
                  :to="video.route ?? `/watch/${video.videoId}`"
                  :data-tab-title="video.title"
                  @click="playQueuedVideo(video, $event)"
                >
                  <span class="mediaThumbnail">
                    <FtRetryImage
                      :src="videoThumbnail(video)"
                      sizes="144px"
                      :class="{ blur: blurThumbnails }"
                      width="160"
                      height="90"
                      loading="lazy"
                    />
                  </span>
                  <span class="mediaDetails">
                    <strong
                      dir="auto"
                      :title="video.title"
                    >{{ video.title }}</strong>
                    <span dir="auto">{{ video.author }}</span>
                  </span>
                </RouterLink>
              </li>
            </ul>
          </template>
        </HomeShelf>
      </FtCard>

      <FtCard
        v-else-if="section.id === 'playlists'"
        class="homeSection"
        data-home-section="playlists"
      >
        <HomeSectionHeading
          :title="sectionLabel(section.id)"
          :icon="['far', 'bookmark']"
          to="/userplaylists"
        />
        <HomeShelf
          :items="recentPlaylists"
          :label="sectionLabel(section.id)"
        >
          <template #default="{ items }">
            <ul class="mediaGrid">
              <li
                v-for="playlist in items"
                :key="playlist._id"
              >
                <RouterLink
                  :to="{ path: `/playlist/${playlist._id}`, query: { playlistType: 'user' } }"
                  :data-tab-title="playlist.playlistName"
                >
                  <span class="mediaThumbnail playlistThumbnail">
                    <FtRetryImage
                      :src="playlistThumbnail(playlist)"
                      sizes="144px"
                      :class="{ blur: blurThumbnails }"
                      width="160"
                      height="90"
                      loading="lazy"
                    />
                    <span class="playlistCount">
                      {{ playlist.videos.length }}
                      <FtIcon :icon="['fas', 'list']" />
                    </span>
                  </span>
                  <span class="mediaDetails">
                    <strong
                      dir="auto"
                      :title="playlist.playlistName"
                    >{{ playlist.playlistName }}</strong>
                    <span>{{ t('Global.Counts.Video Count', { count: playlist.videos.length }, playlist.videos.length) }}</span>
                  </span>
                </RouterLink>
              </li>
            </ul>
          </template>
        </HomeShelf>
      </FtCard>

      <FtCard
        v-else-if="section.id === 'recentDownloads'"
        class="homeSection"
        data-home-section="recentDownloads"
      >
        <HomeSectionHeading
          :title="sectionLabel(section.id)"
          :icon="['fas', 'download']"
          view-all-button
          @view-all="openDownloads"
        />
        <HomeShelf
          :items="recentDownloadEntries"
          :label="sectionLabel(section.id)"
          :item-min-width="320"
          :item-gap="10"
        >
          <template #default="{ items }">
            <ul class="activityList">
              <li
                v-for="{ download, route } in items"
                :key="download.id"
                class="recentDownloadItem"
              >
                <component
                  :is="route ? RouterLink : 'button'"
                  class="activityLink"
                  v-bind="route ? { to: route, 'data-tab-title': download.title } : { type: 'button', onClick: openDownloads }"
                >
                  <span class="activityIcon">
                    <FtIcon :icon="['fas', 'download']" />
                  </span>
                  <span class="activityDetails">
                    <strong dir="auto">{{ download.title }}</strong>
                    <span>{{ downloadStatus(download) }}</span>
                  </span>
                </component>
              </li>
            </ul>
          </template>
        </HomeShelf>
      </FtCard>

      <FtCard
        v-else-if="section.id === 'reminders'"
        class="homeSection"
        data-home-section="reminders"
      >
        <HomeSectionHeading
          :title="sectionLabel(section.id)"
          :icon="['fas', 'clock']"
        />
        <HomeShelf
          :items="reminders"
          :label="sectionLabel(section.id)"
          :item-min-width="320"
          :item-gap="10"
        >
          <template #default="{ items }">
            <ul class="activityList">
              <li
                v-for="reminder in items"
                :key="reminder.videoId"
              >
                <span class="activityIcon">
                  <FtIcon :icon="['fas', 'clock']" />
                </span>
                <RouterLink
                  class="activityDetails reminderLink"
                  :to="`/watch/${reminder.videoId}`"
                >
                  <strong dir="auto">{{ reminder.notificationBody }}</strong>
                  <span>{{ formatReminderTime(reminder.startTimestamp) }}</span>
                </RouterLink>
              </li>
            </ul>
          </template>
        </HomeShelf>
      </FtCard>

      <FtCard
        v-else-if="section.id === 'watchStats'"
        class="homeSection"
        data-home-section="watchStats"
      >
        <HomeSectionHeading
          :title="sectionLabel(section.id)"
          :icon="['fas', 'chart-line']"
          to="/stats"
        />
        <div
          class="statsSummary"
          :aria-label="t('Stats.Watch time summary')"
        >
          <div>
            <span>{{ t('Stats.Today') }}</span>
            <strong>{{ formatDuration(todayWatchSeconds) }}</strong>
          </div>
          <div>
            <span>{{ t('Stats.This week') }}</span>
            <strong>{{ formatDuration(currentWeekWatchSeconds) }}</strong>
          </div>
        </div>
      </FtCard>
    </template>
  </div>
</template>

<script setup>
import { FtIcon } from '@opentubex/icons'
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'

import FtBlockedItem from '../../components/FtBlockedItem/FtBlockedItem.vue'
import { clampOverlayScrollTop } from '../../helpers/overlayScrollbars'
import FtButton from '../../components/FtButton/FtButton.vue'
import FtCard from '../../components/ft-card/ft-card.vue'
import FtIconButton from '../../components/FtIconButton/FtIconButton.vue'
import FtRetryImage from '../../components/FtRetryImage.vue'
import FtToggleSwitch from '../../components/FtToggleSwitch/FtToggleSwitch.vue'
import HomeShelf from './HomeShelf.vue'
import HomeSectionHeading from './HomeSectionHeading.vue'

import store from '../../store/index'
import {
  getRecentDownloads,
  normalizeHomeSectionLayout,
} from '../../helpers/homeSections'
import { isBlurredByBlockLists } from '../../helpers/blockedItems'
import { liveReminder, supportsLiveReminders } from '../../helpers/liveReminders'
import { useHomeNewSubscriptionEntries } from '../../helpers/sharedNewSubscriptionFeed'
import { supportsYtDlp } from '../../helpers/ytDlpCapabilities'
import { getExternalMediaHistoryId, isExternalMediaHistoryId } from '../../helpers/externalMediaHistory'
import { getPostTabTitle } from '../../helpers/tabTitles'
import thumbnailPlaceholder from '../../assets/img/thumbnail_placeholder.svg'
import { formatDateTime } from '../../helpers/dateFormat'
import { useOrderedItemReorder } from '../../composables/useOrderedItemReorder'
import { moveItemByVisibleOffset } from '../../../orderedItems'

const { locale, t } = useI18n()
const IS_ELECTRON = process.env.IS_ELECTRON
const customizing = ref(false)
const activityReady = ref(false)
const revealedSectionCount = ref(0)
let activityFrame = null
const homePage = useTemplateRef('homePage')
let homeResizeObserver = null
const reorderStatus = ref('')
const reminders = ref([])
const dateFormat = computed(() => store.getters.getDateFormat)
const timeFormat = computed(() => store.getters.getTimeFormat)
let removeReminderListener = null
let reminderLoadGeneration = 0

const sectionLayout = computed(() => normalizeHomeSectionLayout(store.getters.getHomeSectionLayout))
const sectionLayoutIds = computed(() => sectionLayout.value.map(section => section.id))
const supportedSectionIds = computed(() => new Set(sectionLayout.value
  .map(section => section.id)
  .filter(id => supportsYtDlp || id !== 'recentDownloads')
  .filter(id => (supportsLiveReminders && store.getters.getNotificationMode !== 'off') || id !== 'reminders')))
const configurableSections = computed(() => (
  sectionLayout.value.filter(section => supportedSectionIds.value.has(section.id))
))
const visibleSections = computed(() => configurableSections.value.filter(section => section.visible))
const allSectionsHidden = computed(() => visibleSections.value.length === 0)

const continueWatching = computed(() => store.getters.getContinueWatchingHistory())
const watchQueue = computed(() => store.getters.getWatchQueue)
const recentPlaylists = computed(() => store.getters.getAllPlaylists
  .filter(playlist => playlist.videos.length > 0 || !['favorites', 'watchLater'].includes(playlist._id))
  .toSorted((a, b) => {
    const aTimestamp = a.lastPlayedAt ?? a.lastUpdatedAt ?? a.createdAt ?? 0
    const bTimestamp = b.lastPlayedAt ?? b.lastUpdatedAt ?? b.createdAt ?? 0
    return bTimestamp - aTimestamp
  }))
// Downloads without a playable file open the Downloads window instead.
const recentDownloadEntries = computed(() => getRecentDownloads(store.getters.getYtDlpDownloads)
  .map(download => ({ download, route: downloadRoute(download) })))
const newSubscriptionEntries = useHomeNewSubscriptionEntries()
const newSubscriptionFeedRoute = Object.freeze({
  path: '/subscriptions',
  query: { tab: 'new' },
})
const watchSecondsByDate = computed(() => store.getters.getWatchSecondsByDate)
const todayWatchSeconds = computed(() => watchSecondsByDate.value[toDateKey(new Date())] ?? 0)
const statsWeekStartsOn = computed(() => Number(store.getters.getStatsWeekStartsOn))
const currentWeekWatchSeconds = computed(() => {
  const weekStart = toDateKey(startOfWeek(new Date()))
  return Object.entries(watchSecondsByDate.value).reduce((total, [date, seconds]) => {
    return date >= weekStart ? total + seconds : total
  }, 0)
})
const hasWatchStats = computed(() => Object.values(watchSecondsByDate.value)
  .some(seconds => seconds > 0))
const watchStatsAvailable = computed(() => (
  store.getters.getRememberHistory && store.getters.getEnableWatchStats
))
const blurThumbnails = computed(() => store.getters.getBlurThumbnails)
const thumbnailPreference = computed(() => store.getters.getThumbnailPreference)
const thumbnailOrigin = computed(() => store.getters.getBackendPreference === 'invidious'
  ? store.getters.getCurrentInvidiousInstanceUrl
  : 'https://i.ytimg.com')

const sectionDefinitions = computed(() => ({
  continueWatching: {
    label: t('Home Page.Continue watching'),
    get hasContent() { return continueWatching.value.length > 0 },
  },
  newSinceLastVisit: {
    label: t('Home Page.New since last visit'),
    get hasContent() { return store.getters.getShowNewSubscriptionFeed && newSubscriptionEntries.value.length > 0 },
  },
  watchQueue: {
    label: t('Home Page.Watch queue'),
    get hasContent() { return watchQueue.value.length > 0 },
  },
  playlists: {
    label: t('Home Page.Recent playlists'),
    get hasContent() { return recentPlaylists.value.length > 0 },
  },
  recentDownloads: {
    label: t('Home Page.Recent downloads'),
    get hasContent() { return recentDownloadEntries.value.length > 0 },
  },
  reminders: {
    label: t('Home Page.Upcoming reminders'),
    get hasContent() { return reminders.value.length > 0 },
  },
  watchStats: {
    label: t('Home Page.Watch statistics'),
    get hasContent() { return watchStatsAvailable.value && hasWatchStats.value },
  },
}))

const renderedSections = computed(() => {
  const sections = activityReady.value
    ? visibleSections.value
    : visibleSections.value.slice(0, revealedSectionCount.value)
  return sections.filter(section => sectionDefinitions.value[section.id].hasContent)
})
const hasVisibleActivity = computed(() => renderedSections.value.length > 0)

const sectionLabel = sectionId => sectionDefinitions.value[sectionId]?.label ?? sectionId

function videoThumbnail(video) {
  if (thumbnailPreference.value === 'hidden') { return thumbnailPlaceholder }

  const storedVideo = store.getters.getHistoryCacheById[video.videoId]
  return video.thumbnailUrl || video.thumbnail ||
    storedVideo?.thumbnailUrl || storedVideo?.thumbnail ||
    (isExternalMediaHistoryId(video.videoId) ? thumbnailPlaceholder : `${thumbnailOrigin.value}/vi/${video.videoId}/maxresdefault.jpg`)
}

function playlistThumbnail(playlist) {
  if (thumbnailPreference.value === 'hidden') return thumbnailPlaceholder
  if (playlist.customThumbnail) return playlist.customThumbnail
  return playlist.videos.length > 0
    ? videoThumbnail(playlist.videos[0])
    : thumbnailPlaceholder
}

function newSubscriptionEntryTitle(entry) {
  return entry.title ?? entry.postText ?? t('Global.Posts')
}

/** Matches the title the opened page shows. */
function newSubscriptionEntryTabTitle(entry) {
  return entry.postId ? getPostTabTitle(entry.author) : entry.title
}

function newSubscriptionCategoryLabel(category) {
  switch (category) {
    case 'videos': return t('Global.Videos')
    case 'shorts': return t('Global.Shorts')
    case 'live': return t('Global.Live')
    case 'posts': return t('Global.Posts')
    default: return category
  }
}

function newSubscriptionCategoryIcon(category) {
  switch (category) {
    case 'videos': return ['fas', 'video']
    case 'shorts': return ['fas', 'clapperboard']
    case 'live': return ['fas', 'tower-broadcast']
    default: return ['fas', 'message']
  }
}

function newSubscriptionEntryRoute({ category, entry }) {
  if (entry.postId) {
    return {
      path: `/post/${entry.postId}`,
      query: entry.authorId ? { authorId: entry.authorId } : undefined,
    }
  }

  const query = {}
  if (category === 'shorts') {
    query.short = 'true'
    query.shortSource = 'subscriptions'
  }

  return { path: `/watch/${entry.videoId}`, query }
}

function watchProgressPercent(video) {
  const progress = Number(video.watchProgress)
  const duration = Number(video.lengthSeconds)
  if (!Number.isFinite(progress) || !Number.isFinite(duration) || duration <= 0) {
    return '0%'
  }

  return `${Math.min(100, Math.max(0, progress / duration * 100))}%`
}

function playQueuedVideo(video, event) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return
  }

  store.commit('removeVideoFromWatchQueue', video.queueItemId)
  store.commit('setPlayedQueueVideoId', video.videoId)
}

function continueWatchingRoute(video) {
  return isExternalMediaHistoryId(video.videoId)
    ? { path: '/external-media', query: { url: video.videoId } }
    : `/watch/${video.videoId}`
}

function activateExistingContinueWatchingTab(event, video) {
  if (
    !IS_ELECTRON ||
    event.button !== 0 ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return
  }

  const external = isExternalMediaHistoryId(video.videoId)
  const videoTab = store.getters.getTabs.find(tab => tab.isActivatable && (external
    ? tab.route.path === '/external-media' && getExternalMediaHistoryId(tab.route.query?.url) === video.videoId
    : tab.route.path === `/watch/${video.videoId}`))
  if (videoTab == null) { return }

  event.preventDefault()
  store.dispatch('activateTab', videoTab.id)
}

function setSectionVisibility(sectionId, visible) {
  const updated = sectionLayout.value.map(section => (
    section.id === sectionId ? { ...section, visible } : section
  ))
  store.dispatch('updateHomeSectionLayout', updated)
}

function updateSectionOrder(ids) {
  const sectionsById = new Map(sectionLayout.value.map(section => [section.id, section]))
  return store.dispatch('updateHomeSectionLayout', ids.map(id => sectionsById.get(id)))
}

function announceSectionMoved(sectionId, position) {
  reorderStatus.value = t('Home Page.Section moved', {
    section: sectionLabel(sectionId),
    position: position + 1,
    total: configurableSections.value.length,
  })
}

function moveSection(sectionId, offset) {
  const visibleIds = configurableSections.value.map(section => section.id)
  const reordered = moveItemByVisibleOffset(sectionLayoutIds.value, visibleIds, sectionId, offset)
  if (reordered === sectionLayoutIds.value) return

  updateSectionOrder(reordered)
  announceSectionMoved(sectionId, visibleIds.indexOf(sectionId) + offset)
}

const {
  draggedItemId: draggedSectionId,
  rowStyle: sectionRowStyle,
  startPointerDrag: startSectionDrag,
  movePointerDrag: moveSectionDrag,
  endPointerDrag: endSectionDrag,
  cancelPointerDrag: cancelSectionDrag,
} = useOrderedItemReorder({
  items: sectionLayoutIds,
  rowSelector: '.customizerItem',
  itemIdAttribute: 'data-home-section-id',
  updateItems: updateSectionOrder,
  announceMoved: announceSectionMoved,
})

function toDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function startOfWeek(date) {
  const result = new Date(date)
  const daysSinceStart = (result.getDay() - statsWeekStartsOn.value + 7) % 7
  result.setDate(result.getDate() - daysSinceStart)
  result.setHours(0, 0, 0, 0)
  return result
}

function formatDuration(seconds) {
  if (seconds < 60) {
    return seconds > 0 ? t('Stats.Less than a minute') : t('Stats.Minutes', { minutes: 0 })
  }

  const totalMinutes = Math.round(seconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) { return t('Stats.Minutes', { minutes }) }
  if (minutes === 0) { return t('Stats.Hours', { hours }) }
  return t('Stats.Hours and minutes', { hours, minutes })
}

function downloadStatus(download) {
  switch (download.status) {
    case 'queued': return t('Downloads.Queued')
    case 'paused': return t('Downloads.Paused')
    case 'pausing': return t('Downloads.Pausing')
    case 'preparing': return t('Downloads.Preparing')
    case 'downloading': return t('Downloads.Downloading')
    case 'processing': return t('Downloads.Processing')
    default: return t('Downloads.Download Complete')
  }
}

function downloadRoute(download) {
  const firstFile = download.files?.find(file => file.available !== false)
  if (!['video', 'audio'].includes(download.mode) || firstFile?.videoId == null) {
    return null
  }

  const query = { downloadId: String(download.id) }
  if (download.playlistId) {
    query.playlistId = download.playlistId
  } else if (download.playlistKey) {
    query.playlistId = download.playlistKey
    query.playlistType = 'user'
  }

  return { path: `/watch/${firstFile.videoId}`, query }
}

function openDownloads() {
  store.dispatch('showSettingsWindow', 'downloads')
}

function formatReminderTime(timestamp) {
  return formatDateTime(
    timestamp,
    locale.value,
    dateFormat.value,
    { dateStyle: 'medium' },
    { timeStyle: 'short' },
    timeFormat.value
  )
}

async function loadReminders() {
  const generation = ++reminderLoadGeneration
  try {
    const records = await liveReminder.list()
    if (generation === reminderLoadGeneration) {
      reminders.value = records
    }
  } catch (error) {
    console.warn('Could not load live reminders', error)
  }
}

watch(
  () => visibleSections.value.some(section => section.id === 'reminders'),
  (visible) => {
    removeReminderListener?.()
    removeReminderListener = null
    reminderLoadGeneration++

    if (!supportsLiveReminders || !visible) {
      reminders.value = []
      return
    }

    loadReminders()
    removeReminderListener = liveReminder.onUpdated(() => loadReminders())
  },
  { immediate: true }
)

onMounted(() => {
  // Paint the heading first, then mount one shelf per frame. Gathering data
  // and laying out every shelf together stalls slower renderers even when the
  // recommendation work yields. Completed pages update normally afterward.
  const revealSection = () => {
    revealedSectionCount.value++
    if (revealedSectionCount.value < visibleSections.value.length) {
      activityFrame = requestAnimationFrame(revealSection)
    } else {
      activityReady.value = true
    }
  }
  activityFrame = requestAnimationFrame(() => {
    activityFrame = requestAnimationFrame(revealSection)
  })
  // Grid/list switches, feedback and refresh can all shorten the page.
  homeResizeObserver = new ResizeObserver(() => {
    if (!homePage.value?.getClientRects().length) return
    const content = homePage.value.closest('.app > .routerView')
    if (content) clampOverlayScrollTop(document.body, content)
  })
  homeResizeObserver.observe(homePage.value)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(activityFrame)
  homeResizeObserver?.disconnect()
  reminderLoadGeneration++
  removeReminderListener?.()
})
</script>

<style scoped src="./Home.css" />
