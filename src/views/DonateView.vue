<template>
  <div class="donate-page">
    <h1 class="title">{{ t('donate.title') }}</h1>
    <p class="subtitle">{{ t('donate.subtitle') }}</p>

    <div v-if="locale === 'en'" class="donate-section">
      <a href="https://ko-fi.com/williamdd" target="_blank" rel="noopener" class="kofi-btn">
        ☕ {{ t('donate.kofiBtn') }}
      </a>
      <p class="donate-desc">{{ t('donate.kofiDesc') }}</p>
    </div>

    <div v-if="locale === 'zh'" class="donate-section wechat-section">
      <img src="/donate-wechat.png" alt="微信赞赏码" class="wechat-qr" />
      <p class="donate-desc">{{ t('donate.wechatDesc') }}</p>
    </div>

    <p class="donate-thanks">{{ t('donate.thanks') }}</p>
  </div>
</template>

<script setup>
import { useI18n } from '../i18n'
const { t, locale } = useI18n()
</script>

<style scoped>
.donate-page {
  padding-top: 40px;
  max-width: 500px;
  margin: 0 auto;
  text-align: center;
}

.title {
  color: #c8aa6e;
  font-size: 1.8em;
  margin-bottom: 4px;
}

.subtitle {
  color: #8a8a8a;
  margin-bottom: 40px;
}

.donate-section {
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 12px;
  padding: 32px;
}

.kofi-btn {
  display: inline-block;
  background: #c8aa6e;
  color: #0d0d0d;
  text-decoration: none;
  padding: 12px 32px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 1.1em;
  transition: background 0.2s, transform 0.1s;
}

.kofi-btn:hover {
  background: #e0c882;
  transform: translateY(-1px);
}

.donate-desc {
  color: #8a8a8a;
  font-size: 0.85em;
  margin-top: 16px;
  line-height: 1.5;
}

.wechat-section {
  margin-top: 24px;
}

.wechat-qr {
  width: 220px;
  height: 220px;
  border-radius: 8px;
}

.donate-thanks {
  color: #555;
  font-size: 0.85em;
  margin-top: 32px;
  padding-top: 16px;
  border-top: 1px solid #2a2a2a;
}
</style>
