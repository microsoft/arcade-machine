import { ModuleWithProviders, NgModule } from '@angular/core';

import { ArcDirective } from './arc.directive';
import { FocusService } from './focus.service';
import { InputService } from './input.service';
import { RegistryService } from './registry.service';
export { InputService } from './input.service';
export { FocusService } from './focus.service';
export { RegistryService } from './registry.service';
export * from './model';

@NgModule({
  declarations: [ArcDirective],
  exports: [ArcDirective],
})
export class ArcModule {
  public static forRoot(): ModuleWithProviders<ArcModule> {
    return {
      ngModule: ArcModule,
      providers: [InputService, FocusService, RegistryService],
    };
  }
}
