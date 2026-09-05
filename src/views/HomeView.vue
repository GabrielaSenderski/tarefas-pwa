<template>
  <div>
    <p v-if="store.error" class="error-message">{{ store.error }}</p>

    <TaskForm
      :editing-task="editingTask"
      @add="handleAdd"
      @update="handleUpdate"
      @cancel="handleCancel"
    />

    <label class="location-filter">
      <input v-model="onlyWithLocation" type="checkbox" />
      Somente com localização
    </label>

    <p v-if="store.loading" class="loading-message">Carregando tarefas...</p>

    <template v-else>
      <section v-if="pendingTasks.length > 0">
        <h2 class="section-title">
          Pendentes ({{ pendingTasks.length }})
        </h2>
        <TaskItem
          v-for="task in pendingTasks"
          :key="task.id"
          :task="task"
          @toggle="handleToggle"
          @remove="handleRemove"
          @edit="handleEdit"
        />
      </section>

      <section v-if="completedTasks.length > 0">
        <h2 class="section-title">
          Concluídas ({{ completedTasks.length }})
        </h2>
        <TaskItem
          v-for="task in completedTasks"
          :key="task.id"
          :task="task"
          @toggle="handleToggle"
          @remove="handleRemove"
          @edit="handleEdit"
        />
      </section>

      <p v-if="store.tasks.length === 0" class="empty-message">
        Nenhuma tarefa cadastrada. Adicione uma acima.
      </p>
      <p
        v-else-if="pendingTasks.length === 0 && completedTasks.length === 0"
        class="empty-message"
      >
        Nenhuma tarefa com localização.
      </p>
    </template>

    <InstallButton />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import TaskForm from '../components/TaskForm.vue';
import TaskItem from '../components/TaskItem.vue';
import InstallButton from '../components/InstallButton.vue';
import { useTasksStore } from '../stores/tasks.js';

const store = useTasksStore();
const editingTask = ref(null);
const onlyWithLocation = ref(false);

const pendingTasks = computed(() =>
  onlyWithLocation.value
    ? store.pendingTasks.filter((task) => task.latitude != null)
    : store.pendingTasks,
);

const completedTasks = computed(() =>
  onlyWithLocation.value
    ? store.completedTasks.filter((task) => task.latitude != null)
    : store.completedTasks,
);

onMounted(() => {
  store.fetchTasks();
});

function handleAdd(payload) {
  store.addTask(payload);
}

async function handleUpdate(id, payload) {
  await store.updateTask(id, payload)

  editingTask.value = null
}

function handleCancel() {
  editingTask.value = null;
}

function handleEdit(task) {
  editingTask.value = task;
}

function handleToggle(id) {
  store.toggleTask(id);
}

function handleRemove(id) {
  if (editingTask.value?.id === id) editingTask.value = null;
  store.removeTask(id);
}
</script>

<style scoped>
.location-filter {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  color: #3f4a56;
  font-size: 14px;
}

.section-title {
  font-size: 1rem;
  color: #666;
  margin-bottom: 12px;
  margin-top: 20px;
}

.empty-message {
  text-align: center;
  color: #999;
  margin-top: 40px;
  font-size: 0.95rem;
}

.error-message {
  color: #c0392b;
  background-color: #fdecea;
  border: 1px solid #e74c3c;
  border-radius: 6px;
  padding: 10px 14px;
  margin-bottom: 12px;
  font-size: 0.9rem;
}

.loading-message {
  color: #666;
  font-size: 0.9rem;
  padding: 8px 0;
}
</style>