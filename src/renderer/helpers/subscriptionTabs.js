// @ts-check

/** @typedef {'videos' | 'community' | 'new' | 'platforms' | 'feeds'} SubscriptionTabId */

export const SUBSCRIPTION_TAB_DEFINITIONS = Object.freeze([
  { id: 'videos', labelKey: 'Global.Videos', icon: ['fa', 'video'] },
  { id: 'community', labelKey: 'Global.Posts', icon: ['fa', 'message'] },
  { id: 'new', labelKey: 'Global.New', icon: ['fa', 'fire'] },
  { id: 'platforms', labelKey: 'Subscriptions.Platforms.Tab', icon: ['fas', 'globe'] },
  { id: 'feeds', labelKey: 'Subscriptions.RSS Feeds.Tab', icon: ['fas', 'rss'] },
])

/** @type {readonly SubscriptionTabId[]} */
export const DEFAULT_SUBSCRIPTION_TABS = Object.freeze(SUBSCRIPTION_TAB_DEFINITIONS.map(({ id }) => /** @type {SubscriptionTabId} */ (id)))
const TAB_IDS = new Set(DEFAULT_SUBSCRIPTION_TABS)

/** Where the subscriptions page remembers its feed, which it opens to next time */
export const SUBSCRIPTIONS_CURRENT_TAB_STORAGE_KEY = 'Subscriptions/currentTab'

/**
 * Keeps the saved order of the known tabs and appends missing ones, so every
 * tab can be shown.
 * @param {unknown} value
 * @returns {SubscriptionTabId[]}
 */
export function normalizeSubscriptionTabs(value) {
  const saved = /** @type {SubscriptionTabId[]} */ (Array.isArray(value) ? value.filter(id => TAB_IDS.has(id)) : [])
  return [...new Set([...saved, ...DEFAULT_SUBSCRIPTION_TABS])]
}

/**
 * The tabs the subscriptions page shows, in the saved order.
 * @param {unknown} order
 * @param {{
 *   hideVideos: boolean,
 *   hideCommunity: boolean,
 *   showNewFeed: boolean,
 *   enableRssFeeds: boolean,
 *   hasFollowedChannels: boolean,
 * }} options
 * @returns {SubscriptionTabId[]}
 */
export function getVisibleSubscriptionTabs(order, options) {
  const hasSubscriptionTabs = !options.hideVideos || !options.hideCommunity
  /** @type {Record<SubscriptionTabId, boolean>} */
  const visible = {
    videos: !options.hideVideos,
    community: !options.hideCommunity,
    // The New feed lists the new RSS and platform items too
    new: options.showNewFeed && (hasSubscriptionTabs || options.enableRssFeeds || options.hasFollowedChannels),
    platforms: options.hasFollowedChannels,
    feeds: options.enableRssFeeds,
  }
  return normalizeSubscriptionTabs(order).filter(id => visible[id])
}
