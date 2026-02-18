import { Injectable, Renderer2, RendererFactory2 } from "@angular/core";

@Injectable({ providedIn: 'root' })
export class ThemeService {

  private renderer: Renderer2;
  private darkClass = 'dark-theme';

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);

    if (this.isBrowser()) {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark') this.enableDarkMode();
      else this.enableLightMode();
    }
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  enableDarkMode() {
    this.renderer.addClass(document.body, this.darkClass);
    if (this.isBrowser()) localStorage.setItem('theme', 'dark');
  }

  enableLightMode() {
    this.renderer.removeClass(document.body, this.darkClass);
    if (this.isBrowser()) localStorage.setItem('theme', 'light');
  }

  // 🔥 lo que te faltaba
  setDark(enabled: boolean) {
    if (enabled) this.enableDarkMode();
    else this.enableLightMode();
  }

  isDark(): boolean {
    return document.body.classList.contains(this.darkClass);
  }
}
