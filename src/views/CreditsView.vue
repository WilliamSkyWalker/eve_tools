<template>
  <div class="credits-page">
    <div class="page-head">
      <div class="titles">
        <h1>{{ t('credits.title') }}</h1>
        <p class="sub">{{ t('credits.subtitle') }}</p>
      </div>
    </div>

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

      <div class="credit-card">
        <h2>Pyfa</h2>
        <p class="credit-author">pyfa-org</p>
        <p class="credit-desc">{{ t('credits.pyfa.desc') }}</p>
        <a href="https://github.com/pyfa-org/Pyfa" target="_blank" rel="noopener" class="credit-link">
          github.com/pyfa-org/Pyfa
        </a>
      </div>

      <div class="credit-card">
        <h2>EVEShip.fit</h2>
        <p class="credit-author">EVEShipFit</p>
        <p class="credit-desc">{{ t('credits.eveshipfit.desc') }}</p>
        <a href="https://github.com/EVEShipFit/dogma-engine" target="_blank" rel="noopener" class="credit-link">
          github.com/EVEShipFit/dogma-engine
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
.credits-page { max-width: 800px; margin: 0 auto; }

.credits-list { display: flex; flex-direction: column; gap: 12px; }
.credit-card {
  background: var(--bg-panel);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  padding: 18px 22px;
  transition: border-color .15s;
}
.credit-card:hover { border-color: var(--border-strong); }
.credit-card h2 { color: var(--gold); font-size: var(--text-lg); margin-bottom: 4px; }
.credit-author { color: var(--text-muted); font-size: var(--text-sm); margin-bottom: 8px; }
.credit-desc { color: var(--text-secondary); font-size: var(--text-base); margin-bottom: 8px; line-height: 1.55; }
.credit-link { color: var(--gold); font-size: var(--text-sm); opacity: .85; }
.credit-link:hover { opacity: 1; text-decoration: underline; }

.legal-notice { margin-top: 28px; padding: 16px 20px; border-top: 1px solid var(--border-default); text-align: center; }
.legal-notice p { color: var(--text-dim); font-size: var(--text-sm); line-height: 1.6; }
</style>
