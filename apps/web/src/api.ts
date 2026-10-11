import { useClient } from '@aglaea/client/vue';
import { ref } from 'vue';

export function resolveApiBase(): string {
  const params = new URLSearchParams(location.search);

  return (params.get('server') || location.origin).replace(/\/$/, '');
}

export const serverUrl = ref(resolveApiBase());
export const api = useClient(serverUrl);
