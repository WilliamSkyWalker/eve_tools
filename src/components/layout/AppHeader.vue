<template>
  <header class="appbar">
    <!-- Brand (5-click easter egg → unlock contracts; single click → credits) -->
    <div class="brand" @click="onLogoClick">
      <span class="mark">EK</span>
      <span class="brand-tx">EVE&nbsp;<span class="kit">Kit</span></span>
    </div>

    <!-- Desktop grouped nav -->
    <nav class="nav-groups">
      <div
        v-for="g in navGroups"
        :key="g.key"
        class="nav-group"
        :class="{ open: openGroup === g.key }"
        @mouseenter="openGroup = g.key"
        @mouseleave="openGroup = null"
      >
        <button class="trigger" @click="openGroup = openGroup === g.key ? null : g.key">
          {{ g.label }}<span class="caret">▾</span>
        </button>
        <div class="menu">
          <router-link
            v-for="it in g.items"
            :key="it.name"
            :to="it.to"
            class="menu-item"
            @click="openGroup = null"
          >
            <span class="mi-ic"><NavIcon :name="it.ic" /></span>
            <span class="mi-tx">
              <span class="mi-name">{{ it.label }}</span>
              <span class="mi-desc">{{ it.desc }}</span>
            </span>
            <span v-if="it.beta" class="mi-beta">{{ t('nav.beta') }}</span>
          </router-link>
        </div>
      </div>
    </nav>

    <!-- Global search / command palette trigger -->
    <button class="search-trigger" @click="openPalette">
      <span class="s-ic">⌕</span>
      <span class="s-tx">{{ t('search.placeholder') }}</span>
      <span class="s-kbd">{{ metaKeyLabel }}K</span>
    </button>

    <!-- Right controls -->
    <div class="controls">
      <div class="seg srv-seg">
        <button :class="{ on: server === 'gf', gf: server === 'gf' }" @click="setServer('gf')">{{ t('server.gf') }}</button>
        <button :class="{ on: server === 'of', of: server === 'of' }" @click="setServer('of')">{{ t('server.of') }}</button>
      </div>
      <button class="ic-btn" @click="settings.toggleLocale()" :title="t('nav.language')">{{ locale === 'zh' ? '中' : 'EN' }}</button>
      <a href="https://github.com/WilliamSkyWalker/eve_tools/issues" target="_blank" rel="noopener" class="ic-btn hide-sm" :title="t('nav.feedback')">✎</a>
      <button class="ic-btn" @click="showDonate = true" :title="t('nav.donate')">♥</button>
      <button class="ic-btn search-mini" @click="openPalette" :title="t('search.placeholder')">⌕</button>
      <button class="ic-btn burger" @click="drawerOpen = true" :aria-label="t('nav.menu')">☰</button>
    </div>
  </header>

  <!-- ── Mobile drawer ── -->
  <Teleport to="body">
    <div v-if="drawerOpen" class="drawer-overlay" @click.self="drawerOpen = false">
      <aside class="drawer">
        <div class="drawer-head">
          <span class="brand-tx">EVE&nbsp;<span class="kit">Kit</span></span>
          <button class="modal-close" style="position:static" @click="drawerOpen = false">&times;</button>
        </div>
        <div class="drawer-body">
          <div v-for="g in navGroups" :key="g.key" class="drawer-group">
            <div class="drawer-group-label">{{ g.label }}</div>
            <router-link
              v-for="it in g.items"
              :key="it.name"
              :to="it.to"
              class="drawer-item"
              @click="drawerOpen = false"
            >
              <span class="mi-ic"><NavIcon :name="it.ic" /></span>
              <span class="mi-name">{{ it.label }}</span>
              <span v-if="it.beta" class="mi-beta">{{ t('nav.beta') }}</span>
            </router-link>
          </div>
          <div class="drawer-group">
            <router-link :to="`/${server}/links`" class="drawer-item" @click="drawerOpen = false">
              <span class="mi-ic"><NavIcon name="link" /></span><span class="mi-name">{{ t('nav.links') }}</span>
            </router-link>
          </div>
        </div>
      </aside>
    </div>
  </Teleport>

  <!-- ── Command palette ── -->
  <Teleport to="body">
    <div v-if="paletteOpen" class="palette-overlay" @click.self="closePalette">
      <div class="palette">
        <div class="palette-input-wrap">
          <span class="s-ic">⌕</span>
          <input
            ref="paletteInput"
            v-model="paletteQuery"
            class="palette-input"
            :placeholder="t('search.paletteHint')"
            @keydown="onPaletteKey"
          />
        </div>
        <div class="palette-results">
          <template v-if="paletteResults.length">
            <router-link
              v-for="(it, i) in paletteResults"
              :key="it.name"
              :to="it.to"
              class="p-item"
              :class="{ sel: i === paletteSel }"
              @click="closePalette"
              @mouseenter="paletteSel = i"
            >
              <span class="mi-ic"><NavIcon :name="it.ic" /></span>
              <span class="p-name">{{ it.label }}<span v-if="it.beta" class="mi-beta">{{ t('nav.beta') }}</span></span>
              <span class="p-grp">{{ it.groupLabel }}</span>
            </router-link>
          </template>
          <div v-else class="palette-empty">{{ t('search.noResults') }}</div>
        </div>
        <div class="palette-foot">
          <span><kbd>↑↓</kbd>{{ t('search.footSelect') }}</span>
          <span><kbd>↵</kbd>{{ t('search.footOpen') }}</span>
          <span><kbd>esc</kbd>{{ t('search.footClose') }}</span>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- ── Credits Modal ── -->
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

  <!-- ── Donate Modal ── -->
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
          <a href="https://ko-fi.com/williamdd" target="_blank" rel="noopener" class="kofi-btn">☕ {{ t('donate.kofiBtn') }}</a>
          <p class="donate-desc">{{ t('donate.kofiDesc') }}</p>
        </div>
        <p class="donate-thanks">{{ t('donate.thanks') }}</p>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, ref, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSettingsStore } from '../../stores/settings'
