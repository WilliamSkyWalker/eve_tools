import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

// Stub i18n with a tiny lookup so we can control sections per-test.
const messages = {}
vi.mock('../../i18n', () => ({
  useI18n: () => ({
    t: (key) => (key in messages ? messages[key] : key),
  }),
}))

import PageHelp from './PageHelp.vue'

beforeEach(() => {
  for (const k of Object.keys(messages)) delete messages[k]
  // Strip any modals left in body by previous tests (Teleport target)
  document.body.innerHTML = ''
})

function setHelp(topic, content) {
  for (const [k, v] of Object.entries(content)) {
    messages[`help.${topic}.${k}`] = v
  }
}

describe('PageHelp', () => {
  it('renders a button with help title attribute', () => {
    messages['help.btnTitle'] = 'Help'
    const wrapper = mount(PageHelp, { props: { topic: 'foo' }, attachTo: document.body })
    const btn = wrapper.find('.page-help-btn')
    expect(btn.exists()).toBe(true)
    expect(btn.attributes('title')).toBe('Help')
  })

  it('modal is closed by default', () => {
    const wrapper = mount(PageHelp, { props: { topic: 'foo' }, attachTo: document.body })
    expect(document.querySelector('.help-overlay')).toBeNull()
    wrapper.unmount()
  })

  it('clicking the button opens the modal in the body (Teleport)', async () => {
    setHelp('industry', {
      title: 'Industry Help',
      intro: 'Calculate materials.',
      usage: ['Step one', 'Step two'],
      formulas: ['required = ceil(...)'],
    })
    const wrapper = mount(PageHelp, { props: { topic: 'industry' }, attachTo: document.body })
    await wrapper.find('.page-help-btn').trigger('click')

    const overlay = document.querySelector('.help-overlay')
    expect(overlay).not.toBeNull()
    expect(document.querySelector('.help-title').textContent).toBe('Industry Help')
    expect(document.querySelector('.help-intro').textContent).toContain('Calculate materials')

    const usageItems = document.querySelectorAll('.help-section')[0].querySelectorAll('li')
    expect(usageItems).toHaveLength(2)
    expect(usageItems[0].textContent).toBe('Step one')

    const formulaCode = document.querySelectorAll('.help-section')[1].querySelectorAll('code')
    expect(formulaCode).toHaveLength(1)
    expect(formulaCode[0].textContent).toBe('required = ceil(...)')

    wrapper.unmount()
  })

  it('omits sections that have no i18n content', async () => {
    setHelp('lean', { title: 'Lean', usage: ['Only usage'] })
    const wrapper = mount(PageHelp, { props: { topic: 'lean' }, attachTo: document.body })
    await wrapper.find('.page-help-btn').trigger('click')

    const sections = document.querySelectorAll('.help-section')
    expect(sections).toHaveLength(1)  // no formulas, no notes
    expect(document.querySelector('.help-intro')).toBeNull()

    wrapper.unmount()
  })

  it('close button hides the modal', async () => {
    setHelp('foo', { title: 'Foo', usage: ['x'] })
    const wrapper = mount(PageHelp, { props: { topic: 'foo' }, attachTo: document.body })
    await wrapper.find('.page-help-btn').trigger('click')
    expect(document.querySelector('.help-overlay')).not.toBeNull()

    document.querySelector('.help-close').click()
    await wrapper.vm.$nextTick()
    expect(document.querySelector('.help-overlay')).toBeNull()

    wrapper.unmount()
  })

  it('falls back to btnTitle when topic has no title key', async () => {
    messages['help.btnTitle'] = 'Help'
    setHelp('bare', { usage: ['x'] })
    const wrapper = mount(PageHelp, { props: { topic: 'bare' }, attachTo: document.body })
    await wrapper.find('.page-help-btn').trigger('click')
    expect(document.querySelector('.help-title').textContent).toBe('Help')
    wrapper.unmount()
  })

  it('coerces string usage/formulas to single-item arrays', async () => {
    setHelp('single', { title: 'X', usage: 'lone string' })
    const wrapper = mount(PageHelp, { props: { topic: 'single' }, attachTo: document.body })
    await wrapper.find('.page-help-btn').trigger('click')
    const items = document.querySelectorAll('.help-list li')
    expect(items).toHaveLength(1)
    expect(items[0].textContent).toBe('lone string')
    wrapper.unmount()
  })
})
