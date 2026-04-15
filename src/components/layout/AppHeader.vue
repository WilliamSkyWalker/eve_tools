<template>
  <header class="app-header">
    <div class="header-content">
      <span class="logo" @click="onLogoClick">{{ t('app.name') }}</span>
      <nav>
        <router-link to="/">{{ t('nav.home') }}</router-link>
        <span class="nav-divider"></span>
        <router-link :to="`/${server}/industry`">{{ t('nav.industry') }}</router-link>
        <router-link :to="`/${server}/market`">{{ t('nav.market') }}</router-link>
        <router-link :to="`/${server}/pi`">{{ t('nav.pi') }}</router-link>
        <router-link :to="`/${server}/lpstore`">{{ t('nav.lpstore') }}</router-link>
        <router-link :to="`/${server}/navigation`">{{ t('nav.navigation') }}</router-link>
        <router-link v-if="settings.contractsUnlocked" :to="`/${server}/contracts`">{{ t('nav.contracts') }}</router-link>
        <router-link :to="`/${server}/fitting`">{{ t('nav.fitting') }}</router-link>
        <!-- <router-link :to="`/${server}/dscan`">{{ t('nav.dscan') }}</router-link> -->
        <!-- <router-link :to="`/${server}/sovmap`">{{ t('nav.sovmap') }}</router-link> -->
      </nav>
      <div class="header-controls">
        <div class="toggle-group">
          <router-link :to="`/${server}/links`" class="toggle-item">{{ t('nav.links') }}</router-link>
          <span class="toggle-sep"></span>
          <a href="https://github.com/WilliamSkyWalker/eve_tools/issues" target="_blank" rel="noopener" class="toggle-item">{{ t('nav.feedback') }}</a>
          <span class="toggle-sep"></span>
          <button class="toggle-item" @click="showDonate = true">{{ t('nav.donate') }}</button>
        </div>
        <div class="toggle-group">
          <button class="toggle-item" @click="onToggleServer">
            <span :class="server === 'gf' ? 'clr-gf' : 'clr-of'">{{ serverLabel }}</span>
          </button>
          <span class="toggle-sep"></span>
          <button class="toggle-item" @click="settings.toggleLocale()">
            {{ locale === 'zh' ? 'EN' : '中' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Credits Modal -->
    <Teleport to="body">
      <div v-if="showCredits" class="modal-overlay" @click.self="showCredits = false">
        <div class="modal-content">
          <button class="modal-close" @click="showCredits = false">&times;</button>
          <h2 class="modal-title">{{ t('credits.title') }}</h2>
          <p class="modal-subtitle">{{ t('credits.subtitle') }}</p>

          <div class="modal-cards">
            <div class="modal-card">
              <h3>Fuzzwork Enterprises</h3>
              <p class="card-author">Steve Ronuken</p>
              <p class="card-desc">{{ t('credits.fuzzwork.desc') }}</p>
              <a href="https://www.fuzzwork.co.uk/dump/latest/" target="_blank" rel="noopener" class="card-link">fuzzwork.co.uk/dump/latest</a>
            </div>
            <div class="modal-card">
              <h3>CCP Games</h3>
              <p class="card-desc">{{ t('credits.ccp.desc') }}</p>
              <a href="https://developers.eveonline.com/" target="_blank" rel="noopener" class="card-link">developers.eveonline.com</a>
            </div>
            <div class="modal-card">
              <h3>eve-bookmarks</h3>
              <p class="card-author">OkYk</p>
              <p class="card-desc">{{ t('credits.evebookmarks.desc') }}</p>
              <a href="https://github.com/OkYk/eve-bookmarks" target="_blank" rel="noopener" class="card-link">github.com/OkYk/eve-bookmarks</a>
            </div>
          </div>

          <p class="modal-legal">{{ t('credits.legal') }}</p>
        </div>
      </div>
    </Teleport>

    <!-- Donate Modal -->
    <Teleport to="body">
      <div v-if="showDonate" class="modal-overlay" @click.self="showDonate = false">
        <div class="modal-content donate-modal">
          <button class="modal-close" @click="showDonate = false">&times;</button>
          <h2 class="modal-title">{{ t('donate.title') }}</h2>
          <p class="modal-subtitle">{{ t('donate.subtitle') }}</p>

          <div v-if="locale === 'zh'" class="donate-body">
            <img src="/donate-wechat.png" alt="微信赞赏码" class="wechat-qr" />
            <p class="donate-desc">{{ t('donate.wechatDesc') }}</p>
          </div>

          <div v-else class="donate-body">
            <a href="https://ko-fi.com/williamdd" target="_blank" rel="noopener" class="kofi-btn">
              ☕ {{ t('donate.kofiBtn') }}
            </a>
            <p class="donate-desc">{{ t('donate.kofiDesc') }}</p>
          </div>

          <p class="donate-thanks">{{ t('donate.thanks') }}</p>
        </div>
      </div>
    </Teleport>
  </header>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSettingsStore } from '../../stores/settings'
import { useI18n } from '../../i18n'

const settings = useSettingsStore()
const router = useRouter()
const route = useRoute()
const { t, locale, serverLabel } = useI18n()

const server = computed(() => settings.server)
const showCredits = ref(false)
const showDonate = ref(false)

let logoClicks = 0
let logoTimer = null

function onLogoClick() {
  logoClicks++
  clearTimeout(logoTimer)
  if (logoClicks >= 5) {
    logoClicks = 0
    settings.unlockContracts()
  } else {
    logoTimer = setTimeout(() => {
      if (logoClicks < 5) showCredits.value = true
      logoClicks = 0
    }, 400)
  }
}

function onToggleServer() {
  const newServer = server.value === 'gf' ? 'of' : 'gf'
  settings.setServer(newServer)

  if (route.params.server) {
    router.push({ params: { server: newServer } })
  }
}
</script>

<style scoped>
.app-header {
  background-color: #1a1a1a;
  border-bottom: 1px solid #2a2a2a;
  padding: 12px 20px;
}

.header-content {
  max-width: 1600px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  color: #c8aa6e;
  font-size: 1.3em;
  font-weight: bold;
  cursor: pointer;
  transition: opacity 0.2s;
}

.logo:hover {
  opacity: 0.8;
}

nav {
  display: flex;
  align-items: center;
  gap: 6px;
}

nav a {
  color: #8a8a8a;
  text-decoration: none;
  margin-left: 14px;
  font-size: 0.95em;
}

nav a:hover,
nav a.router-link-active {
  color: #c8aa6e;
}

.nav-divider {
  display: inline-block;
  width: 1px;
  height: 16px;
  background: #2a2a2a;
  margin-left: 14px;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toggle-group {
  display: flex;
  align-items: center;
  background: #0d0d0d;
  border: 1px solid #2a2a2a;
  border-radius: 4px;
  overflow: hidden;
}

.toggle-item {
  background: none;
  border: none;
  color: #8a8a8a;
  font-size: 0.8em;
  font-weight: 600;
  padding: 4px 10px;
  cursor: pointer;
  transition: color 0.2s, background 0.2s;
}

.toggle-item:hover {
  color: #c8aa6e;
  background: rgba(200, 170, 110, 0.08);
}

.toggle-sep {
  display: inline-block;
  width: 1px;
  height: 14px;
  background: #2a2a2a;
}

/* ── Donate Modal ── */
.donate-modal {
  max-width: 400px;
  text-align: center;
}

.donate-body {
  margin: 20px 0;
}

.wechat-qr {
  width: 220px;
  height: 220px;
  border-radius: 8px;
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
  margin-top: 12px;
}

.donate-thanks {
  color: #555;
  font-size: 0.8em;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #2a2a2a;
}

.clr-gf {
  color: #ff9800;
}

.clr-of {
  color: #4caf50;
}

/* ── Credits Modal ── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 12px;
  padding: 28px 32px;
  max-width: 600px;
  width: 90%;
  max-height: 85vh;
  overflow-y: auto;
  position: relative;
}

.modal-close {
  position: absolute;
  top: 12px;
  right: 16px;
  background: none;
  border: none;
  color: #555;
  font-size: 1.6em;
  cursor: pointer;
  line-height: 1;
  transition: color 0.2s;
}

.modal-close:hover {
  color: #c8aa6e;
}

.modal-title {
  color: #c8aa6e;
  font-size: 1.4em;
  margin-bottom: 4px;
  text-align: center;
}

.modal-subtitle {
  color: #8a8a8a;
  font-size: 0.9em;
  text-align: center;
  margin-bottom: 20px;
}

.modal-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.modal-card {
  background: #0d0d0d;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  padding: 14px 18px;
}

.modal-card h3 {
  color: #c8aa6e;
  font-size: 1em;
  margin-bottom: 2px;
}

.card-author {
  color: #8a8a8a;
  font-size: 0.8em;
  margin-bottom: 6px;
}

.card-desc {
  color: #d0d0d0;
  font-size: 0.85em;
  line-height: 1.5;
  margin-bottom: 6px;
}

.card-link {
  color: #c8aa6e;
  text-decoration: none;
  font-size: 0.8em;
  opacity: 0.8;
}

.card-link:hover {
  opacity: 1;
  text-decoration: underline;
}

.modal-legal {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #2a2a2a;
  color: #555;
  font-size: 0.78em;
  line-height: 1.6;
  text-align: center;
}
</style>
