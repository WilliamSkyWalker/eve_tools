<template>
  <li class="tree-node" :style="{ paddingLeft: depth * 20 + 'px' }">
    <div class="node-row">
      <span class="node-icon">{{ node.build && node.children?.length ? '▼' : node.is_manufacturable ? '▶' : '●' }}</span>
      <span class="node-name" :class="{ 'reaction-name': node.is_reaction }">{{ node.type_name }}</span>
      <span v-if="node.is_reaction" class="source-badge reaction">反应</span>
      <span v-else-if="node.is_manufacturable" class="source-badge manufacturing">制造</span>
      <span class="node-qty">x{{ formatNumber(node.quantity) }}</span>
      <span v-if="node.me_level != null" class="me-badge">ME{{ node.me_level }}</span>
      <span v-if="node.sub_runs" class="runs-badge">{{ node.sub_runs }}流程</span>
      <button
        v-if="node.is_manufacturable"
        @click="toggleBuild"
        class="toggle-btn"
        :class="{ active: node.build }"
      >
        {{ node.build ? '购买' : '制造' }}
      </button>
    </div>
    <ul v-if="node.build && node.children?.length" class="tree-children">
      <BomTreeNode
        v-for="child in node.children"
        :key="child.type_id"
        :node="child"
        :depth="depth + 1"
        @toggle-build="(typeId, build, me) => emit('toggle-build', typeId, build, me)"
      />
    </ul>
  </li>
</template>

<script setup>
const props = defineProps({
  node: { type: Object, required: true },
  depth: { type: Number, default: 0 },
})

const emit = defineEmits(['toggle-build'])

function formatNumber(n) {
  return n != null ? n.toLocaleString() : '-'
}

function toggleBuild() {
  emit('toggle-build', props.node.type_id, !props.node.build, 10)
}
</script>

<style scoped>
.tree-node {
  list-style: none;
}

.node-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  border-bottom: 1px solid var(--border-default);
}

.node-icon {
  color: var(--text-dim);
  font-size: 0.7em;
  width: 14px;
  text-align: center;
}

.node-name {
  color: var(--text-primary);
  flex: 1;
}

.node-name.reaction-name {
  color: var(--orange);
}

.source-badge {
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 0.7em;
  font-weight: 600;
}

.source-badge.reaction {
  background: var(--orange-bg);
  color: var(--orange);
  border: 1px solid var(--orange-bg);
}

.source-badge.manufacturing {
  background: var(--green-bg);
  color: var(--green);
  border: 1px solid var(--green-bg);
}

.node-qty {
  color: var(--gold);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.me-badge, .runs-badge {
  background: var(--border-default);
  color: var(--text-muted);
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 0.75em;
}

.toggle-btn {
  padding: 2px 10px;
  border: 1px solid var(--border-default);
  border-radius: 3px;
  background: transparent;
  color: var(--text-muted);
  font-size: 0.8em;
  transition: all 0.2s;
}

.toggle-btn:hover {
  border-color: var(--gold);
  color: var(--gold);
}

.toggle-btn.active {
  border-color: var(--green);
  color: var(--green);
}

.tree-children {
  padding-left: 0;
}
</style>
