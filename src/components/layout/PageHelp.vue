<template>
  <span class="page-help-wrap">
    <button
      type="button"
      class="page-help-btn"
      :title="t('help.btnTitle')"
      :aria-label="t('help.btnTitle')"
      @click="open = true"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M9 18h6" />
        <path d="M10 21h4" />
        <path d="M12 3a6 6 0 0 0-4 10.5c.8.8 1.5 1.7 1.7 2.8L10 18h4l.3-1.7c.2-1.1.9-2 1.7-2.8A6 6 0 0 0 12 3z" />
        <path d="M12 9v4" />
      </svg>
    </button>

    <Teleport to="body">
      <div v-if="open" class="help-overlay" @click.self="open = false">
        <div class="help-modal">
          <button class="help-close" @click="open = false" aria-label="close">&times;</button>
          <h2 class="help-title">{{ helpTitle }}</h2>
          <p v-if="intro" class="help-intro">{{ intro }}</p>

          <section v-if="usage && usage.length" class="help-section">
            <h3 class="help-section-title">{{ t('help.sectionUsage') }}</h3>
            <ol class="help-list">
              <li v-for="(item, i) in usage" :key="`u${i}`">{{ item }}</li>
            </ol>
          </section>

          <section v-if="formulas && formulas.length" class="help-section">
            <h3 class="help-section-title">{{ t('help.sectionFormula') }}</h3>
            <ul class="help-list help-list-formula">
              <li v-for="(item, i) in formulas" :key="`f${i}`">
                <code>{{ item }}</code>
              </li>
            </ul>
          </section>

          <section v-if="notes && notes.length" class="help-section">
            <h3 class="help-section-title">{{ t('help.sectionNote') }}</h3>
            <ul class="help-list">
              <li v-for="(item, i) in notes" :key="`n${i}`">{{ item }}</li>
            </ul>
          </section>
        </div>
      </div>
    </Teleport>
  </span>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from '../../i18n'

const props = defineProps({
  topic: { type: String, required: true },
})

const { t } = useI18n()
const open = ref(false)

function getList(key) {
  const v = t(key)
  if (Array.isArray(v)) return v
  if (typeof v === 'string' && v !== key) return [v]
  return []
}

const helpTitle = computed(() => {
  const v = t(`help.${props.topic}.title`)
  return v === `help.${props.topic}.title` ? t('help.btnTitle') : v
})
const intro = computed(() => {
  const v = t(`help.${props.topic}.intro`)
  return v === `help.${props.topic}.intro` ? '' : v
})
const usage = computed(() => getList(`help.${props.topic}.usage`))
const formulas = computed(() => getList(`help.${props.topic}.formulas`))
const notes = computed(() => getList(`help.${props.topic}.notes`))
</script>

<style scoped>
.page-help-wrap {
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
  margin-left: 10px;
}

.page-help-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: #c8aa6e;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  transition: color 0.15s, transform 0.1s, filter 0.15s;
}

.page-help-btn:hover {
  color: #e0c882;
  transform: translateY(-1px);
  filter: drop-shadow(0 0 4px rgba(200, 170, 110, 0.6));
}

.page-help-btn svg {
  display: block;
}

.help-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  box-sizing: border-box;
}

.help-modal {
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 12px;
  padding: 26px 30px;
  max-width: 620px;
  width: 100%;
  max-height: 85vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
}

.help-close {
  position: absolute;
  top: 10px;
  right: 14px;
  background: none;
  border: none;
  color: #555;
  font-size: 1.6em;
  cursor: pointer;
  line-height: 1;
  transition: color 0.2s;
}

.help-close:hover { color: #c8aa6e; }

.help-title {
  color: #c8aa6e;
  font-size: 1.3em;
  margin: 0 0 10px;
  padding-right: 24px;
}

.help-intro {
  color: #b0b0b0;
  font-size: 0.92em;
  line-height: 1.6;
  margin: 0 0 16px;
}

.help-section {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid #2a2a2a;
}

.help-section:first-of-type {
  margin-top: 0;
  padding-top: 0;
  border-top: none;
}

.help-section-title {
  color: #c8aa6e;
  font-size: 0.95em;
  margin: 0 0 8px;
  font-weight: 600;
}

.help-list {
  margin: 0;
  padding-left: 22px;
  color: #d0d0d0;
  font-size: 0.9em;
  line-height: 1.7;
}

.help-list li { margin-bottom: 2px; }

.help-list-formula code {
  display: inline-block;
  background: #0d0d0d;
  border: 1px solid #2a2a2a;
  border-radius: 4px;
  padding: 2px 8px;
  color: #e0c882;
  font-family: ui-monospace, Consolas, monospace;
  font-size: 0.88em;
}
</style>
