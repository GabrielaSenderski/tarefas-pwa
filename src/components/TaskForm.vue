<template>
  <form class="task-form" @submit.prevent="handleSubmit">

    <!-- Campo da tarefa e botões -->
    <div class="task-row">
      <input
        v-model="newTask"
        type="text"
        placeholder="Nova tarefa..."
        class="task-input"
      />

      <button
        type="submit"
        class="task-button"
        :disabled="uploading"
      >
        {{ editingTask ? 'Alterar' : 'Adicionar' }}
      </button>

      <button
        v-if="editingTask"
        type="button"
        class="task-button-cancel"
        @click="handleCancel"
      >
        Cancelar
      </button>
    </div>


    <!-- Imagem -->
    <div class="image-section">

      <!-- Preview da imagem -->
      <img
        v-if="previewUrl || editingTask?.img_url"
        :src="previewUrl || editingTask?.img_url"
        class="image-preview"
        alt="Imagem da tarefa"
      />

      <label
        class="image-label"
        :class="{ disabled: uploading }"
      >
        <span v-if="uploading" class="upload-status">
          Enviando...
        </span>

        <span v-else>
          {{
            previewUrl || editingTask?.img_url
              ? 'Trocar imagem'
              : 'Adicionar imagem'
          }}
        </span>

        <input
          type="file"
          accept="image/jpeg,image/png"
          capture="environment"
          class="image-input"
          :disabled="uploading"
          @change="handleImageChange"
        />
      </label>

      <p class="image-help">
        Em celular, o botão pode abrir a câmera.
        Em notebook, abre o seletor de arquivos.
      </p>

    </div>

    <div class="location-section">
      <p class="location-privacy">
        A localização é opcional. Se você capturar, latitude e longitude
        serão associadas a esta tarefa e armazenadas no servidor.
      </p>

      <div class="location-actions">
        <button
          type="button"
          class="location-button"
          :disabled="!isSupported || loadingLocation || uploading"
          @click="handleGetLocation"
        >
          {{ loadingLocation ? 'Obtendo localização...' : 'Usar localização atual' }}
        </button>

        <button
          v-if="location"
          type="button"
          class="location-button-remove"
          :disabled="uploading"
          @click="clearLocation"
        >
          Remover localização
        </button>
      </div>

      <p v-if="!isSupported" class="location-error">
        Geolocalização não suportada neste dispositivo.
      </p>
      <p v-else-if="locationError" class="location-error">{{ locationError }}</p>

      <div v-if="location" class="location-details">
        <p class="location-label">
          {{ location.label || 'Endereço ainda não identificado' }}
        </p>
        <p class="location-coords">
          {{ location.latitude.toFixed(5) }}, {{ location.longitude.toFixed(5) }}
          <span v-if="location.accuracy != null">
            · precisão estimada {{ Math.round(location.accuracy) }} m
          </span>
          <span
            v-if="accuracyLevel"
            :class="`accuracy-badge accuracy-badge--${accuracyLevel}`"
          >
            Precisão {{ accuracyLevel }}
          </span>
        </p>
      </div>

      <TaskLocationMap v-if="location" :location="location" />
    </div>

  </form>
</template>


<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import tasksApi from '../api/tasksApi.js';
import geocodingApi from '../api/geocodingApi.js';
import TaskLocationMap from './TaskLocationMap.vue';
import { useGeolocation } from '../composables/useGeolocation.js';
import { classifyAccuracy } from '../utils/location.js';

const props = defineProps({
  editingTask: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['add', 'update', 'cancel']);

const newTask = ref('');
const previewUrl = ref(null);
const imgAttachmentKey = ref(null);
const uploading = ref(false);

const {
  isSupported,
  loadingLocation,
  locationError,
  location,
  readPermissionState,
  setLocationFromTask,
  clearLocation,
  setLocationLabel,
  requestCurrentLocation,
} = useGeolocation();

const accuracyLevel = computed(() => classifyAccuracy(location.value?.accuracy));

onMounted(() => {
  readPermissionState();
});

watch(
  () => props.editingTask,
  (task) => {
    newTask.value = task ? task.title : '';

    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value);
    }

    previewUrl.value = null;
    imgAttachmentKey.value = null;
    setLocationFromTask(task);
  },
);

