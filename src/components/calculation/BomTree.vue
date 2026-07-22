<template>
  <div class="bom-tree">
    <div class="tree-root">
      <div class="root-label">
        <strong>{{ tree.type_name }}</strong> x{{ formatNumber(tree.quantity) }}
        <span class="me-badge">ME{{ tree.me_level }}</span>
      </div>
      <ul class="tree-children">
        <BomTreeNode
          v-for="child in tree.children"
          :key="child.type_id"
          :node="child"
          :depth="1"
          @toggle-build="(typeId, build, me) => emit('toggle-build', typeId, build, me)"
        />
      </ul>
    </div>
  </div>
</template>

<script setup>
import BomTreeNode from './BomTreeNode.vue'

defineProps({
  tree: { type: Object, required: true },
  buildItems: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['toggle-build'])

function formatNumber(n) {
  return n != null ? n.toLocaleString() : '-'
}
</script>

<style scoped>
.bom-tree {
  background: var(--bg-panel);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 16px;
}

.root-label {
  font-size: 1.1em;
  margin-bottom: 8px;
  color: var(--gold);
}

.me-badge {
  background: var(--border-default);
  color: var(--text-muted);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.75em;
  margin-left: 8px;
}

.tree-children {
  list-style: none;
  padding-left: 0;
}
</style>
