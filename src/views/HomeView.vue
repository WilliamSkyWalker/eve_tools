<template>
  <div class="home">
    <h1 class="title">{{ t('home.title') }}</h1>

    <template v-if="!settings.server">
      <p class="subtitle">{{ t('home.selectServer') }}</p>
      <div class="server-cards">
        <button class="server-card gf" @click="selectServer('gf')">
          <h2>{{ t('server.gf') }}</h2>
          <p>{{ t('server.serenity') }}</p>
        </button>
        <button class="server-card of" @click="selectServer('of')">
          <h2>{{ t('server.of') }}</h2>
          <p>{{ t('server.tranquility') }}</p>
        </button>
      </div>
    </template>

    <template v-else>
      <p class="subtitle">
        {{ t('home.current') }} <strong>{{ serverLabel }}</strong>
      </p>
      <div class="nav-cards">
        <router-link :to="`/${settings.server}/industry`" class="card">
          <h2>{{ t('home.industry.title') }}</h2>
          <p>{{ t('home.industry.desc') }}</p>
        </router-link>
        <router-link :to="`/${settings.server}/market`" class="card">
          <h2>{{ t('home.market.title') }}</h2>
          <p>{{ t('home.market.desc') }}</p>
        </router-link>
        <router-link :to="`/${settings.server}/navigation`" class="card">
          <h2>{{ t('home.navigation.title') }}</h2>
          <p>{{ t('home.navigation.desc') }}</p>
        </router-link>
        <router-link :to="`/${settings.server}/contracts`" class="card">
          <h2>{{ t('home.contracts.title') }}</h2>
          <p>{{ t('home.contracts.desc') }}</p>
        </router-link>
        <router-link :to="`/${settings.server}/wormhole`" class="card">
          <h2>{{ t('home.wormhole.title') }}</h2>
          <p>{{ t('home.wormhole.desc') }}</p>
        </router-link>
      </div>
    </template>
  </div>
</template>

<script setup>
import { useSettingsStore } from '../stores/settings'
import { useI18n } from '../i18n'

const settings = useSettingsStore()
const { t, serverLabel } = useI18n()

function selectServer(s) {
  settings.setServer(s)
}
</script>

<style scoped>
.home {
  padding-top: 60px;
  text-align: center;
}

.title {
  color: #c8aa6e;
  font-size: 2em;
  margin-bottom: 32px;
}

.subtitle {
  color: #8a8a8a;
  margin-bottom: 24px;
  font-size: 1.1em;
}

.subtitle strong {
  color: #c8aa6e;
}

.server-cards {
  display: flex;
  gap: 24px;
  justify-content: center;
  flex-wrap: wrap;
}

.server-card {
  background: #1a1a1a;
  border: 2px solid #2a2a2a;
  border-radius: 12px;
  padding: 40px 60px;
  cursor: pointer;
  transition: border-color 0.2s, transform 0.2s;
  min-width: 200px;
}

.server-card:hover {
  transform: translateY(-3px);
}

.server-card.gf:hover {
  border-color: #ff9800;
}

.server-card.of:hover {
  border-color: #4caf50;
}

.server-card h2 {
  color: #e6e6e6;
  font-size: 1.5em;
  margin-bottom: 4px;
}

.server-card.gf h2 {
  color: #ff9800;
}

.server-card.of h2 {
  color: #4caf50;
}

.server-card p {
  color: #555555;
  font-size: 0.9em;
}

.nav-cards {
  display: flex;
  gap: 20px;
  justify-content: center;
  flex-wrap: wrap;
}

.card {
  display: block;
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  padding: 24px 32px;
  text-decoration: none;
  transition: border-color 0.2s, transform 0.2s;
  min-width: 260px;
}

.card:hover {
  border-color: #c8aa6e;
  transform: translateY(-2px);
}

.card h2 {
  color: #c8aa6e;
  margin-bottom: 8px;
  font-size: 1.2em;
}

.card p {
  color: #8a8a8a;
  font-size: 0.9em;
}
</style>
