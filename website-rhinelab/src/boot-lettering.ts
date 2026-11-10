import "./boot-lettering.css";
export async function loadBootWebfonts() { return false; }
/** Retain the upstream timeline API while rendering ordinary, system-font text. */
export class BootLettering {
  private value: string | undefined;
  constructor(private host: HTMLElement, _keys: string[]) {
    host.classList.add("pnc-boot-lettering");
    host.dataset.letteringRenderer = "system-font";
  }
  useWebfonts() {}
  setText(value: string) {
    if (this.value === value) return;
    this.value = value; this.host.textContent = value;
  }
}
