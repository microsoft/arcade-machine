import { Location } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'page-2',
  template: `
  <h1>Page 2</h1>
  <p>Try navigating with gamepad-B. Back buttons will not work here</p>
  <button tabindex="0" (click)="goBack()">Go Back</button>
  `,
})
export class Page2Component {
  constructor(
    private location: Location,
  ) { }

  public goBack() {
    this.location.back();
  }
}
