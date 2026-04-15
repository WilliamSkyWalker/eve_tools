<template>
  <div class="links-page">
    <h1 class="title">{{ t('links.title') }}</h1>
    <p class="subtitle">{{ t('links.subtitle') }}</p>

    <div v-for="cat in categories" :key="cat.key" class="category">
      <h2 class="cat-title">{{ t(`links.cat.${cat.key}`) }}</h2>
      <div class="cards">
        <a
          v-for="link in cat.items"
          :key="link.url"
          :href="link.url"
          target="_blank"
          rel="noopener"
          class="card"
        >
          <div class="card-name">{{ link.name }}</div>
          <div class="card-desc">{{ t(`links.${link.i18n}`) }}</div>
          <div class="card-url">{{ link.display }}</div>
        </a>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from '../i18n'

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
.links-page {
  padding-top: 20px;
  max-width: 1000px;
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
  margin-bottom: 28px;
  text-align: center;
}

.category {
  margin-bottom: 28px;
}

.cat-title {
  color: #c8aa6e;
  font-size: 1.1em;
  margin-bottom: 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid #2a2a2a;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}

.card {
  display: block;
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  padding: 16px 18px;
  text-decoration: none;
  transition: border-color 0.2s, background 0.2s;
}

.card:hover {
  border-color: #c8aa6e;
  background: rgba(200, 170, 110, 0.05);
}

.card-name {
  color: #d0d0d0;
  font-size: 1em;
  font-weight: 600;
  margin-bottom: 4px;
}

.card:hover .card-name {
  color: #c8aa6e;
}

.card-desc {
  color: #8a8a8a;
  font-size: 0.85em;
  line-height: 1.4;
  margin-bottom: 8px;
}

.card-url {
  color: #555;
  font-size: 0.78em;
  font-family: monospace;
}
</style>