import { useI18n } from '../../i18n'
import NavIcon from './NavIcon.vue'

const settings = useSettingsStore()
const router = useRouter()
const route = useRoute()
const { t, locale } = useI18n()

const server = computed(() => settings.server)

const openGroup = ref(null)
const drawerOpen = ref(false)
const paletteOpen = ref(false)
const paletteQuery = ref('')
const paletteSel = ref(0)
const paletteInput = ref(null)
const showCredits = ref(false)
const showDonate = ref(false)

const metaKeyLabel = computed(() => (typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)) ? '⌘' : 'Ctrl ')

/* ── Navigation model (information architecture) ── */
const navGroups = computed(() => {
  const s = server.value
  const p = (path) => `/${s}/${path}`
  const groups = [
    { key: 'industry', items: [
      { name: 'industry', ic: 'factory', to: p('industry') },
      { name: 't2rank', ic: 'trending-up', to: p('t2rank') },
      { name: 'pi', ic: 'globe', to: p('pi') },
    ]},
    { key: 'market', items: [
      { name: 'market', ic: 'line-chart', to: p('market') },
      { name: 'reprocess', ic: 'refresh', to: p('market/reprocess') },
      { name: 'orevalue', ic: 'gem', to: p('market/ore') },
      { name: 'lpstore', ic: 'award', to: p('lpstore') },
      ...(settings.contractsUnlocked ? [{ name: 'contracts', ic: 'file-text', to: p('contracts') }] : []),
    ]},
    { key: 'nav', items: [
      { name: 'navigation', ic: 'navigation', to: p('navigation') },
      { name: 'wormhole', ic: 'tornado', to: p('wormhole'), beta: true },
      { name: 'sovmap', ic: 'map', to: p('sovmap'), beta: true },
    ]},
    { key: 'combat', items: [
      { name: 'fitting', ic: 'rocket', to: p('fitting'), beta: true },
      { name: 'dscan', ic: 'radar', to: p('dscan'), beta: true },
    ]},
  ]
  return groups.map(g => ({
    ...g,
    label: t(`nav.group.${g.key}`),
    items: g.items.map(it => ({
      ...it,
      label: t(`nav.item.${it.name}`),
      desc: t(`nav.desc.${it.name}`),
      groupLabel: t(`nav.group.${g.key}`),
    })),
  }))
})

const allTools = computed(() => navGroups.value.flatMap(g => g.items))

const paletteResults = computed(() => {
  const q = paletteQuery.value.trim().toLowerCase()
  if (!q) return allTools.value
  return allTools.value.filter(it =>
    (it.label + it.desc + it.groupLabel).toLowerCase().includes(q))
})

watch(paletteResults, () => { paletteSel.value = 0 })

/* ── Command palette ── */
function openPalette() {
  paletteOpen.value = true
  paletteQuery.value = ''
  paletteSel.value = 0
  nextTick(() => paletteInput.value?.focus())
}
function closePalette() { paletteOpen.value = false }
function onPaletteKey(e) {
  const n = paletteResults.value.length
  if (e.key === 'Escape') closePalette()
  else if (e.key === 'ArrowDown') { e.preventDefault(); paletteSel.value = Math.min(paletteSel.value + 1, n - 1) }
  else if (e.key === 'ArrowUp') { e.preventDefault(); paletteSel.value = Math.max(paletteSel.value - 1, 0) }
  else if (e.key === 'Enter') {
    const it = paletteResults.value[paletteSel.value]
    if (it) { router.push(it.to); closePalette() }
  }
}
function onGlobalKey(e) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette() }
}
onMounted(() => window.addEventListener('keydown', onGlobalKey))
onUnmounted(() => window.removeEventListener('keydown', onGlobalKey))

