import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/:server(gf|of)/industry',
      name: 'industry',
      component: () => import('../views/IndustryView.vue'),
    },
    {
      path: '/:server(gf|of)/market',
      name: 'market',
      component: () => import('../views/MarketView.vue'),
    },
    {
      path: '/:server(gf|of)/navigation',
      name: 'navigation',
      component: () => import('../views/JumpPlannerView.vue'),
    },
    {
      path: '/:server(gf|of)/contracts',
      name: 'contracts',
      component: () => import('../views/ContractsView.vue'),
    },
    {
      path: '/:server(gf|of)/wormhole',
      name: 'wormhole',
      component: () => import('../views/WormholeView.vue'),
    },
    {
      path: '/credits',
      name: 'credits',
      component: () => import('../views/CreditsView.vue'),
    },
{
      path: '/blueprint/:typeId',
      name: 'blueprint',
      component: () => import('../views/BlueprintView.vue'),
      props: (route) => ({ typeId: Number(route.params.typeId) }),
    },
  ],
})

export default router
