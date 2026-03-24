<template>
  <div class="donate-page">
    <h1 class="title">{{ t('donate.title') }}</h1>
    <p class="subtitle">{{ t('donate.subtitle') }}</p>

    <div class="donate-methods">
      <div class="donate-card">
        <h2>{{ t('donate.wechat') }}</h2>
        <div class="qr-placeholder">
          <!-- Replace with: <img src="/donate-wechat.png" alt="WeChat QR" class="qr-img" /> -->
          <p class="qr-hint">{{ t('donate.qrHint') }}</p>
        </div>
      </div>

      <div class="donate-card">
        <h2>{{ t('donate.alipay') }}</h2>
        <div class="qr-placeholder">
          <!-- Replace with: <img src="/donate-alipay.png" alt="Alipay QR" class="qr-img" /> -->
          <p class="qr-hint">{{ t('donate.qrHint') }}</p>
        </div>
      </div>

      <div class="donate-card">
        <h2>Ko-fi</h2>
        <p class="donate-desc">{{ t('donate.kofiDesc') }}</p>
        <!-- Replace href with your Ko-fi link -->
        <a href="https://ko-fi.com/" target="_blank" rel="noopener" class="kofi-btn">
          {{ t('donate.kofiBtn') }}
        </a>
      </div>
    </div>

    <p class="donate-thanks">{{ t('donate.thanks') }}</p>
  </div>
</template>

<script setup>
import { useI18n } from '../i18n'
const { t } = useI18n()
</script>

<style scoped>
.donate-page {
  padding-top: 40px;
  max-width: 700px;
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

.donate-methods {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: center;
}

.donate-card {
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  padding: 24px;
  flex: 1;
  min-width: 180px;
  max-width: 220px;
  text-align: center;
}

.donate-card h2 {
  color: #c8aa6e;
  font-size: 1.1em;
  margin-bottom: 12px;
}

.qr-placeholder {
  width: 160px;
  height: 160px;
  margin: 0 auto;
  border: 2px dashed #2a2a2a;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qr-hint {
  color: #555;
  font-size: 0.8em;
}

.qr-img {
  width: 160px;
  height: 160px;
  border-radius: 6px;
}

.donate-desc {
  color: #8a8a8a;
  font-size: 0.85em;
  margin-bottom: 16px;
  line-height: 1.5;
}

.kofi-btn {
  display: inline-block;
  background: #c8aa6e;
  color: #0d0d0d;
  text-decoration: none;
  padding: 8px 20px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.9em;
  transition: background 0.2s;
}

.kofi-btn:hover {
  background: #e0c882;
}

.donate-thanks {
  text-align: center;
  color: #555;
  font-size: 0.85em;
  margin-top: 32px;
  padding-top: 16px;
  border-top: 1px solid #2a2a2a;
}
</style>