async function handleGetLocation() {
  const captured = await requestCurrentLocation();
  if (!captured) return;

  try {
    const address = await geocodingApi.reverse(
      captured.latitude,
      captured.longitude,
    );
    setLocationLabel(address?.label);
  } catch {
    locationError.value =
      'Localização obtida, mas não foi possível identificar a rua.';
  }
}

function resetForm() {
  newTask.value = '';

  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
  }

  previewUrl.value = null;
  imgAttachmentKey.value = null;
  clearLocation();
}

async function handleImageChange(event) {
  const file = event.target.files[0];

  if (!file) return;

  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
  }

  previewUrl.value = URL.createObjectURL(file);
  uploading.value = true;

  try {
    const response = await tasksApi.uploadImage(file);

    imgAttachmentKey.value = response.data.attachment_key;
  } catch (err) {
    console.error('Erro ao fazer upload da imagem', err);

    previewUrl.value = null;
    imgAttachmentKey.value = null;
  } finally {
    uploading.value = false;
  }
}

function handleSubmit() {
  if (!newTask.value.trim()) return;

  const payload = {
    title: newTask.value.trim(),
    imgAttachmentKey: imgAttachmentKey.value,
    location: location.value,
  };

  if (props.editingTask) {
    emit('update', props.editingTask.id, payload);
  } else {
    emit('add', payload);
  }

  resetForm();
}

function handleCancel() {
  resetForm();
  emit('cancel');
}
</script>


<style scoped>
/* ========================================
   FORMULÁRIO
======================================== */

.task-form {
  width: 100%;

  display: flex;
  flex-direction: column;

  gap: 12px;

  margin-bottom: 24px;
  padding: 18px;

  background-color: #ffffff;

  border: 1px solid #e4e9ef;
  border-radius: 14px;

  box-shadow:
    0 5px 18px rgba(0, 0, 0, 0.05);
}


/* ========================================
   CAMPO + BOTÕES
======================================== */

.task-row {
  width: 100%;

  display: flex;
  align-items: center;

  gap: 8px;
}

.task-input {
  flex: 1;

  min-width: 0;

  height: 46px;

  padding: 0 14px;

  border: 1px solid #d4dbe3;
  border-radius: 9px;

  background-color: #ffffff;
  color: #263238;

  font-family: inherit;
  font-size: 15px;

  outline: none;

  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.task-input:focus {
  border-color: #4a90d9;

  box-shadow:
    0 0 0 3px rgba(74, 144, 217, 0.12);
}

.task-input::placeholder {
  color: #929ba5;
}


/* ========================================
   BOTÃO ADICIONAR / ALTERAR
======================================== */

.task-button {
  height: 46px;

  padding: 0 18px;

  border: none;
  border-radius: 9px;

  background-color: #4a90d9;
  color: #ffffff;

  font-family: inherit;
  font-size: 14px;
  font-weight: 600;

  cursor: pointer;

  white-space: nowrap;

  transition:
    background-color 0.2s ease,
    transform 0.15s ease;
}

.task-button:hover:not(:disabled) {
  background-color: #357abd;

  transform: translateY(-1px);
}

.task-button:active:not(:disabled) {
  transform: translateY(0);
}

.task-button:disabled {
  opacity: 0.6;

  cursor: not-allowed;
}


/* ========================================
   BOTÃO CANCELAR
======================================== */

.task-button-cancel {
  height: 46px;

  padding: 0 15px;

  border: 1px solid #d7dee6;
  border-radius: 9px;

  background-color: #ffffff;
  color: #687681;

  font-family: inherit;
  font-size: 14px;
  font-weight: 500;

  cursor: pointer;

  white-space: nowrap;

  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
}

.task-button-cancel:hover {
  background-color: #f5f7f9;

  border-color: #b8c2cc;

  color: #3f4a56;
}


/* ========================================
   ÁREA DE IMAGEM
======================================== */

.image-section {
  width: 100%;

  display: flex;
  align-items: center;

  gap: 12px;

  padding: 10px 12px;

  border: 1px dashed #cbd5df;
  border-radius: 9px;

  background-color: #f8fafc;
}


/* ========================================
   PREVIEW
======================================== */

.image-preview {
  width: 48px;
  height: 48px;

  flex-shrink: 0;

  object-fit: cover;

  border-radius: 7px;

  border: 1px solid #dce2e8;
}


/* ========================================
   BOTÃO DE IMAGEM
======================================== */

.image-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  min-height: 34px;

  padding: 0 12px;

  border-radius: 7px;

  background-color: #e8f1fb;
  color: #357abd;

  font-size: 13px;
  font-weight: 600;

  cursor: pointer;

  white-space: nowrap;

  transition:
    background-color 0.2s ease;
}

