import { createApp, registerElement } from 'nativescript-vue';

import Home from './components/Home.vue';
import { PlaybackWebView } from './player/native-webview';

import './app.css';

registerElement('AWebView', () => PlaybackWebView);
createApp(Home).start();
