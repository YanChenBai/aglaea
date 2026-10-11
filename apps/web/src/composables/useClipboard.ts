import { ref } from 'vue';

export function useClipboard() {
  const copied = ref('');
  const copyFailed = ref(false);

  async function copy(value: string): Promise<boolean> {
    if (!value) {
      return false;
    }

    try {
      await navigator.clipboard.writeText(value);
      copied.value = value;
      copyFailed.value = false;

      return true;
    } catch {
      copyFailed.value = true;

      return false;
    }
  }

  function clearCopied(): void {
    copied.value = '';
  }

  return { copied, copyFailed, copy, clearCopied };
}
