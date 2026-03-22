<script setup lang="ts">
import type { ActiveTripActivity } from '~/composables/useDashboardStats'
import { formatDate } from '~/lib/utils'

interface Props {
  trips: ActiveTripActivity[]
}

const props = defineProps<Props>()

const formatStartedAt = (date: string) => formatDate(date)
</script>

<template>
  <div class="bg-white rounded-xl border border-gray-200 p-6 h-full">
    <div class="flex items-center justify-between mb-5">
      <div>
        <h3 class="text-lg font-semibold text-gray-900">Live Trip Activity</h3>
        <p class="text-sm text-gray-500">Current active trips on the road</p>
      </div>
      <div class="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
        <span class="relative flex h-2.5 w-2.5">
          <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
          <span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500"></span>
        </span>
        Live
      </div>
    </div>

    <div v-if="props.trips.length === 0" class="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
      No active trips right now.
    </div>

    <div v-else class="space-y-3">
      <NuxtLink
        v-for="trip in props.trips"
        :key="trip.id"
        :to="trip.href"
        class="block rounded-xl border border-gray-200 p-4 transition-all duration-200 hover:border-blue-200 hover:shadow-md"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <p class="font-semibold text-gray-900 truncate">{{ trip.busNumber }}</p>
              <span class="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700">
                <span class="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse"></span>
                Live
              </span>
            </div>
            <p class="mt-1 text-sm text-gray-600 truncate">{{ trip.routeName }}</p>
            <p class="mt-1 text-xs text-gray-500 truncate">Driver: {{ trip.driverName }}</p>
            <p class="mt-1 text-xs text-gray-400 truncate">Current location: {{ trip.location }}</p>
          </div>
          <div class="text-right text-xs text-gray-400 whitespace-nowrap">
            <p>{{ formatStartedAt(trip.startedAt) }}</p>
          </div>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>
