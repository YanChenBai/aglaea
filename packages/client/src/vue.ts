import type { Treaty } from '@elysiajs/eden';
import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue';

import { createClient, type AglaeaClient } from './index.ts';

export function useClient(
  serverUrl: MaybeRefOrGetter<string>,
  options?: Treaty.Config,
): ComputedRef<AglaeaClient> {
  return computed(() => createClient(toValue(serverUrl), options));
}
