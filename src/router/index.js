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
      path: '/:server(gf|of)/pi',
      name: 'pi',
      component: () => import('../views/PiView.vue'),
    },
    {
      path: '/:server(gf|of)/fitting',
      name: 'fitting',
      component: () => import('../views/FittingView.vue'),
    },
    {
      path: '/:server(gf|of)/dscan',
      name: 'dscan',
      component: () => import('../views/DscanView.vue'),
    },
    {
      path: '/:server(gf|of)/lpstore',
      name: 'lpstore',
      component: () => import('../views/LpStoreView.vue'),
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
      beforeEnter: () => {
        return localStorage.getItem('eve_contracts') === '1' || { name: 'home' }
      },
    },
    {
      path: '/:server(gf|of)/links',
      name: 'links',
      component: () => import('../views/LinksView.vue'),
    },
    {
      path: '/:server(gf|of)/sovmap',
      name: 'sovmap',
      component: () => import('../views/SovMapView.vue'),
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