.image-label:hover {
  background-color: #dcebf9;
}

.image-label.disabled {
  opacity: 0.6;

  cursor: not-allowed;
}


/* Input real fica invisível */

.image-input {
  display: none;
}


/* ========================================
   STATUS DO UPLOAD
======================================== */

.upload-status {
  color: #357abd;
}


/* ========================================
   TEXTO DE AJUDA
======================================== */

.image-help {
  margin: 0;

  color: #8a949e;

  font-size: 11px;

  line-height: 1.4;
}


.location-section {
  display: flex;
  flex-direction: column;
  gap: 10px;

  padding: 10px 12px;

  border: 1px dashed #cbd5df;
  border-radius: 9px;

  background-color: #f8fafc;
}

.location-privacy {
  margin: 0;

  color: #687681;

  font-size: 12px;
  line-height: 1.45;
}

.location-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.location-button,
.location-button-remove {
  height: 34px;
  padding: 0 12px;

  border-radius: 7px;

  font-family: inherit;
  font-size: 13px;
  font-weight: 600;

  cursor: pointer;
}

.location-button {
  border: none;

  background-color: #e8f1fb;
  color: #357abd;
}

.location-button:hover:not(:disabled) {
  background-color: #dcebf9;
}

.location-button:disabled,
.location-button-remove:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.location-button-remove {
  border: 1px solid #d7dee6;

  background-color: #ffffff;
  color: #687681;
}

.location-error {
  margin: 0;

  color: #c0392b;

  font-size: 12px;
}

.location-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.location-label {
  margin: 0;

  color: #263238;

  font-size: 13px;
  font-weight: 600;
}

.location-coords {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;

  margin: 0;

  color: #687681;

  font-size: 12px;
}

.accuracy-badge {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 12px;
}

.accuracy-badge--boa {
  background: #d4edda;
  color: #155724;
}

.accuracy-badge--moderada {
  background: #fff3cd;
  color: #856404;
}

.accuracy-badge--baixa {
  background: #f8d7da;
  color: #721c24;
}


/* ========================================
   CELULAR
======================================== */

@media (max-width: 600px) {

  .task-form {
    padding: 14px;
  }

  .task-row {
    flex-wrap: wrap;
  }

  .task-input {
    width: 100%;
    flex-basis: 100%;
  }

  .task-button,
  .task-button-cancel {
    flex: 1;
  }

  .image-section {
    align-items: center;

    gap: 8px;

    padding: 9px;
  }

  .image-preview {
    width: 42px;
    height: 42px;
  }

  .image-label {
    padding: 0 9px;

    font-size: 12px;
  }

  .image-help {
    display: none;
  }
}
</style>