import { NgModule, CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ArViewComponent } from '../components/ar-view/ar-view.component';

@NgModule({
  declarations: [ArViewComponent],
  imports: [CommonModule, IonicModule],
  exports: [ArViewComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA]
})
export class SharedModule {}
