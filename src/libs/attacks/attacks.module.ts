import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbPopoverModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { TagsModule } from '../shared/tags/tags.module';
import { ActionIconsModule } from '../shared/ui/action-icons/action-icons.module';
import { ObjectEffectsModule } from '../shared/object-effects/object-effects.module';
import { FormsModule } from '@angular/forms';
import { ItemModule } from '../shared/item/item.module';
import { TraitModule } from '../shared/ui/trait/trait.module';
import { QuickdiceModule } from '../shared/quickdice/quickdice.module';
import { SkillModule } from '../shared/skill/skill.module';
import { AttacksComponent } from './components/attacks/attacks.component';
import { DescriptionModule } from '../shared/ui/description/description.module';
import { GridIconModule } from '../shared/ui/grid-icon/grid-icon.module';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,

        NgbTooltipModule,
        NgbPopoverModule,

        TagsModule,
        ActionIconsModule,
        ObjectEffectsModule,
        ItemModule,
        TraitModule,
        QuickdiceModule,
        SkillModule,
        DescriptionModule,
        GridIconModule,
    ],
    declarations: [
        AttacksComponent,
    ],
    exports: [
        AttacksComponent,
    ],
})
export class AttacksModule { }