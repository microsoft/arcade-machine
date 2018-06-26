import { AfterViewInit, Component } from '@angular/core';
import { take } from 'rxjs/operators';

import { ScrollService } from './scroll-service';
import { FocusService } from '../../../../src/focus.service';

@Component({
  selector: 'arc-smooth-scroll',
  template: `
  <h1>Smooth Scroll Demo</h1>
  <p>Navigate around to see smooth scroll in action</p>
  <div class="scroll-container">
    <div class="box" tabindex="0">Box1</div>
    <div class="box" tabindex="0">Box2</div>
    <div class="box" tabindex="0">Box3</div>
    <div class="box" tabindex="0">Box4</div>
    <div class="box" tabindex="0">Box5</div>
    <div class="box" tabindex="0">Box6</div>
    <div class="box" tabindex="0">Box7</div>
    <div class="box" tabindex="0">Box8</div>
  </div>
  `,
  styles: [`
    .scroll-container { position: relative; height: 500px; width: 500px; overflow: auto; }
    .arc--selected-direct { outline: 2px solid red; }
    .box { margin: 100px; height: 100px; line-height: 100px; text-align: center; background: grey; }
  `],
})
export class SmoothScrollPageComponent implements AfterViewInit {
  constructor(
    private focus: FocusService,
    private scrollService: ScrollService,
  ) {
    this.focus.scrollSpeed = null;
  }

  public ngAfterViewInit() {
    const scrollContainer = <HTMLElement>document.querySelector('.scroll-container');
    scrollContainer.addEventListener('arcfocuschanging', (ev) => {
      ev.preventDefault();
      const topOffset = (<HTMLElement>ev.target).offsetTop - (scrollContainer.offsetHeight / 2);
      this.scrollService.smoothScroll(scrollContainer, topOffset);
      this.scrollService.scrollCompleted
        .pipe(take(1))
        .subscribe(() => {
          if (this.focus.selected) {
            this.focus.selected.focus();
          }
        });
    });
  }
}