/* Close overlays on route change */
watch(() => route.fullPath, () => { openGroup.value = null; drawerOpen.value = false; paletteOpen.value = false })

/* ── Server toggle (keeps URL prefix in sync) ── */
function setServer(newServer) {
  if (server.value === newServer) return
  settings.setServer(newServer)
  if (route.params.server) router.push({ params: { server: newServer } })
}

/* ── Logo easter egg ── */
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
</script>

<style scoped>
.appbar {
  position: sticky;
  top: 0;
  z-index: 50;
  height: var(--appbar-h);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 16px;
  background: rgba(15, 16, 19, 0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border-default);
}

.brand {
  display: flex;
  align-items: center;
  gap: 9px;
  padding-right: 6px;
  font-weight: 700;
  font-size: 15px;
  letter-spacing: 0.02em;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}
.brand .mark {
  width: 24px; height: 24px;
  display: grid; place-items: center;
  border-radius: 6px;
  background: linear-gradient(135deg, var(--gold), #a9863f);
  color: var(--gold-ink);
  font-size: 12px; font-weight: 800;
}
.brand .kit { color: var(--gold); }

/* ── Desktop nav ── */
.nav-groups { display: flex; align-items: center; gap: 2px; }
.nav-group { position: relative; }
.nav-group > .trigger {
  display: flex; align-items: center; gap: 5px;
  background: none; border: none;
  color: var(--text-muted);
  padding: 7px 11px;
  border-radius: var(--radius-sm);
  font-size: 13.5px; font-weight: 500;
  transition: color .15s, background .15s;
}
.nav-group > .trigger:hover { color: var(--text-primary); background: rgba(255,255,255,0.04); }
.nav-group.open > .trigger { color: var(--gold); background: var(--gold-bg); }
.nav-group > .trigger .caret { font-size: 9px; opacity: .6; transition: transform .15s; }
.nav-group.open > .trigger .caret { transform: rotate(180deg); }

.menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 250px;
  background: var(--bg-panel);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-pop);
  padding: 6px;
  display: none;
  animation: menupop .13s ease;
}
.nav-group.open .menu { display: block; }
/* Transparent bridge over the 6px gap so moving the pointer from the trigger
   into the menu doesn't leave .nav-group and collapse it. */
.menu::before { content: ''; position: absolute; left: 0; right: 0; top: -8px; height: 8px; }
@keyframes menupop { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }

.menu-item, .drawer-item {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  transition: background .12s;
}
.menu-item:hover, .drawer-item:hover { background: var(--bg-elevated); color: var(--text-primary); }
.menu-item.router-link-active .mi-name, .drawer-item.router-link-active .mi-name { color: var(--gold); }

.mi-ic {
  width: 26px; height: 26px; flex: none;
  border-radius: 6px;
  display: grid; place-items: center;
  background: var(--bg-elevated);
  font-size: 14px;
}
.menu-item:hover .mi-ic { background: var(--gold-bg); }
.mi-tx { display: flex; flex-direction: column; line-height: 1.25; min-width: 0; }
.mi-name { font-size: 13.5px; }
.mi-desc { font-size: 11px; color: var(--text-dim); }
.mi-beta {
  margin-left: auto; flex: none;
  font-size: 10px; color: var(--gold);
  border: 1px solid var(--gold-line); border-radius: 4px; padding: 1px 6px;
}

/* ── Search trigger ── */
.search-trigger {
  flex: 1;
  max-width: 400px;
  margin: 0 auto;
  display: flex; align-items: center; gap: 8px;
  height: 34px; padding: 0 12px;
  background: var(--bg-input);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  color: var(--text-dim);
  font-size: 13px;
  transition: border-color .15s;
}
.search-trigger:hover { border-color: var(--border-strong); }
.search-trigger .s-ic { opacity: .8; font-size: 15px; }
.search-trigger .s-tx { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.search-trigger .s-kbd {
  margin-left: auto; flex: none;
  font-family: var(--font-mono); font-size: 11px;
  color: var(--text-dim);
  border: 1px solid var(--border-default); border-radius: 4px;
  padding: 1px 6px; background: var(--bg-panel);
}

/* ── Right controls ── */
.controls { display: flex; align-items: center; gap: 8px; }
.srv-seg button { font-weight: 600; }
.srv-seg button.on.gf { background: var(--gf); color: var(--gold-ink); }
.srv-seg button.on.of { background: var(--of); color: var(--gold-ink); }

.ic-btn {
  width: 32px; height: 32px; flex: none;
  display: grid; place-items: center;
  background: var(--bg-input);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  color: var(--text-muted);
  font-size: 13px; font-weight: 600;
  transition: color .15s, border-color .15s;
  text-decoration: none;
}
.ic-btn:hover { color: var(--gold); border-color: var(--border-strong); }
.search-mini, .burger { display: none; }

/* ── Mobile drawer ── */
.drawer-overlay {
  position: fixed; inset: 0; z-index: 1100;
  background: rgba(0,0,0,0.55);
  display: flex; justify-content: flex-end;
}
.drawer {
  width: 300px; max-width: 84vw; height: 100%;
  background: var(--bg-panel);
  border-left: 1px solid var(--border-strong);
  overflow-y: auto;
  animation: slidein .18s ease;
}
@keyframes slidein { from { transform: translateX(20px); opacity: .6; } to { transform: none; opacity: 1; } }
.drawer-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; border-bottom: 1px solid var(--border-default);
  font-weight: 700; font-size: 15px;
}
.drawer-head .kit { color: var(--gold); }
.drawer-body { padding: 8px; }
.drawer-group { padding: 6px 0; border-bottom: 1px solid var(--border-default); }
.drawer-group:last-child { border-bottom: none; }
.drawer-group-label {
  font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.08em;
  color: var(--text-dim); padding: 6px 10px;
}

