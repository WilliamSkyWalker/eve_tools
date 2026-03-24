<template>
  <div class="material-form">
    <div class="form-row">
      <div class="field">
        <label>ME Level</label>
        <div class="slider-row">
          <input type="range" v-model.number="meLevel" min="0" max="10" step="1" />
          <span class="value">{{ meLevel }}</span>
        </div>
      </div>
      <div class="field">
        <label>Runs</label>
        <input type="number" v-model.number="runs" min="1" :max="maxRuns || 999999" class="runs-input" />
      </div>
      <div class="actions">
        <button @click="emitCalculate" class="btn btn-primary">Calculate</button>
        <button @click="emitBom" class="btn btn-secondary">BOM Tree</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  maxRuns: { type: Number, default: 999999 },
})

const emit = defineEmits(['calculate', 'calculate-bom'])

const meLevel = ref(0)
const runs = ref(1)

function emitCalculate() {
  emit('calculate', { meLevel: meLevel.value, runs: runs.value })
}

function emitBom() {
  emit('calculate-bom', { meLevel: meLevel.value, runs: runs.value })
}
</script>

<style scoped>
.material-form {
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.form-row {
  display: flex;
  align-items: flex-end;
  gap: 20px;
  flex-wrap: wrap;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field label {
  font-size: 0.85em;
  color: #8a8a8a;
}

.slider-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.slider-row input[type="range"] {
  width: 150px;
  accent-color: #c8aa6e;
}

.value {
  color: #c8aa6e;
  font-weight: bold;
  min-width: 24px;
  text-align: center;
}

.runs-input {
  width: 100px;
  padding: 6px 10px;
  background: #0d0d0d;
  border: 1px solid #2a2a2a;
  border-radius: 6px;
  color: #d0d0d0;
  outline: none;
}

.runs-input:focus {
  border-color: #c8aa6e;
}

.actions {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 8px 20px;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  transition: background 0.2s;
}

.btn-primary {
  background: #c8aa6e;
  color: #0d0d0d;
}

.btn-primary:hover {
  background: #e0c882;
}

.btn-secondary {
  background: #2a2a2a;
  color: #d0d0d0;
}

.btn-secondary:hover {
  background: #3a3a3a;
}
</style>
