<template>
  <div class="lang-switcher" @click.stop>
    <button class="lang-btn" type="button" @click="toggle">
      <Globe :size="13" />
      <span>{{ currentLabel }}</span>
      <ChevronDown :size="11" />
    </button>
    <div v-if="open" class="lang-menu">
      <button
        v-for="opt in options"
        :key="opt.code"
        type="button"
        :class="['lang-opt', { active: opt.code === locale }]"
        @click="pick(opt.code)"
      >
        <span>{{ opt.label }}</span>
        <Check v-if="opt.code === locale" :size="11" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { Globe, ChevronDown, Check } from 'lucide-vue-next'

const { locale } = useI18n()

const open = ref(false)
const options = [
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文' },
]

const currentLabel = computed(() => options.find(o => o.code === locale.value)?.label || '')

function toggle() {
  open.value = !open.value
}

function pick(code) {
  locale.value = code
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('huobao:locale', code)
    document.documentElement.lang = code
  }
  open.value = false
}

function onClickOutside(e) {
  if (!e.target.closest('.lang-switcher')) open.value = false
}

onMounted(() => {
  if (typeof window === 'undefined') return
  const saved = window.localStorage.getItem('huobao:locale')
  if (saved && (saved === 'en' || saved === 'zh') && saved !== locale.value) {
    locale.value = saved
  }
  document.documentElement.lang = locale.value
  document.addEventListener('click', onClickOutside)
})

onBeforeUnmount(() => {
  if (typeof document !== 'undefined') document.removeEventListener('click', onClickOutside)
})
</script>

<style scoped>
.lang-switcher {
  position: relative;
}

.lang-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(27, 41, 64, 0.08);
  font-size: 11px;
  color: var(--text-1, #1b2940);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  font-family: inherit;
}

.lang-btn:hover {
  background: rgba(255, 255, 255, 0.8);
  border-color: rgba(27, 41, 64, 0.18);
}

.lang-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 140px;
  background: #fff;
  border: 1px solid var(--border, rgba(27, 41, 64, 0.08));
  border-radius: 14px;
  box-shadow: var(--shadow-lg, 0 8px 32px rgba(27, 41, 64, 0.12));
  padding: 4px;
  z-index: 9999;
  animation: langMenuIn 0.15s var(--ease-out, ease-out);
}

@keyframes langMenuIn {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}

.lang-opt {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 7px 10px;
  border: none;
  background: transparent;
  border-radius: 10px;
  cursor: pointer;
  font-size: 12px;
  color: var(--text-1, #1b2940);
  font-family: inherit;
  transition: background 0.12s;
}

.lang-opt:hover {
  background: var(--bg-hover, rgba(27, 41, 64, 0.04));
}

.lang-opt.active {
  color: var(--accent-text, #b87814);
  font-weight: 600;
  background: var(--accent-bg, rgba(184, 120, 20, 0.08));
}
</style>
