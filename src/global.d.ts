interface ScrollOptions {
  preventScroll: boolean;
}
interface HTMLElement {
  focus(scrollOptions?: ScrollOptions): void;
}

