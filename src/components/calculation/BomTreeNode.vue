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
  border-bottom: 1px solid #2a2a2a;
}

.node-icon {
  color: #555555;
  font-size: 0.7em;
  width: 14px;
  text-align: center;
}

.node-name {
  color: #d0d0d0;
  flex: 1;
}

.node-name.reaction-name {
  color: #ff9800;
}

.source-badge {
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 0.7em;
  font-weight: 600;
}

.source-badge.reaction {
  background: rgba(255, 152, 0, 0.15);
  color: #ff9800;
  border: 1px solid rgba(255, 152, 0, 0.3);
}

.source-badge.manufacturing {
  background: rgba(76, 175, 80, 0.15);
  color: #4caf50;
  border: 1px solid rgba(76, 175, 80, 0.3);
}

.node-qty {
  color: #c8aa6e;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.me-badge, .runs-badge {
  background: #2a2a2a;
  color: #8a8a8a;
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 0.75em;
}

.toggle-btn {
  padding: 2px 10px;
  border: 1px solid #2a2a2a;
  border-radius: 3px;
  background: transparent;
  color: #8a8a8a;
  font-size: 0.8em;
  transition: all 0.2s;
}

.toggle-btn:hover {
  border-color: #c8aa6e;
  color: #c8aa6e;
}

.toggle-btn.active {
  border-color: #4caf50;
  color: #4caf50;
}

.tree-children {
  padding-left: 0;
}
</style>
