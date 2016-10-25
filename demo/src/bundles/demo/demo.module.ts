import { ArcModule, InputService, FocusService } from '../../../../src';
import { Component, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

@Component({
  selector: 'demo-app',
  styles: [`
    :host {
      font-family: monospace;
    }

    .area {
      max-width: 960px;
      border: 1px solid #000;
      margin: 15px auto;

      .arc--selected {
        border-color: #f00;
      }
    }

    .box {
      width: 100px;
      float: left;
      margin: 15px;
      background: #000;
      color: #fff;

      .arc--selected {
        background: #f00;
      }
    }
  `],
  template:   `
    <div class="area">
      <div class="box" *ngFor="let box of boxes">
        {{ box }}
      </div>
    </div>
  `,
})
export class DemoComponent {
  public boxes: string[] = [];

  constructor(input: InputService) {
    for (let i = 0; i < 100; i++) {
      this.boxes.push(String(`Box ${i}`));
    }

    input.bootstrap();
  }
}

@NgModule({
  imports: [
    BrowserModule,
    ArcModule,
  ],
  providers: [
    FocusService,
    InputService,
  ],
  declarations: [
    DemoComponent,
  ],
  bootstrap: [
    DemoComponent,
  ],
})
export class AppModule {
}
