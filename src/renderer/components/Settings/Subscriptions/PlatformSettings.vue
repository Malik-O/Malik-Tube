<template>
  <FtSettingsSection
    :title="t('Settings.Subscription Settings.Platforms.Other Platforms')"
    :title-id="titleId"
    :icon="['fas', 'globe']"
  >
    <FtFlexBox>
      <div class="autoRefreshInterval">
        <FtSelect
          :placeholder="t('Settings.Subscription Settings.Auto Refresh Interval')"
          :describe-by-id="titleId"
          :value="autoRefreshInterval"
          setting-key="platformFeedAutoRefreshInterval"
          :select-names="autoRefreshIntervalNames"
          :select-values="AUTO_REFRESH_INTERVAL_VALUES"
          :tooltip="t('Tooltips.Subscription Settings.Platforms Auto Refresh Interval')"
          :icon="['fas', 'clock']"
          @change="value => store.dispatch('updatePlatformFeedAutoRefreshInterval', value)"
        />
      </div>
    </FtFlexBox>
  </FtSettingsSection>
</template>

<script setup>
import { computed, useId } from 'vue'
import { useI18n } from 'vue-i18n'

import FtFlexBox from '../../ft-flex-box/ft-flex-box.vue'
import FtSelect from '../../FtSelect/FtSelect.vue'
import FtSettingsSection from '../../FtSettingsSection/FtSettingsSection.vue'

import store from '../../../store/index'
import { AUTO_REFRESH_INTERVAL_VALUES, getAutoRefreshIntervalNames } from '../../../helpers/autoRefreshIntervals'

const { t } = useI18n()

// The refresh select repeats another section's label, so it names its section.
const titleId = useId()

const autoRefreshInterval = computed(() => store.getters.getPlatformFeedAutoRefreshInterval)
const autoRefreshIntervalNames = computed(() => getAutoRefreshIntervalNames(t))
</script>

<style scoped src="./PlatformSettings.css" />
