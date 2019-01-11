interface IScrollOptions {
  preventScroll: boolean;
}

// tslint:disable-next-line
interface HTMLElement {
  focus(scrollOptions?: IScrollOptions): void;
}
