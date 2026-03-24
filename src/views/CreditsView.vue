<template>
  <div class="credits-page">
    <h1 class="title">{{ t('credits.title') }}</h1>
    <p class="subtitle">{{ t('credits.subtitle') }}</p>

    <div class="credits-list">
      <div class="credit-card">
        <h2>Fuzzwork Enterprises</h2>
        <p class="credit-author">Steve Ronuken</p>
        <p class="credit-desc">{{ t('credits.fuzzwork.desc') }}</p>
        <a href="https://www.fuzzwork.co.uk/dump/latest/" target="_blank" rel="noopener" class="credit-link">
          fuzzwork.co.uk/dump/latest
        </a>
      </div>

      <div class="credit-card">
        <h2>CCP Games</h2>
        <p class="credit-desc">{{ t('credits.ccp.desc') }}</p>
        <a href="https://developers.eveonline.com/" target="_blank" rel="noopener" class="credit-link">
          developers.eveonline.com
        </a>
      </div>

      <div class="credit-card">
        <h2>eve-bookmarks</h2>
        <p class="credit-author">OkYk</p>
        <p class="credit-desc">{{ t('credits.evebookmarks.desc') }}</p>
        <a href="https://github.com/OkYk/eve-bookmarks" target="_blank" rel="noopener" class="credit-link">
          github.com/OkYk/eve-bookmarks
        </a>
      </div>

    </div>

    <div class="legal-notice">
      <p>{{ t('credits.legal') }}</p>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from '../i18n'
const { t } = useI18n()
</script>

<style scoped>
.credits-page {
  padding-top: 40px;
  max-width: 800px;
  margin: 0 auto;
}

.title {
  color: #c8aa6e;
  font-size: 1.8em;
  margin-bottom: 4px;
  text-align: center;
}

.subtitle {
  color: #8a8a8a;
  margin-bottom: 32px;
  text-align: center;
}

.credits-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.credit-card {
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  padding: 20px 24px;
  transition: border-color 0.2s;
}

.credit-card:hover {
  border-color: #3a3a3a;
}

.credit-card h2 {
  color: #c8aa6e;
  font-size: 1.2em;
  margin-bottom: 4px;
}

.credit-author {
  color: #8a8a8a;
  font-size: 0.9em;
  margin-bottom: 8px;
}

.credit-desc {
  color: #d0d0d0;
  font-size: 0.95em;
  margin-bottom: 8px;
  line-height: 1.5;
}

.credit-link {
  color: #c8aa6e;
  text-decoration: none;
  font-size: 0.9em;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.credit-link:hover {
  opacity: 1;
  text-decoration: underline;
}

.legal-notice {
  margin-top: 32px;
  padding: 16px 20px;
  border-top: 1px solid #2a2a2a;
  text-align: center;
}

.legal-notice p {
  color: #555;
  font-size: 0.85em;
  line-height: 1.6;
}
</style>
