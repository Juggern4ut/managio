<script setup lang="ts">
const props = defineProps<{
  name: string | null
  color: string | null
}>()

const textColor = computed(() => (props.color ? textColorForBackground(props.color) : '#4b5563'))
</script>

<template>
  <span
    class="type-badge"
    :class="{ empty: !name }"
    :style="color ? { backgroundColor: color, color: textColor } : undefined"
  >
    {{ name ?? 'No type' }}
  </span>
</template>

<style scoped>
.type-badge {
  display: inline-block;
  padding: 0.2rem 0.65rem;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.4;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.08),
    0 2px 6px rgba(0, 0, 0, 0.06);
  white-space: nowrap;
}

.type-badge.empty {
  background: #f3f4f6;
  color: #6b7280;
  box-shadow: none;
  font-weight: 500;
}
</style>
