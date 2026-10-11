<script setup lang="ts">
import { ArrowUpRight, ChevronDown, Settings2 } from 'lucide-vue-next';
import { computed, ref } from 'vue';

import { websiteLinks } from '../links.ts';
import CopyCode from './CopyCode.vue';
import MotionReveal from './MotionReveal.vue';
import TechStack from './TechStack.vue';

const shell = ref<'bash' | 'powershell'>('bash');
const sourceCommand = `git clone ${websiteLinks.repository}.git\ncd aglaea`;

const configurationCommand = computed(() =>
  shell.value === 'bash' ? 'cp .env.example .env' : 'Copy-Item .env.example .env',
);

const configuration = `# 宿主机访问端口
AGLAEA_PORT=8787

# 容器监听端口与地址，通常无需修改
PORT=8787
HOST=0.0.0.0

# 对外服务地址，启动日志中显示的入口
AGLAEA_PUBLIC_URL=http://localhost:8787

# 手机遥控地址，请填写手机能访问的域名
AGLAEA_WEB_URL=http://localhost:8787

# 容器内网页目录，保留 Compose 默认值
AGLAEA_STATIC_ROOT=/app/website`;
</script>

<template>
  <section id="deploy" class="ag:scroll-mt-20">
    <div class="ag:mx-auto ag:max-w-6xl ag:px-6 ag:py-24 ag:md:py-28">
      <MotionReveal class="ag:flex ag:flex-wrap ag:items-end ag:justify-between ag:gap-6">
        <div class="ag-section-heading">
          <p class="ag-eyebrow">SELF HOSTING</p>
          <h2 class="ag-display ag:text-ag-paper">让相聚，有自己的归处</h2>
          <p class="ag:mt-4 ag:text-xs ag:leading-6 ag:text-ag-muted">
            获取源码，配置地址，启动服务。
          </p>
        </div>
        <a
          :href="websiteLinks.repository + '#readme'"
          target="_blank"
          rel="noopener noreferrer"
          class="ag-focus ag:inline-flex ag:items-center ag:gap-2 ag:text-xs ag:text-ag-gold ag:no-underline"
          >完整部署文档 <ArrowUpRight :size="13" aria-hidden="true"
        /></a>
      </MotionReveal>
      <MotionReveal class="ag:mt-10">
        <div
          class="ag:flex ag:flex-wrap ag:items-center ag:justify-between ag:gap-3 ag:border-b ag:border-white/8 ag:pb-5"
        >
          <span class="ag:text-[11px] ag:text-ag-muted">需要 Docker 与 Compose</span>
          <div
            class="ag:flex ag:gap-0.5 ag:rounded-full ag:border ag:border-white/8 ag:bg-white/[0.02] ag:p-0.5"
            aria-label="命令使用的终端"
          >
            <button
              v-for="option in ['bash', 'powershell'] as const"
              :key="option"
              type="button"
              :aria-pressed="shell === option"
              @click="shell = option"
              class="ag-focus ag:cursor-pointer ag:rounded-full ag:border ag:px-2.5 ag:py-1 ag:text-[11px] ag:transition-colors"
              :class="
                shell === option
                  ? 'ag:border-ag-gold/15 ag:bg-ag-gold/8 ag:text-ag-gold-pale'
                  : 'ag:border-transparent ag:text-ag-muted ag:hover:bg-white/[0.03] ag:hover:text-ag-paper'
              "
            >
              {{ option === 'bash' ? 'Bash' : 'PowerShell' }}
            </button>
          </div>
        </div>
        <ol>
          <li class="ag:grid ag:gap-4 ag:py-6 ag:md:grid-cols-[230px_1fr] ag:md:gap-10 ag:md:py-7">
            <div class="ag:flex ag:gap-4">
              <span
                class="ag:mt-1 ag:w-5 ag:shrink-0 ag:font-mono ag:text-[10px] ag:tracking-widest ag:text-ag-gold/60"
                >01</span
              >
              <div class="ag:pt-1">
                <h3 class="ag:flex ag:items-center ag:gap-2 ag:text-sm ag:text-ag-paper">
                  获取源码
                </h3>
                <p class="ag:mt-2 ag:text-[11px] ag:leading-6 ag:text-ag-muted">
                  克隆仓库，进入项目目录。
                </p>
              </div>
            </div>
            <CopyCode :code="sourceCommand" label="获取源码命令" />
          </li>
          <li
            class="ag:grid ag:gap-4 ag:border-t ag:border-white/6 ag:py-6 ag:md:grid-cols-[230px_1fr] ag:md:gap-10 ag:md:py-7"
          >
            <div class="ag:flex ag:gap-4">
              <span
                class="ag:mt-1 ag:w-5 ag:shrink-0 ag:font-mono ag:text-[10px] ag:tracking-widest ag:text-ag-gold/60"
                >02</span
              >
              <div class="ag:pt-1">
                <h3 class="ag:flex ag:items-center ag:gap-2 ag:text-sm ag:text-ag-paper">
                  准备配置
                </h3>
                <p class="ag:mt-2 ag:text-[11px] ag:leading-6 ag:text-ag-muted">
                  从模板创建 .env。<br />本地保留默认值，公网填写实际域名。
                </p>
              </div>
            </div>
            <div class="ag:min-w-0">
              <CopyCode :code="configurationCommand" label="配置模板命令" compact />
              <details class="ag:group ag:mt-3">
                <summary
                  class="ag-focus ag:flex ag:cursor-pointer ag:list-none ag:items-center ag:justify-between ag:gap-3 ag:py-3 ag:text-[11px] ag:text-ag-muted ag:hover:text-ag-gold-pale"
                >
                  <span class="ag:flex ag:items-center ag:gap-2"
                    ><Settings2 :size="12" aria-hidden="true" /> .env 参数与公网配置</span
                  >
                  <ChevronDown
                    :size="13"
                    class="ag:transition-transform ag:group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <div class="ag:pb-4">
                  <CopyCode :code="configuration" label=".env" />
                  <p class="ag:my-3 ag:text-[11px] ag:leading-6 ag:text-ag-muted">
                    修改配置后，执行下方命令应用，无需重建镜像。
                  </p>
                  <CopyCode code="docker compose up -d" label="更新配置命令" compact />
                </div>
              </details>
            </div>
          </li>
          <li
            class="ag:grid ag:gap-4 ag:border-t ag:border-white/6 ag:py-6 ag:md:grid-cols-[230px_1fr] ag:md:gap-10 ag:md:py-7"
          >
            <div class="ag:flex ag:gap-4">
              <span
                class="ag:mt-1 ag:w-5 ag:shrink-0 ag:font-mono ag:text-[10px] ag:tracking-widest ag:text-ag-gold/60"
                >03</span
              >
              <div class="ag:pt-1">
                <h3 class="ag:flex ag:items-center ag:gap-2 ag:text-sm ag:text-ag-paper">
                  启动服务
                </h3>
                <p class="ag:mt-2 ag:text-[11px] ag:leading-6 ag:text-ag-muted">
                  构建并启动，随后打开网页。<br />插件填入服务地址，即可创建房间。
                </p>
              </div>
            </div>
            <div class="ag:min-w-0">
              <CopyCode code="docker compose up -d --build" label="启动服务命令" compact />
              <div
                class="ag:mt-3 ag:flex ag:flex-wrap ag:items-center ag:gap-3 ag:text-[10px] ag:text-ag-muted"
              >
                <span class="ag:size-1 ag:rotate-45 ag:bg-ag-gold/60" aria-hidden="true"></span>
                <span>本地访问入口</span
                ><code class="ag:text-ag-gold-pale">http://localhost:8787</code>
              </div>
            </div>
          </li>
        </ol>
        <div
          class="ag:flex ag:flex-wrap ag:items-center ag:justify-between ag:gap-3 ag:border-t ag:border-white/6 ag:py-4"
        >
          <span class="ag:flex ag:items-center ag:gap-2 ag:text-[10px] ag:text-ag-muted"
            ><img src="/technologies/docker.svg" alt="" class="ag:h-4 ag:w-5 ag:object-contain" />
            Docker Compose</span
          >
          <p class="ag:text-[10px] ag:leading-6 ag:text-ag-muted/70">
            房间保存在内存中，服务重启后会清空。
          </p>
        </div>
      </MotionReveal>
      <TechStack />
    </div>
  </section>
</template>
