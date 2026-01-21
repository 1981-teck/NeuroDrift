import { getUI } from './ui/elements.js';
import { bindEvents } from './ui/bindEvents.js';
import { AppController } from './app/AppController.js';

const ui = getUI();
const app = new AppController(ui);

app.initUI();
bindEvents(ui, app);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    app.visualizer.stop();
    app.visualizer.renderStatic();
  } else if (app.engine?.isPlaying) {
    app.visualizer.start(app.engine.getAnalyser());
  }
});
