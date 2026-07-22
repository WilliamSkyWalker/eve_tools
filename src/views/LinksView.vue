<template>
  <div class="links-page">
    <div class="page-head">
      <div class="titles">
        <h1>{{ t('links.title') }}<PageHelp topic="links" /></h1>
        <p class="sub">{{ t('links.subtitle') }}</p>
      </div>
    </div>

    <div v-for="cat in categories" :key="cat.key" class="category">
      <h2 class="cat-title">{{ t(`links.cat.${cat.key}`) }}</h2>
      <div class="cards">
        <a
          v-for="link in cat.items"
          :key="link.url"
          :href="link.url"
          target="_blank"
          rel="noopener"
          class="link-card"
        >
          <div class="card-name">{{ link.name }} <span class="ext">↗</span></div>
          <div class="card-desc">{{ t(`links.${link.i18n}`) }}</div>
          <div class="card-url num">{{ link.display }}</div>
        </a>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from '../i18n'
import PageHelp from '../components/layout/PageHelp.vue'

const { t } = useI18n()

const categories = [
  {
    key: 'info',
    items: [
      { name: 'EVE Ref', i18n: 'everef', url: 'https://everef.net/', display: 'everef.net' },
      { name: 'UniWiki', i18n: 'uniwiki', url: 'https://wiki.eveuniversity.org/', display: 'wiki.eveuniversity.org' },
      { name: 'EVE Marketer', i18n: 'evemarketer', url: 'https://evemarketer.com/', display: 'evemarketer.com' },
      { name: 'Janice Junk', i18n: 'janice', url: 'https://janice.e-351.com/', display: 'janice.e-351.com' },
      { name: 'Adam4EVE', i18n: 'adam4eve', url: 'https://www.adam4eve.eu/', display: 'adam4eve.eu' },
    ],
  },
  {
    key: 'fitting',
    items: [
      { name: 'Pyfa', i18n: 'pyfa', url: 'https://github.com/pyfa-org/Pyfa/releases', display: 'github.com/pyfa-org/Pyfa' },
      { name: 'zKillboard', i18n: 'zkill', url: 'https://zkillboard.com/', display: 'zkillboard.com' },
    ],
  },
  {
    key: 'wormhole',
    items: [
      { name: 'Anoik.is', i18n: 'anoik', url: 'https://anoik.is/', display: 'anoik.is' },
      { name: 'Ellatha', i18n: 'ellatha', url: 'https://www.ellatha.com/eve/wormholelist', display: 'ellatha.com' },
      { name: 'Venus', i18n: 'venus', url: 'http://venus.wormholes.club/', display: 'venus.wormholes.club' },
      { name: 'Tripwire', i18n: 'tripwire', url: 'https://tripwire.eve-apps.com/', display: 'tripwire.eve-apps.com' },
      { name: 'Pathfinder', i18n: 'pathfinder', url: 'https://www.pathfinder-w.space/', display: 'pathfinder-w.space' },
    ],
  },
  {
    key: 'map',
    items: [
      { name: 'Dotlan', i18n: 'dotlan', url: 'https://evemaps.dotlan.net/', display: 'evemaps.dotlan.net' },
      { name: 'EVE Gatecamp Check', i18n: 'gatecamp', url: 'https://eve-gatecheck.space/', display: 'eve-gatecheck.space' },
    ],
  },
  {
    key: 'industry',
    items: [
      { name: 'Fuzzwork', i18n: 'fuzzwork', url: 'https://www.fuzzwork.co.uk/', display: 'fuzzwork.co.uk' },
      { name: 'EVE Cost', i18n: 'evecost', url: 'https://www.evecos.com/', display: 'evecos.com' },
    ],
  },
  {
    key: 'serenity',
    items: [
      { name: 'EVE 国服官网', i18n: 'evecn', url: 'https://www.evepc.163.com/', display: 'evepc.163.com' },
      { name: 'KB 国服', i18n: 'kbcn', url: 'https://kb.ceve-market.org/', display: 'kb.ceve-market.org' },
      { name: '国服击杀榜', i18n: 'kbrank', url: 'https://kb.ceve-market.org/ranking/', display: 'kb.ceve-market.org/ranking' },
      { name: 'CEVE 市场', i18n: 'cevemarket', url: 'https://www.ceve-market.org/', display: 'ceve-market.org' },
    ],
  },
]
</script>

<style scoped>
.links-page { max-width: 1040px; margin: 0 auto; }

.category { margin-bottom: 28px; }
.cat-title {
  color: var(--text-primary);
  font-size: var(--text-lg);
  font-weight: 600;
  margin-bottom: 12px;
  padding-bottom: 7px;
  border-bottom: 1px solid var(--border-default);
}

.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 12px; }

.link-card {
  display: block;
  background: var(--bg-panel);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  padding: 15px 18px;
  transition: border-color .15s, background .15s;
}
.link-card:hover { border-color: var(--gold-line); background: var(--gold-bg-light); }

.card-name { color: var(--text-primary); font-size: var(--text-md); font-weight: 600; margin-bottom: 5px; display: flex; align-items: center; gap: 6px; }
.card-name .ext { color: var(--text-dim); font-size: 0.85em; }
.link-card:hover .card-name { color: var(--gold); }
.link-card:hover .ext { color: var(--gold); }
.card-desc { color: var(--text-muted); font-size: var(--text-sm); line-height: 1.5; margin-bottom: 8px; }
.card-url { color: var(--text-dim); font-size: 0.78em; }
</style>
