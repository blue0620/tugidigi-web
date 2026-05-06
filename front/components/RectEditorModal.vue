<script setup lang="ts">
type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Point = {
  x: number;
  y: number;
};

const props = defineProps<{
  imageSrc: string;
}>();

const emit = defineEmits<{
  close: [rect: Rect | null];
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const imageRef = ref<HTMLImageElement | null>(null);
const size = ref(100);
const baseScale = ref(1);
const rect = ref<Rect | null>(null);
const tempRect = ref<Rect | null>(null);

const toCanvasValue = (value: number) => (value / 100) * size.value * baseScale.value;
const toActualValue = (value: number) => (value * 100) / size.value / baseScale.value;

const normalizeRect = (value: Rect): Rect => ({
  x: Math.floor((value.width < 0 ? value.x + value.width : value.x)),
  y: Math.floor((value.height < 0 ? value.y + value.height : value.y)),
  width: Math.floor(Math.abs(value.width)),
  height: Math.floor(Math.abs(value.height)),
});

const eventPoint = (event: MouseEvent | TouchEvent): Point => {
  const source = 'changedTouches' in event ? event.changedTouches[0] : event;
  const bounds = canvasRef.value!.getBoundingClientRect();
  return {
    x: source.clientX - bounds.left,
    y: source.clientY - bounds.top,
  };
};

const draw = () => {
  const canvas = canvasRef.value;
  const image = imageRef.value;
  if (!canvas || !image) return;

  const context = canvas.getContext('2d');
  if (!context) return;

  canvas.width = ((image.width * size.value) / 100) * baseScale.value;
  canvas.height = ((image.height * size.value) / 100) * baseScale.value;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const current = tempRect.value || (rect.value ? {
    x: toCanvasValue(rect.value.x),
    y: toCanvasValue(rect.value.y),
    width: toCanvasValue(rect.value.width),
    height: toCanvasValue(rect.value.height),
  } : null);

  if (current) {
    const normalized = normalizeRect(current);
    context.fillStyle = 'rgba(0, 94, 184, 0.18)';
    context.strokeStyle = '#005eb8';
    context.lineWidth = 2;
    context.fillRect(normalized.x, normalized.y, normalized.width, normalized.height);
    context.strokeRect(normalized.x, normalized.y, normalized.width, normalized.height);
  }
};

const onPointerMove = (event: MouseEvent | TouchEvent) => {
  if (!tempRect.value) return;
  const point = eventPoint(event);
  tempRect.value.width = point.x - tempRect.value.x;
  tempRect.value.height = point.y - tempRect.value.y;
  draw();
  event.preventDefault();
};

const stopTracking = () => {
  window.removeEventListener('mousemove', onPointerMove);
  window.removeEventListener('mouseup', onPointerUp);
  window.removeEventListener('touchmove', onPointerMove);
  window.removeEventListener('touchend', onPointerUp);
};

const onPointerUp = (event: MouseEvent | TouchEvent) => {
  if (!tempRect.value) return;
  const normalized = normalizeRect(tempRect.value);
  rect.value = normalized.width <= 5 || normalized.height <= 5
    ? null
    : {
        x: Math.floor(toActualValue(normalized.x)),
        y: Math.floor(toActualValue(normalized.y)),
        width: Math.floor(toActualValue(normalized.width)),
        height: Math.floor(toActualValue(normalized.height)),
      };
  tempRect.value = null;
  stopTracking();
  draw();
  event.preventDefault();
};

const onPointerDown = (event: MouseEvent | TouchEvent) => {
  const point = eventPoint(event);
  tempRect.value = {
    x: point.x,
    y: point.y,
    width: 0,
    height: 0,
  };
  window.addEventListener('mousemove', onPointerMove, { passive: false });
  window.addEventListener('mouseup', onPointerUp, { passive: false });
  window.addEventListener('touchmove', onPointerMove, { passive: false });
  window.addEventListener('touchend', onPointerUp, { passive: false });
  draw();
  event.preventDefault();
};

const onWheel = (event: WheelEvent) => {
  size.value += event.deltaY * -0.3;
  if (size.value < 1) size.value = 1;
  if (size.value > 200) size.value = 200;
  draw();
  event.preventDefault();
};

const save = () => emit('close', rect.value);
const cancel = () => emit('close', null);

onMounted(() => {
  const image = new Image();
  image.onload = () => {
    imageRef.value = image;
    baseScale.value = 800 / image.width;
    draw();
  };
  image.src = props.imageSrc;

  const canvas = canvasRef.value;
  if (!canvas) return;
  canvas.addEventListener('mousedown', onPointerDown);
  canvas.addEventListener('touchstart', onPointerDown, { passive: false });
  canvas.addEventListener('wheel', onWheel, { passive: false });
});

onBeforeUnmount(() => {
  stopTracking();
  const canvas = canvasRef.value;
  if (!canvas) return;
  canvas.removeEventListener('mousedown', onPointerDown);
  canvas.removeEventListener('touchstart', onPointerDown);
  canvas.removeEventListener('wheel', onWheel);
});

watch(size, draw);
</script>

<template>
  <div class="modal-backdrop" @click.self="cancel">
    <div class="modal-panel">
      <div class="toolbar">
        <input v-model="size" type="range" min="1" max="200">
        <div class="actions">
          <button class="button is-primary" type="button" @click="save">OK</button>
          <button class="button is-secondary" type="button" @click="cancel">キャンセル</button>
        </div>
      </div>
      <canvas ref="canvasRef" class="drawing"></canvas>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  align-items: center;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  inset: 0;
  justify-content: center;
  padding: 1.5rem;
  position: fixed;
  z-index: 80;
}

.modal-panel {
  background: #fff;
  border-radius: 8px;
  max-height: calc(100vh - 3rem);
  max-width: calc(100vw - 3rem);
  overflow: auto;
  padding: 1rem;
}

.toolbar {
  align-items: center;
  display: flex;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.toolbar input[type='range'] {
  flex: 1;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.drawing {
  border: 1px solid #94a3b8;
  display: block;
  max-width: 100%;
}
</style>