/* ── Command palette ── */
.palette-overlay {
  position: fixed; inset: 0; z-index: 1150;
  background: rgba(0,0,0,0.55); backdrop-filter: blur(3px);
  display: flex; align-items: flex-start; justify-content: center;
  padding: 12vh 16px 16px;
}
.palette {
  width: 560px; max-width: 100%;
  background: var(--bg-panel);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-pop);
  overflow: hidden;
}
.palette-input-wrap { display: flex; align-items: center; gap: 10px; padding: 0 18px; border-bottom: 1px solid var(--border-default); }
.palette-input-wrap .s-ic { font-size: 17px; color: var(--text-dim); }
.palette-input { flex: 1; border: none; background: none; color: var(--text-primary); font-size: 15px; padding: 16px 0; }
.palette-input:focus { outline: none; }
.palette-results { max-height: 340px; overflow-y: auto; padding: 6px; }
.p-item { display: flex; align-items: center; gap: 11px; padding: 9px 12px; border-radius: var(--radius-md); color: var(--text-primary); }
.p-item.sel { background: var(--bg-elevated); }
.p-item .mi-ic { background: var(--bg-input); }
.p-name { font-size: 13.5px; display: flex; align-items: center; gap: 8px; }
.p-grp { margin-left: auto; font-size: 11px; color: var(--text-dim); }
.palette-empty { padding: 22px; text-align: center; color: var(--text-dim); font-size: 13px; }
.palette-foot { display: flex; gap: 16px; padding: 9px 14px; border-top: 1px solid var(--border-default); font-size: 11px; color: var(--text-dim); }
.palette-foot kbd { font-family: var(--font-mono); border: 1px solid var(--border-default); border-radius: 4px; padding: 0 5px; margin-right: 5px; }

/* ── Modals (component-specific bits; base in main.css) ── */
.modal-cards { display: flex; flex-direction: column; gap: 12px; }
.modal-card { background: var(--bg-base); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 14px 18px; }
.modal-card h3 { color: var(--gold); font-size: 1em; margin-bottom: 2px; }
.card-author { color: var(--text-muted); font-size: 0.8em; margin-bottom: 6px; }
.card-desc { color: var(--text-secondary); font-size: 0.85em; line-height: 1.5; margin-bottom: 6px; }
.card-link { color: var(--gold); font-size: 0.8em; opacity: .85; }
.card-link:hover { opacity: 1; text-decoration: underline; }
.modal-legal { margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border-default); color: var(--text-dim); font-size: 0.78em; line-height: 1.6; text-align: center; }
.donate-modal { max-width: 400px; text-align: center; }
.donate-body { margin: 20px 0; }
.wechat-qr { width: 220px; height: 220px; border-radius: 8px; }
.kofi-btn { display: inline-block; background: var(--gold); color: var(--gold-ink); padding: 12px 32px; border-radius: 8px; font-weight: 700; font-size: 1.1em; transition: background .2s, transform .1s; }
.kofi-btn:hover { background: var(--gold-hover); transform: translateY(-1px); }
.donate-desc { color: var(--text-muted); font-size: 0.85em; margin-top: 12px; }
.donate-thanks { color: var(--text-dim); font-size: 0.8em; margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border-default); }

/* ── Responsive ── */
@media (max-width: 960px) {
  .nav-groups, .search-trigger { display: none; }
  .search-mini, .burger { display: grid; }
}
@media (min-width: 961px) {
  .burger, .search-mini { display: none; }
}
@media (max-width: 520px) {
  .brand-tx { display: none; }
  .hide-sm { display: none; }
  .appbar { padding: 0 10px; }
}
</style>
