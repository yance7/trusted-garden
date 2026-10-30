import { defineConfig } from 'vite';
import {sharedNavigation} from './tools/site/navigation.ts';
export default defineConfig({ base: './',plugins:[sharedNavigation()], build: { target: 'es2022', chunkSizeWarningLimit: 850,rolldownOptions:{input:{farm:'index.html',story:'story.html',design:'design.html',architecture:'architecture.html',notes:'notes.html'}} } });
